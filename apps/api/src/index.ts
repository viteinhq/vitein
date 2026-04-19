import * as Sentry from '@sentry/cloudflare';
import { Hono } from 'hono';
import { healthRoute } from './routes/health.js';
import { sentryOptions } from './infra/sentry.js';
import type { AppVariables, Env } from './types/env.js';

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.route('/v1/health', healthRoute);

app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Route not found' } }, 404));

app.onError((err, c) => {
  Sentry.captureException(err);
  return c.json({ error: { code: 'internal_error', message: 'Internal server error' } }, 500);
});

const handler: ExportedHandler<Env> = {
  fetch: app.fetch,
};

export default Sentry.withSentry(sentryOptions, handler);
