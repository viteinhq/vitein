import { Resvg, initWasm } from '@resvg/resvg-wasm';
import satori from 'satori';
import { getEventBySlug } from '@vitein/ts-sdk';
import { configureApi } from '$lib/api';
import type { RequestHandler } from './$types';

// resvg-wasm version this fetcher targets — keep in sync with package.json.
const RESVG_WASM_URL = 'https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm';

const WIDTH = 1200;
const HEIGHT = 630;

function resolveBaseUrl(platform: App.Platform | undefined): string {
  return platform?.env?.API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:8787';
}

// One-shot WASM init per isolate. resvg-wasm's initWasm throws on a
// double-init, so the cached promise + guard. We fetch the WASM at
// runtime from unpkg rather than bundling it — the bundler-import path
// requires fragile TS shims and Vite plugin coordination, and the
// one-off ~200 KB pull from unpkg is paid once per isolate.
let wasmReady: Promise<void> | null = null;
function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    wasmReady = (async () => {
      const res = await fetch(RESVG_WASM_URL);
      if (!res.ok) throw new Error(`resvg_wasm_fetch_failed_${String(res.status)}`);
      const buf = await res.arrayBuffer();
      await initWasm(buf);
    })();
  }
  return wasmReady;
}

// Inter 700 fetched on the first OG request and cached for the lifetime
// of the isolate. Google Fonts' CDN is fast enough that the one-off
// latency is tolerable; bundling the font would add ~30 KB to the
// server bundle without much benefit.
let cachedFont: ArrayBuffer | null = null;
async function loadFont(): Promise<ArrayBuffer> {
  if (cachedFont) return cachedFont;
  const cssRes = await fetch(
    'https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap',
    { headers: { 'User-Agent': 'Mozilla/5.0' } },
  );
  const css = await cssRes.text();
  const match = /url\(['"]?([^'")]+)['"]?\)/.exec(css);
  if (!match?.[1]) throw new Error('font_url_not_found_in_google_fonts_css');
  const fontRes = await fetch(match[1]);
  cachedFont = await fontRes.arrayBuffer();
  return cachedFont;
}

/**
 * Dynamic OG image for the Save the Date preview, generated with satori
 * (HTML/JSX → SVG) and @resvg/resvg-wasm (SVG → PNG). Replaces the
 * previous @vercel/og attempt which crashed at import time inside
 * Cloudflare workerd with the `Invalid URL string.` node:url legacy
 * parse error. Going through the engines directly sidesteps the
 * wrapper's URL resolution and gives us deterministic WASM loading.
 */
export const GET: RequestHandler = async ({ params, platform }) => {
  configureApi(resolveBaseUrl(platform));

  const { data, error } = await getEventBySlug({ path: { slug: params.slug } });
  if (error || !data) return new Response('Event not found', { status: 404 });
  if (data.tier !== 'plus') return new Response('Not found', { status: 404 });

  // Format date in the event's own timezone so the OG image matches the
  // public STD page, not the request's resolved zone.
  const date = formatDate(data.startsAt, data.timezone);

  const [font] = await Promise.all([loadFont(), ensureWasm()]);

  const element = buildElement(data.title, date);
  const svg = await satori(element as Parameters<typeof satori>[0], {
    width: WIDTH,
    height: HEIGHT,
    fonts: [{ name: 'Inter', data: font, weight: 700, style: 'normal' }],
  });

  // Resvg returns a Uint8Array; modern TS's generic Uint8Array<ArrayBufferLike>
  // type doesn't structurally match Response's BodyInit union, so cast at
  // the boundary. Runtime accepts the typed array fine.
  const png = new Resvg(svg).render().asPng();

  return new Response(png as unknown as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      // Same image content for the lifetime of the event's title + date;
      // tolerate a day of edge caching.
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
};

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

function formatDate(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  }).format(new Date(iso));
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + '…';
}
