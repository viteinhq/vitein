import { DEFAULT_LOCALE, negotiateLocale, type Locale } from '@vitein/i18n-messages';
import en from './locales/en.json';
import de from './locales/de.json';

export type { Locale } from '@vitein/i18n-messages';
export { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@vitein/i18n-messages';

/**
 * Resolve the current locale from the cookie (set by the switcher) or fall
 * back to the user's `Accept-Language`. `@vitein/i18n-messages` ships the
 * matcher; the dictionaries below are web-specific UI strings.
 */
export function resolveLocale(
  cookieValue: string | undefined,
  acceptLanguage: string | null,
): Locale {
  if (cookieValue === 'en' || cookieValue === 'de') return cookieValue;
  return negotiateLocale(acceptLanguage);
}

const dicts: Record<Locale, Record<string, string>> = { en, de };

/** Look up a UI string for the given locale with English fallback, then key. */
export function t(key: string, locale: Locale = DEFAULT_LOCALE): string {
  return dicts[locale][key] ?? dicts[DEFAULT_LOCALE][key] ?? key;
}
