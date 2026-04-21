import { redirect } from '@sveltejs/kit';
import { SUPPORTED_LOCALES, type Locale } from '$lib/i18n';
import type { RequestHandler } from './$types';

/**
 * Endpoint for the footer locale switcher. Accepts `?set=<locale>` plus an
 * optional `?to=<path>` and sets the `locale` cookie before redirecting
 * back. Kept small and stateless; no CSRF because the cookie is the only
 * side effect and is scoped to this origin.
 */
export const GET: RequestHandler = ({ url, cookies }) => {
  const set = url.searchParams.get('set');
  const to = url.searchParams.get('to') ?? '/';
  if (set && (SUPPORTED_LOCALES as readonly string[]).includes(set)) {
    cookies.set('locale', set as Locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }
  throw redirect(303, to.startsWith('/') ? to : '/');
};
