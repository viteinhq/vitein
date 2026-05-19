export interface Env {
  ENVIRONMENT: 'dev' | 'staging' | 'production';
  API_BASE_URL: string;
  SENTRY_DSN?: string;
  /** Short git SHA injected at deploy time via `wrangler --var BUILD_SHA:...`. */
  BUILD_SHA?: string;
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

/**
 * Per-call context passed to tool handlers in addition to the global
 * `Env`. Carries the OAuth bearer token (if any) that the MCP client
 * presented on the request, so OAuth-gated tools can forward it to the
 * Core API.
 */
export interface ToolContext {
  bearer: string | null;
}

export interface ToolDefinition<TInput = unknown> {
  name: string;
  description: string;
  inputSchema: unknown;
  /**
   * When true, the dispatcher rejects the call with an authentication
   * error unless `ctx.bearer` is present. Public tools (the default)
   * leave this unset and ignore the bearer.
   */
  requiresAuth?: boolean;
  /**
   * `ctx` is optional in the type so tests and internal callers can omit
   * it; the real dispatcher (`server.ts`) always passes one. OAuth-gated
   * handlers should null-check `ctx?.bearer`.
   */
  handler: (env: Env, args: TInput, ctx?: ToolContext) => Promise<ToolResult>;
}
