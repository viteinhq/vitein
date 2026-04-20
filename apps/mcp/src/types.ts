export interface Env {
  ENVIRONMENT: 'dev' | 'staging' | 'production';
  API_BASE_URL: string;
}

/**
 * A tool result follows the MCP shape: one or more content blocks plus an
 * optional structured payload that downstream tool calls can consume.
 */
export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: unknown;
  isError?: boolean;
}

export interface ToolDefinition<TInput = unknown> {
  name: string;
  description: string;
  inputSchema: unknown;
  handler: (env: Env, args: TInput) => Promise<ToolResult>;
}
