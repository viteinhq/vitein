import { error as httpError, fail, redirect } from '@sveltejs/kit';
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
  sendAnnouncement,
  sendReminder,
  updateEvent,
} from '@vitein/ts-sdk';
import { configureApi } from '$lib/api';
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
    // No valid auth — push the user to sign in. The dashboard can
    // get them back to /manage with session auth. The creator-token
    // path goes through the magic-link email, not this redirect.
    throw redirect(303, `/signin?next=${encodeURIComponent(url.pathname)}`);
  }

  return {
    token,
    event: manage.data,
    rsvps: rsvps.data?.items ?? [],
    guests: guests.data?.items ?? [],
    media: media.data?.items ?? [],
    announcements: announcements.data?.items ?? [],
  };
};

export const actions: Actions = {
  update: async ({ request, params, url, platform }) => {
    configureApi(resolveBaseUrl(platform));
    const token = url.searchParams.get('token');
    const headers = ownershipHeaders(request, token, url.origin);

    const bySlug = await getEventBySlug({ path: { slug: params.slug } });
    if (bySlug.error || !bySlug.data) return fail(404, { updateError: 'manage_event_not_found' });

    const form = await request.formData();
    const body: Record<string, unknown> = {};
    const title = String(form.get('title') ?? '').trim();
    const description = String(form.get('description') ?? '').trim();
    const startsAt = String(form.get('startsAt') ?? '');
    const endsAt = String(form.get('endsAt') ?? '');
    const timezone = String(form.get('timezone') ?? '').trim();
    const locationText = String(form.get('locationText') ?? '').trim();

    if (title) body.title = title;
    if (description) body.description = description;
    if (startsAt) body.startsAt = new Date(startsAt).toISOString();
    if (endsAt) body.endsAt = new Date(endsAt).toISOString();
    if (timezone) body.timezone = timezone;
    if (locationText) body.locationText = locationText;

    if (Object.keys(body).length === 0) {
      return fail(400, { updateError: 'manage_no_changes' });
    }

    const { error } = await updateEvent({
      path: { id: bySlug.data.id },
      headers,
      body,
    });

    if (error) return fail(500, { updateError: 'manage_save_failed' });
    return { updateSuccess: true };
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

  announce: async ({ request, params, url, platform }) => {
    configureApi(resolveBaseUrl(platform));
    const headers = ownershipHeaders(request, url.searchParams.get('token'), url.origin);

    const bySlug = await getEventBySlug({ path: { slug: params.slug } });
    if (bySlug.error || !bySlug.data) return fail(404, { announceError: 'manage_event_not_found' });

    const form = await request.formData();
    const stageRaw = String(form.get('stage') ?? '');
    const stage: 'save_the_date' | 'invitation' =
      stageRaw === 'save_the_date' ? 'save_the_date' : 'invitation';

    const { data, error, response } = await sendAnnouncement({
      path: { id: bySlug.data.id },
      headers,
      body: { stage },
    });

    if (error || !data) {
      const status = response?.status;
      if (status === 403)
        return fail(403, { announceError: 'announcement_plus_required', announceStage: stage });
      if (status === 409)
        return fail(409, { announceError: 'announcement_already_sent', announceStage: stage });
      if (status === 400)
        return fail(400, { announceError: 'announcement_no_guests', announceStage: stage });
      if (status === 413)
        return fail(413, { announceError: 'announcement_too_many', announceStage: stage });
      return fail(status ?? 500, {
        announceError: 'announcement_http',
        announceStatus: status,
        announceStage: stage,
      });
    }

    return { announceSent: true, announceStage: stage };
  },

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
