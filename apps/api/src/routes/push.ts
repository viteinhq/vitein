import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthContext } from '../domain/auth/context.js';
import { UnauthorizedError, ValidationError } from '../domain/errors.js';
import {
  deletePushSubscription,
  type PushBinding,
  refreshPushSubscription,
  registerPushSubscription,
} from '../domain/push/push.js';
import { db } from '../infra/db.js';
import type { AppVariables, Env } from '../types/env.js';

export const pushRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

/** Public — the browser needs this key to subscribe to push. */
pushRoute.get('/vapid-key', (c) => {
  const key = c.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return c.json(
      { error: { code: 'push.not_configured', message: 'Web Push is not configured' } },
      503,
    );
  }
  return c.json({ key });
});

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

pushRoute.post(
  '/subscriptions',
  zValidator('json', subscriptionSchema, (r) => {
    if (!r.success) {
      throw new ValidationError('Invalid push subscription', { issues: r.error.issues });
    }
  }),
  async (c) => {
    const input = c.req.valid('json');
    await registerPushSubscription(db(c), {
      binding: bindingFor(c.var.auth),
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
    });
    return c.body(null, 204);
  },
);

/**
 * Public — no auth. A rotated subscription is re-bound by its old
 * endpoint: the service worker fires `pushsubscriptionchange` without
 * access to a creator token or session, so the unguessable old endpoint
 * URL is the capability. See `refreshPushSubscription`.
 */
pushRoute.post(
  '/subscriptions/refresh',
  zValidator(
    'json',
    z.object({ oldEndpoint: z.string().url(), ...subscriptionSchema.shape }),
    (r) => {
      if (!r.success) {
        throw new ValidationError('Invalid push subscription', { issues: r.error.issues });
      }
    },
  ),
  async (c) => {
    const input = c.req.valid('json');
    await refreshPushSubscription(db(c), {
      oldEndpoint: input.oldEndpoint,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
    });
    return c.body(null, 204);
  },
);

pushRoute.delete(
  '/subscriptions',
  zValidator('json', z.object({ endpoint: z.string().url() }), (r) => {
    if (!r.success) throw new ValidationError('Invalid request body', { issues: r.error.issues });
  }),
  async (c) => {
    bindingFor(c.var.auth); // require user or creator auth
    await deletePushSubscription(db(c), c.req.valid('json').endpoint);
    return c.body(null, 204);
  },
);

/**
 * Derive the subscription's owner from the request's auth context: a
 * signed-in user (session or OAuth) binds to their account, an anonymous
 * creator binds to their event. Anonymous callers are rejected.
 */
function bindingFor(auth: AuthContext): PushBinding {
  if (auth.kind === 'user' || auth.kind === 'oauth') return { userId: auth.userId };
  if (auth.kind === 'creator') return { eventId: auth.eventId };
  throw new UnauthorizedError(
    'push.unauthorized',
    'Sign in or use a creator link to manage notifications',
  );
}
