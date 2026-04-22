import { createEvent } from '@vitein/ts-sdk';
import { fail } from '@sveltejs/kit';
import { configureApi } from '$lib/api';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, platform }) => {
    const baseUrl =
      platform?.env?.API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:8787';
    configureApi(baseUrl);

    const form = await request.formData();
    const title = String(form.get('title') ?? '').trim();
    const description = String(form.get('description') ?? '').trim();
    const startsAt = String(form.get('startsAt') ?? '');
    const endsAt = String(form.get('endsAt') ?? '');
    const timezone = String(form.get('timezone') ?? 'UTC');
    const locationText = String(form.get('locationText') ?? '').trim();
    const creatorEmail = String(form.get('creatorEmail') ?? '').trim();
    const visibilityRaw = String(form.get('visibility') ?? 'link_only');
    const visibility: 'link_only' | 'public' = visibilityRaw === 'public' ? 'public' : 'link_only';

    const values = {
      title,
      description,
      startsAt,
      endsAt,
      timezone,
      locationText,
      creatorEmail,
      visibility,
    };

    if (!title || !startsAt || !creatorEmail) {
      return fail(400, { error: 'create_missing_fields', values });
    }

    const { data, error } = await createEvent({
      body: {
        title,
        description: description || null,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        timezone,
        locationText: locationText || null,
        creatorEmail,
        visibility,
      },
    });

    if (error || !data) {
      return fail(500, { error: 'create_failed', values });
    }

    return {
      success: true,
      slug: data.event.slug,
      title: data.event.title,
      magicLinkSent: data.magicLinkSent,
      creatorTokenPreview: data.creatorTokenPreview,
    };
  },
};
