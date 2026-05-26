import { describe, expect, it } from 'vitest';
import {
  BASELINE_FONT_PAIRING_ID,
  BASELINE_LAYOUT_ID,
  BASELINE_THEME_ID,
  createFontPairingRegistry,
  createLayoutRegistry,
  createThemeRegistry,
} from './index.js';

describe('theme registry', () => {
  it('loads the eight community palettes', () => {
    const registry = createThemeRegistry();
    expect(registry.list()).toHaveLength(8);
    expect(registry.has(BASELINE_THEME_ID)).toBe(true);
  });

  it('resolves a known id to its theme', () => {
    expect(createThemeRegistry().resolve('noir').id).toBe('noir');
  });

  it('falls back to the baseline theme (volt) for an unknown id', () => {
    expect(createThemeRegistry().resolve('does-not-exist').id).toBe(BASELINE_THEME_ID);
    expect(BASELINE_THEME_ID).toBe('volt');
  });

  it('ships only free community palettes', () => {
    const registry = createThemeRegistry();
    expect(registry.list({ tier: 'free' })).toHaveLength(8);
    expect(registry.list({ tier: 'basic' })).toHaveLength(0);
  });
});

describe('layout registry', () => {
  it('loads the eight community layouts', () => {
    const registry = createLayoutRegistry();
    expect(registry.list()).toHaveLength(8);
    expect(registry.has(BASELINE_LAYOUT_ID)).toBe(true);
    expect(registry.has('ticket')).toBe(true);
    expect(registry.has('editorial')).toBe(true);
    expect(registry.has('poster')).toBe(true);
    expect(registry.has('mono')).toBe(true);
  });

  it('falls back to the baseline layout for an unknown id', () => {
    expect(createLayoutRegistry().resolve('does-not-exist').id).toBe(BASELINE_LAYOUT_ID);
  });
});

describe('font-pairing registry', () => {
  it('loads the six community type pairings', () => {
    const registry = createFontPairingRegistry();
    expect(registry.list()).toHaveLength(6);
    expect(registry.has(BASELINE_FONT_PAIRING_ID)).toBe(true);
  });

  it('falls back to the baseline pairing for an unknown id', () => {
    expect(createFontPairingRegistry().resolve('does-not-exist').id).toBe(BASELINE_FONT_PAIRING_ID);
    expect(BASELINE_FONT_PAIRING_ID).toBe('bricolage-geist');
  });
});
