import {
  createFontPairingRegistry,
  createLayoutRegistry,
  createThemeRegistry,
  type FontPairing,
  type ThemeTokens,
} from '@vitein/template-engine';

/**
 * Community-only theme / layout / font-pairing registries for the
 * open-source web build (ADR 0011 + 2026-05-26 theme-engine
 * expansion). The hosted build registers premium themes on top via
 * the extension hook.
 */
export const themeRegistry = createThemeRegistry();
export const layoutRegistry = createLayoutRegistry();
export const fontPairingRegistry = createFontPairingRegistry();

/**
 * Resolve a theme id to inline CSS custom-property declarations, for use as
 * the `style` of a theme-scope wrapper. Each token maps onto the matching
 * `@theme` variable in `app.css`, so token-classed markup inside the scope
 * restyles itself. Unknown ids fall back to the baseline theme.
 */
export function themeStyle(themeId: string): string {
  return themeCssVars(themeRegistry.resolve(themeId).tokens);
}

/**
 * Resolve a font-pairing id to inline CSS custom-property declarations
 * for the same `style` slot. Combine with {@link themeStyle} by joining
 * with `;` — both push onto the same set of font variables that the
 * theme tokens supply, with the font pairing winning where they collide
 * (display / sans / mono). Display tracking and weight stay on the
 * theme — a pairing's tracking only seeds the picker preview.
 */
export function fontPairingStyle(fontPairingId: string): string {
  const p = fontPairingRegistry.resolve(fontPairingId);
  return fontPairingCssVars(p);
}

/**
 * Combine theme + font-pairing into a single inline-style string for an
 * event page scope. Convenience wrapper; the page can also call the two
 * individual helpers and `${}` them together.
 */
export function eventScopeStyle(themeId: string, fontPairingId: string): string {
  return `${themeStyle(themeId)};${fontPairingStyle(fontPairingId)}`;
}

function themeCssVars(t: ThemeTokens): string {
  return [
    `--color-paper:${t.colors.paper}`,
    `--color-paper-2:${t.colors.paper2}`,
    `--color-ink:${t.colors.ink}`,
    `--color-ink-muted:${t.colors.inkMuted}`,
    `--color-rule:${t.colors.rule}`,
    `--color-card:${t.colors.card}`,
    `--color-accent:${t.colors.accent}`,
    `--color-accent-ink:${t.colors.accentInk}`,
    `--color-accent-ink-muted:${t.colors.accentInkMuted}`,
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

function fontPairingCssVars(p: FontPairing): string {
  return [`--font-display:${p.display}`, `--font-sans:${p.body}`, `--font-mono:${p.mono}`].join(
    ';',
  );
}
