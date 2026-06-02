/**
 * Resolve a user-supplied post-authentication callback target to a
 * SAME-ORIGIN absolute URL.
 *
 * The magic-link flow takes a `cb` query parameter and (a) forwards it to
 * the upstream verify endpoint as `callbackURL` and (b) uses it as the
 * post-login redirect target. Left unchecked, `?cb=https://evil.example`
 * is an open redirect. This collapses anything cross-origin,
 * protocol-relative (`//evil`), or unparseable down to a safe default on
 * the app's own origin.
 *
 * Returns an absolute URL string (Better-Auth's `callbackURL` and
 * SvelteKit's `redirect` both accept absolute same-origin URLs).
 */
export function safeCallback(
  cb: string | null | undefined,
  origin: string,
  fallbackPath = '/account/dashboard',
): string {
  const fallback = `${origin}${fallbackPath}`;
  if (!cb) return fallback;
  let resolved: URL;
  try {
    // Resolving against `origin` makes a bare path absolute and makes a
    // protocol-relative or cross-origin value reveal its true origin.
    resolved = new URL(cb, origin);
  } catch {
    return fallback;
  }
  if (resolved.origin !== origin) return fallback;
  return resolved.toString();
}
