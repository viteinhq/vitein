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
    const timezone = String(form.get('timezone') ?? 'UTC');
    const locationText = String(form.get('locationText') ?? '').trim();
    const creatorEmail = String(form.get('creatorEmail') ?? '').trim();

    if (!title || !startsAt || !creatorEmail) {
      return fail(400, {
        error: 'create_missing_fields',
        values: { title, description, startsAt, timezone, locationText, creatorEmail },
      });
    }

    const { data, error } = await createEvent({
      body: {
        title,
        description: description || null,
        startsAt: new Date(startsAt).toISOString(),
        timezone,
        locationText: locationText || null,
        creatorEmail,
      },
    });

    if (error || !data) {
      return fail(500, {
        error: 'create_failed',
        values: { title, description, startsAt, timezone, locationText, creatorEmail },
      });
    }

    return {
      success: true,
      slug: data.event.slug,
      magicLinkSent: data.magicLinkSent,
      creatorTokenPreview: data.creatorTokenPreview,
    };
  },
};
