import type { Template, TemplateTokens } from './types.js';

/**
 * The community templates share the app's self-hosted webfont stacks
 * (mirrored from `apps/web/src/app.css`); only `serif` swaps its display
 * face for the serif stack.
 */
const FONTS: TemplateTokens['fonts'] = {
  display: "'Bricolage Grotesque Variable', system-ui, -apple-system, 'Segoe UI', sans-serif",
  sans: "'Geist Variable', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'",
  serif: "'Instrument Serif', 'Times New Roman', Georgia, serif",
  mono: "'Geist Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace",
};

/**
 * The four open community templates shipped with vite.in.
 *
 * `classic` is the baseline: its tokens are byte-identical to
 * `apps/web/src/app.css`, so every existing event renders unchanged after
 * the `template_id` migration defaults them to it.
 *
 * The `noir` / `paper` / `serif` palettes are a first pass — the exact hex
 * values and per-theme WCAG-AA contrast are open to design review.
 */
export const communityTemplates: Template[] = [
  {
    id: 'classic',
    name: 'template_classic_name',
    tier: 'free',
    origin: 'community',
    layout: 'standard',
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
    name: 'template_noir_name',
    tier: 'free',
    origin: 'community',
    layout: 'standard',
    tokens: {
      colors: {
        paper: '#0a0a0a',
        paper2: '#161616',
        ink: '#f1eee7',
        inkMuted: 'rgba(241, 238, 231, 0.62)',
        rule: 'rgba(241, 238, 231, 0.14)',
        card: '#161616',
        accent: '#e3ff3a',
        accentInk: '#0a0a0a',
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
    name: 'template_paper_name',
    tier: 'free',
    origin: 'community',
    layout: 'standard',
    tokens: {
      colors: {
        paper: '#f3efe6',
        paper2: '#e8e2d4',
        ink: '#0a0a0a',
        inkMuted: '#6b6863',
        rule: 'rgba(10, 10, 10, 0.12)',
        card: '#fdfbf6',
        accent: '#bf3413',
        accentInk: '#ffffff',
        coral: '#ff5436',
        coralDeep: '#bf3413',
      },
      fonts: FONTS,
      radiusCard: '22px',
      displayTracking: '-0.05em',
    },
  },
  {
    id: 'serif',
    name: 'template_serif_name',
    tier: 'free',
    origin: 'community',
    layout: 'standard',
    tokens: {
      colors: {
        paper: '#faf6ee',
        paper2: '#efe9db',
        ink: '#1a1612',
        inkMuted: 'rgba(26, 22, 18, 0.62)',
        rule: 'rgba(26, 22, 18, 0.14)',
        card: '#fffdf8',
        accent: '#e3ff3a',
        accentInk: '#1a1612',
        coral: '#ff5436',
        coralDeep: '#bf3413',
      },
      fonts: { ...FONTS, display: FONTS.serif },
      radiusCard: '14px',
      displayTracking: 'normal',
    },
  },
];
