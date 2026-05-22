import { communityThemes, Registry, type Theme } from '@vitein/template-engine';
import { describe, expect, it } from 'vitest';
import { assertLayoutAllowed, assertThemeAllowed } from '../src/domain/events/themes.js';

/**
 * A theme registry that also carries a premium (`basic`-tier) theme, so the
 * paid-gate path can be exercised — the open-source registry is free-only.
 */
function registryWithPremium(): Registry<Theme> {
  const base = communityThemes[0];
  if (!base) throw new Error('expected community themes to exist');
  const registry = new Registry<Theme>('classic');
  registry.register(...communityThemes);
  registry.register({ ...base, id: 'premium-one', tier: 'basic', origin: 'premium' });
  return registry;
}

describe('assertThemeAllowed', () => {
  it('accepts a free theme regardless of paid state', () => {
    expect(() => assertThemeAllowed('classic', false)).not.toThrow();
    expect(() => assertThemeAllowed('noir', true)).not.toThrow();
  });

  it('rejects an unknown theme id', () => {
    expect(() => assertThemeAllowed('does-not-exist', true)).toThrow(/unknown theme/i);
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
  it('accepts the known community layouts', () => {
    expect(() => assertLayoutAllowed('standard')).not.toThrow();
    expect(() => assertLayoutAllowed('ticket')).not.toThrow();
  });

  it('rejects an unknown layout id', () => {
    expect(() => assertLayoutAllowed('does-not-exist')).toThrow(/unknown layout/i);
  });
});
