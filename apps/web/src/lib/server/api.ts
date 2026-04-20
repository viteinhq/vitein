import type { RequestEvent } from '@sveltejs/kit';

/**
 * Server-side fetch that forwards the user's `Cookie` header to the API.
 *
 * In production the web app and the API share the parent domain (`.vite.in`)
 * and Better-Auth's session cookie is scoped there, so cookies travel
 * naturally browser ↔ web ↔ API. In local dev the two run on different
 * ports and cross-origin cookies are lossy — the simplest workable path
 * is to run behind a single dev proxy (e.g. `vite dev --host 0.0.0.0` +
 * a reverse proxy) before relying on signed-in flows.
 */
export function apiFetch(
  event: RequestEvent,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const baseUrl = resolveBaseUrl(event);
  const url = new URL(path, baseUrl);

  const headers = new Headers(init.headers);
  if (!headers.has('Accept-Language')) {
    const accept = event.request.headers.get('accept-language');
    if (accept) headers.set('Accept-Language', accept);
  }
  const cookie = event.request.headers.get('cookie');
  if (cookie) headers.set('Cookie', cookie);

  return fetch(url, { ...init, headers });
}

export function resolveBaseUrl(event: RequestEvent): string {
  return event.platform?.env?.API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:8787';
}
