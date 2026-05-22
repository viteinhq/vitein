import {
  createLayoutRegistry,
  createThemeRegistry,
  type ThemeTokens,
} from '@vitein/template-engine';

/**
 * Community-only theme + layout registries for the open-source web build
 * (ADR 0011). The hosted build registers premium themes on top via the
 * extension hook.
 */
export const themeRegistry = createThemeRegistry();
export const layoutRegistry = createLayoutRegistry();

/**
 * Resolve a theme id to inline CSS custom-property declarations, for use as
 * the `style` of a theme-scope wrapper. Each token maps onto the matching
 * `@theme` variable in `app.css`, so token-classed markup inside the scope
 * restyles itself. Unknown ids fall back to the baseline theme.
 */
export function themeStyle(themeId: string): string {
  return cssVars(themeRegistry.resolve(themeId).tokens);
}

function cssVars(t: ThemeTokens): string {
  return [
    `--color-paper:${t.colors.paper}`,
    `--color-paper-2:${t.colors.paper2}`,
    `--color-ink:${t.colors.ink}`,
    `--color-ink-muted:${t.colors.inkMuted}`,
    `--color-rule:${t.colors.rule}`,
    `--color-card:${t.colors.card}`,
    `--color-accent:${t.colors.accent}`,
    `--color-accent-ink:${t.colors.accentInk}`,
    `--color-coral:${t.colors.coral}`,
    `--color-coral-deep:${t.colors.coralDeep}`,
    `--font-display:${t.fonts.display}`,
    `--font-sans:${t.fonts.sans}`,
    `--font-serif:${t.fonts.serif}`,
    `--font-mono:${t.fonts.mono}`,
    `--radius-card:${t.radiusCard}`,
    `--tracking-display:${t.displayTracking}`,
  ].join(';');
}
