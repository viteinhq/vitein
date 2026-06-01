import { paraglideMiddleware } from '$lib/paraglide/server';
import { getTextDirection } from '$lib/paraglide/runtime';
import { cspFor, isLocalhost } from '$lib/server/csp';
import { captureToSentry } from '$lib/server/sentry';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle, HandleServerError } from '@sveltejs/kit';

// Build-time-baked release tag, injected by Vite's `define` from
// process.env.BUILD_SHA. Empty string locally; matches the SHA used
// by sentry-cli when uploading source maps in CI.
declare const __BUILD_SHA__: string;
const BUILD_SHA = __BUILD_SHA__ || undefined;

/**
 * Server-side hook chain:
 *  1. `paraglideHandle` — Paraglide v2 middleware. Resolves the request
 *     locale (URL prefix → cookie → Accept-Language → baseLocale) and
 *     runs the render inside that locale context; stamps `<html lang>`
 *     and `dir` via `transformPageChunk`.
 *  2. `withHeaders` — request id, security headers, CSP/HSTS in production.
 *
 * `handleError` forwards uncaught server errors to Sentry via a minimal
 * envelope POST (see `$lib/server/sentry`). `@sentry/sveltekit` and
 * `@sentry/cloudflare` both have edges on the Pages runtime — this is the
 * reliable path.
 */

const paraglideHandle: Handle = ({ event, resolve }) =>
  paraglideMiddleware(event.request, ({ request, locale }) => {
    event.request = request;
    return resolve(event, {
      transformPageChunk: ({ html }) =>
        html.replace('%lang%', locale).replace('%dir%', getTextDirection(locale)),
    });
  });

const withHeaders: Handle = async ({ event, resolve }) => {
  const inboundId = event.request.headers.get('x-request-id');
  const requestId = inboundId && isWellFormed(inboundId) ? inboundId : randomRequestId();
  event.locals.requestId = requestId;

  const response = await resolve(event);

  response.headers.set('X-Request-Id', requestId);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');

  // CSP is set in every environment so the clickjacking control
  // (`frame-ancestors 'none'`) is consistent with the unconditional
  // `X-Frame-Options: DENY` above. On localhost `cspFor` returns only
  // `frame-ancestors` so dev/HMR scripts aren't blocked.
  response.headers.set('Content-Security-Policy', cspFor(event.url, event.platform));
  if (!isLocalhost(event.url)) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
};

export const handle: Handle = sequence(paraglideHandle, withHeaders);

export const handleError: HandleServerError = async ({ error, event, status }) => {
  const dsn = event.platform?.env?.SENTRY_DSN;
  // 404s are routine noise — automated bot scans probe every site for
  // /wp-login.php, xmlrpc.php and the like. Only real (5xx) failures are
  // worth a Sentry alert; an expected "not found" is not.
  if (dsn && status !== 404) {
    // Must await: Cloudflare Worker isolates can terminate before a
    // fire-and-forget fetch completes, swallowing the Sentry event.
    await captureToSentry({
      dsn,
      error,
      environment: event.platform?.env?.API_BASE_URL?.includes('api-staging')
        ? 'staging'
        : 'production',
      requestId: event.locals.requestId,
      release: BUILD_SHA,
    });
  }
  return {
    message: error instanceof Error ? error.message : 'Unknown error',
  };
};

function randomRequestId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const WELL_FORMED = /^[A-Za-z0-9._-]{1,128}$/;
function isWellFormed(value: string): boolean {
  return WELL_FORMED.test(value);
}
