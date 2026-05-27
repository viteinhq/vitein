import { createEvent } from '@vitein/ts-sdk';
import { fail } from '@sveltejs/kit';
import { configureApi } from '$lib/api';
import { zonedWallTimeToUtc } from '$lib/datetime';
import { apiFetch } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

interface UserProfile {
  email: string;
}

/**
 * If the visitor already has a Better-Auth session, surface their
 * email so the create form can pre-fill `creatorEmail`. We never
 * redirect — anonymous creation is the core flow. A failed lookup
 * (no session, expired session, API hiccup) just leaves the field
 * empty as before.
 */
export const load: PageServerLoad = async (event) => {
  try {
    const res = await apiFetch(event, '/v1/users/me');
    if (!res.ok) return { sessionEmail: null };
    const user = (await res.json()) as UserProfile;
    return { sessionEmail: user.email ?? null };
  } catch {
    return { sessionEmail: null };
  }
};

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
    const themeId = String(form.get('themeId') ?? '').trim();
    const layout = String(form.get('layout') ?? '').trim();
    const fontPairing = String(form.get('fontPairing') ?? '').trim();

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
        // The datetime-local value is a naive wall-clock time; interpret it
        // in the event's timezone, not the Worker runtime's UTC.
        startsAt: zonedWallTimeToUtc(startsAt, timezone).toISOString(),
        endsAt: endsAt ? zonedWallTimeToUtc(endsAt, timezone).toISOString() : null,
        timezone,
        locationText: locationText || null,
        creatorEmail,
        visibility,
        themeId: themeId || undefined,
        layout: layout || undefined,
        fontPairing: fontPairing || undefined,
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
      manageUrl: data.manageUrl,
      creatorTokenPreview: data.creatorTokenPreview,
    };
  },
};
