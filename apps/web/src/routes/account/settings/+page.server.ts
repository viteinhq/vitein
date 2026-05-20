import { fail, redirect } from '@sveltejs/kit';
import { i18n } from '$lib/i18n';
import { apiFetch } from '$lib/server/api';
import { availableLanguageTags, type AvailableLanguageTag } from '$lib/paraglide/runtime.js';
import type { Actions, PageServerLoad } from './$types';

interface UserProfile {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  locale: string;
  timezone: string;
  createdAt: string;
}

/**
 * Account settings page.
 *
 * The shared `/account/+layout.server.ts` already loaded the profile
 * via /v1/users/me — we re-fetch here only for the fields the layout
 * doesn't expose (locale, timezone) and to keep the page resilient to
 * future layout changes. Cheap call; no caching layer yet.
 */
export const load: PageServerLoad = async (event) => {
  const res = await apiFetch(event, '/v1/users/me');
  if (res.status === 401) throw redirect(303, '/signin');
  if (!res.ok) {
    return { profile: null as UserProfile | null, loadError: true as const };
  }
  const profile = (await res.json()) as unknown as UserProfile;
  return { profile, loadError: false as const };
};

export const actions: Actions = {
  update: async (event) => {
    const form = await event.request.formData();
    const name = String(form.get('name') ?? '').trim();
    const locale = String(form.get('locale') ?? '').trim();
    const timezone = String(form.get('timezone') ?? '').trim();

    const body: { name?: string | null; locale?: string; timezone?: string } = {};
    body.name = name === '' ? null : name;
    if (locale) body.locale = locale;
    if (timezone) body.timezone = timezone;

    const res = await apiFetch(event, '/v1/users/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return fail(res.status, {
        updateError: 'settings_update_failed',
        updateStatus: res.status,
      });
    }

    // If the user picked a known locale, also flip Paraglide's cookie
    // + URL prefix so the change is visible immediately. Without this,
    // the PATCH writes `users.locale` but the visible UI keeps the
    // old language until the next language-switcher click.
    if (locale && (availableLanguageTags as readonly string[]).includes(locale)) {
      const tag = locale as AvailableLanguageTag;
      event.cookies.set('paraglide_lang', tag, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        secure: !event.url.hostname.startsWith('localhost'),
      });
      const next = i18n.resolveRoute('/account/settings', tag);
      throw redirect(303, next);
    }

    return { updated: true };
  },

  exportData: async (event) => {
    const res = await apiFetch(event, '/v1/users/me/export');
    if (!res.ok) {
      return fail(res.status, {
        exportError: 'settings_export_failed',
        exportStatus: res.status,
      });
    }
    const text = await res.text();
    // Surface the JSON to the user as a download. Action results can't
    // return a Response directly; encode + flag so the page renders a
    // download link the user can click.
    const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(text)}`;
    return { exportReady: true as const, exportDataUrl: dataUrl };
  },

  deleteAccount: async (event) => {
    const form = await event.request.formData();
    const confirm = String(form.get('confirm') ?? '');
    if (confirm !== 'DELETE') {
      return fail(400, { deleteError: 'settings_delete_confirm_required' });
    }
    const res = await apiFetch(event, '/v1/users/me', { method: 'DELETE' });
    if (!res.ok && res.status !== 204) {
      return fail(res.status, {
        deleteError: 'settings_delete_failed',
        deleteStatus: res.status,
      });
    }
    // Session cookie remains on the browser but the underlying user is
    // soft-deleted; the next request to /account/* will 401-bounce to
    // /signin via the layout guard. Send the user to the homepage with
    // a clean redirect for closure.
    throw redirect(303, '/');
  },
};
