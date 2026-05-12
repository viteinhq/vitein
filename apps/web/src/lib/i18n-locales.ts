import type { AvailableLanguageTag } from './paraglide/runtime.js';

/**
 * Endonym (native-name) for each locale we serve.
 *
 * Why endonyms only and not "Japanese (日本語)" hybrids: a user who reads
 * Japanese doesn't need the parenthetical English; a user who doesn't
 * reads `日本語` first anyway and scans the rest by visual shape. The
 * exonym makes the list visually heavier without buying anything.
 *
 * Flags are deliberately NOT used. Languages cross borders — Spanish is
 * spoken in 20+ countries, French covers four continents, and a single
 * flag would imply a country preference we don't have. Universally
 * advised against by every i18n UX guideline (Smashing 2022, Smartling,
 * Linguise 2025).
 *
 * Adding a new locale = one entry here + one tag in
 * `apps/web/project.inlang/settings.json` + the matching `messages/<tag>.json`.
 */
export const LOCALE_ENDONYMS: Record<AvailableLanguageTag, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands',
  pl: 'Polski',
};

/** Human-readable endonym for a locale, with a safe fallback to the tag. */
export function endonym(tag: AvailableLanguageTag): string {
  return LOCALE_ENDONYMS[tag] ?? tag;
}
