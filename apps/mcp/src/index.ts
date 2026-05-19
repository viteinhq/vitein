import * as Sentry from '@sentry/cloudflare';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { tools } from './server.js';
import { sentryOptions } from './sentry.js';
import type { Env, ToolDefinition } from './types.js';

/**
 * Worker entry.
 *
 * - `GET|POST|DELETE /mcp` — Streamable HTTP transport (MCP spec). The
 *   SDK's `WebStandardStreamableHTTPServerTransport` handles SSE setup,
 *   JSON-RPC framing, and the GET → notification stream / POST → request
 *   / DELETE → session close routing.
 * - `GET /` — server info banner, useful for probes.
 * - `GET /_debug/boom` — throws on purpose; used to verify Sentry wiring.
 *
 * Statelessness: we run with `sessionIdGenerator: undefined` +
 * `enableJsonResponse: true`. Each HTTP request gets a fresh Server +
 * Transport. This trades long-lived streaming for surviving across worker
 * isolates — sessions in-memory don't survive a CF isolate eviction
 * anyway, so the simpler model wins until we add Durable Objects.
 *
 * Auth: the bearer token from `Authorization: Bearer …` is forwarded
 * verbatim into each tool call via closure. OAuth-gated tools fail with
 * a structured "auth required" result when no bearer is present.
 */

const toolByName = new Map<string, ToolDefinition>(tools.map((t) => [t.name, t]));

const SERVER_INFO = { name: 'vitein-mcp', version: '0.0.0' };

function buildServer(env: Env, bearer: string | null): Server {
  const server = new Server(SERVER_INFO, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown>,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const name = request.params.name;
    const args = (request.params.arguments ?? {}) as unknown;
    const tool = toolByName.get(name);
    if (!tool) {
      return {
        content: [{ type: 'text', text: `Tool not found: ${name}` }],
        isError: true,
      };
    }
    if (tool.requiresAuth && !bearer) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool "${name}" requires an OAuth access token. Ask the user to authorize the MCP client first.`,
          },
        ],
        isError: true,
      };
    }
    const result = await tool.handler(env, args, { bearer });
    return result as CallToolResult;
  });

  return server;
}

/**
 * Build the CORS headers we attach to every /mcp response. The MCP
 * Inspector runs in a browser, so without these the preflight fails and
 * the actual request never reaches us. Auth is via bearer token, not
 * origin checks, so reflecting the requesting Origin is safe. We deny
 * the request entirely if no Origin is supplied — non-browser callers
 * pass without preflight and don't need these headers anyway.
 */
function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Authorization, Content-Type, Accept, Mcp-Session-Id, Last-Event-Id, MCP-Protocol-Version',
    'Access-Control-Expose-Headers': 'Mcp-Session-Id',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

async function handleMcp(request: Request, env: Env): Promise<Response> {
  const cors = corsHeaders(request);

  // The SDK transport returns 405 on OPTIONS and never adds CORS
  // headers, so browser preflights fail. Handle OPTIONS ourselves.
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  // GET /mcp opens the server→client notification stream in the
  // Streamable HTTP spec. In stateless + JSON-response mode we never
  // produce server-initiated notifications, so the stream would hang
  // forever and Cloudflare Workers kills it as a runaway. The spec
  // explicitly allows 405 here — compliant clients fall back to
  // POST-only and continue normally.
  if (request.method === 'GET') {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Server-initiated notifications not supported' },
        id: null,
      }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json', Allow: 'POST, DELETE, OPTIONS', ...cors },
      },
    );
  }

  const bearer = extractBearer(request.headers.get('authorization'));
  const server = buildServer(env, bearer);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);

  const response = await transport.handleRequest(request);

  // Mutate the response to add CORS headers without copying the body
  // (which would break SSE streaming if we ever stop using JSON mode).
  for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
  return response;
}

const handler: ExportedHandler<Env> = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/') {
      return Response.json({
        name: SERVER_INFO.name,
        version: SERVER_INFO.version,
        environment: env.ENVIRONMENT,
        tools: tools.map((t) => t.name),
      });
    }

    if (request.method === 'GET' && url.pathname === '/_debug/boom') {
      throw new Error('mcp_debug_boom — intentional Sentry canary');
    }

    if (url.pathname === '/mcp') {
      return handleMcp(request, env);
    }

    return new Response('Not found', { status: 404 });
  },
};

export default Sentry.withSentry(sentryOptions, handler);

function extractBearer(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer (.+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}
