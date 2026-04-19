import { Hono } from 'hono';
import { createAuth } from '../infra/auth.js';
import type { AppVariables, Env } from '../types/env.js';

/**
 * Mount Better-Auth's router at `/v1/auth/*`. Better-Auth owns all the
 * routing underneath (sign-in, sign-out, magic-link, session, OAuth callbacks
 * once providers are added).
 *
 * We do not enforce auth on these paths via our own middleware — they are
 * the paths that _produce_ auth. But the auth middleware still runs so
 * request logging / Sentry tags can see "kind: anonymous".
 */
export const authRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

authRoute.all('/*', async (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});
