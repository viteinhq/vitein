import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/domain/auth/context.js';
import { errorHandler } from '../src/middleware/error.js';
import { rateLimit } from '../src/middleware/rate-limit.js';
import type { AppVariables, Env } from '../src/types/env.js';

interface FakeStub {
  limit: number;
  remaining: number;
  retryAfter: number;
}

function makeLimiter(stub: FakeStub) {
  const captured: { lastUrl: string | null; ids: string[] } = { lastUrl: null, ids: [] };
  const namespace = {
    idFromName: (name: string) => {
      captured.ids.push(name);
      return { name };
    },
    get: () => ({
      fetch: (input: string) => {
        captured.lastUrl = input;
        const allowed = stub.remaining > 0;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              allowed,
              remaining: Math.max(0, stub.remaining - 1),
              retryAfter: stub.retryAfter,
            }),
            { headers: { 'content-type': 'application/json' } },
          ),
        );
      },
    }),
  } as unknown as DurableObjectNamespace;
  return { namespace, captured };
}

const noopLogger: AppVariables['logger'] = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  with: () => noopLogger,
};

function buildApp(auth: AuthContext, _namespace: DurableObjectNamespace | undefined) {
  const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
  app.use('*', async (c, next) => {
    c.set('auth', auth);
    c.set('logger', noopLogger);
    await next();
  });
  app.use('*', rateLimit);
  app.get('/r', (c) => c.json({ ok: true }));
  app.post('/r', (c) => c.json({ ok: true }));
  app.onError(errorHandler);
  return app.fetch.bind(app) as (req: Request, env: Env) => Promise<Response>;
}

function env(
  rl: DurableObjectNamespace | undefined,
  environment: Env['ENVIRONMENT'] = 'dev',
): Env {
  return { RATE_LIMITER: rl, ENVIRONMENT: environment };
}

describe('rate-limit middleware', () => {
  it('skips (with a warning) when RATE_LIMITER binding is absent in dev', async () => {
    const fetcher = buildApp({ kind: 'anonymous' }, undefined);
    const res = await fetcher(new Request('https://x/r'), env(undefined, 'dev'));
    expect(res.status).toBe(200);
  });

  it('fails closed (503) when RATE_LIMITER binding is absent in production (GHSA-v92r)', async () => {
    const fetcher = buildApp({ kind: 'anonymous' }, undefined);
    const res = await fetcher(new Request('https://x/r'), env(undefined, 'production'));
    expect(res.status).toBe(503);
    const body: { error: { code: string } } = await res.json();
    expect(body.error.code).toBe('rate_limiter_unavailable');
  });

  it('fails closed (503) when the binding is absent in staging', async () => {
    const fetcher = buildApp({ kind: 'anonymous' }, undefined);
    const res = await fetcher(new Request('https://x/r'), env(undefined, 'staging'));
    expect(res.status).toBe(503);
  });

  it('gives OAuth agents a dedicated per-(user,client) bucket, not the shared IP one', async () => {
    const stub = { limit: 300, remaining: 10, retryAfter: 30 } satisfies FakeStub;
    const { namespace, captured } = makeLimiter(stub);
    const fetcher = buildApp(
      { kind: 'oauth', userId: 'usr-9', clientId: 'mcp_first_party', scopes: ['events:read'] },
      namespace,
    );

    await fetcher(
      new Request('https://x/r', { headers: { 'cf-connecting-ip': '9.9.9.9' } }),
      env(namespace),
    );
    expect(captured.ids).toEqual(['oauth:usr-9:mcp_first_party:read']);
    expect(captured.lastUrl).toContain('limit=300');
  });

  it('keys anonymous traffic by ip and op (read = GET, higher budget)', async () => {
    const stub = { limit: 100, remaining: 50, retryAfter: 30 } satisfies FakeStub;
    const { namespace, captured } = makeLimiter(stub);
    const fetcher = buildApp({ kind: 'anonymous' }, namespace);

    const res = await fetcher(
      new Request('https://x/r', { headers: { 'cf-connecting-ip': '1.2.3.4' } }),
      env(namespace),
    );

    expect(res.status).toBe(200);
    expect(captured.ids).toEqual(['ip:1.2.3.4:read']);
    expect(captured.lastUrl).toContain('limit=100');
    expect(res.headers.get('X-RateLimit-Limit')).toBe('100');
  });

  it('keys writes separately with a tighter budget', async () => {
    const stub = { limit: 20, remaining: 5, retryAfter: 30 } satisfies FakeStub;
    const { namespace, captured } = makeLimiter(stub);
    const fetcher = buildApp({ kind: 'anonymous' }, namespace);

    const res = await fetcher(
      new Request('https://x/r', {
        method: 'POST',
        headers: { 'cf-connecting-ip': '1.2.3.4' },
      }),
      env(namespace),
    );

    expect(res.status).toBe(200);
    expect(captured.ids).toEqual(['ip:1.2.3.4:write']);
    expect(captured.lastUrl).toContain('limit=20');
  });

  it('emits 429 with rate_limited code when budget is exhausted', async () => {
    const stub = { limit: 100, remaining: 0, retryAfter: 42 } satisfies FakeStub;
    const { namespace } = makeLimiter(stub);
    const fetcher = buildApp({ kind: 'anonymous' }, namespace);

    const res = await fetcher(
      new Request('https://x/r', { headers: { 'cf-connecting-ip': '1.2.3.4' } }),
      env(namespace),
    );

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('42');
    const body: { error: { code: string } } = await res.json();
    expect(body.error.code).toBe('rate_limited');
  });

  it('uses creator key when authenticated by creator token', async () => {
    const stub = { limit: 300, remaining: 10, retryAfter: 30 } satisfies FakeStub;
    const { namespace, captured } = makeLimiter(stub);
    const fetcher = buildApp(
      {
        kind: 'creator',
        eventId: 'evt-1',
        tokenId: 'tok-1',
      },
      namespace,
    );

    await fetcher(new Request('https://x/r'), env(namespace));
    expect(captured.ids).toEqual(['creator:evt-1:read']);
  });

  it('uses user key when authenticated by session', async () => {
    const stub = { limit: 600, remaining: 10, retryAfter: 30 } satisfies FakeStub;
    const { namespace, captured } = makeLimiter(stub);
    const fetcher = buildApp(
      {
        kind: 'user',
        userId: 'usr-1',
        scopes: ['*'],
      },
      namespace,
    );

    await fetcher(new Request('https://x/r', { method: 'PATCH' }), env(namespace));
    expect(captured.ids).toEqual(['user:usr-1:write']);
  });
});
