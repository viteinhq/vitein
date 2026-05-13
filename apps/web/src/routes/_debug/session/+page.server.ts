import { apiFetch } from '$lib/server/api';
import type { PageServerLoad } from './$types';

/**
 * Diagnostic page — visible at /_debug/session.
 *
 * Shows the raw Cookie header reaching the server, which cookie names
 * are present, and the result of calling /v1/users/me with them. Use
 * to triangulate magic-link signin issues: if the page reports a
 * session cookie present but the API still returns 401, the cookie's
 * value is being mangled in transit. If no cookie is present, the
 * auth/continue forwarding step didn't fire or the browser dropped it.
 *
 * Not a real route — `noindex` plus an underscored path keeps it out
 * of the public surface. Remove when no longer needed.
 */
export const load: PageServerLoad = async (event) => {
  const cookieHeader = event.request.headers.get('cookie') ?? '';
  const cookieNames = cookieHeader
    .split(';')
    .map((p) => p.trim().split('=')[0])
    .filter(Boolean);

  let meStatus: number | null = null;
  let meBody: unknown = null;
  try {
    const res = await apiFetch(event, '/v1/users/me');
    meStatus = res.status;
    const text = await res.text();
    try {
      meBody = JSON.parse(text) as unknown;
    } catch {
      meBody = text;
    }
  } catch (err) {
    meBody = String(err);
  }

  return {
    cookieHeaderLength: cookieHeader.length,
    cookieNames,
    meStatus,
    meBody,
    requestUrl: event.url.toString(),
    origin: event.url.origin,
  };
};
