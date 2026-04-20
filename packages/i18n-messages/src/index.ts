import en from './locales/en.json' with { type: 'json' };
import de from './locales/de.json' with { type: 'json' };

export type Locale = 'en' | 'de';
export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'de'] as const;
export const DEFAULT_LOCALE: Locale = 'en';

const dictionaries: Record<Locale, Record<string, string>> = { en, de };

/**
 * Look up a message by error code for the given locale. Falls back to the
 * English entry, then to the code itself — callers should never see an
 * empty string.
 */
export function translate(code: string, locale: Locale = DEFAULT_LOCALE): string {
  return dictionaries[locale][code] ?? dictionaries[DEFAULT_LOCALE][code] ?? code;
}

/**
 * Parse an `Accept-Language` header into one of the supported locales. Uses
 * simple prefix matching (`de-CH` → `de`). Unknown languages fall back to
 * the default.
 */
export function negotiateLocale(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;

  const candidates = header
    .split(',')
    .map((entry) => {
      const [tag, qPart] = entry.trim().split(';');
      const q = qPart?.startsWith('q=') ? Number(qPart.slice(2)) : 1;
      return { tag: tag?.toLowerCase() ?? '', q: Number.isFinite(q) ? q : 0 };
    })
    .filter((c) => c.tag.length > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of candidates) {
    const primary = tag.split('-')[0];
    if (primary && SUPPORTED_LOCALES.includes(primary as Locale)) {
      return primary as Locale;
    }
  }
  return DEFAULT_LOCALE;
}
