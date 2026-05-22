import { describe, expect, it } from 'vitest';
import {
  BASELINE_LAYOUT_ID,
  BASELINE_THEME_ID,
  createLayoutRegistry,
  createThemeRegistry,
} from './index.js';

describe('theme registry', () => {
  it('loads the four community themes', () => {
    const registry = createThemeRegistry();
    expect(registry.list()).toHaveLength(4);
    expect(registry.has(BASELINE_THEME_ID)).toBe(true);
  });

  it('resolves a known id to its theme', () => {
    expect(createThemeRegistry().resolve('noir').id).toBe('noir');
  });

  it('falls back to the baseline theme for an unknown id', () => {
    // A premium id on a build without the premium package must degrade.
    expect(createThemeRegistry().resolve('does-not-exist').id).toBe(BASELINE_THEME_ID);
  });

  it('ships only free community themes', () => {
    const registry = createThemeRegistry();
    expect(registry.list({ tier: 'free' })).toHaveLength(4);
    expect(registry.list({ tier: 'basic' })).toHaveLength(0);
  });
});

describe('layout registry', () => {
  it('loads the community layouts including ticket', () => {
    const registry = createLayoutRegistry();
    expect(registry.has(BASELINE_LAYOUT_ID)).toBe(true);
    expect(registry.has('ticket')).toBe(true);
  });

  it('falls back to the baseline layout for an unknown id', () => {
    expect(createLayoutRegistry().resolve('does-not-exist').id).toBe(BASELINE_LAYOUT_ID);
  });
});
