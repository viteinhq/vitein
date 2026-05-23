import { eq, users } from '@vitein/db-schema';
import { createMiddleware } from 'hono/factory';
import { DomainError, UnauthorizedError } from '../domain/errors.js';
import { db } from '../infra/db.js';
import type { AppVariables, Env } from '../types/env.js';

/**
 * Gate the request behind the `ADMIN_EMAILS` allowlist. Runs after the
 * global auth middleware; treats anything other than a signed-in user as
 * unauthorized, then resolves the user's email and checks it against the
 * env var (comma-separated, case-insensitive). OAuth tokens are not
 * accepted — admin actions need a real interactive session.
 *
 * On match, the resolved email is stashed on `c.var.adminEmail` so the
 * route handler can use it (e.g. for the `grantedByUserId` audit fields)
 * without a second lookup.
 */
export const requireAdmin = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  const auth = c.var.auth;
  if (auth.kind !== 'user') {
    throw new UnauthorizedError('admin.unauthorized', 'Admin access requires a signed-in session');
  }

  const allowlist = parseAllowlist(c.env.ADMIN_EMAILS);
  if (allowlist.length === 0) {
    throw new DomainError('admin.not_configured', 'Admin access is not configured', 403);
  }

  const [row] = await db(c)
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, auth.userId))
    .limit(1);

  const email = row?.email?.toLowerCase() ?? null;
  if (!email || !allowlist.includes(email)) {
    throw new DomainError('admin.forbidden', 'Not an admin', 403);
  }

  c.set('adminEmail', email);
  await next();
});

function parseAllowlist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
