import { sql } from '@vitein/db-schema';
import { Hono } from 'hono';
import { db } from '../infra/db.js';
import type { AppVariables, Env } from '../types/env.js';

type DbStatus = 'connected' | 'unavailable' | 'error';

export const healthRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

healthRoute.get('/', async (c) => {
  const dbStatus = await pingDb(c.env);
  return c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT,
    db: dbStatus,
    ts: new Date().toISOString(),
  });
});

async function pingDb(env: Env): Promise<DbStatus> {
  if (!env.DATABASE_URL) return 'unavailable';
  try {
    await db(env).execute(sql`select 1`);
    return 'connected';
  } catch {
    return 'error';
  }
}
