import { ImageResponse } from '@vercel/og';
import type { RequestHandler } from './$types';

/**
 * Diagnostic: imports @vercel/og but never constructs an ImageResponse.
 * If this 500s, the failure is at module-load time. If it 200s, the
 * failure is in the constructor / runtime path.
 */
export const GET: RequestHandler = ({ params }) => {
  return new Response(
    `import ok: typeof ImageResponse = ${typeof ImageResponse}, slug=${params.slug}\n`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    },
  );
};
