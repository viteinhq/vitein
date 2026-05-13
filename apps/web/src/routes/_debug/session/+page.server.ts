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

  async function probe(path: string) {
    let status: number | null = null;
    let body: unknown = null;
    try {
      const res = await apiFetch(event, path);
      status = res.status;
      const text = await res.text();
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = text;
      }
    } catch (err) {
      body = String(err);
    }
    return { status, body };
  }

  const me = await probe('/v1/users/me');
  // Better-Auth's own session endpoint, bypasses our authMiddleware. If
  // this returns a session object while /v1/users/me 401s, the bug is in
  // our middleware. If this also returns null, the cookie value isn't
  // recognised by Better-Auth.
  const betterAuthSession = await probe('/v1/auth/get-session');

  return {
    cookieHeaderLength: cookieHeader.length,
    cookieNames,
    meStatus: me.status,
    meBody: me.body,
    sessionStatus: betterAuthSession.status,
    sessionBody: betterAuthSession.body,
    requestUrl: event.url.toString(),
    origin: event.url.origin,
  };
};
