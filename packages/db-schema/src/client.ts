import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { schema } from './schema.js';

/**
 * Build a Drizzle client bound to the Neon HTTP driver and the full schema.
 *
 * The HTTP driver is the right choice from Cloudflare Workers: each query is
 * a single HTTPS round-trip, so there are no connection pools to manage and
 * no per-isolate state to worry about. If you need transactions spanning
 * multiple statements, use `@neondatabase/serverless`'s `neonConfig.transport`
 * or migrate to the WebSocket driver.
 */
export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema, casing: 'snake_case' });
}

export type Db = ReturnType<typeof createDb>;
