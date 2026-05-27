import { Hono } from 'hono';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
// Wrangler bundles the .wasm import as a WebAssembly.Module at build time —
// workerd refuses runtime WebAssembly.instantiate of raw bytes, so the
// bundler path is the only one that works. The TS shim in
// `apps/api/src/types/wasm.d.ts` types the import.
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';
import satori from 'satori';
import { fontPairingRegistry, themeRegistry } from '../domain/events/themes.js';
import { getEventBySlug } from '../domain/events/events.js';
import { tierOf } from '../domain/payments/payments.js';
import { db } from '../infra/db.js';
import type { AppVariables, Env } from '../types/env.js';

export const ogRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const WIDTH = 1200;
const HEIGHT = 630;

// One-shot WASM init per isolate. resvg-wasm's initWasm throws on
// double-init, so cache the promise.
let wasmReady: Promise<void> | null = null;
function ensureWasm(): Promise<void> {
  if (!wasmReady) wasmReady = initWasm(resvgWasm);
  return wasmReady;
}

/**
 * For each font-pairing id, the Google-Fonts CSS endpoint that resolves
 * to the display font we want to draw the title in. Satori needs the
 * raw font bytes (not a font stack), so a per-pairing fetch is the
 * cost of correctness — and the cached map below pays it only on the
 * first request per isolate per pairing.
 */
interface FontSpec {
  family: string;
  cssUrl: string;
  weight: 400 | 500 | 600 | 700 | 800;
  style: 'normal' | 'italic';
}

const FONT_SPECS: Record<string, FontSpec> = {
  // Bricolage Grotesque doesn't ship italic on Google Fonts (browsers
  // synthesise the slant via the variable font on the page; satori
  // won't, so the OG image renders upright). Roman 700 is the closest
  // truthful version of the pairing's display.
  'bricolage-geist': {
    family: 'Bricolage Grotesque',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700',
    weight: 700,
    style: 'normal',
  },
  'instrument-geist': {
    family: 'Instrument Serif',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1',
    weight: 400,
    style: 'italic',
  },
  'space-inter': {
    family: 'Space Grotesk',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600',
    weight: 600,
    style: 'normal',
  },
  'bricolage-mono': {
    family: 'Bricolage Grotesque',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700',
    weight: 700,
    style: 'normal',
  },
  'instrument-instrument': {
    family: 'Instrument Serif',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1',
    weight: 400,
    style: 'italic',
  },
  'geist-geist': {
    family: 'Geist',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Geist:wght@800',
    weight: 800,
    style: 'normal',
  },
};

// Per-pairing font cache. Each pairing fetches once per isolate; warm
// invocations of the same pairing hit memory.
const cachedFonts = new Map<string, ArrayBuffer>();

async function loadFontFor(fontPairingId: string): Promise<{ spec: FontSpec; data: ArrayBuffer }> {
  const spec = FONT_SPECS[fontPairingId] ?? FONT_SPECS['bricolage-geist'];
  if (!spec) throw new Error('font_spec_missing');

  const cached = cachedFonts.get(fontPairingId);
  if (cached) return { spec, data: cached };

  const cssRes = await fetch(spec.cssUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const css = await cssRes.text();
  const match = /url\(['"]?([^'")]+)['"]?\)/.exec(css);
  if (!match?.[1]) throw new Error(`font_url_not_found_${fontPairingId}`);
  const fontRes = await fetch(match[1]);
  const data = await fontRes.arrayBuffer();
  cachedFonts.set(fontPairingId, data);
  return { spec, data };
}

/**
 * GET /v1/og/save-the-date/:slug.png — dynamic Open Graph image for the
 * Save the Date preview. Renders a 1200×630 PNG that picks up the
 * event's chosen theme (palette accent + accentInk) and font pairing
 * (display family + style + weight + tracking). 404s for non-Plus
 * events so the URL doesn't enumerate.
 *
 * Lives here (API worker) rather than in the SvelteKit app because
 * wrangler natively bundles `.wasm` imports as `WebAssembly.Module`,
 * which workerd requires — Vite's plugin landscape for WASM in the
 * Pages adapter is a moving target.
 */
ogRoute.get('/save-the-date/:slug{.+\\.png}', async (c) => {
  const param = c.req.param('slug');
  // The route grabs `<slug>.png`; the actual slug is everything before
  // the `.png` suffix.
  const slug = param.replace(/\.png$/i, '');
  if (!slug) return c.text('Not found', 404);

  let event: Awaited<ReturnType<typeof getEventBySlug>>;
  try {
    event = await getEventBySlug(db(c), slug);
  } catch {
    return c.text('Not found', 404);
  }
  if (!tierOf(event) || tierOf(event) !== 'plus') {
    return c.text('Not found', 404);
  }

  const locale = event.defaultLocale || 'en';
  const date = formatDate(event.startsAt, event.timezone, locale);

  // Resolve theme + font pairing. The engine's `resolve()` falls back
  // to the baseline entries if an event's stored id has since been
  // retired (e.g. legacy `classic`/`serif` rows pre-migration).
  const theme = themeRegistry.resolve(event.themeId);
  const pairing = fontPairingRegistry.resolve(event.fontPairing);

  const [{ spec, data: font }] = await Promise.all([loadFontFor(pairing.id), ensureWasm()]);

  const element = buildElement(event.title, date, locale, theme.tokens.colors, pairing, spec);
  const svg = await satori(element, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [{ name: spec.family, data: font, weight: spec.weight, style: spec.style }],
  });
  const png = new Resvg(svg).render().asPng();

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
});

/**
 * `Save the Date` is a loanword that's left untranslated across our
 * locales (see `apps/web/messages/*.json`'s `std_eyebrow`), so we keep
 * a single string for the eyebrow. `When` differs — small per-locale
 * table avoids dragging i18n-messages into the API worker.
 */
const WHEN_LABEL: Record<string, string> = {
  en: 'When',
  de: 'Wann',
  fr: 'Quand',
  es: 'Cuándo',
  it: 'Quando',
  nl: 'Wanneer',
  pt: 'Quando',
  pl: 'Kiedy',
  ja: '日時',
  ko: '일시',
  zh: '时间',
  hi: 'कब',
  bn: 'কখন',
  gu: 'ક્યારે',
  kn: 'ಯಾವಾಗ',
  ml: 'എപ്പോൾ',
  mr: 'केव്हा',
  pa: 'ਕਦੋਂ',
  ta: 'எப்போது',
  te: 'ఎప్పుడు',
};

function whenLabel(locale: string): string {
  const base = locale.toLowerCase().split('-')[0] ?? 'en';
  return WHEN_LABEL[base] ?? WHEN_LABEL.en ?? 'When';
}

interface PaletteColors {
  accent: string;
  accentInk: string;
}

interface PairingTokens {
  displayStyle: 'italic' | 'normal';
  displayWeight: number;
  tracking: string;
}

function buildElement(
  title: string,
  date: string,
  locale: string,
  colors: PaletteColors,
  pairing: PairingTokens,
  spec: FontSpec,
): object {
  // The display style on the page can be italic; the OG image's font
  // file is loaded for a specific style though, so the satori element
  // must declare exactly the style/weight we asked Google Fonts for
  // — anything else falls back at render time.
  const displayStyle = spec.style;
  const displayWeight = spec.weight;
  return {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '80px',
        backgroundColor: colors.accent,
        color: colors.accentInk,
        fontFamily: spec.family,
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: 22,
              letterSpacing: '4px',
              textTransform: 'uppercase',
              fontStyle: displayStyle,
              fontWeight: displayWeight,
              opacity: 0.7,
            },
            children: 'Save the Date',
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column' },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontSize: 96,
                    lineHeight: 0.95,
                    fontStyle: displayStyle,
                    fontWeight: displayWeight,
                    letterSpacing: pairing.tracking,
                  },
                  children: truncate(title, 60),
                },
              },
              {
                type: 'div',
                props: {
                  style: { display: 'flex', flexDirection: 'column', marginTop: 32 },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          fontSize: 18,
                          letterSpacing: '2px',
                          textTransform: 'uppercase',
                          fontStyle: displayStyle,
                          fontWeight: displayWeight,
                          opacity: 0.6,
                        },
                        children: whenLabel(locale),
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          fontSize: 48,
                          fontStyle: displayStyle,
                          fontWeight: displayWeight,
                          letterSpacing: '-1px',
                          marginTop: 12,
                        },
                        children: date,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

function formatDate(iso: Date, timezone: string, locale: string): string {
  // Intl.DateTimeFormat accepts BCP-47 tags directly; if the locale is
  // unknown to the runtime it falls back to the closest match (often
  // English), which is the desired behaviour here.
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  }).format(iso);
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + '…';
}
