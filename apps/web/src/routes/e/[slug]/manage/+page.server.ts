import { error as httpError, fail } from '@sveltejs/kit';
import {
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
  if (!token) throw httpError(401, 'Creator token required');

  const bySlug = await getEventBySlug({ path: { slug: params.slug } });
  if (bySlug.error || !bySlug.data) throw httpError(404, 'Event not found');

  const eventId = bySlug.data.id;
  const headers = { 'X-Creator-Token': token };

  const [manage, rsvps, guests, media] = await Promise.all([
    getEventManage({ path: { id: eventId }, headers }),
    listRsvps({ path: { id: eventId }, headers }),
    listGuests({ path: { id: eventId }, headers }),
    listMedia({ path: { id: eventId } }),
  ]);

  if (manage.error || !manage.data) throw httpError(401, 'Creator token invalid');

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
    if (!token) return fail(401, { updateError: 'Missing token.' });

    const bySlug = await getEventBySlug({ path: { slug: params.slug } });
    if (bySlug.error || !bySlug.data) return fail(404, { updateError: 'Event not found.' });

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
      return fail(400, { updateError: 'No changes to save.' });
    }

    const { error } = await updateEvent({
      path: { id: bySlug.data.id },
      headers: { 'X-Creator-Token': token },
      body,
    });

    if (error) return fail(500, { updateError: 'Could not save changes.' });
    return { updateSuccess: true };
  },

  remind: async ({ params, url, platform }) => {
    configureApi(resolveBaseUrl(platform));
    const token = url.searchParams.get('token');
    if (!token) return fail(401, { reminderError: 'Missing token.' });

    const bySlug = await getEventBySlug({ path: { slug: params.slug } });
    if (bySlug.error || !bySlug.data) return fail(404, { reminderError: 'Event not found.' });

    const { error } = await sendReminder({
      path: { id: bySlug.data.id },
      headers: { 'X-Creator-Token': token },
    });

    if (error) return fail(500, { reminderError: 'Could not queue reminder.' });
    return { reminderQueued: true };
  },

  uploadMedia: async ({ request, params, url, platform }) => {
    const apiBase = resolveBaseUrl(platform);
    const token = url.searchParams.get('token');
    if (!token) return fail(401, { mediaError: 'Missing token.' });

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return fail(400, { mediaError: 'Please pick an image.' });
    }
    if (file.size > 10 * 1024 * 1024) {
      return fail(400, { mediaError: 'Image must be at most 10 MiB.' });
    }

    // Look up event id via slug. We don't hit the SDK here because the
    // upload is binary body; the SDK's generated wrapper assumes JSON
    // bodies for uploadMedia.
    configureApi(apiBase);
    const bySlug = await getEventBySlug({ path: { slug: params.slug } });
    if (bySlug.error || !bySlug.data) return fail(404, { mediaError: 'Event not found.' });

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
        mediaError: `Upload failed (${String(res.status)}): ${detail.slice(0, 200)}`,
      });
    }

    return { mediaUploaded: true };
  },

  deleteMedia: async ({ request, params, url, platform }) => {
    configureApi(resolveBaseUrl(platform));
    const token = url.searchParams.get('token');
    if (!token) return fail(401, { mediaError: 'Missing token.' });

    const form = await request.formData();
    const mediaId = String(form.get('mediaId') ?? '');
    if (!mediaId) return fail(400, { mediaError: 'Missing mediaId.' });

    const bySlug = await getEventBySlug({ path: { slug: params.slug } });
    if (bySlug.error || !bySlug.data) return fail(404, { mediaError: 'Event not found.' });

    const { error } = await deleteMedia({
      path: { id: bySlug.data.id, mediaId },
      headers: { 'X-Creator-Token': token },
    });
    if (error) return fail(500, { mediaError: 'Could not delete media.' });
    return { mediaDeleted: true };
  },
};
