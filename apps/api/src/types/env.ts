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
  /**
   * Direct Postgres connection string. Used in local dev and by
   * `drizzle-kit`. In deployed environments the Worker connects through
   * `HYPERDRIVE` instead — see ADR 0008.
   */
  DATABASE_URL?: string;
  /**
   * Cloudflare Hyperdrive binding — pools the Postgres connection at the
   * edge over the wire protocol. Bound on staging + production; absent in
   * local dev, where the Worker falls back to `DATABASE_URL`.
   */
  HYPERDRIVE?: Hyperdrive;
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

  /**
   * Email delivery queue. Bound on staging + production; absent in local
   * dev, where `infra/email.ts` falls back to a synchronous Resend call.
   */
  QUEUE_EMAIL?: Queue<EmailJob>;
  /** Web Push delivery queue — consumer sends to push_subscriptions. */
  QUEUE_PUSH?: Queue<PushJob>;

  /**
   * VAPID keypair for Web Push. The public key is non-secret (handed to
   * browsers as the applicationServerKey) and lives in wrangler vars; the
   * private key signs the VAPID JWT and is a `wrangler secret`.
   */
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;

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

  // Bindings added later go here:
  // KV_CACHE: KVNamespace;
  // QUEUE_PUSH: Queue — added with the PWA Web Push stage.
}

import type { AuthContext } from '../domain/auth/context.js';
import type { DbHolder } from '../infra/db.js';
import type { EmailJob } from '../infra/email-types.js';
import type { Logger } from '../infra/logger.js';
import type { PushJob } from '../infra/push-types.js';

export type AppVariables = {
  requestId: string;
  logger: Logger;
  auth: AuthContext;
  dbHolder: DbHolder;
};
