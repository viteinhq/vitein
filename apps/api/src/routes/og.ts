import { Hono } from 'hono';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
// Wrangler bundles the .wasm import as a WebAssembly.Module at build time —
// workerd refuses runtime WebAssembly.instantiate of raw bytes, so the
// bundler path is the only one that works. The TS shim in
// `apps/api/src/types/wasm.d.ts` types the import.
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';
import satori from 'satori';
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

// Inter 700 fetched the first time and cached for the isolate's
// lifetime. ~30 KB pull; warm calls hit memory.
let cachedFont: ArrayBuffer | null = null;
async function loadFont(): Promise<ArrayBuffer> {
  if (cachedFont) return cachedFont;
  const cssRes = await fetch(
    'https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap',
    { headers: { 'User-Agent': 'Mozilla/5.0' } },
  );
  const css = await cssRes.text();
  const match = /url\(['"]?([^'")]+)['"]?\)/.exec(css);
  if (!match?.[1]) throw new Error('font_url_not_found');
  const fontRes = await fetch(match[1]);
  cachedFont = await fontRes.arrayBuffer();
  return cachedFont;
}

/**
 * GET /v1/og/save-the-date/:slug.png — dynamic Open Graph image for the
 * Save the Date preview. Renders a 1200×630 PNG with the event title +
 * date on the brand accent. 404s for non-Plus events so the URL
 * doesn't enumerate.
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

  const date = formatDate(event.startsAt, event.timezone);
  const [font] = await Promise.all([loadFont(), ensureWasm()]);

  const element = buildElement(event.title, date);
  const svg = await satori(element, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [{ name: 'Inter', data: font, weight: 700, style: 'normal' }],
  });
  const png = new Resvg(svg).render().asPng();

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
});

function buildElement(title: string, date: string): object {
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
        backgroundColor: '#e3ff3a',
        color: '#0a0a0a',
        fontFamily: 'Inter',
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
              fontWeight: 700,
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
                    fontWeight: 700,
                    letterSpacing: '-3px',
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
                          fontWeight: 700,
                          opacity: 0.6,
                        },
                        children: 'When',
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          display: 'flex',
                          fontSize: 48,
                          fontWeight: 700,
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

function formatDate(iso: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
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
