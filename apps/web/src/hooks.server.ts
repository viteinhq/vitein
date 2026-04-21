import { captureToSentry } from '$lib/server/sentry';
import type { Handle, HandleServerError } from '@sveltejs/kit';

/**
 * Server-side hook chain: stamps security headers and a request id on
 * every response, threads the id into `event.locals` so `apiFetch` can
 * forward it to the API, and captures uncaught server errors to Sentry
 * via a minimal envelope POST (see `$lib/server/sentry`).
 *
 * CSP is intentionally skipped in `dev` — Vite injects inline modules and
 * HMR sockets that trip any reasonable policy.
 */

export const handle: Handle = async ({ event, resolve }) => {
  const inboundId = event.request.headers.get('x-request-id');
  const requestId = inboundId && isWellFormed(inboundId) ? inboundId : randomRequestId();
  event.locals.requestId = requestId;

  const response = await resolve(event);

  response.headers.set('X-Request-Id', requestId);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');

  if (!isLocalhost(event.url)) {
    response.headers.set('Content-Security-Policy', productionCsp(event.platform));
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
};

export const handleError: HandleServerError = async ({ error, event }) => {
  const dsn = event.platform?.env?.SENTRY_DSN;
  if (dsn) {
    // Must await: Cloudflare Worker isolates can terminate before a
    // fire-and-forget fetch completes, swallowing the Sentry event.
    await captureToSentry({
      dsn,
      error,
      environment: event.platform?.env?.API_BASE_URL?.includes('api-staging')
        ? 'staging'
        : 'production',
      requestId: event.locals.requestId,
    });
  }
  return {
    message: error instanceof Error ? error.message : 'Unknown error',
  };
};

function isLocalhost(url: URL): boolean {
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
}

function productionCsp(platform: App.Platform | undefined): string {
  const apiOrigin = new URL(platform?.env?.API_BASE_URL ?? 'https://api.vite.in').origin;
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "img-src 'self' https: data:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'",
    `connect-src 'self' ${apiOrigin}`,
    'upgrade-insecure-requests',
  ].join('; ');
}

function randomRequestId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const WELL_FORMED = /^[A-Za-z0-9._-]{1,128}$/;
function isWellFormed(value: string): boolean {
  return WELL_FORMED.test(value);
}
