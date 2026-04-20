import { and, eq, eventTokens } from '@vitein/db-schema';
import type { MiddlewareHandler } from 'hono';
import type { AuthContext } from '../domain/auth/context.js';
import { hashToken } from '../domain/auth/tokens.js';
import { createAuth } from '../infra/auth.js';
import { db } from '../infra/db.js';
import { rootLogger } from '../infra/logger.js';
import type { AppVariables, Env } from '../types/env.js';

/**
 * Resolve the request's authentication context and stash it on `c.var.auth`.
 *
 * Precedence:
 *   1. `X-Creator-Token` header (creator).
 *   2. Better-Auth session cookie / bearer (user).
 *   3. Anonymous.
 *
 * Creator tokens win over sessions so signed-in users can still hold a
 * creator link for an event that was anonymously created with a different
 * email — the token represents direct proof-of-creation.
 */
export const authMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: AppVariables;
}> = async (c, next) => {
  const creatorToken = c.req.header('X-Creator-Token');
  if (creatorToken) {
    c.set('auth', await resolveCreatorToken(c.env, creatorToken));
    await next();
    return;
  }

  const userAuth = await resolveUserSession(c.env, c.req.raw);
  c.set('auth', userAuth ?? anonymous());
  await next();
};

function anonymous(): AuthContext {
  return { kind: 'anonymous' };
}

async function resolveCreatorToken(env: Env, token: string): Promise<AuthContext> {
  if (!env.DATABASE_URL) return anonymous();

  const hash = await hashToken(token);
  const [row] = await db(env)
    .select({
      id: eventTokens.id,
      eventId: eventTokens.eventId,
      expiresAt: eventTokens.expiresAt,
      revokedAt: eventTokens.revokedAt,
    })
    .from(eventTokens)
    .where(and(eq(eventTokens.tokenHash, hash), eq(eventTokens.purpose, 'manage')))
    .limit(1);

  if (!row || row.revokedAt) return anonymous();
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return anonymous();

  return { kind: 'creator', eventId: row.eventId, tokenId: row.id };
}

async function resolveUserSession(env: Env, request: Request): Promise<AuthContext | null> {
  if (!env.DATABASE_URL || !env.AUTH_SECRET) return null;
  try {
    const auth = createAuth(env);
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user.id) return null;
    return { kind: 'user', userId: session.user.id, scopes: ['*'] };
  } catch (err) {
    rootLogger.warn('auth_get_session_failed', { err: err as Error });
    return null;
  }
}
