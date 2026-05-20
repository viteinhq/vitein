import type { MiddlewareHandler } from 'hono';
import { dbConnectionString } from '../infra/db.js';
import type { AppVariables, Env } from '../types/env.js';

/**
 * Installs the per-request database holder. The `pg` connection pool is
 * opened lazily — only if a handler actually calls `db()` — and drained
 * after the request via `waitUntil`, so the response is never delayed by
 * pool teardown. See ADR 0008.
 */
export const dbMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (
  c,
  next,
) => {
  c.set('dbHolder', {
    connectionString: dbConnectionString(c.env),
    handle: undefined,
  });
  try {
    await next();
  } finally {
    const { handle } = c.get('dbHolder');
    if (handle) c.executionCtx.waitUntil(handle.close());
  }
};
