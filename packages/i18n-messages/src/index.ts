import en from './locales/en.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import it from './locales/it.json';
import pt from './locales/pt.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import mr from './locales/mr.json';
import gu from './locales/gu.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import pa from './locales/pa.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';

export type Locale =
  | 'en'
  | 'de'
  | 'fr'
  | 'es'
  | 'it'
  | 'pt'
  | 'nl'
  | 'pl'
  | 'hi'
  | 'bn'
  | 'ta'
  | 'te'
  | 'mr'
  | 'gu'
  | 'kn'
  | 'ml'
  | 'pa'
  | 'zh'
  | 'ja'
  | 'ko';
export const SUPPORTED_LOCALES: readonly Locale[] = [
  'en',
  'de',
  'fr',
  'es',
  'it',
  'pt',
  'nl',
  'pl',
  'hi',
  'bn',
  'ta',
  'te',
  'mr',
  'gu',
  'kn',
  'ml',
  'pa',
  'zh',
  'ja',
  'ko',
] as const;
export const DEFAULT_LOCALE: Locale = 'en';

const dictionaries: Record<Locale, Record<string, string>> = {
  en,
  de,
  fr,
  es,
  it,
  pt,
  nl,
  pl,
  hi,
  bn,
  ta,
  te,
  mr,
  gu,
  kn,
  ml,
  pa,
  zh,
  ja,
  ko,
};

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
