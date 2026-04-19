import * as Sentry from '@sentry/cloudflare';
import { Hono } from 'hono';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { authRoute } from './routes/auth.js';
import { eventsRoute } from './routes/events.js';
import { healthRoute } from './routes/health.js';
import { sentryOptions } from './infra/sentry.js';
import type { AppVariables, Env } from './types/env.js';

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// Better-Auth owns its own routing and must run before our own auth
// middleware (its endpoints produce sessions; auth context for them is
// by definition anonymous on entry).
app.route('/v1/auth', authRoute);

app.use('*', authMiddleware);

app.route('/v1/health', healthRoute);
app.route('/v1/events', eventsRoute);

app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Route not found' } }, 404));

app.onError(errorHandler);

const handler: ExportedHandler<Env> = {
  fetch: app.fetch,
};

export default Sentry.withSentry(sentryOptions, handler);
