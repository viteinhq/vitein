import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/domain/auth/context.js';
import { errorHandler } from '../src/middleware/error.js';
import { requireUser } from '../src/middleware/require-user.js';
import type { AppVariables, Env } from '../src/types/env.js';

function buildApp(auth: AuthContext) {
  const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
  app.use('*', async (c, next) => {
    c.set('auth', auth);
    await next();
  });
  app.get('/protected', requireUser, (c) => c.json({ ok: true }));
  app.onError(errorHandler);
  return app;
}

interface ErrorBody {
  error: { code: string; message: string };
}

describe('requireUser', () => {
  it('returns 401 for anonymous', async () => {
    const res = await buildApp({ kind: 'anonymous' }).request('/protected');
    expect(res.status).toBe(401);
    const body: ErrorBody = await res.json();
    expect(body.error.code).toBe('user.unauthorized');
  });

  it('returns 401 for creator-token auth', async () => {
    const res = await buildApp({
      kind: 'creator',
      eventId: '00000000-0000-0000-0000-000000000001',
      tokenId: '00000000-0000-0000-0000-000000000002',
    }).request('/protected');
    expect(res.status).toBe(401);
  });

  it('passes through for user', async () => {
    const res = await buildApp({
      kind: 'user',
      userId: '00000000-0000-0000-0000-000000000003',
      scopes: ['*'],
    }).request('/protected');
    expect(res.status).toBe(200);
    const body: { ok: boolean } = await res.json();
    expect(body.ok).toBe(true);
  });
});
