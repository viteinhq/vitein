import { z } from 'zod';
import type { Env, ToolDefinition, ToolResult } from '../types.js';

/**
 * Phase 1 tool set: only the public, read-only endpoints. Creator- and
 * user-scoped tools (list_events, create_event, add_guests, ...) are
 * deferred until the Phase 2 OAuth flow lands — see apps/mcp/CLAUDE.md.
 */

const slugInput = z.object({
  slug: z.string().min(1).max(64).describe("The event's URL slug (e.g. `fhx82k7m`)."),
});

const slugInputJsonSchema = {
  type: 'object',
  properties: {
    slug: {
      type: 'string',
      description: "The event's URL slug (e.g. `fhx82k7m`).",
    },
  },
  required: ['slug'],
  additionalProperties: false,
} as const;

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

export const getEventBySlugTool: ToolDefinition<z.infer<typeof slugInput>> = {
  name: 'get_event_by_slug',
  description:
    'Fetch the public view of a vite.in event by its URL slug. Returns title, start time, location, description, and timezone.',
  inputSchema: slugInputJsonSchema,

  async handler(env, args) {
    const parsed = slugInput.safeParse(args);
    if (!parsed.success) return validationError(parsed.error.issues);

    const res = await fetch(`${env.API_BASE_URL}/v1/events/by-slug/${parsed.data.slug}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.status === 404) {
      return error(`No event found with slug "${parsed.data.slug}".`);
    }
    if (!res.ok) {
      return error(`Core API returned ${String(res.status)} while fetching the event.`);
    }
    const event: EventPublic = await res.json();
    return {
      content: [{ type: 'text', text: summariseEvent(event) }],
      structuredContent: event,
    };
  },
};

export const getEventShareUrlTool: ToolDefinition<z.infer<typeof slugInput>> = {
  name: 'get_event_share_url',
  description:
    'Return the canonical public URL for a vite.in event. Use this when the user wants a shareable link.',
  inputSchema: slugInputJsonSchema,

  handler: (env, args) => {
    const parsed = slugInput.safeParse(args);
    if (!parsed.success) return Promise.resolve(validationError(parsed.error.issues));

    const webBase = deriveWebBase(env);
    const url = `${webBase}/e/${parsed.data.slug}`;
    return Promise.resolve({
      content: [{ type: 'text', text: `Shareable link: ${url}` }],
      structuredContent: { url },
    });
  },
};

export const eventTools: readonly ToolDefinition[] = [
  getEventBySlugTool as ToolDefinition,
  getEventShareUrlTool as ToolDefinition,
];

function summariseEvent(event: EventPublic): string {
  const parts = [`"${event.title}"`, `starts ${event.startsAt}`, `(${event.timezone})`];
  if (event.locationText) parts.push(`at ${event.locationText}`);
  if (event.description) parts.push(`— ${truncate(event.description, 120)}`);
  return parts.join(' ');
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function deriveWebBase(env: Env): string {
  if (env.ENVIRONMENT === 'production') return 'https://vite.in';
  if (env.ENVIRONMENT === 'staging') return 'https://next.vite.in';
  return 'http://localhost:5173';
}

function error(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

function validationError(issues: unknown): ToolResult {
  return {
    content: [
      {
        type: 'text',
        text: `Invalid input: ${JSON.stringify(issues)}`,
      },
    ],
    isError: true,
  };
}
