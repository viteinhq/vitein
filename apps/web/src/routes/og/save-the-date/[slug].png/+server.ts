import type { RequestHandler } from './$types';

/**
 * Diagnostic stub — no @vercel/og, no SDK calls, no fetches. If this
 * returns 200 with the slug echoed, the breakage is from one of the
 * imports/calls I had in the previous build. If this still 500s with
 * "Invalid URL string", the failure is upstream (SvelteKit or
 * Paraglide handling of the `[slug].png` route shape).
 */
export const GET: RequestHandler = ({ params }) => {
  return new Response(`stub ok for slug=${params.slug}\n`, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
};
