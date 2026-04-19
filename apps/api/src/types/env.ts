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

  // Bindings added later (KV, R2, Queues, DO, DB) go here:
  // KV_CACHE: KVNamespace;
  // R2_MEDIA: R2Bucket;
  // QUEUE_EMAIL: Queue;
  // RATE_LIMITER: DurableObjectNamespace;
  // DATABASE_URL: string;
}

export type AppVariables = {
  requestId: string;
};
