import { eventTools } from './tools/events.js';
import type { Env, ToolDefinition, ToolResult } from './types.js';

/**
 * Tiny MCP-over-HTTP dispatcher.
 *
 * Implements `initialize`, `tools/list`, and `tools/call` — enough for any
 * MCP-aware LLM client to discover and call our tools. Full Streamable
 * HTTP transport (sessions, SSE fallback) lands in Phase 2 when the OAuth
 * flow is wired up. For now this is JSON-RPC 2.0 over a single HTTP POST.
 */

export const tools: readonly ToolDefinition[] = [...eventTools];
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

export async function dispatch(env: Env, request: JsonRpcRequest): Promise<JsonRpcResponse> {
  const id = request.id ?? null;
  try {
    const result = await handle(env, request);
    return { jsonrpc: '2.0', id, result };
  } catch (err) {
    if (err instanceof JsonRpcError) {
      return { jsonrpc: '2.0', id, error: { code: err.code, message: err.message } };
    }
    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32000, message: err instanceof Error ? err.message : 'Internal error' },
    };
  }
}

async function handle(env: Env, request: JsonRpcRequest): Promise<unknown> {
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
      const result: ToolResult = await tool.handler(env, args);
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
