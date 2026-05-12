import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createEventTool,
  eventTools,
  getEventBySlugTool,
  getEventIcsTool,
  getEventShareUrlTool,
  listLocalesTool,
  submitRsvpTool,
} from '../src/tools/events.js';
import type { Env } from '../src/types.js';

const env: Env = {
  ENVIRONMENT: 'dev',
  API_BASE_URL: 'http://api.test',
};

const fetchSpy = vi.spyOn(globalThis, 'fetch');

beforeEach(() => {
  fetchSpy.mockReset();
});
afterEach(() => {
  fetchSpy.mockReset();
});

describe('get_event_by_slug', () => {
  it('validates input and rejects empty slugs', async () => {
    const res = await getEventBySlugTool.handler(env, { slug: '' });
    expect(res.isError).toBe(true);
  });

  it('returns an MCP-shaped success on 200', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: '01920000-0000-7000-8000-000000000001',
          slug: 'abc',
          title: 'Pizza night',
          description: null,
          startsAt: '2026-05-01T18:00:00.000Z',
          endsAt: null,
          timezone: 'Europe/Zurich',
          locationText: null,
          visibility: 'link_only',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const res = await getEventBySlugTool.handler(env, { slug: 'abc' });
    expect(res.isError).toBeFalsy();
    expect(res.content[0]?.type).toBe('text');
    expect(res.content[0]?.text).toContain('Pizza night');
    expect(res.structuredContent).toMatchObject({ slug: 'abc', title: 'Pizza night' });
  });

  it('reports a helpful error on 404', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('', { status: 404 }));
    const res = await getEventBySlugTool.handler(env, { slug: 'missing' });
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain('missing');
  });
});

describe('get_event_share_url', () => {
  it.each([
    ['dev', 'http://localhost:5173'],
    ['staging', 'https://next.vite.in'],
    ['production', 'https://vite.in'],
  ] as const)('points to the %s web origin', async (environment, expected) => {
    const res = await getEventShareUrlTool.handler(
      { ENVIRONMENT: environment, API_BASE_URL: 'http://api.test' },
      { slug: 'abc' },
    );
    expect(res.isError).toBeFalsy();
    expect(res.content[0]?.text).toContain(`${expected}/e/abc`);
  });
});

describe('get_event_ics', () => {
  it('returns the iCalendar text on 200', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('BEGIN:VCALENDAR\nEND:VCALENDAR', { status: 200 }));
    const res = await getEventIcsTool.handler(env, { slug: 'abc' });
    expect(res.isError).toBeFalsy();
    expect(res.content[0]?.text).toContain('BEGIN:VCALENDAR');
  });

  it('reports 404 helpfully', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('', { status: 404 }));
    const res = await getEventIcsTool.handler(env, { slug: 'missing' });
    expect(res.isError).toBe(true);
  });
});

describe('create_event', () => {
  it('rejects missing required fields', async () => {
    // Deliberately pass a partial input — the handler's safeParse should
    // catch the missing required fields. Cast through unknown so tsc
    // doesn't refuse the deliberate mismatch.
    const res = await createEventTool.handler(env, {
      title: 'x',
    } as unknown as Parameters<typeof createEventTool.handler>[1]);
    expect(res.isError).toBe(true);
  });

  it('returns share URL on success', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          event: { slug: 'xyz123', title: 'Birthday' },
          magicLinkSent: true,
          creatorTokenPreview: null,
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      ),
    );
    const res = await createEventTool.handler(env, {
      title: 'Birthday',
      startsAt: '2026-06-01T18:00:00.000Z',
      timezone: 'Europe/Zurich',
      creatorEmail: 'host@example.com',
    });
    expect(res.isError).toBeFalsy();
    expect(res.content[0]?.text).toContain('Birthday');
    expect(res.content[0]?.text).toContain('/e/xyz123');
  });
});

describe('submit_rsvp', () => {
  it('records an RSVP', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: '01920000-0000-7000-8000-000000000099',
          status: 'yes',
          respondedAt: '2026-05-12T10:00:00.000Z',
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      ),
    );
    const res = await submitRsvpTool.handler(env, {
      eventId: '01920000-0000-7000-8000-000000000001',
      name: 'Anna',
      status: 'yes',
    });
    expect(res.isError).toBeFalsy();
    expect(res.content[0]?.text).toContain('Anna');
    expect(res.content[0]?.text).toContain('yes');
  });

  it('handles event-not-found', async () => {
    fetchSpy.mockResolvedValueOnce(new Response('', { status: 404 }));
    const res = await submitRsvpTool.handler(env, {
      eventId: '01920000-0000-7000-8000-000000000999',
      name: 'Anna',
      status: 'yes',
    });
    expect(res.isError).toBe(true);
  });
});

describe('list_locales', () => {
  it('lists the eight launch locales', async () => {
    const res = await listLocalesTool.handler(env, {});
    expect(res.isError).toBeFalsy();
    const structured = res.structuredContent as { locales: { code: string }[] };
    expect(structured.locales.map((l) => l.code).sort()).toEqual([
      'de',
      'en',
      'es',
      'fr',
      'it',
      'nl',
      'pl',
      'pt',
    ]);
  });
});

describe('eventTools array', () => {
  it('exports every launch-set tool', () => {
    const names = eventTools.map((t) => t.name);
    expect(names).toContain('get_event_by_slug');
    expect(names).toContain('get_event_share_url');
    expect(names).toContain('get_event_ics');
    expect(names).toContain('create_event');
    expect(names).toContain('submit_rsvp');
    expect(names).toContain('list_locales');
  });
});
