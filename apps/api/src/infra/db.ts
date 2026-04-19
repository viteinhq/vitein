import { createDb, type Db } from '@vitein/db-schema';
import type { Env } from '../types/env.js';

/**
 * Build a Drizzle client for the current request.
 *
 * Neon's HTTP driver is stateless — there are no connection pools to hold
 * onto, so we can build a fresh client per request without overhead.
 */
export function db(env: Env): Db {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  return createDb(env.DATABASE_URL);
}
