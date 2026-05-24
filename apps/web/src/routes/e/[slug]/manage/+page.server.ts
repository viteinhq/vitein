import { error as httpError, fail, redirect } from '@sveltejs/kit';
import QRCode from 'qrcode';
import {
  createCheckout,
  deleteEvent,
  deleteMedia,
  getEventBySlug,
  getEventManage,
  listAnnouncements,
  listGuests,
  listMedia,
  listRsvps,
  sendReminder,
  updateEvent,
} from '@vitein/ts-sdk';
import { configureApi } from '$lib/api';
import { zonedWallTimeToUtc } from '$lib/datetime';
import type { Actions, PageServerLoad } from './$types';

function resolveBaseUrl(platform: App.Platform | undefined): string {
  return platform?.env?.API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:8787';
}

/**
 * Build the auth headers for SDK calls from this load fn. Two
 * accepted paths into /manage:
 *
 *  1. Creator-token mode: `?token=…` query param (magic-link email).
 *     Sent as `X-Creator-Token`; the API still recognises it.
 *  2. Session mode: a signed-in user whose `creator_user_id` matches
 *     the event. Achieved by forwarding the inbound Cookie + Origin
 *     so Better-Auth picks up the session on the API side.
 *
 * We include both kinds of headers when both signals are present —
 * `requireEventOwnership` accepts whichever lights up first.
 */
function ownershipHeaders(
  request: Request,
  token: string | null,
  origin: string,
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (token) headers['X-Creator-Token'] = token;
  const cookie = request.headers.get('cookie');
  if (cookie) headers['Cookie'] = cookie;
  headers['Origin'] = origin;
  return headers;
}

/**
 * Geo-suggest the checkout currency from the visitor's IP country
 * (Cloudflare's `cf-ipcountry` header). This only sets the dropdown
 * default — the user can override, and Stripe's billing-address
 * detection is what fixes the actually-charged price (ARCHITECTURE
 * §12.6). Unknown / EU / everything-else falls back to EUR.
 */
type CheckoutCurrency = 'EUR' | 'USD' | 'CHF' | 'GBP';

function suggestCurrency(request: Request): CheckoutCurrency {
  const country = request.headers.get('cf-ipcountry')?.toUpperCase();
  switch (country) {
    case 'US':
      return 'USD';
    case 'GB':
      return 'GBP';
    case 'CH':
      return 'CHF';
    default:
      return 'EUR';
  }
}

export const load: PageServerLoad = async ({ params, url, platform, request }) => {
  configureApi(resolveBaseUrl(platform));

  const token = url.searchParams.get('token');
  const headers = ownershipHeaders(request, token, url.origin);

  const bySlug = await getEventBySlug({ path: { slug: params.slug } });
  if (bySlug.error || !bySlug.data)
    throw httpError(404, { message: 'Event not found', code: 'http_event_not_found' });

  const eventId = bySlug.data.id;

  const [manage, rsvps, guests, media, announcements] = await Promise.all([
    getEventManage({ path: { id: eventId }, headers }),
    listRsvps({ path: { id: eventId }, headers }),
    listGuests({ path: { id: eventId }, headers }),
    listMedia({ path: { id: eventId } }),
    listAnnouncements({ path: { id: eventId }, headers }),
  ]);

  if (manage.error || !manage.data) {
    // No valid auth. An anonymous creator who lost (or never had) their
    // magic-link token recovers fresh management links by email at
    // /recover — that page also links to /signin for account holders.
    throw redirect(303, '/recover');
  }

  // Save the Date affordances are Plus-only. Pre-compute the URL + QR SVG
  // server-side: keeps `qrcode` off the client bundle, and the
  // shareable URL needs the absolute origin which the server already has.
  const stdUrl =
    manage.data.tier === 'plus' ? `${url.origin}/e/${manage.data.slug}/save-the-date` : null;
  const stdQrSvg = stdUrl
    ? await QRCode.toString(stdUrl, {
        type: 'svg',
        margin: 1,
        color: { dark: '#0a0a0a', light: '#ffffff' },
        width: 240,
      })
    : null;

  return {
    token,
    event: manage.data,
    rsvps: rsvps.data?.items ?? [],
    guests: guests.data?.items ?? [],
    media: media.data?.items ?? [],
    announcements: announcements.data?.items ?? [],
    suggestedCurrency: suggestCurrency(request),
    stdUrl,
    stdQrSvg,
  };
};

export const actions: Actions = {
  update: async ({ request, params, url, platform }) => {
    configureApi(resolveBaseUrl(platform));
    const token = url.searchParams.get('token');
    const headers = ownershipHeaders(request, token, url.origin);

    const form = await request.formData();
    // Each Section's form ships a `formScope` so the result lands on the
    // matching Banner. Without it, every save error would dump into the
    // Edit-Details banner (the original layout had a single shared key).
    const rawScope = String(form.get('formScope') ?? 'details');
    const scope: 'details' | 'design' | 'slug' =
      rawScope === 'design' || rawScope === 'slug' ? rawScope : 'details';
    const errorKey = `${scope}Error`;
    const successKey = `${scope}Success`;

    const bySlug = await getEventBySlug({ path: { slug: params.slug } });
    if (bySlug.error || !bySlug.data) {
      return fail(404, { [errorKey]: 'manage_event_not_found' });
    }

    const body: Record<string, unknown> = {};
    const title = String(form.get('title') ?? '').trim();
    const description = String(form.get('description') ?? '').trim();
    const startsAt = String(form.get('startsAt') ?? '');
    const endsAt = String(form.get('endsAt') ?? '');
    const timezone = String(form.get('timezone') ?? '').trim();
    const locationText = String(form.get('locationText') ?? '').trim();
    const themeId = String(form.get('themeId') ?? '').trim();
    const layout = String(form.get('layout') ?? '').trim();
    // Slugs are case-insensitive on the server; coerce to lowercase here so
    // a stray uppercase from autocapitalising mobile keyboards doesn't bounce
    // off the API's regex (which is lower-only by design).
    const slug = String(form.get('slug') ?? '')
      .trim()
      .toLowerCase();

    // Naive datetime-local values are interpreted in the event's timezone
    // (the submitted `timezone` field), not the Worker's UTC runtime.
    const tz = timezone || 'UTC';
    if (title) body.title = title;
    if (description) body.description = description;
    if (startsAt) body.startsAt = zonedWallTimeToUtc(startsAt, tz).toISOString();
    if (endsAt) body.endsAt = zonedWallTimeToUtc(endsAt, tz).toISOString();
    if (timezone) body.timezone = timezone;
    if (locationText) body.locationText = locationText;
    if (themeId) body.themeId = themeId;
    if (layout) body.layout = layout;
    if (slug) body.slug = slug;

    // The slug form's value is prefilled with the current slug, so an
    // unchanged submission would round-trip the same slug back to the API.
    // Drop it on the slug scope so we don't trigger spurious requests.
    if (scope === 'slug' && slug === params.slug) {
      delete body.slug;
    }

    if (Object.keys(body).length === 0) {
      return fail(400, { [errorKey]: 'manage_no_changes' });
    }

    const { error, response } = await updateEvent({
      path: { id: bySlug.data.id },
      headers,
      body,
    });

    if (error) {
      if (response?.status === 409) return fail(409, { [errorKey]: 'manage_slug_taken' });
      // A 400 on a slug-only submission is the API's slug regex/length
      // rejecting the input. Surface the actionable message instead of
      // the generic "save failed" so the user knows what to change.
      if (response?.status === 400 && scope === 'slug') {
        return fail(400, { [errorKey]: 'manage_slug_invalid' });
      }
      return fail(response?.status ?? 500, {
        [errorKey]: 'manage_save_failed',
        updateStatus: response?.status ?? 500,
      });
    }
    // A slug change moves the event's URL — the current /manage URL is now
    // stale, so redirect to the event's new manage URL.
    if (slug && slug !== params.slug) {
      throw redirect(303, `/e/${slug}/manage${token ? `?token=${token}` : ''}`);
    }
    return { [successKey]: true };
  },

  remind: async ({ request, params, url, platform }) => {
    configureApi(resolveBaseUrl(platform));
    const headers = ownershipHeaders(request, url.searchParams.get('token'), url.origin);

    const bySlug = await getEventBySlug({ path: { slug: params.slug } });
    if (bySlug.error || !bySlug.data) return fail(404, { reminderError: 'manage_event_not_found' });

    const { error } = await sendReminder({
      path: { id: bySlug.data.id },
      headers,
    });

    if (error) return fail(500, { reminderError: 'manage_reminder_failed' });
    return { reminderQueued: true };
  },

  uploadMedia: async ({ request, params, url, platform }) => {
    const apiBase = resolveBaseUrl(platform);
    const ownership = ownershipHeaders(request, url.searchParams.get('token'), url.origin);

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return fail(400, { mediaError: 'manage_pick_image' });
    }
    if (file.size > 10 * 1024 * 1024) {
      return fail(400, { mediaError: 'manage_image_too_large' });
    }

    // Look up event id via slug. We don't hit the SDK here because the
    // upload is binary body; the SDK's generated wrapper assumes JSON
    // bodies for uploadMedia.
    configureApi(apiBase);
    const bySlug = await getEventBySlug({ path: { slug: params.slug } });
    if (bySlug.error || !bySlug.data) return fail(404, { mediaError: 'manage_event_not_found' });

    const res = await fetch(`${apiBase}/v1/events/${bySlug.data.id}/media?kind=cover`, {
      method: 'POST',
      body: await file.arrayBuffer(),
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        ...ownership,
      },
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return fail(res.status, {
        mediaError: 'manage_upload_http',
        mediaStatus: res.status,
        mediaDetails: detail.slice(0, 200),
      });
    }

    return { mediaUploaded: true };
  },

  // ADR 0012: bulk-email is gated to B2B accounts; the `?/announce` UI is
  // gone and the API always returns 403 `feature.b2b_only` on personal
  // tiers. The action used to live here; it was wired only to UI buttons
  // we removed in PR #205. Dropped now — nothing calls it.

  setPassword: async ({ request, params, url, platform }) => {
    configureApi(resolveBaseUrl(platform));
    const headers = ownershipHeaders(request, url.searchParams.get('token'), url.origin);

    const bySlug = await getEventBySlug({ path: { slug: params.slug } });
    if (bySlug.error || !bySlug.data) return fail(404, { passwordError: 'manage_event_not_found' });

    const form = await request.formData();
    const clear = form.get('clear') === '1';
    const raw = String(form.get('password') ?? '');

    if (!clear && raw.length < 4) {
      return fail(400, { passwordError: 'manage_password_too_short' });
    }

    const { error, response } = await updateEvent({
      path: { id: bySlug.data.id },
      headers,
      body: { password: clear ? null : raw },
    });

    if (error) {
      if (response?.status === 403)
        return fail(403, { passwordError: 'manage_password_plus_required' });
      return fail(response?.status ?? 500, { passwordError: 'manage_password_failed' });
    }

    return clear ? { passwordCleared: true } : { passwordSet: true };
  },

  upgrade: async ({ request, params, url, platform }) => {
    configureApi(resolveBaseUrl(platform));
    const headers = ownershipHeaders(request, url.searchParams.get('token'), url.origin);

    const bySlug = await getEventBySlug({ path: { slug: params.slug } });
    if (bySlug.error || !bySlug.data) return fail(404, { upgradeError: 'manage_event_not_found' });

    const form = await request.formData();
    const tierRaw = String(form.get('tier') ?? 'basic').toLowerCase();
    const tier: 'basic' | 'plus' = tierRaw === 'plus' ? 'plus' : 'basic';
    const currencyRaw = String(form.get('currency') ?? 'EUR').toUpperCase();
    const currency = (['EUR', 'USD', 'CHF', 'GBP'] as const).includes(
      currencyRaw as 'EUR' | 'USD' | 'CHF' | 'GBP',
    )
      ? (currencyRaw as 'EUR' | 'USD' | 'CHF' | 'GBP')
      : 'EUR';

    const { data, error, response } = await createCheckout({
      path: { id: bySlug.data.id },
      headers,
      body: { tier, currency },
    });

    if (error || !data) {
      return fail(response?.status ?? 500, {
        upgradeError: 'upgrade_http',
        upgradeStatus: response?.status,
      });
    }

    throw redirect(303, data.url);
  },

  deleteMedia: async ({ request, params, url, platform }) => {
    configureApi(resolveBaseUrl(platform));
    const headers = ownershipHeaders(request, url.searchParams.get('token'), url.origin);

    const form = await request.formData();
    const mediaId = String(form.get('mediaId') ?? '');
    if (!mediaId) return fail(400, { mediaError: 'manage_missing_media_id' });

    const bySlug = await getEventBySlug({ path: { slug: params.slug } });
    if (bySlug.error || !bySlug.data) return fail(404, { mediaError: 'manage_event_not_found' });

    const { error } = await deleteMedia({
      path: { id: bySlug.data.id, mediaId },
      headers,
    });
    if (error) return fail(500, { mediaError: 'manage_delete_failed' });
    return { mediaDeleted: true };
  },

  /**
   * Soft-delete the event. Mirrors the /account/settings danger zone:
   * user must type DELETE to confirm. The API uses ownership-based
   * auth so both creator-token and signed-in-owner flows work.
   */
  deleteEvent: async ({ request, params, url, platform }) => {
    configureApi(resolveBaseUrl(platform));
    const headers = ownershipHeaders(request, url.searchParams.get('token'), url.origin);

    const form = await request.formData();
    const confirm = String(form.get('confirm') ?? '');
    if (confirm !== 'DELETE') {
      return fail(400, { deleteError: 'manage_delete_confirm_required' });
    }

    const bySlug = await getEventBySlug({ path: { slug: params.slug } });
    if (bySlug.error || !bySlug.data) return fail(404, { deleteError: 'manage_event_not_found' });

    const { error, response } = await deleteEvent({
      path: { id: bySlug.data.id },
      headers,
    });
    if (error && response?.status !== 204) {
      return fail(response?.status ?? 500, {
        deleteError: 'manage_delete_failed',
        deleteStatus: response?.status,
      });
    }
    // Soft-deleted — back to whichever entry the user came from. The
    // dashboard is the right place for a signed-in owner; the public
    // homepage for a token-only creator.
    throw redirect(303, '/account/dashboard');
  },
};
