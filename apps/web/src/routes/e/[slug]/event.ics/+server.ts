import { error as httpError } from '@sveltejs/kit';
import { apiFetch } from '$lib/server/api';
import type { RequestHandler } from './$types';

/**
 * Proxy to the API's iCalendar endpoint so the web origin can serve the
 * download from the same URL space (`/e/{slug}/event.ics`). Also survives
 * the corp firewalls that sometimes strip `api.vite.in` responses.
 */
export const GET: RequestHandler = async (event) => {
  const res = await apiFetch(event, `/v1/events/by-slug/${event.params.slug}/ics`);
  if (!res.ok) throw httpError(res.status, 'Event not found');

  const body = await res.text();
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.params.slug}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
};
