import type { Reroute } from '@sveltejs/kit';
import { deLocalizeUrl } from '$lib/paraglide/runtime';

/**
 * Paraglide's URL-prefix strategy keeps a language segment (e.g. `/de`)
 * on the request path. `deLocalizeUrl` strips it back to the canonical
 * route before SvelteKit's router resolves the match — without this,
 * `/de/pricing` has no matching `+page.svelte` and SvelteKit 404s.
 *
 * Lives in `hooks.ts` (shared by server and client), not
 * `hooks.server.ts`, so the same reroute is applied on both sides of
 * the SSR boundary.
 */
export const reroute: Reroute = (request) => deLocalizeUrl(request.url).pathname;
