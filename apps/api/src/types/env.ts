/**
 * Typed bindings for the Cloudflare Worker environment.
 *
 * Keep this in sync with `wrangler.toml`. If you add a binding there, add it
 * here too — otherwise TypeScript will silently let you read `undefined`.
 */
export interface Env {
  // Vars (wrangler.toml [vars] / [env.*.vars])
  ENVIRONMENT: 'dev' | 'staging' | 'production';
  /** Short git SHA of the deployed commit, injected by CI via `--var BUILD_SHA:...`. */
  BUILD_SHA?: string;
  /** ISO-minute UTC timestamp recorded at deploy time. */
  BUILD_STAMP?: string;

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

  // Stripe (Phase 1 premium upgrade — two tiers × four currencies = 8 Price IDs)
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  /** Stripe Price IDs per tier per currency. One maps to each `Price` on the tier's Product. */
  STRIPE_PRICE_BASIC_EUR?: string;
  STRIPE_PRICE_BASIC_USD?: string;
  STRIPE_PRICE_BASIC_CHF?: string;
  STRIPE_PRICE_BASIC_GBP?: string;
  STRIPE_PRICE_PLUS_EUR?: string;
  STRIPE_PRICE_PLUS_USD?: string;
  STRIPE_PRICE_PLUS_CHF?: string;
  STRIPE_PRICE_PLUS_GBP?: string;
  // Phase 1.5 — India PPP (ARCHITECTURE §12.4).
  STRIPE_PRICE_BASIC_INR?: string;
  STRIPE_PRICE_PLUS_INR?: string;

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
