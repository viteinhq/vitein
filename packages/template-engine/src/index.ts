import { communityFontPairings } from './fonts.js';
import { communityLayouts } from './layouts.js';
import { Registry } from './registry.js';
import { communityThemes } from './themes.js';
import type { FontPairing, Layout, Theme } from './types.js';

export type { Theme, ThemeTokens, Layout, FontPairing, Preset, Tier, Origin } from './types.js';
export { Registry } from './registry.js';
export { communityThemes } from './themes.js';
export { communityLayouts } from './layouts.js';
export { communityFontPairings } from './fonts.js';
export { communityPresets } from './presets.js';

/** Id of the theme every registry must contain — the resolve fallback. */
export const BASELINE_THEME_ID = 'volt';
/** Id of the layout every registry must contain — the resolve fallback. */
export const BASELINE_LAYOUT_ID = 'standard';
/** Id of the font pairing every registry must contain — the resolve fallback. */
export const BASELINE_FONT_PAIRING_ID = 'bricolage-geist';

/**
 * Legacy theme ids accepted on the read path so events created before
 * the 2026-05-26 theme-engine rename keep rendering. The runtime
 * resolves them onto the new ids; the DB migration rewrites them
 * permanently. Once the migration has run on all environments and the
 * window for stale clients has closed, these can go.
 */
export const LEGACY_THEME_ID_ALIASES: Record<string, string> = {
  // `classic` was just `volt` under the old name.
  classic: 'volt',
  // `serif` mixed palette + font — the closest single palette is `paper`;
  // the migration also sets the row's font pairing to `instrument-instrument`
  // so it lands on the same visual.
  serif: 'paper',
};

/**
 * Create a theme registry pre-loaded with the open community themes.
 */
export function createThemeRegistry(): Registry<Theme> {
  const registry = new Registry<Theme>(BASELINE_THEME_ID);
  registry.register(...communityThemes);
  return registry;
}

/**
 * Create a layout registry pre-loaded with the open community layouts.
 * Layouts are open-source — there is no premium-layout hook (ADR 0011).
 */
export function createLayoutRegistry(): Registry<Layout> {
  const registry = new Registry<Layout>(BASELINE_LAYOUT_ID);
  registry.register(...communityLayouts);
  return registry;
}

/**
 * Create a font-pairing registry pre-loaded with the open community
 * type pairings (2026-05-26 — the third axis). Pure data, like themes.
 */
export function createFontPairingRegistry(): Registry<FontPairing> {
  const registry = new Registry<FontPairing>(BASELINE_FONT_PAIRING_ID);
  registry.register(...communityFontPairings);
  return registry;
}

/**
 * Extension point for the private vitein-premium package: register its
 * premium themes onto an existing registry. The open-source build simply
 * never calls this — only the seam lives in the public repo. Themes are
 * pure data, so they register cleanly; premium layouts do not exist.
 */
export function registerExternalThemes(registry: Registry<Theme>, themes: Theme[]): void {
  registry.register(...themes);
}
