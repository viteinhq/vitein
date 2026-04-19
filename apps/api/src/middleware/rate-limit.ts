import { createMiddleware } from 'hono/factory';
import { DomainError } from '../domain/errors.js';
import type { AppVariables, Env } from '../types/env.js';

interface BucketDecision {
  key: string;
  limit: number;
}

/**
 * Default rate limits per minute, per-bucket. The bucket is derived from
 * the resolved auth context — anonymous traffic gets the lowest budget,
 * users the highest. These numbers are first-pass; tune after Phase 1
 * load tests.
 */
const LIMITS = {
  anonymous: 60,
  creator: 300,
  user: 600,
};

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
  req: { raw: Request };
}): BucketDecision {
  const auth = c.var.auth;
  switch (auth.kind) {
    case 'creator':
      return { key: `creator:${auth.eventId}`, limit: LIMITS.creator };
    case 'user':
      return { key: `user:${auth.userId}`, limit: LIMITS.user };
    case 'anonymous':
    default: {
      const ip = c.req.raw.headers.get('cf-connecting-ip') ?? 'unknown';
      return { key: `ip:${ip}`, limit: LIMITS.anonymous };
    }
  }
}
