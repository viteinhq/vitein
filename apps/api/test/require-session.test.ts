import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/domain/auth/context.js';
import { errorHandler } from '../src/middleware/error.js';
import { requireSession } from '../src/middleware/require-session.js';
import { requireUser } from '../src/middleware/require-user.js';
import type { AppVariables, Env } from '../src/types/env.js';

function buildApp(auth: AuthContext) {
  const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
  app.use('*', async (c, next) => {
    c.set('auth', auth);
    await next();
  });
  // Mirrors the production mount in routes/users.ts: a baseline
  // `requireUser` plus a per-route `requireSession` on the sensitive ones.
  app.use('*', requireUser);
  app.get('/account', requireSession, (c) => c.json({ ok: true }));
  app.onError(errorHandler);
  return app;
}

interface ErrorBody {
  error: { code: string; message: string };
}

describe('requireSession', () => {
  it('passes through for a first-party user session', async () => {
    const res = await buildApp({
      kind: 'user',
      userId: '00000000-0000-0000-0000-000000000001',
      scopes: ['*'],
    }).request('/account');
    expect(res.status).toBe(200);
    const body: { ok: boolean } = await res.json();
    expect(body.ok).toBe(true);
  });

  it('rejects a valid OAuth token regardless of granted scopes (GHSA-3fp4)', async () => {
    // The crux of the advisory: an OAuth bearer that satisfies requireUser
    // must NOT reach account-management routes, even with broad scopes.
    const res = await buildApp({
      kind: 'oauth',
      userId: '00000000-0000-0000-0000-000000000002',
      clientId: 'mcp_first_party',
      scopes: ['events:read', 'events:write', 'guests:read', 'rsvps:read'],
    }).request('/account');
    expect(res.status).toBe(401);
    const body: ErrorBody = await res.json();
    expect(body.error.code).toBe('user.session_required');
  });

  it('rejects an OAuth token even with a wildcard-looking scope', async () => {
    const res = await buildApp({
      kind: 'oauth',
      userId: '00000000-0000-0000-0000-000000000003',
      clientId: 'evil_client',
      scopes: ['*'],
    }).request('/account');
    expect(res.status).toBe(401);
  });

  it('rejects anonymous and creator-token callers', async () => {
    const anon = await buildApp({ kind: 'anonymous' }).request('/account');
    expect(anon.status).toBe(401);

    const creator = await buildApp({
      kind: 'creator',
      eventId: '00000000-0000-0000-0000-000000000004',
      tokenId: '00000000-0000-0000-0000-000000000005',
    }).request('/account');
    expect(creator.status).toBe(401);
  });
});
