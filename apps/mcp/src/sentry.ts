import type * as Sentry from '@sentry/cloudflare';
import type { Env } from './types.js';

/** Mirror apps/api's pattern — conditional DSN so local dev is a no-op. */
export function sentryOptions(env: Env): Sentry.CloudflareOptions {
  const base = {
    environment: env.ENVIRONMENT,
    tracesSampleRate: env.ENVIRONMENT === 'production' ? 0.1 : 1.0,
    sendDefaultPii: false,
  };
  return env.SENTRY_DSN ? { ...base, dsn: env.SENTRY_DSN } : base;
}
