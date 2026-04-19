import * as Sentry from '@sentry/cloudflare';
import { Hono } from 'hono';
import { runScheduled } from './cron.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { rateLimit } from './middleware/rate-limit.js';
import { authRoute } from './routes/auth.js';
import { claimRoute } from './routes/claim.js';
import { eventsRoute } from './routes/events.js';
import { healthRoute } from './routes/health.js';
import { usersRoute } from './routes/users.js';
import { sentryOptions } from './infra/sentry.js';
import type { AppVariables, Env } from './types/env.js';

export { RateLimiter } from './infra/rate-limiter.js';

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Auth middleware runs first so every handler can read c.var.auth.
app.use('*', authMiddleware);

// Rate limiting per resolved auth context. Skipped in environments without
// the RATE_LIMITER binding (local dev unless wired up).
app.use('*', rateLimit);

// /v1/auth/claim is ours (needs c.var.auth) and must match BEFORE the
// Better-Auth catch-all below swallows everything under /v1/auth.
app.route('/v1/auth/claim', claimRoute);
app.route('/v1/auth', authRoute);

app.route('/v1/health', healthRoute);
app.route('/v1/events', eventsRoute);
app.route('/v1/users', usersRoute);

app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Route not found' } }, 404));

app.onError(errorHandler);

const handler: ExportedHandler<Env> = {
  fetch: app.fetch,
  scheduled(_event, env, ctx) {
    ctx.waitUntil(runScheduled(env));
  },
};

export default Sentry.withSentry(sentryOptions, handler);
