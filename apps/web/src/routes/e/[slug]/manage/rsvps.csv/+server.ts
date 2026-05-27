import { error } from '@sveltejs/kit';
import { resolveBaseUrl } from '$lib/server/api';
import type { RequestHandler } from './$types';

/**
 * CSV-download proxy for the manage page. The browser hits this with
 * the existing `?token=…` magic-link query (or the session cookie
 * for signed-in owners); we resolve slug → id with a public lookup
 * and then call the API's `/v1/events/{id}/rsvps/csv` endpoint with
 * the same auth signals the page itself uses (X-Creator-Token,
 * Cookie, Origin). The API response — including the
 * `Content-Disposition` filename — is piped straight back.
 *
 * Done server-side so the creator token never has to ride a query
 * string into a Fetch from the browser (CSP, referer leaks).
 */
export const GET: RequestHandler = async (req) => {
  const { params, url, request } = req;
  const baseUrl = resolveBaseUrl(req);
  const token = url.searchParams.get('token');

  // 1. Resolve slug → event id. Public endpoint, no auth needed.
  const bySlugRes = await fetch(`${baseUrl}/v1/events/by-slug/${encodeURIComponent(params.slug)}`);
  if (!bySlugRes.ok) {
    throw error(bySlugRes.status === 404 ? 404 : 502, 'event lookup failed');
  }
  const evt = (await bySlugRes.json()) as { id: string };

  // 2. Fetch the CSV with ownership headers forwarded.
  const headers: Record<string, string> = {};
  if (token) headers['X-Creator-Token'] = token;
  const cookie = request.headers.get('cookie');
  if (cookie) headers['Cookie'] = cookie;
  headers['Origin'] = url.origin;

  const csvRes = await fetch(`${baseUrl}/v1/events/${evt.id}/rsvps/csv`, { headers });
  if (!csvRes.ok) {
    throw error(csvRes.status === 401 ? 401 : 502, 'csv fetch failed');
  }

  return new Response(csvRes.body, {
    status: 200,
    headers: {
      'Content-Type': csvRes.headers.get('Content-Type') ?? 'text/csv; charset=utf-8',
      'Content-Disposition':
        csvRes.headers.get('Content-Disposition') ??
        `attachment; filename="${params.slug}-rsvps.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
};
