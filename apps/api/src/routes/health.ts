import { sql } from '@vitein/db-schema';
import { type Context, Hono } from 'hono';
import { db, dbConnectionString } from '../infra/db.js';
import type { AppVariables, Env } from '../types/env.js';

type DbStatus = 'connected' | 'unavailable' | 'error';

export const healthRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

healthRoute.get('/', async (c) => {
  return c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT,
    db: await pingDb(c),
    ts: new Date().toISOString(),
    buildSha: c.env.BUILD_SHA ?? null,
    buildStamp: c.env.BUILD_STAMP ?? null,
  });
});

async function pingDb(c: Context<{ Bindings: Env; Variables: AppVariables }>): Promise<DbStatus> {
  if (!dbConnectionString(c.env)) return 'unavailable';
  try {
    await db(c).execute(sql`select 1`);
    return 'connected';
  } catch (err) {
    c.var.logger.warn('health_db_ping_failed', { err: err as Error });
    return 'error';
  }
}
