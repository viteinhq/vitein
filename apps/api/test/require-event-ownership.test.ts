import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../src/domain/auth/context.js';
import { errorHandler } from '../src/middleware/error.js';
import { requireEventOwnership } from '../src/middleware/require-event-ownership.js';
import type { AppVariables, Env } from '../src/types/env.js';

const EVENT_ID = '019e2000-0000-7000-8000-000000000001';
const OTHER_EVENT_ID = '019e2000-0000-7000-8000-000000000002';

function buildApp(auth: AuthContext, opts?: { scope?: string }) {
  const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
  app.use('*', async (c, next) => {
    c.set('auth', auth);
    await next();
  });
  app.get('/events/:id/protected', requireEventOwnership('id', opts), (c) => c.json({ ok: true }));
  app.onError(errorHandler);
  return app;
}

interface ErrorBody {
  error: { code: string };
}

describe('requireEventOwnership — creator-token path', () => {
  it('passes when the creator-token matches the event id', async () => {
    const res = await buildApp({
      kind: 'creator',
      eventId: EVENT_ID,
      tokenId: 'tok-1',
    }).request(`/events/${EVENT_ID}/protected`);
    expect(res.status).toBe(200);
  });

  it('rejects creator-token for a different event', async () => {
    const res = await buildApp({
      kind: 'creator',
      eventId: OTHER_EVENT_ID,
      tokenId: 'tok-1',
    }).request(`/events/${EVENT_ID}/protected`);
    expect(res.status).toBe(401);
    const body: ErrorBody = await res.json();
    expect(body.error.code).toBe('event.unauthorized');
  });
});

describe('requireEventOwnership — anonymous / wrong-kind rejection', () => {
  it('rejects anonymous', async () => {
    const res = await buildApp({ kind: 'anonymous' }).request(`/events/${EVENT_ID}/protected`);
    expect(res.status).toBe(401);
  });
});

describe('requireEventOwnership — OAuth scope short-circuit', () => {
  it('rejects OAuth caller missing the required scope BEFORE touching the DB', async () => {
    // No DATABASE_URL, no db() call — if scope check ran first, we get 401
    // insufficient_scope and never reach the lookup that would error.
    const res = await buildApp(
      {
        kind: 'oauth',
        userId: 'usr-1',
        clientId: 'mcp',
        scopes: ['rsvps:read'],
      },
      { scope: 'events:write' },
    ).request(`/events/${EVENT_ID}/protected`);
    expect(res.status).toBe(401);
    const body: ErrorBody = await res.json();
    expect(body.error.code).toBe('oauth.insufficient_scope');
  });
});
