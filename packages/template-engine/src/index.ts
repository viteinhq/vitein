import { communityLayouts } from './layouts.js';
import { Registry } from './registry.js';
import { communityThemes } from './themes.js';
import type { Layout, Theme } from './types.js';

export type { Theme, ThemeTokens, Layout, Template, Tier, Origin } from './types.js';
export { Registry } from './registry.js';
export { communityThemes } from './themes.js';
export { communityLayouts } from './layouts.js';

/** Id of the theme every registry must contain — the resolve fallback. */
export const BASELINE_THEME_ID = 'classic';
/** Id of the layout every registry must contain — the resolve fallback. */
export const BASELINE_LAYOUT_ID = 'standard';

/**
 * Create a theme registry pre-loaded with the open community themes. The
 * hosted build additionally calls {@link registerExternalThemes} with the
 * premium palettes; the open-source build ships community-only.
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
 * Extension point for the private vitein-premium package: register its
 * premium themes onto an existing registry. The open-source build simply
 * never calls this — only the seam lives in the public repo. Themes are
 * pure data, so they register cleanly; premium layouts do not exist.
 */
export function registerExternalThemes(registry: Registry<Theme>, themes: Theme[]): void {
  registry.register(...themes);
}
