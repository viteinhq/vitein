import { i18n } from '$lib/i18n';

/**
 * Paraglide's URL-prefix strategy strips the language segment (e.g. `/de`)
 * off the request path and rewrites it to the canonical route before
 * SvelteKit's router resolves the match. Without this, `/de/pricing` has
 * no matching `+page.svelte` and SvelteKit 404s — which is exactly the
 * bug we saw on the first language switch.
 *
 * Lives in `hooks.ts` (shared by server and client), not
 * `hooks.server.ts`, so the same reroute is applied on both sides of
 * the SSR boundary.
 */
export const reroute = i18n.reroute();
