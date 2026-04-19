import { createMiddleware } from 'hono/factory';
import { UnauthorizedError } from '../domain/errors.js';
import type { AppVariables, Env } from '../types/env.js';

/**
 * Short-circuits with 401 unless the resolved auth context is `user`
 * (a signed-in Better-Auth session). Mount per-route after the global
 * auth middleware.
 */
export const requireUser = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  if (c.var.auth.kind !== 'user') {
    throw new UnauthorizedError('user.unauthorized', 'Sign-in required');
  }
  await next();
});
