import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { getEventForCreator } from '../domain/events/events.js';
import { ConflictError, DomainError, ValidationError } from '../domain/errors.js';
import { db } from '../infra/db.js';
import {
  createCheckoutSession,
  priceIdFor,
  StripeApiError,
  StripeNotConfiguredError,
} from '../infra/stripe.js';
import { requireCreator } from '../middleware/require-creator.js';
import type { AppVariables, Env } from '../types/env.js';

export const checkoutRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const checkoutInputSchema = z.object({
  tier: z.enum(['basic', 'plus']),
  currency: z.enum(['EUR', 'USD', 'CHF', 'GBP']).optional(),
});

const idSchema = z.object({ id: z.string().uuid() });

/**
 * Creator-authed. Creates a Stripe Checkout Session for the requested tier
 * and currency, and returns its hosted URL. The webhook is the source of
 * truth for marking the event paid; this endpoint only starts the flow.
 */
checkoutRoute.post(
  '/',
  zValidator('param', idSchema, (result) => {
    if (!result.success)
      throw new ValidationError('Invalid event id', { issues: result.error.issues });
  }),
  requireCreator('id'),
  zValidator('json', checkoutInputSchema, (result) => {
    if (!result.success)
      throw new ValidationError('Invalid checkout body', { issues: result.error.issues });
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const { tier, currency = 'EUR' } = c.req.valid('json');

    const event = await getEventForCreator(db(c.env), id);
    if (event.isPaid) {
      throw new ConflictError('event.already_paid', 'Event is already premium');
    }

    const priceId = priceIdFor(c.env, tier, currency);
    if (!priceId) {
      throw new DomainError(
        'stripe.price_not_configured',
        `No Stripe Price configured for tier=${tier} currency=${currency}`,
        503,
      );
    }

    const webBase = c.env.WEB_BASE_URL ?? 'https://vite.in';
    // Creator auth rides on the X-Creator-Token header; we need the plain
    // token back on the return URLs so /manage can re-authenticate the
    // creator after the Stripe round-trip. Read it from the header that
    // the middleware already validated.
    const creatorToken = c.req.header('X-Creator-Token') ?? '';
    const returnBase = `${webBase}/e/${event.slug}/manage?token=${encodeURIComponent(creatorToken)}`;

    try {
      const session = await createCheckoutSession(c.env, {
        priceId,
        successUrl: `${returnBase}&upgraded=1`,
        cancelUrl: `${returnBase}&canceled=1`,
        clientReferenceId: event.id,
        // tier travels on the Session so the webhook can persist it even if
        // `line_items` isn't expanded on the checkout.session.completed event.
        metadata: { event_id: event.id, event_slug: event.slug, tier, currency },
        customerEmail: event.creatorEmail,
      });
      return c.json({ url: session.url });
    } catch (err) {
      if (err instanceof StripeNotConfiguredError) {
        throw new DomainError(
          'stripe.not_configured',
          'Stripe is not configured for this environment',
          503,
        );
      }
      if (err instanceof StripeApiError) {
        c.var.logger.warn('stripe_checkout_failed', { status: err.status, body: err.body });
        throw new DomainError('stripe.api_error', 'Stripe rejected the checkout request', 502);
      }
      throw err;
    }
  },
);
