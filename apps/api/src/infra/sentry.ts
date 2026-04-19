import type * as Sentry from '@sentry/cloudflare';
import type { Env } from '../types/env.js';

/**
 * Build the Sentry options object used by `withSentry`. Runs on every request.
 * If SENTRY_DSN is not set (e.g. local dev without a DSN), Sentry becomes a
 * no-op — it will not send events but will not throw either.
 */
export function sentryOptions(env: Env): Sentry.CloudflareOptions {
  const base = {
    environment: env.ENVIRONMENT,
    tracesSampleRate: env.ENVIRONMENT === 'production' ? 0.1 : 1.0,
    sendDefaultPii: false,
  };
  return env.SENTRY_DSN ? { ...base, dsn: env.SENTRY_DSN } : base;
}
