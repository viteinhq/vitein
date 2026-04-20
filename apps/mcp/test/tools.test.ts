import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEventBySlugTool, getEventShareUrlTool } from '../src/tools/events.js';
import type { Env } from '../src/types.js';

const env: Env = {
  ENVIRONMENT: 'dev',
  API_BASE_URL: 'http://api.test',
};

describe('get_event_by_slug', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');

  beforeEach(() => {
    fetchSpy.mockReset();
  });
  afterEach(() => {
    fetchSpy.mockReset();
  });

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
