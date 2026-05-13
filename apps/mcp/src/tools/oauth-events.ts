import type { Env, ToolContext, ToolDefinition, ToolResult } from '../types.js';

/**
 * OAuth-gated tools (Phase 2 launch set, partial).
 *
 * These hit the Core API's user-scoped endpoints. The dispatcher only
 * invokes them when the MCP client presented an `Authorization: Bearer
 * <jwt>` on the JSON-RPC request — see `server.ts`'s `requiresAuth`
 * gating. The bearer is forwarded verbatim to the Core API; the API
 * verifies it via `better-auth/oauth2`'s `verifyAccessToken` and resolves
 * `c.var.auth` to `{ kind: 'oauth', userId, clientId, scopes }`.
 *
 * Phase 2 launch coverage:
 *
 * - `list_events` (this file) — uses `GET /v1/users/me/events`.
 *
 * The rest of the launch set (`update_event`, `delete_event`,
 * `list_rsvps`, `add_guests`, `list_guests`, `send_reminders`) is
 * deferred: those endpoints currently require a creator token, and
 * teaching them to accept OAuth-with-ownership is a separate API-side
 * change. Once `requireEventOwnership` lands as a middleware, drop the
 * matching tools in here.
 */

interface EventPublic {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  locationText: string | null;
  visibility: string;
}

interface ListEventsResponse {
  items: EventPublic[];
}

const noInputJsonSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const;

export const listEventsTool: ToolDefinition<Record<string, never>> = {
  name: 'list_events',
  description:
    'List the events owned by the authenticated user. Requires an OAuth access token with the `events:read` scope.',
  inputSchema: noInputJsonSchema,
  requiresAuth: true,

  handler: handleListEvents,
};

async function handleListEvents(
  env: Env,
  _args: Record<string, never>,
  ctx?: ToolContext,
): Promise<ToolResult> {
  if (!ctx?.bearer) return error('Missing bearer token.');

  const res = await fetch(`${env.API_BASE_URL}/v1/users/me/events`, {
    headers: {
      Authorization: `Bearer ${ctx.bearer}`,
      Accept: 'application/json',
    },
  });

  if (res.status === 401) {
    return error('OAuth token rejected by the API. The token may be expired or missing scopes.');
  }
  if (!res.ok) {
    return error(`Core API returned ${String(res.status)} while listing events.`);
  }
  const body: ListEventsResponse = await res.json();

  const summary =
    body.items.length === 0
      ? 'You have no events yet.'
      : `${String(body.items.length)} event(s):\n` +
        body.items.map((e) => `· ${e.title} (${e.slug}) — ${e.startsAt}`).join('\n');

  return {
    content: [{ type: 'text', text: summary }],
    structuredContent: body,
  };
}

export const oauthEventTools: readonly ToolDefinition[] = [listEventsTool as ToolDefinition];

function error(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}
