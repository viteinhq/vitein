import { describe, expect, it } from 'vitest';
import en from './locales/en.json';
import de from './locales/de.json';
import { negotiateLocale, translate } from './index.js';

describe('translate', () => {
  it('returns the localised string when available', () => {
    expect(translate('event.not_found', 'de')).toBe('Event nicht gefunden');
    expect(translate('event.not_found', 'en')).toBe('Event not found');
  });

  it('falls back to English for unknown locales', () => {
    expect(translate('event.not_found', 'en')).toBe('Event not found');
  });

  it('falls back to the code when no dictionary entry exists', () => {
    expect(translate('nonexistent.code', 'en')).toBe('nonexistent.code');
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

  it('honours q-values for ranking', () => {
    expect(negotiateLocale('fr;q=1.0,de;q=0.8,en;q=0.5')).toBe('de');
  });

  it('falls back to default for unsupported languages', () => {
    expect(negotiateLocale('fr-FR,it;q=0.5')).toBe('en');
  });
});

describe('locale dictionaries', () => {
  it('de.json covers every key in en.json', () => {
    const missing = Object.keys(en).filter((key) => !(key in de));
    expect(missing).toEqual([]);
  });

  it('de.json has no extra keys absent from en.json', () => {
    const extra = Object.keys(de).filter((key) => !(key in en));
    expect(extra).toEqual([]);
  });
});
