import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Same-origin proxy for address autocomplete (ADR 0010). The browser
 * calls this; this calls the OSM-based geocoder (Geoapify) with the
 * server-side key — so the key never reaches the client and there is no
 * third-party request from the browser (no CSP change, no consent
 * concern). With no key configured, autocomplete is silently disabled
 * and the location field stays a plain text input.
 */
export const GET: RequestHandler = async ({ url, platform }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';
  const key = platform?.env?.GEOAPIFY_API_KEY ?? process.env.GEOAPIFY_API_KEY;
  if (q.length < 3 || !key) return json({ suggestions: [] });

  try {
    const res = await fetch(
      `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(q)}` +
        `&limit=5&format=json&apiKey=${key}`,
    );
    if (!res.ok) return json({ suggestions: [] });
    const data = (await res.json()) as { results?: { formatted?: string }[] };
    const suggestions = (data.results ?? [])
      .map((r) => r.formatted)
      .filter((f): f is string => Boolean(f));
    return json({ suggestions });
  } catch {
    // Geocoder unreachable — degrade to no suggestions, never error.
    return json({ suggestions: [] });
  }
};
