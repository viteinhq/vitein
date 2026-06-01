import { eventTools } from './tools/events.js';
import { oauthEventTools } from './tools/oauth-events.js';
import type { Env, ToolContext, ToolDefinition, ToolResult } from './types.js';

/**
 * Tiny MCP-over-HTTP dispatcher.
 *
 * Implements `initialize`, `tools/list`, and `tools/call` — enough for any
 * MCP-aware LLM client to discover and call our tools. Full Streamable
 * HTTP transport (sessions, SSE fallback) lands in Phase 2 when the OAuth
 * flow is wired up. For now this is JSON-RPC 2.0 over a single HTTP POST.
 *
 * Auth model:
 *   - Public tools (`requiresAuth: undefined`) work without a bearer.
 *   - OAuth-gated tools (`requiresAuth: true`) require an
 *     `Authorization: Bearer <jwt>` on the underlying HTTP request, which
 *     `index.ts` extracts and threads through `ctx.bearer`. Without a
 *     bearer the dispatcher returns a structured "auth required" tool
 *     result rather than failing JSON-RPC — LLMs handle tool-level
 *     errors gracefully, but a hard transport failure terminates the
 *     whole MCP session.
 */

export const tools: readonly ToolDefinition[] = [...eventTools, ...oauthEventTools];
const toolByName = new Map<string, ToolDefinition>(tools.map((t) => [t.name, t]));

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const SERVER_INFO = { name: 'vitein-mcp', version: '0.0.0' };
const PROTOCOL_VERSION = '2024-11-05';

export async function dispatch(
  env: Env,
  request: JsonRpcRequest,
  ctx: ToolContext = { bearer: null },
): Promise<JsonRpcResponse> {
  const id = request.id ?? null;
  try {
    const result = await handle(env, request, ctx);
    return { jsonrpc: '2.0', id, result };
  } catch (err) {
    if (err instanceof JsonRpcError) {
      return { jsonrpc: '2.0', id, error: { code: err.code, message: err.message } };
    }
    // Never surface a raw internal error message to the client/LLM — it can
    // carry stack/DB/user detail (GHSA-jp6m). Log it server-side, return a
    // generic message.
    console.error('mcp_dispatch_internal_error', err);
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32000, message: 'Internal error' },
    };
  }
}

async function handle(env: Env, request: JsonRpcRequest, ctx: ToolContext): Promise<unknown> {
  switch (request.method) {
    case 'initialize':
      return {
        protocolVersion: PROTOCOL_VERSION,
        serverInfo: SERVER_INFO,
        capabilities: { tools: {} },
      };

    case 'tools/list':
      return {
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      };

    case 'tools/call': {
      const name = request.params?.['name'];
      const args = request.params?.['arguments'] ?? {};
      if (typeof name !== 'string') {
        throw new JsonRpcError(-32602, 'Invalid params: `name` is required');
      }
      const tool = toolByName.get(name);
      if (!tool) throw new JsonRpcError(-32601, `Tool not found: ${name}`);
      if (tool.requiresAuth && !ctx.bearer) {
        return {
          content: [
            {
              type: 'text',
              text: `Tool "${name}" requires an OAuth access token. Ask the user to authorize the MCP client first.`,
            },
          ],
          isError: true,
        } satisfies ToolResult;
      }
      const result: ToolResult = await tool.handler(env, args, ctx);
      return result;
    }

    default:
      throw new JsonRpcError(-32601, `Method not found: ${request.method}`);
  }
}

class JsonRpcError extends Error {
  constructor(
    public readonly code: number,
    message: string,
  ) {
    super(message);
    this.name = 'JsonRpcError';
  }
}
