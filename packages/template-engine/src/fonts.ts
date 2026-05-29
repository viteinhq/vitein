import type { FontPairing } from './types.js';

/**
 * The six community type pairings (the third axis of the design engine,
 * added after ADR 0011). Pure data — the renderer maps each font stack
 * onto the `--font-display` / `--font-sans` / `--font-mono` CSS variables
 * on a scope wrapping the event. The display headline picks up
 * `displayStyle` / `displayWeight` / `tracking` separately.
 *
 * Font stacks are written to fall back gracefully: every entry ends in a
 * system family that ships everywhere, so a network blip on the webfont
 * never leaves the page unstyled.
 *
 * `bricolage-geist` is the baseline — its values match the current
 * `apps/web/src/app.css` typography exactly so the default render stays
 * byte-identical to today.
 */
export const communityFontPairings: FontPairing[] = [
  {
    id: 'bricolage-geist',
    name: 'font_bricolage_geist_name',
    tier: 'free',
    origin: 'community',
    display: "'Bricolage Grotesque Variable', system-ui, -apple-system, 'Segoe UI', sans-serif",
    body: "'Geist Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'",
    mono: "'Geist Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace",
    displayStyle: 'italic',
    displayWeight: 700,
    tracking: '-0.045em',
  },
  {
    id: 'instrument-geist',
    name: 'font_instrument_geist_name',
    tier: 'free',
    origin: 'community',
    display: "'Instrument Serif', 'Times New Roman', Georgia, serif",
    body: "'Geist Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'",
    mono: "'Geist Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace",
    displayStyle: 'italic',
    displayWeight: 400,
    tracking: '-0.025em',
  },
  {
    id: 'space-inter',
    name: 'font_space_inter_name',
    tier: 'free',
    origin: 'community',
    display: "'Space Grotesk Variable', system-ui, -apple-system, 'Segoe UI', sans-serif",
    body: "'Inter Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    mono: "'JetBrains Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace",
    displayStyle: 'normal',
    displayWeight: 600,
    tracking: '-0.035em',
  },
  {
    id: 'bricolage-mono',
    name: 'font_bricolage_mono_name',
    tier: 'free',
    origin: 'community',
    display: "'Bricolage Grotesque Variable', system-ui, -apple-system, 'Segoe UI', sans-serif",
    body: "'Geist Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace",
    mono: "'Geist Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace",
    displayStyle: 'normal',
    displayWeight: 700,
    tracking: '-0.045em',
  },
  {
    id: 'instrument-instrument',
    name: 'font_instrument_instrument_name',
    tier: 'free',
    origin: 'community',
    display: "'Instrument Serif', 'Times New Roman', Georgia, serif",
    body: "'Instrument Serif', 'Times New Roman', Georgia, serif",
    mono: "'Geist Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace",
    displayStyle: 'italic',
    displayWeight: 400,
    tracking: '-0.02em',
  },
  {
    id: 'geist-geist',
    name: 'font_geist_geist_name',
    tier: 'free',
    origin: 'community',
    display:
      "'Geist Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
    body: "'Geist Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
    mono: "'Geist Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace",
    displayStyle: 'normal',
    displayWeight: 800,
    tracking: '-0.04em',
  },
];
