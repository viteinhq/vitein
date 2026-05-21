/**
 * Which tier unlocks a template. `free` templates are available to every
 * event, paid or not; `basic` templates are unlocked by the Basic tier
 * (the entry paid tier — see ADR 0009).
 */
export type TemplateTier = 'free' | 'basic';

/**
 * Provenance. `community` templates ship in this open-source package;
 * `premium` templates are registered at runtime from the private
 * vitein-premium package via the extension hook — they never live here.
 */
export type TemplateOrigin = 'community' | 'premium';

/**
 * A template's visual layer: values for the design tokens defined as CSS
 * custom properties in `apps/web/src/app.css`'s `@theme` block. The
 * renderer maps each field onto its `--color-*` / `--font-*` / `--radius-*`
 * variable on a scope wrapping the event.
 */
export interface TemplateTokens {
  colors: {
    paper: string;
    paper2: string;
    ink: string;
    inkMuted: string;
    rule: string;
    card: string;
    accent: string;
    accentInk: string;
    coral: string;
    coralDeep: string;
  };
  fonts: {
    display: string;
    sans: string;
    serif: string;
    mono: string;
  };
  radiusCard: string;
  /**
   * `letter-spacing` for display headings. A geometric display sans wants
   * it tight; a display serif wants it relaxed — so it is per-template.
   */
  displayTracking: string;
}

export interface Template {
  /** Stable registry key; persisted on `events.template_id`. */
  id: string;
  /** Paraglide message key for the display name — never literal text. */
  name: string;
  tier: TemplateTier;
  origin: TemplateOrigin;
  tokens: TemplateTokens;
  /** Layout variant. Only `standard` exists in M1; M2 adds more. */
  layout: 'standard';
  /**
   * Phase-3 hook: a template may later declare extra structured content
   * fields (e.g. an Indian-wedding template's multi-day functions).
   * Deliberately unshaped and unused in M1 — see ADR 0009.
   */
  contentModel?: unknown;
}
