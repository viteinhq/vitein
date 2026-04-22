import { error as httpError, fail, redirect } from '@sveltejs/kit';
import {
  createCheckout,
  deleteMedia,
  getEventBySlug,
  getEventManage,
  listGuests,
  listMedia,
  listRsvps,
  sendReminder,
  updateEvent,
} from '@vitein/ts-sdk';
import { configureApi } from '$lib/api';
import type { Actions, PageServerLoad } from './$types';

function resolveBaseUrl(platform: App.Platform | undefined): string {
  return platform?.env?.API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:8787';
}

export const load: PageServerLoad = async ({ params, url, platform }) => {
  configureApi(resolveBaseUrl(platform));

  const token = url.searchParams.get('token');
  if (!token)
    throw httpError(401, { message: 'Creator token required', code: 'http_creator_token_required' });

  const bySlug = await getEventBySlug({ path: { slug: params.slug } });
  if (bySlug.error || !bySlug.data)
    throw httpError(404, { message: 'Event not found', code: 'http_event_not_found' });

  const eventId = bySlug.data.id;
  const headers = { 'X-Creator-Token': token };

  const [manage, rsvps, guests, media] = await Promise.all([
    getEventManage({ path: { id: eventId }, headers }),
    listRsvps({ path: { id: eventId }, headers }),
    listGuests({ path: { id: eventId }, headers }),
    listMedia({ path: { id: eventId } }),
  ]);

  if (manage.error || !manage.data)
    throw httpError(401, { message: 'Creator token invalid', code: 'http_creator_token_invalid' });

  return {
    token,
    event: manage.data,
    rsvps: rsvps.data?.items ?? [],
    guests: guests.data?.items ?? [],
    media: media.data?.items ?? [],
  };
};

export const actions: Actions = {
  update: async ({ request, params, url, platform }) => {
    configureApi(resolveBaseUrl(platform));
    const token = url.searchParams.get('token');
    if (!token) return fail(401, { updateError: 'manage_missing_token' });

    const bySlug = await getEventBySlug({ path: { slug: params.slug } });
    if (bySlug.error || !bySlug.data) return fail(404, { updateError: 'manage_event_not_found' });

    const form = await request.formData();
    const body: Record<string, unknown> = {};
    const title = String(form.get('title') ?? '').trim();
    const description = String(form.get('description') ?? '').trim();
    const startsAt = String(form.get('startsAt') ?? '');
    const locationText = String(form.get('locationText') ?? '').trim();

    if (title) body.title = title;
    if (description) body.description = description;
    if (startsAt) body.startsAt = new Date(startsAt).toISOString();
    if (locationText) body.locationText = locationText;

    if (Object.keys(body).length === 0) {
      return fail(400, { updateError: 'manage_no_changes' });
    }

    const { error } = await updateEvent({
      path: { id: bySlug.data.id },
      headers: { 'X-Creator-Token': token },
      body,
    });

    if (error) return fail(500, { updateError: 'manage_save_failed' });
    return { updateSuccess: true };
  },

  remind: async ({ params, url, platform }) => {
    configureApi(resolveBaseUrl(platform));
    const token = url.searchParams.get('token');
    if (!token) return fail(401, { reminderError: 'manage_missing_token' });

    const bySlug = await getEventBySlug({ path: { slug: params.slug } });
    if (bySlug.error || !bySlug.data) return fail(404, { reminderError: 'manage_event_not_found' });

    const { error } = await sendReminder({
      path: { id: bySlug.data.id },
      headers: { 'X-Creator-Token': token },
    });

    if (error) return fail(500, { reminderError: 'manage_reminder_failed' });
    return { reminderQueued: true };
  },

  uploadMedia: async ({ request, params, url, platform }) => {
    const apiBase = resolveBaseUrl(platform);
    const token = url.searchParams.get('token');
    if (!token) return fail(401, { mediaError: 'manage_missing_token' });

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
        'X-Creator-Token': token,
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

  upgrade: async ({ request, params, url, platform }) => {
    configureApi(resolveBaseUrl(platform));
    const token = url.searchParams.get('token');
    if (!token) return fail(401, { upgradeError: 'manage_missing_token' });

    const bySlug = await getEventBySlug({ path: { slug: params.slug } });
    if (bySlug.error || !bySlug.data) return fail(404, { upgradeError: 'manage_event_not_found' });

    const form = await request.formData();
    const currencyRaw = String(form.get('currency') ?? 'EUR').toUpperCase();
    const currency = (['EUR', 'USD', 'CHF', 'GBP'] as const).includes(
      currencyRaw as 'EUR' | 'USD' | 'CHF' | 'GBP',
    )
      ? (currencyRaw as 'EUR' | 'USD' | 'CHF' | 'GBP')
      : 'EUR';

    const { data, error, response } = await createCheckout({
      path: { id: bySlug.data.id },
      headers: { 'X-Creator-Token': token },
      body: { currency },
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
    const token = url.searchParams.get('token');
    if (!token) return fail(401, { mediaError: 'manage_missing_token' });

    const form = await request.formData();
    const mediaId = String(form.get('mediaId') ?? '');
    if (!mediaId) return fail(400, { mediaError: 'manage_missing_media_id' });

    const bySlug = await getEventBySlug({ path: { slug: params.slug } });
    if (bySlug.error || !bySlug.data) return fail(404, { mediaError: 'manage_event_not_found' });

    const { error } = await deleteMedia({
      path: { id: bySlug.data.id, mediaId },
      headers: { 'X-Creator-Token': token },
    });
    if (error) return fail(500, { mediaError: 'manage_delete_failed' });
    return { mediaDeleted: true };
  },
};
