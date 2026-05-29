import type { Theme, ThemeTokens } from './types.js';

/**
 * `fonts` here is a fallback stack used when no font pairing is applied
 * on top of a theme — kept so the theme tokens stay self-sufficient. In
 * the production flow the active `FontPairing` overrides these on the
 * scope.
 */
const FONTS: ThemeTokens['fonts'] = {
  display: "'Bricolage Grotesque Variable', system-ui, -apple-system, 'Segoe UI', sans-serif",
  sans: "'Geist Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'",
  serif: "'Instrument Serif', 'Times New Roman', Georgia, serif",
  mono: "'Geist Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace",
};

/**
 * The eight open community palettes — Axis 2 of the design engine
 * (2026-05-26). All are `free` (no premium gate) per the theme-engine
 * decision: extending vite.in's range is part of the core platform.
 *
 * `volt` is the baseline. Its tokens are byte-identical to what the
 * previous `classic` palette shipped, so existing events rendering
 * with the old id keep working after the migration renames their
 * `template_id` value to `volt`.
 *
 * The `serif` palette from the pre-engine catalogue is gone — it
 * mixed palette and font, which is exactly what the third axis
 * separates. The migration moves `serif` rows to `paper` + the
 * `instrument-instrument` font pairing.
 */
export const communityThemes: Theme[] = [
  {
    id: 'volt',
    name: 'theme_volt_name',
    tier: 'free',
    origin: 'community',
    tokens: {
      colors: {
        paper: '#f1eee7',
        paper2: '#e8e4dc',
        ink: '#0a0a0a',
        inkMuted: '#6b6863',
        rule: 'rgba(10, 10, 10, 0.12)',
        card: '#ffffff',
        accent: '#e3ff3a',
        accentInk: '#0a0a0a',
        accentInkMuted: '#65711e',
        coral: '#ff5436',
        coralDeep: '#bf3413',
      },
      fonts: FONTS,
      radiusCard: '22px',
      displayTracking: '-0.05em',
    },
  },
  {
    id: 'noir',
    name: 'theme_noir_name',
    tier: 'free',
    origin: 'community',
    tokens: {
      colors: {
        paper: '#0d0d0d',
        paper2: '#161616',
        ink: '#f1eee7',
        inkMuted: 'rgba(241, 238, 231, 0.62)',
        rule: 'rgba(241, 238, 231, 0.14)',
        card: '#1a1a1a',
        accent: '#e3ff3a',
        accentInk: '#0a0a0a',
        accentInkMuted: '#65711e',
        coral: '#ff5436',
        coralDeep: '#ff7a63',
      },
      fonts: FONTS,
      radiusCard: '22px',
      displayTracking: '-0.05em',
    },
  },
  {
    id: 'paper',
    name: 'theme_paper_name',
    tier: 'free',
    origin: 'community',
    tokens: {
      colors: {
        paper: '#f3efe6',
        paper2: '#e8e2d4',
        ink: '#1a1612',
        inkMuted: '#6e5e4d',
        rule: 'rgba(26, 22, 18, 0.14)',
        card: '#fbf7ee',
        accent: '#a35a30',
        accentInk: '#fbf7ee',
        accentInkMuted: '#f9f4ea',
        coral: '#7a4a2a',
        coralDeep: '#5a3318',
      },
      fonts: FONTS,
      radiusCard: '18px',
      displayTracking: '-0.04em',
    },
  },
  {
    id: 'press',
    name: 'theme_press_name',
    tier: 'free',
    origin: 'community',
    tokens: {
      colors: {
        paper: '#f5f1e8',
        paper2: '#ebe6d8',
        ink: '#0a0a0a',
        inkMuted: '#5a554c',
        rule: 'rgba(10, 10, 10, 0.18)',
        card: '#ffffff',
        accent: '#1a3dbf',
        accentInk: '#ffffff',
        accentInkMuted: '#b6c1eb',
        coral: '#d6442a',
        coralDeep: '#a02e1c',
      },
      fonts: FONTS,
      radiusCard: '14px',
      displayTracking: '-0.04em',
    },
  },
  {
    id: 'sorbet',
    name: 'theme_sorbet_name',
    tier: 'free',
    origin: 'community',
    tokens: {
      colors: {
        paper: '#f6e3df',
        paper2: '#efd5cf',
        ink: '#3a1f3a',
        inkMuted: '#7d5772',
        rule: 'rgba(58, 31, 58, 0.16)',
        card: '#fff4ee',
        accent: '#e58aa8',
        accentInk: '#2a0f24',
        accentInkMuted: '#532a41',
        coral: '#7e57a8',
        coralDeep: '#5a3a82',
      },
      fonts: FONTS,
      radiusCard: '22px',
      displayTracking: '-0.04em',
    },
  },
  {
    id: 'garden',
    name: 'theme_garden_name',
    tier: 'free',
    origin: 'community',
    tokens: {
      colors: {
        paper: '#eee9d8',
        paper2: '#e3ddc9',
        ink: '#1f2a1a',
        inkMuted: '#5a6e44',
        rule: 'rgba(31, 42, 26, 0.16)',
        card: '#f8f3e1',
        accent: '#557029',
        accentInk: '#f8f3e1',
        accentInkMuted: '#eeebd6',
        coral: '#c25a3a',
        coralDeep: '#8e3f25',
      },
      fonts: FONTS,
      radiusCard: '20px',
      displayTracking: '-0.04em',
    },
  },
  {
    id: 'hot',
    name: 'theme_hot_name',
    tier: 'free',
    origin: 'community',
    tokens: {
      colors: {
        paper: '#0a0a0a',
        paper2: '#161616',
        ink: '#fff7f0',
        inkMuted: 'rgba(255, 247, 240, 0.62)',
        rule: 'rgba(255, 247, 240, 0.16)',
        card: '#1a1a1a',
        accent: '#ff2e8a',
        accentInk: '#0a0a0a',
        accentInkMuted: '#3b1124',
        coral: '#ffd23a',
        coralDeep: '#c9a017',
      },
      fonts: FONTS,
      radiusCard: '22px',
      displayTracking: '-0.05em',
    },
  },
  {
    id: 'sand',
    name: 'theme_sand_name',
    tier: 'free',
    origin: 'community',
    tokens: {
      colors: {
        paper: '#e6d6b8',
        paper2: '#d9c8a6',
        ink: '#2a1e10',
        inkMuted: '#66492b',
        rule: 'rgba(42, 30, 16, 0.18)',
        card: '#f0e2c6',
        accent: '#c8842a',
        accentInk: '#2a1e10',
        accentInkMuted: '#372612',
        coral: '#7a3e1a',
        coralDeep: '#5a2c0f',
      },
      fonts: FONTS,
      radiusCard: '18px',
      displayTracking: '-0.04em',
    },
  },
];
