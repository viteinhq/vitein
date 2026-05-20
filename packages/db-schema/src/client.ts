import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { schema } from './schema.js';

/**
 * Drizzle client bound to the full schema.
 *
 * The Core API Worker connects through Cloudflare Hyperdrive: Hyperdrive
 * speaks the Postgres wire protocol and pools connections at the edge, so
 * the Worker hands it a plain connection string. See ADR 0008 — this
 * replaced the Neon HTTP `/sql` driver, whose endpoint was being
 * edge-blocked under load.
 *
 * The wire-protocol driver is NOT stateless: every `openDb` owns a `pg`
 * pool that the caller must `close()` when the request or invocation
 * finishes (e.g. via `ctx.waitUntil`).
 */
export type Db = NodePgDatabase<typeof schema>;

export interface DbHandle {
  db: Db;
  /** Drain the underlying pool. Call once per request/invocation. */
  close(): Promise<void>;
}

export function openDb(connectionString: string): DbHandle {
  const pool = new pg.Pool({ connectionString, max: 5 });
  const db = drizzle(pool, { schema, casing: 'snake_case' });
  return {
    db,
    close: async () => {
      await pool.end();
    },
  };
}
