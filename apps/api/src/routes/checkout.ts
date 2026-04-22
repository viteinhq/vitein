import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { getEventForCreator } from '../domain/events/events.js';
import { ConflictError, DomainError, ValidationError } from '../domain/errors.js';
import { db } from '../infra/db.js';
import {
  createCheckoutSession,
  priceIdForCurrency,
  StripeApiError,
  StripeNotConfiguredError,
} from '../infra/stripe.js';
import { requireCreator } from '../middleware/require-creator.js';
import type { AppVariables, Env } from '../types/env.js';

export const checkoutRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const checkoutInputSchema = z.object({
  currency: z.enum(['EUR', 'USD', 'CHF', 'GBP']).optional(),
});

const idSchema = z.object({ id: z.string().uuid() });

/**
 * Creator-authed. Creates a Stripe Checkout Session for the current event
 * and returns its hosted URL. The client redirects the creator to that URL;
 * the event is only marked paid when the webhook fires.
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
    const { currency = 'EUR' } = c.req.valid('json');

    const event = await getEventForCreator(db(c.env), id);
    if (event.isPaid) {
      throw new ConflictError('event.already_paid', 'Event is already premium');
    }

    const priceId = priceIdForCurrency(c.env, currency);
    if (!priceId) {
      throw new DomainError(
        'stripe.price_not_configured',
        `No Stripe Price configured for ${currency}`,
        503,
      );
    }

    const webBase = c.env.WEB_BASE_URL ?? 'https://vite.in';
    // Creator auth rides on the X-Creator-Token header; we need the plain
    // token back on the return URLs so the /manage page can re-authenticate
    // the creator after the Stripe round-trip. We read it from the header
    // that the middleware already validated.
    const creatorToken = c.req.header('X-Creator-Token') ?? '';
    const returnBase = `${webBase}/e/${event.slug}/manage?token=${encodeURIComponent(creatorToken)}`;

    try {
      const session = await createCheckoutSession(c.env, {
        priceId,
        successUrl: `${returnBase}&upgraded=1`,
        cancelUrl: `${returnBase}&canceled=1`,
        clientReferenceId: event.id,
        metadata: { event_id: event.id, event_slug: event.slug },
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
