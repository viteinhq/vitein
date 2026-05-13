import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/domain/auth/context.js';
import { errorHandler } from '../src/middleware/error.js';
import { requireScope } from '../src/middleware/require-scope.js';
import type { AppVariables, Env } from '../src/types/env.js';

function buildApp(auth: AuthContext, scope = 'events:read') {
  const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
  app.use('*', async (c, next) => {
    c.set('auth', auth);
    await next();
  });
  app.get('/protected', requireScope(scope), (c) => c.json({ ok: true }));
  app.onError(errorHandler);
  return app;
}

interface ErrorBody {
  error: { code: string; message: string };
}

describe('requireScope', () => {
  it('lets user-session callers through unconditionally', async () => {
    const res = await buildApp({
      kind: 'user',
      userId: 'usr-1',
      scopes: ['*'],
    }).request('/protected');
    expect(res.status).toBe(200);
  });

  it('lets OAuth callers with the scope through', async () => {
    const res = await buildApp({
      kind: 'oauth',
      userId: 'usr-1',
      clientId: 'mcp',
      scopes: ['events:read', 'events:write'],
    }).request('/protected');
    expect(res.status).toBe(200);
  });

  it('rejects OAuth callers missing the scope', async () => {
    const res = await buildApp({
      kind: 'oauth',
      userId: 'usr-1',
      clientId: 'mcp',
      scopes: ['rsvps:read'],
    }).request('/protected');
    expect(res.status).toBe(401);
    const body: ErrorBody = await res.json();
    expect(body.error.code).toBe('oauth.insufficient_scope');
  });

  it('rejects anonymous callers', async () => {
    const res = await buildApp({ kind: 'anonymous' }).request('/protected');
    expect(res.status).toBe(401);
  });

  it('rejects creator-token callers', async () => {
    const res = await buildApp({
      kind: 'creator',
      eventId: 'evt-1',
      tokenId: 'tok-1',
    }).request('/protected');
    expect(res.status).toBe(401);
  });

  it('requires every listed scope (AND semantics)', async () => {
    const app = buildApp(
      {
        kind: 'oauth',
        userId: 'usr-1',
        clientId: 'mcp',
        scopes: ['events:read'],
      },
      'events:write',
    );
    const res = await app.request('/protected');
    expect(res.status).toBe(401);
  });
});
