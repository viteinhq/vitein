import * as Sentry from '@sentry/cloudflare';
import { createMiddleware } from 'hono/factory';
import { uuidv7 } from 'uuidv7';
import { createLogger } from '../infra/logger.js';
import type { AppVariables, Env } from '../types/env.js';

/**
 * Stamp every request with a request id, attach a per-request structured
 * logger, and echo the id back as `X-Request-Id`.
 *
 * Accepts an inbound `X-Request-Id` so callers (e.g. the web app) can
 * propagate a single id across the request chain; otherwise we mint a
 * UUIDv7 — the leading 48 bits are the timestamp, which is convenient for
 * log correlation.
 */
export const requestId = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  const inbound = c.req.header('x-request-id');
  const id = inbound && isWellFormed(inbound) ? inbound : uuidv7();

  c.set('requestId', id);
  c.set('logger', createLogger({ requestId: id, env: c.env.ENVIRONMENT }));

  Sentry.getCurrentScope().setTag('request_id', id);

  c.header('X-Request-Id', id);
  await next();
});

const WELL_FORMED = /^[A-Za-z0-9._-]{1,128}$/;
function isWellFormed(value: string): boolean {
  return WELL_FORMED.test(value);
}
