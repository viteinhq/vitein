import { error as httpError, fail } from '@sveltejs/kit';
import { getEventBySlug, listMedia, submitRsvp } from '@vitein/ts-sdk';
import { configureApi } from '$lib/api';
import type { Actions, PageServerLoad } from './$types';

function resolveBaseUrl(platform: App.Platform | undefined): string {
  return platform?.env?.API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:8787';
}

export const load: PageServerLoad = async ({ params, platform }) => {
  configureApi(resolveBaseUrl(platform));
  const { data, error } = await getEventBySlug({ path: { slug: params.slug } });
  if (error || !data) {
    throw httpError(404, 'Event not found');
  }
  const media = await listMedia({ path: { id: data.id } });
  const cover = media.data?.items.find((m) => m.kind === 'cover' && m.url) ?? null;
  return { event: data, cover };
};

export const actions: Actions = {
  rsvp: async ({ request, params, platform }) => {
    configureApi(resolveBaseUrl(platform));

    const form = await request.formData();
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim() || null;
    const status = String(form.get('status') ?? 'yes') as 'yes' | 'maybe' | 'no';
    const message = String(form.get('message') ?? '').trim() || null;
    const plusOnesRaw = Number(form.get('plusOnes') ?? 0);
    const plusOnes = Number.isFinite(plusOnesRaw) ? Math.max(0, Math.min(20, plusOnesRaw)) : 0;

    if (!name) {
      return fail(400, { rsvpError: 'Please enter your name.' });
    }

    const event = await getEventBySlug({ path: { slug: params.slug } });
    if (event.error || !event.data) {
      return fail(404, { rsvpError: 'Event not found.' });
    }

    const { data, error } = await submitRsvp({
      path: { id: event.data.id },
      body: { name, email, status, message, plusOnes },
    });

    if (error || !data) {
      return fail(500, { rsvpError: 'Could not record your RSVP. Please try again.' });
    }

    return { rsvpSuccess: true, rsvpStatus: data.status };
  },
};
