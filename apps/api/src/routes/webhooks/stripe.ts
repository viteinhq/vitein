import { Hono } from 'hono';
import {
  claimStripeEvent,
  markEventPaid,
  releaseStripeEvent,
} from '../../domain/payments/payments.js';
import { NotFoundError } from '../../domain/errors.js';
import { db } from '../../infra/db.js';
import { verifyWebhookSignature, WebhookVerificationError } from '../../infra/stripe.js';
import type { AppVariables, Env } from '../../types/env.js';

export const stripeWebhookRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

/**
 * Stripe webhook receiver. Must read the raw body BEFORE any parsing so the
 * signature can be verified byte-for-byte. We handle only the events we
 * care about; unknown types are 200'd so Stripe stops retrying them.
 */
stripeWebhookRoute.post('/', async (c) => {
  const logger = c.var.logger;
  const secret = c.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn('stripe_webhook_secret_unset');
    return c.json(
      { error: { code: 'stripe_not_configured', message: 'Webhook secret not set' } },
      503,
    );
  }

  const signature = c.req.header('stripe-signature');
  if (!signature) {
    return c.json(
      { error: { code: 'stripe_signature_missing', message: 'Missing Stripe-Signature header' } },
      400,
    );
  }

  const rawBody = await c.req.text();

  let evt;
  try {
    evt = await verifyWebhookSignature(secret, rawBody, signature);
  } catch (err) {
    const reason = err instanceof WebhookVerificationError ? err.reason : 'unknown';
    logger.warn('stripe_webhook_verify_failed', { reason });
    return c.json(
      { error: { code: 'stripe_signature_invalid', message: 'Signature verification failed' } },
      400,
    );
  }

  logger.info('stripe_webhook_received', { stripeEventId: evt.id, stripeType: evt.type });

  if (evt.type !== 'checkout.session.completed') {
    // Acknowledge and move on — Stripe retries on non-2xx.
    return c.json({ received: true, handled: false });
  }

  const session = evt.data.object as {
    id: string;
    client_reference_id?: string | null;
    payment_status?: string;
    metadata?: Record<string, string>;
  };

  if (session.payment_status && session.payment_status !== 'paid') {
    logger.info('stripe_webhook_skip_unpaid', {
      stripeEventId: evt.id,
      paymentStatus: session.payment_status,
    });
    return c.json({ received: true, handled: false });
  }

  const eventId = session.client_reference_id ?? session.metadata?.['event_id'];
  if (!eventId) {
    logger.warn('stripe_webhook_missing_event_id', {
      stripeEventId: evt.id,
      sessionId: session.id,
    });
    return c.json({ received: true, handled: false });
  }

  const tierRaw = session.metadata?.['tier'];
  const tier = tierRaw === 'basic' || tierRaw === 'plus' ? tierRaw : null;
  if (!tier) {
    logger.warn('stripe_webhook_missing_tier', {
      stripeEventId: evt.id,
      sessionId: session.id,
      metadata: session.metadata,
    });
    return c.json({ received: true, handled: false });
  }

  const dbc = db(c);

  // Idempotency: claim the event id before the side-effecting write so a
  // duplicate Stripe delivery is acknowledged without re-running it (and
  // without appending a second `payment.completed` audit row).
  const fresh = await claimStripeEvent(dbc, evt.id, evt.type);
  if (!fresh) {
    logger.info('stripe_webhook_duplicate', { stripeEventId: evt.id });
    return c.json({ received: true, handled: false, duplicate: true });
  }

  try {
    await markEventPaid(dbc, {
      eventId,
      tier,
      paymentRef: session.id,
      metadata: { stripeEventId: evt.id },
    });
  } catch (err) {
    if (err instanceof NotFoundError) {
      // The referenced event is missing or soft-deleted — a PERMANENT
      // condition that can never succeed on retry. Keep the idempotency
      // claim and 200-ack so Stripe stops redelivering (a 5xx here makes
      // Stripe retry the bad event indefinitely). Log for ops.
      logger.warn('stripe_webhook_event_missing', { stripeEventId: evt.id, eventId });
      return c.json({ received: true, handled: false, reason: 'event_not_found' });
    }
    // Transient failure (DB blip, etc.) — release the claim so Stripe's
    // retry can re-process this event, and surface a 5xx.
    await releaseStripeEvent(dbc, evt.id).catch(() => {});
    throw err;
  }

  return c.json({ received: true, handled: true, tier });
});
