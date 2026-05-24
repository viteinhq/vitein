import { ImageResponse } from '@vercel/og';
import { getEventBySlug } from '@vitein/ts-sdk';
import { configureApi } from '$lib/api';
import type { RequestHandler } from './$types';

const WIDTH = 1200;
const HEIGHT = 630;

function resolveBaseUrl(platform: App.Platform | undefined): string {
  return platform?.env?.API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:8787';
}

/**
 * Diagnostic build — every stage is wrapped so a failure returns a
 * structured JSON identifying which step blew up. The previous
 * production behaviour (plain 500 with "Invalid URL string") gave no
 * trace into Sentry, and the classifier blocks wrangler tail. Once
 * the bad stage is identified the diagnostics come back out.
 */
export const GET: RequestHandler = async ({ params, platform }) => {
  const stages: Record<string, string> = {};
  try {
    stages['1_resolveBaseUrl'] = 'start';
    const baseUrl = resolveBaseUrl(platform);
    stages['1_resolveBaseUrl'] = `ok (${baseUrl})`;

    stages['2_configureApi'] = 'start';
    configureApi(baseUrl);
    stages['2_configureApi'] = 'ok';

    stages['3_getEventBySlug'] = 'start';
    const { data, error } = await getEventBySlug({ path: { slug: params.slug } });
    stages['3_getEventBySlug'] = error ? `api_error_${String(error.error?.code ?? '?')}` : 'ok';
    if (error || !data) {
      return debugResponse(404, 'event_not_found', stages);
    }
    if (data.tier !== 'plus') {
      return debugResponse(404, 'not_plus_tier', stages);
    }

    stages['4_format_date'] = 'start';
    const date = formatDate(data.startsAt, data.timezone);
    stages['4_format_date'] = `ok (${date})`;

    stages['5_load_font'] = 'start';
    const font = await loadFont();
    stages['5_load_font'] = `ok (${String(font.byteLength)} bytes)`;

    stages['6_build_element'] = 'start';
    const element = buildElement(data.title, date);
    stages['6_build_element'] = 'ok';

    stages['7_new_image_response'] = 'start';
    const response = new ImageResponse(element, {
      width: WIDTH,
      height: HEIGHT,
      fonts: [{ name: 'Inter', data: font, weight: 700, style: 'normal' }],
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
    stages['7_new_image_response'] = 'ok';
    return response;
  } catch (err) {
    return debugResponse(500, 'unhandled', stages, err);
  }
};

let cachedFont: ArrayBuffer | null = null;

async function loadFont(): Promise<ArrayBuffer> {
  if (cachedFont) return cachedFont;
  const cssRes = await fetch(
    'https://fonts.googleapis.com/css2?family=Inter:wght@700&display=swap',
    { headers: { 'User-Agent': 'Mozilla/5.0' } },
  );
  const css = await cssRes.text();
  const match = /url\(['"]?([^'")]+)['"]?\)/.exec(css);
  if (!match?.[1]) throw new Error('font_url_not_found_in_css');
  const fontRes = await fetch(match[1]);
  cachedFont = await fontRes.arrayBuffer();
  return cachedFont;
}

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
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: 22,
              letterSpacing: '0.18em',
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
            style: { display: 'flex', flexDirection: 'column', gap: 40 },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontSize: 96,
                    lineHeight: 0.95,
                    fontWeight: 700,
                    letterSpacing: '-0.04em',
                  },
                  children: truncate(title, 60),
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
                          fontSize: 18,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          opacity: 0.6,
                          fontWeight: 700,
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
                          letterSpacing: '-0.01em',
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

function debugResponse(
  status: number,
  reason: string,
  stages: Record<string, string>,
  err?: unknown,
): Response {
  const errInfo = err
    ? {
        name: err instanceof Error ? err.name : 'unknown',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack?.split('\n').slice(0, 6) : undefined,
      }
    : undefined;
  return new Response(JSON.stringify({ reason, stages, err: errInfo }, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
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
