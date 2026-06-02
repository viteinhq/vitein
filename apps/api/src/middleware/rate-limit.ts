import { createMiddleware } from 'hono/factory';
import { DomainError } from '../domain/errors.js';
import type { AppVariables, Env } from '../types/env.js';

interface BucketDecision {
  key: string;
  limit: number;
}

/**
 * Per-minute budgets, split read vs write. Numbers mirror ARCHITECTURE §7.4 —
 * tune after Phase 1 load tests. OAuth agents get the same budget as creator
 * tokens; api_key (Phase 3) is added when that auth kind exists.
 */
const LIMITS = {
  anonymous: { read: 100, write: 20 },
  creator: { read: 300, write: 60 },
  user: { read: 600, write: 120 },
  oauth: { read: 300, write: 60 },
} as const;

export const rateLimit = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  if (!c.env.RATE_LIMITER) {
    // Never silently disable the only abuse control in a real environment.
    // In dev (no DO binding locally) we warn and continue; in staging/prod a
    // missing binding is a deploy fault and we fail closed rather than serve
    // unlimited traffic.
    const environment = c.env.ENVIRONMENT;
    if (environment === 'production' || environment === 'staging') {
      c.var.logger.error('rate_limiter_binding_missing', { environment });
      throw new DomainError(
        'rate_limiter_unavailable',
        'Rate limiting is temporarily unavailable',
        503,
      );
    }
    c.var.logger.warn('rate_limiter_binding_missing');
    await next();
    return;
  }

  const decision = bucketFor(c);
  const id = c.env.RATE_LIMITER.idFromName(decision.key);
  const stub = c.env.RATE_LIMITER.get(id);
  const response = await stub.fetch(`https://rl/check?limit=${String(decision.limit)}`);
  const verdict: { allowed: boolean; remaining: number; retryAfter: number } =
    await response.json();

  c.header('X-RateLimit-Limit', String(decision.limit));
  c.header('X-RateLimit-Remaining', String(verdict.remaining));

  if (!verdict.allowed) {
    c.header('Retry-After', String(verdict.retryAfter));
    throw new DomainError('rate_limited', 'Too many requests', 429);
  }

  await next();
});

function bucketFor(c: {
  var: { auth: AppVariables['auth'] };
  req: { raw: Request; method: string };
}): BucketDecision {
  const isWrite = c.req.method !== 'GET' && c.req.method !== 'HEAD';
  const op: 'read' | 'write' = isWrite ? 'write' : 'read';
  const auth = c.var.auth;
  switch (auth.kind) {
    case 'creator':
      return { key: `creator:${auth.eventId}:${op}`, limit: LIMITS.creator[op] };
    case 'user':
      return { key: `user:${auth.userId}:${op}`, limit: LIMITS.user[op] };
    case 'oauth':
      // Per (user, client) so one connected app can't drain another's budget,
      // and agents get a dedicated bucket rather than the shared IP one.
      return { key: `oauth:${auth.userId}:${auth.clientId}:${op}`, limit: LIMITS.oauth[op] };
    case 'anonymous':
    default: {
      const ip = c.req.raw.headers.get('cf-connecting-ip') ?? 'unknown';
      return { key: `ip:${ip}:${op}`, limit: LIMITS.anonymous[op] };
    }
  }
}
