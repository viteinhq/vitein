import { error as httpError, fail } from '@sveltejs/kit';
import {
  getEventBySlug,
  getEventManage,
  listGuests,
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

  const [manage, rsvps, guests] = await Promise.all([
    getEventManage({ path: { id: eventId }, headers }),
    listRsvps({ path: { id: eventId }, headers }),
    listGuests({ path: { id: eventId }, headers }),
  ]);

  if (manage.error || !manage.data) throw httpError(401, 'Creator token invalid');

  return {
    token,
    event: manage.data,
    rsvps: rsvps.data?.items ?? [],
    guests: guests.data?.items ?? [],
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
};
