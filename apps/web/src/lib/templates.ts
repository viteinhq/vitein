import { createTemplateRegistry, type TemplateTokens } from '@vitein/template-engine';

/**
 * Community-only template registry for the open-source web build. The
 * hosted build registers premium templates on top via the extension hook
 * (ADR 0009).
 */
export const templateRegistry = createTemplateRegistry();

/**
 * Resolve a template id to inline CSS custom-property declarations, for use
 * as the `style` of a theme-scope wrapper. Each token maps onto the
 * matching `@theme` variable in `app.css`, so token-classed markup inside
 * the scope restyles itself. Unknown ids fall back to the baseline.
 */
export function templateStyle(templateId: string): string {
  return cssVars(templateRegistry.resolve(templateId).tokens);
}

function cssVars(t: TemplateTokens): string {
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
