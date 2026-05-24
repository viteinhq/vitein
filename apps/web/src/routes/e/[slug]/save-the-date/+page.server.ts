import { error as httpError } from '@sveltejs/kit';
import { getEventBySlug, listMedia } from '@vitein/ts-sdk';
import { configureApi } from '$lib/api';
import type { PageServerLoad } from './$types';

function resolveBaseUrl(platform: App.Platform | undefined): string {
  return platform?.env?.API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:8787';
}

/**
 * Save the Date — a sparser preview of the event meant to be shared early.
 *
 * Plus-tier feature (ADR 0012's tier marker). For free / Basic events the
 * route 404s rather than 403 — we don't surface the existence of the
 * variant URL to non-eligible callers, consistent with the admin-gate
 * pattern. Same event data as `/e/<slug>`; the template intentionally
 * leaves out description, location and RSVP.
 */
export const load: PageServerLoad = async ({ params, platform }) => {
  configureApi(resolveBaseUrl(platform));

  const { data, error } = await getEventBySlug({ path: { slug: params.slug } });
  if (error || !data) {
    throw httpError(404, { message: 'Event not found', code: 'http_event_not_found' });
  }
  if (data.tier !== 'plus') {
    throw httpError(404, { message: 'Not found', code: 'http_event_not_found' });
  }

  const media = await listMedia({ path: { id: data.id } });
  const items = media.data?.items ?? [];
  const cover = items.find((m) => m.kind === 'cover' && m.url) ?? null;

  // Plus-tier-only by the gate above, so branding is always off here.
  // The root layout reads `page.data.noBranding` to drop the chrome.
  const apiBase = resolveBaseUrl(platform);
  const ogImageUrl = `${apiBase}/v1/og/save-the-date/${data.slug}.png`;
  return { event: data, cover, noBranding: true, ogImageUrl };
};
