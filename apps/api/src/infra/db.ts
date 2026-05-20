import { openDb, type Db, type DbHandle } from '@vitein/db-schema';
import type { Context } from 'hono';
import type { AppVariables, Env } from '../types/env.js';

/**
 * Per-request database holder. `dbMiddleware` puts one on every request's
 * context; the `pg` pool is opened lazily on the first `db()` call and
 * drained after the request. See ADR 0008.
 */
export interface DbHolder {
  connectionString: string | undefined;
  handle: DbHandle | undefined;
}

/**
 * Resolve the Postgres connection string. Deployed environments connect
 * through the Hyperdrive binding; local dev falls back to `DATABASE_URL`.
 */
export function dbConnectionString(env: Env): string | undefined {
  return env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
}

/**
 * The Drizzle client for the current request. Opens the connection pool on
 * first use; `dbMiddleware` drains it once the request finishes.
 */
export function db(c: Context<{ Bindings: Env; Variables: AppVariables }>): Db {
  const holder = c.get('dbHolder');
  if (!holder) throw new Error('dbMiddleware did not run before db() was called');
  if (!holder.connectionString) throw new Error('No database connection is configured');
  holder.handle ??= openDb(holder.connectionString);
  return holder.handle.db;
}

/**
 * Run `fn` with a database client outside the request lifecycle — for the
 * cron and queue handlers, which own their own `ExecutionContext`. The pool
 * is drained once `fn` settles.
 */
export async function withDb<T>(env: Env, fn: (db: Db) => Promise<T>): Promise<T> {
  const connectionString = dbConnectionString(env);
  if (!connectionString) throw new Error('No database connection is configured');
  const handle = openDb(connectionString);
  try {
    return await fn(handle.db);
  } finally {
    await handle.close();
  }
}
