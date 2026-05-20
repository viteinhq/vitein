import { describe, expect, it } from 'vitest';
import en from './locales/en.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import itDict from './locales/it.json';
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
import { negotiateLocale, SUPPORTED_LOCALES, translate, type Locale } from './index.js';

describe('translate', () => {
  it('returns the localised string when available', () => {
    expect(translate('event.not_found', 'de')).toBe('Event nicht gefunden');
    expect(translate('event.not_found', 'en')).toBe('Event not found');
    expect(translate('event.not_found', 'fr')).toBe('Événement introuvable');
  });

  it('falls back to English for unknown codes', () => {
    expect(translate('nonexistent.code', 'fr')).toBe('nonexistent.code');
  });
});

describe('negotiateLocale', () => {
  it('returns the default when header is empty', () => {
    expect(negotiateLocale(undefined)).toBe('en');
    expect(negotiateLocale('')).toBe('en');
    expect(negotiateLocale(null)).toBe('en');
  });

  it('matches primary tag (de-CH → de)', () => {
    expect(negotiateLocale('de-CH,de;q=0.9,en;q=0.5')).toBe('de');
  });

  it('matches a supported tag among many', () => {
    expect(negotiateLocale('pl-PL,en;q=0.5')).toBe('pl');
    expect(negotiateLocale('pt-BR,en;q=0.5')).toBe('pt');
    expect(negotiateLocale('nl-NL,en;q=0.5')).toBe('nl');
  });

  it('honours q-values for ranking', () => {
    // Picks the highest-q supported tag.
    expect(negotiateLocale('ja;q=1.0,de;q=0.8,en;q=0.5')).toBe('de');
  });

  it('falls back to default for unsupported languages', () => {
    expect(negotiateLocale('ja-JP,ko;q=0.5')).toBe('en');
  });
});

describe('locale dictionaries', () => {
  const dicts: Record<Exclude<Locale, 'en'>, Record<string, string>> = {
    de,
    fr,
    es,
    it: itDict,
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
  };

  for (const [name, dict] of Object.entries(dicts)) {
    it(`${name}.json covers every key in en.json`, () => {
      const missing = Object.keys(en).filter((key) => !(key in dict));
      expect(missing).toEqual([]);
    });

    it(`${name}.json has no extra keys absent from en.json`, () => {
      const extra = Object.keys(dict).filter((key) => !(key in en));
      expect(extra).toEqual([]);
    });
  }

  it('SUPPORTED_LOCALES matches the dictionary set', () => {
    expect([...SUPPORTED_LOCALES].sort()).toEqual(
      [
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
      ].sort(),
    );
  });
});
