import { dispatch, tools } from './server.js';
import type { Env } from './types.js';

/**
 * Worker entry.
 *
 * - `POST /mcp` — JSON-RPC 2.0, the Phase 1 transport. Accepts
 *   `initialize`, `tools/list`, and `tools/call`. Full Streamable HTTP
 *   transport (sessions, SSE) lands in Phase 2.
 * - `GET /` — server info banner, useful for probes.
 *
 * No per-user auth at this stage: only public, read-only tools are
 * exposed. When OAuth arrives, gate `/mcp` on a valid bearer token and
 * scope-check inside each tool.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/') {
      return Response.json({
        name: 'vitein-mcp',
        version: '0.0.0',
        environment: env.ENVIRONMENT,
        tools: tools.map((t) => t.name),
      });
    }

    if (request.method === 'POST' && url.pathname === '/mcp') {
      let payload: unknown;
      try {
        payload = await request.json();
      } catch {
        return Response.json(
          {
            jsonrpc: '2.0',
            id: null,
            error: { code: -32700, message: 'Parse error' },
          },
          { status: 400 },
        );
      }

      if (!isJsonRpcRequest(payload)) {
        return Response.json(
          {
            jsonrpc: '2.0',
            id: null,
            error: { code: -32600, message: 'Invalid Request' },
          },
          { status: 400 },
        );
      }

      const response = await dispatch(env, payload);
      return Response.json(response);
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;

function isJsonRpcRequest(value: unknown): value is {
  jsonrpc: '2.0';
  id: number | string | null;
  method: string;
  params?: Record<string, unknown>;
} {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v['jsonrpc'] === '2.0' && typeof v['method'] === 'string';
}
