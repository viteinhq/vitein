import { communityThemes, Registry, type Theme } from '@vitein/template-engine';
import { describe, expect, it } from 'vitest';
import {
  assertFontPairingAllowed,
  assertLayoutAllowed,
  assertThemeAllowed,
} from '../src/domain/events/themes.js';

/**
 * A theme registry that also carries a premium (`basic`-tier) theme, so the
 * paid-gate path can be exercised — the open-source registry is free-only.
 */
function registryWithPremium(): Registry<Theme> {
  const base = communityThemes[0];
  if (!base) throw new Error('expected community themes to exist');
  const registry = new Registry<Theme>('volt');
  registry.register(...communityThemes);
  registry.register({ ...base, id: 'premium-one', tier: 'basic', origin: 'premium' });
  return registry;
}

describe('assertThemeAllowed', () => {
  it('accepts a free theme regardless of paid state', () => {
    expect(() => assertThemeAllowed('volt', false)).not.toThrow();
    expect(() => assertThemeAllowed('noir', true)).not.toThrow();
    expect(() => assertThemeAllowed('sand', false)).not.toThrow();
    expect(() => assertThemeAllowed('press', false)).not.toThrow();
  });

  it('rejects an unknown theme id', () => {
    expect(() => assertThemeAllowed('does-not-exist', true)).toThrow(/unknown theme/i);
  });

  it('rejects the retired `classic` and `serif` ids (migrated to volt / paper)', () => {
    expect(() => assertThemeAllowed('classic', false)).toThrow(/unknown theme/i);
    expect(() => assertThemeAllowed('serif', false)).toThrow(/unknown theme/i);
  });

  it('rejects a premium theme on an unpaid event', () => {
    expect(() => assertThemeAllowed('premium-one', false, registryWithPremium())).toThrow(
      /paid tier/i,
    );
  });

  it('accepts a premium theme on a paid event', () => {
    expect(() => assertThemeAllowed('premium-one', true, registryWithPremium())).not.toThrow();
  });
});

describe('assertLayoutAllowed', () => {
  it('accepts every community layout', () => {
    for (const id of [
      'standard',
      'ticket',
      'editorial',
      'poster',
      'card',
      'photo',
      'bento',
      'mono',
    ]) {
      expect(() => assertLayoutAllowed(id)).not.toThrow();
    }
  });

  it('rejects an unknown layout id', () => {
    expect(() => assertLayoutAllowed('does-not-exist')).toThrow(/unknown layout/i);
  });
});

describe('assertFontPairingAllowed', () => {
  it('accepts every community type pairing', () => {
    for (const id of [
      'bricolage-geist',
      'instrument-geist',
      'space-inter',
      'bricolage-mono',
      'instrument-instrument',
      'geist-geist',
    ]) {
      expect(() => assertFontPairingAllowed(id)).not.toThrow();
    }
  });

  it('rejects an unknown font-pairing id', () => {
    expect(() => assertFontPairingAllowed('does-not-exist')).toThrow(/unknown font/i);
  });
});
