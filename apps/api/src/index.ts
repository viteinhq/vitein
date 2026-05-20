import { oauthProviderAuthServerMetadata } from '@better-auth/oauth-provider';
import * as Sentry from '@sentry/cloudflare';
import { Hono } from 'hono';
import { runScheduled } from './cron.js';
import { createAuth } from './infra/auth.js';
import { db } from './infra/db.js';
import { consumeEmailBatch } from './infra/email.js';
import type { EmailJob } from './infra/email-types.js';
import { authMiddleware } from './middleware/auth.js';
import { dbMiddleware } from './middleware/db.js';
import { errorHandler } from './middleware/error.js';
import { rateLimit } from './middleware/rate-limit.js';
import { requestId } from './middleware/request-id.js';
import { authRoute } from './routes/auth.js';
import { claimRoute } from './routes/claim.js';
import { eventsRoute } from './routes/events.js';
import { healthRoute } from './routes/health.js';
import { usersRoute } from './routes/users.js';
import { stripeWebhookRoute } from './routes/webhooks/stripe.js';
import { sentryOptions } from './infra/sentry.js';
import type { AppVariables, Env } from './types/env.js';

export { RateLimiter } from './infra/rate-limiter.js';

export const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Tag every request with an id + per-request structured logger before
// anything else can log.
app.use('*', requestId);

// Install the per-request DB holder before anything that may query —
// auth middleware included.
app.use('*', dbMiddleware);

// Auth middleware runs next so every handler can read c.var.auth.
app.use('*', authMiddleware);

// Rate limiting per resolved auth context. Skipped in environments without
// the RATE_LIMITER binding (local dev unless wired up).
app.use('*', rateLimit);

// RFC 8414 canonical discovery: clients build the URL by taking the
// issuer's authority, prepending `/.well-known/oauth-authorization-server`,
// and appending the issuer path. Our issuer is `<host>/v1/auth`, so the
// canonical URL is `<host>/.well-known/oauth-authorization-server/v1/auth`.
// Better-Auth's plugin also serves the doc at `<issuer>/.well-known/...`,
// but the MCP Inspector and most spec-conformant clients hit the RFC 8414
// form — we expose it here. Same handler powers both.
app.get('/.well-known/oauth-authorization-server/v1/auth', async (c) => {
  const auth = createAuth(c.env, db(c));
  const handler = oauthProviderAuthServerMetadata(auth);
  return handler(c.req.raw);
});

// /v1/auth/claim is ours (needs c.var.auth) and must match BEFORE the
// Better-Auth catch-all below swallows everything under /v1/auth.
app.route('/v1/auth/claim', claimRoute);
app.route('/v1/auth', authRoute);

app.route('/v1/health', healthRoute);
app.route('/v1/events', eventsRoute);
app.route('/v1/users', usersRoute);
app.route('/v1/webhooks/stripe', stripeWebhookRoute);

app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Route not found' } }, 404));

app.onError(errorHandler);

const handler: ExportedHandler<Env, EmailJob> = {
  fetch: app.fetch,
  scheduled(_event, env, ctx) {
    ctx.waitUntil(runScheduled(env));
  },
  async queue(batch, env) {
    await consumeEmailBatch(batch, env);
  },
};

// `withSentry` is typed for the generic `ExportedHandler<Env>`; our handler
// narrows the queue message to `EmailJob`. The wrapper only forwards the
// batch, so widening it back at this boundary is sound.
export default Sentry.withSentry(sentryOptions, handler as ExportedHandler<Env>);
