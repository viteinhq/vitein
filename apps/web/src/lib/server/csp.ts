/**
 * Content-Security-Policy construction, split out of `hooks.server.ts` so
 * it can be unit-tested without the build-time `__BUILD_SHA__` global.
 */

export function isLocalhost(url: URL): boolean {
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
}

export function productionCsp(platform: App.Platform | undefined): string {
  const apiOrigin = new URL(platform?.env?.API_BASE_URL ?? 'https://api.vite.in').origin;
  // NB: `default-src` is deliberately omitted. Its presence would fall
  // back for missing `script-src` / `style-src` and intersect with
  // SvelteKit's per-page meta CSP (see svelte.config.js `kit.csp`),
  // blocking the hashes the meta tag grants. Each directive we care
  // about is set explicitly here, and scripts/styles are handled by
  // the meta CSP.
  return [
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    // Stripe Checkout: our /e/[slug]/manage upgrade form POSTs to a
    // SvelteKit action that 303s to checkout.stripe.com. CSP
    // form-action enforces the entire redirect chain (not just the
    // initial target), so we must allowlist Stripe's checkout origin
    // here — otherwise the browser silently aborts the navigation
    // and the user stays put.
    "form-action 'self' https://checkout.stripe.com",
    "img-src 'self' https: data:",
    "font-src 'self' data:",
    "manifest-src 'self'",
    "worker-src 'self'",
    "media-src 'self'",
    `connect-src 'self' ${apiOrigin}`,
    'upgrade-insecure-requests',
  ].join('; ');
}

/**
 * The CSP to send for a given request. In production/staging we send the
 * full policy. On localhost the full policy would block dev/HMR inline
 * scripts, so we still assert the clickjacking control — `frame-ancestors`,
 * the modern equivalent of `X-Frame-Options` — without the script/style
 * restrictions, so the two clickjacking defenses no longer diverge by
 * environment.
 */
export function cspFor(url: URL, platform: App.Platform | undefined): string {
  return isLocalhost(url) ? "frame-ancestors 'none'" : productionCsp(platform);
}
