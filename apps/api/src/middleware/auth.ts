import { and, eq, eventTokens } from '@vitein/db-schema';
import type { MiddlewareHandler } from 'hono';
import type { AuthContext } from '../domain/auth/context.js';
import { hashToken } from '../domain/auth/tokens.js';
import { db } from '../infra/db.js';
import type { AppVariables, Env } from '../types/env.js';

/**
 * Resolve the request's authentication context and stash it on `c.var.auth`.
 *
 * Currently handles `X-Creator-Token` (Phase 1). User sessions, OAuth, and
 * API keys will be layered on as Better-Auth and the OAuth server come
 * online (Tasks 0.9 full scope + Phase 2).
 */
export const authMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: AppVariables;
}> = async (c, next) => {
  const creatorToken = c.req.header('X-Creator-Token');
  const ctx = creatorToken ? await resolveCreatorToken(c.env, creatorToken) : anonymous();
  c.set('auth', ctx);
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
