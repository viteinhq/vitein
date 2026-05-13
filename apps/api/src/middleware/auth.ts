import { verifyAccessToken } from 'better-auth/oauth2';
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
 *   2. `Authorization: Bearer <jwt>` (OAuth 2.1 access token — Phase 2).
 *   3. Better-Auth session cookie (user).
 *   4. Anonymous.
 *
 * Creator tokens win over sessions so signed-in users can still hold a
 * creator link for an event that was anonymously created with a different
 * email — the token represents direct proof-of-creation. OAuth bearer
 * comes before the cookie path so an OAuth client that happens to share a
 * browser cookie with the user resolves with scoped permissions, not full
 * session-level `'*'`.
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

  const bearer = extractBearer(c.req.header('Authorization'));
  if (bearer) {
    const oauth = await resolveOAuthBearer(c.env, bearer);
    if (oauth) {
      c.set('auth', oauth);
      await next();
      return;
    }
    // Bearer present but invalid — fall through to anonymous rather than
    // also probing the cookie. Mixing bearer-and-cookie auth would let a
    // failed OAuth client silently fall back to the user's full session.
    c.set('auth', anonymous());
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

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer (.+)$/i.exec(header.trim());
  return match?.[1] ?? null;
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

/**
 * Verify an OAuth 2.1 JWT access token against our own JWKS endpoint.
 *
 * The JWT is signed by Better-Auth's `jwt` plugin, served via the
 * `/v1/auth/jwks` endpoint of the same Worker that just received the
 * request. Workers can call their own hostname (Cloudflare wires up the
 * loop transparently). `verifyAccessToken` caches the JWKS internally.
 *
 * Extracts userId from `sub`, scopes from the space-delimited `scope`
 * claim, and the issuing client from `client_id`. Returns null on any
 * verification failure — caller falls through to anonymous.
 */
async function resolveOAuthBearer(env: Env, token: string): Promise<AuthContext | null> {
  if (!env.DATABASE_URL || !env.AUTH_SECRET) return null;

  const apiBaseURL = deriveApiBaseURL(env);

  try {
    const payload = await verifyAccessToken(token, {
      verifyOptions: { issuer: apiBaseURL, audience: apiBaseURL },
      jwksUrl: `${apiBaseURL}/v1/auth/jwks`,
    });

    const userId = typeof payload.sub === 'string' ? payload.sub : null;
    if (!userId) return null;

    const scopeClaim = payload['scope'];
    const scopes: readonly string[] =
      typeof scopeClaim === 'string'
        ? scopeClaim.split(' ').filter(Boolean)
        : Array.isArray(scopeClaim)
          ? scopeClaim.filter((s): s is string => typeof s === 'string')
          : [];

    const clientId =
      typeof payload['client_id'] === 'string' ? payload['client_id'] : 'unknown_client';

    return { kind: 'oauth', userId, clientId, scopes };
  } catch (err) {
    rootLogger.warn('oauth_token_verify_failed', { err: err as Error });
    return null;
  }
}

function deriveApiBaseURL(env: Env): string {
  if (env.ENVIRONMENT === 'production') return 'https://api.vite.in';
  if (env.ENVIRONMENT === 'staging') return 'https://api-staging.vite.in';
  return 'http://localhost:8787';
}
