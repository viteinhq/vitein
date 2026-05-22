/**
 * Which tier unlocks an item. `free` is available to every event, paid or
 * not; `basic` unlocks with the Basic tier (the entry paid tier). See
 * ADR 0009 / 0011.
 */
export type Tier = 'free' | 'basic';

/**
 * Provenance. `community` items ship in this open-source package;
 * `premium` items register at runtime from the private vitein-premium
 * package via the extension hook — they never live here.
 */
export type Origin = 'community' | 'premium';

/**
 * A theme's design tokens: values for the CSS custom properties in
 * `apps/web/src/app.css`'s `@theme` block. The renderer maps each field
 * onto its `--color-*` / `--font-*` / `--radius-*` variable on a scope
 * wrapping the event.
 */
export interface ThemeTokens {
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
   * it tight; a display serif wants it relaxed — so it is per-theme.
   */
  displayTracking: string;
}

/**
 * A colour/type theme — one of the two orthogonal axes of an event's
 * design (ADR 0011). Pure data, applied as CSS variables on a scope.
 */
export interface Theme {
  /** Stable registry key; persisted on `events.template_id`. */
  id: string;
  /** Paraglide message key for the display name — never literal text. */
  name: string;
  tier: Tier;
  origin: Origin;
  tokens: ThemeTokens;
}

/**
 * A layout — the structural arrangement of the event page, the other
 * orthogonal axis (ADR 0011). This is the descriptor only: the rendering
 * components live in `apps/web`, keyed by `id`. Layouts are open-source.
 */
export interface Layout {
  /** Stable registry key; persisted on `events.layout`. */
  id: string;
  /** Paraglide message key for the display name. */
  name: string;
  tier: Tier;
  origin: Origin;
}

/**
 * A curated premium preset composing a layout, a theme and optional
 * premium layers (ADR 0011). Produced by the private vitein-premium
 * package — no presets ship in this open-source repo; only the type does.
 */
export interface Template {
  id: string;
  name: string;
  origin: Origin;
  /** Layout id this preset applies. */
  layout: string;
  /** Theme id this preset applies. */
  theme: string;
  /**
   * Phase-3 hook: a preset may later declare extra structured content
   * fields (e.g. an Indian-wedding template's multi-day functions).
   */
  contentModel?: unknown;
}
