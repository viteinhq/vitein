import { createMiddleware } from 'hono/factory';
import { DomainError } from '../domain/errors.js';
import type { AppVariables, Env } from '../types/env.js';

interface BucketDecision {
  key: string;
  limit: number;
}

/**
 * Per-minute budgets, split read vs write. Numbers mirror ARCHITECTURE §7.4 —
 * tune after Phase 1 load tests. OAuth and api_key actors arrive in P2/P3;
 * their buckets are added when those auth kinds exist.
 */
const LIMITS = {
  anonymous: { read: 100, write: 20 },
  creator: { read: 300, write: 60 },
  user: { read: 600, write: 120 },
} as const;

export const rateLimit = createMiddleware<{
  Bindings: Env;
  Variables: AppVariables;
}>(async (c, next) => {
  if (!c.env.RATE_LIMITER) {
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
    case 'anonymous':
    default: {
      const ip = c.req.raw.headers.get('cf-connecting-ip') ?? 'unknown';
      return { key: `ip:${ip}:${op}`, limit: LIMITS.anonymous[op] };
    }
  }
}
