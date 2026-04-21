/**
 * Typed bindings for the Cloudflare Worker environment.
 *
 * Keep this in sync with `wrangler.toml`. If you add a binding there, add it
 * here too — otherwise TypeScript will silently let you read `undefined`.
 */
export interface Env {
  // Vars (wrangler.toml [vars] / [env.*.vars])
  ENVIRONMENT: 'dev' | 'staging' | 'production';

  // Secrets (set via `wrangler secret put ...`)
  SENTRY_DSN?: string;
  DATABASE_URL?: string;
  RESEND_API_KEY?: string;
  WEB_BASE_URL?: string;
  /**
   * Required for Better-Auth session signing. Generate once per environment
   * with `openssl rand -hex 32` and store via `wrangler secret put AUTH_SECRET`.
   */
  AUTH_SECRET?: string;

  RATE_LIMITER?: DurableObjectNamespace;
  R2_MEDIA?: R2Bucket;
  /** Base URL where R2 objects become publicly readable, e.g. https://media-staging.vite.in */
  MEDIA_PUBLIC_BASE_URL?: string;

  // Bindings added later (KV, Queues) go here:
  // KV_CACHE: KVNamespace;
  // QUEUE_EMAIL: Queue;
}

import type { AuthContext } from '../domain/auth/context.js';
import type { Logger } from '../infra/logger.js';

export type AppVariables = {
  requestId: string;
  logger: Logger;
  auth: AuthContext;
};
