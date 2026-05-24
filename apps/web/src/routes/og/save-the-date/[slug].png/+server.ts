import { ImageResponse } from '@vercel/og';
import { error as httpError } from '@sveltejs/kit';
import { getEventBySlug } from '@vitein/ts-sdk';
import { configureApi } from '$lib/api';
import type { RequestHandler } from './$types';

const WIDTH = 1200;
const HEIGHT = 630;

function resolveBaseUrl(platform: App.Platform | undefined): string {
  return platform?.env?.API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:8787';
}

/**
 * Dynamic OG image for the Save the Date preview. Satori (via @vercel/og)
 * renders a single-screen card with the event title + date on the brand
 * accent. Defaults to the bundled Noto Sans Latin — keeps the bundle
 * footprint minimal at the cost of "Bricolage Grotesque on the website,
 * Noto Sans in the share preview" — acceptable for v1.
 *
 * The route returns 404 for non-Plus events: Save the Date is a Plus
 * tier feature, and the existence of an OG endpoint should not leak the
 * event metadata for tiers that don't have the public STD page either.
 */
export const GET: RequestHandler = async ({ params, platform }) => {
  configureApi(resolveBaseUrl(platform));

  const { data, error } = await getEventBySlug({ path: { slug: params.slug } });
  if (error || !data) throw httpError(404, 'Event not found');
  if (data.tier !== 'plus') throw httpError(404, 'Not found');

  // Format date in the event's own timezone so the OG image matches
  // what the public STD page shows, not whatever zone the request
  // resolved to.
  const date = formatDate(data.startsAt, data.timezone);

  const element = {
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
        fontFamily: 'sans-serif',
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
              fontWeight: 500,
              opacity: 0.7,
            },
            children: 'Save the Date',
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: 40,
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    fontSize: 96,
                    lineHeight: 0.95,
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                  },
                  children: truncate(data.title, 60),
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'column',
                  },
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

  // Satori's element type names ReactElement; at runtime it only walks
  // the type/props/children shape, which the plain object above
  // satisfies. TS is fine with structural compatibility here, so no
  // explicit cast is needed.
  return new ImageResponse(element, {
    width: WIDTH,
    height: HEIGHT,
    headers: {
      // Same image content for the lifetime of the event's title + date;
      // tolerate a day of stale-while-revalidate on the edge.
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
};

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
