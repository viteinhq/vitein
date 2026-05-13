import { z } from 'zod';
import type { ToolContext, ToolDefinition, ToolResult } from '../types.js';

/**
 * OAuth-gated tools — Phase 2 launch set.
 *
 * The MCP client presents an `Authorization: Bearer <jwt>` on the
 * JSON-RPC request; the dispatcher routes flagged tools here with the
 * bearer in `ctx.bearer`. Each handler forwards the bearer to the Core
 * API; the API verifies the JWT (`better-auth/oauth2`), resolves
 * `c.var.auth` to `{ kind: 'oauth', userId, clientId, scopes }`, then
 * runs `requireEventOwnership` to confirm the user owns the referenced
 * event before letting the action proceed.
 *
 * Scope per tool (must be granted at authorize-time):
 *
 *   list_events     → events:read
 *   update_event    → events:write
 *   delete_event    → events:write
 *   list_rsvps      → rsvps:read
 *   list_guests     → guests:read
 *   add_guest       → guests:write
 *   send_reminder   → events:write
 *
 * `add_guest` is single-guest-per-call — the Core API doesn't have a
 * bulk endpoint yet. LLMs handle a loop fine; if usage shows the
 * round-trip cost matters we ship a real `add_guests` later.
 */

// ---------- helpers ----------

function bearerHeaders(ctx?: ToolContext): Record<string, string> | null {
  if (!ctx?.bearer) return null;
  return {
    Authorization: `Bearer ${ctx.bearer}`,
    Accept: 'application/json',
  };
}

function authError(): ToolResult {
  return error('Missing bearer token.');
}

function apiError(status: number, op: string): ToolResult {
  if (status === 401) {
    return error(`OAuth token rejected by the API while ${op}. Re-authorize and try again.`);
  }
  if (status === 403) {
    return error(`OAuth token lacks the required scope for ${op}.`);
  }
  if (status === 404) {
    return error(`Event not found.`);
  }
  return error(`Core API returned ${String(status)} while ${op}.`);
}

function error(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

// ---------- list_events ----------

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

const noInputJsonSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const;

export const listEventsTool: ToolDefinition<Record<string, never>> = {
  name: 'list_events',
  description:
    'List the events owned by the authenticated user. Requires OAuth scope `events:read`.',
  inputSchema: noInputJsonSchema,
  requiresAuth: true,

  async handler(env, _args, ctx) {
    const headers = bearerHeaders(ctx);
    if (!headers) return authError();

    const res = await fetch(`${env.API_BASE_URL}/v1/users/me/events`, { headers });
    if (!res.ok) return apiError(res.status, 'listing events');

    const body: { items: EventPublic[] } = await res.json();
    const summary =
      body.items.length === 0
        ? 'You have no events yet.'
        : `${String(body.items.length)} event(s):\n` +
          body.items.map((e) => `· ${e.title} (${e.slug}) — ${e.startsAt}`).join('\n');

    return {
      content: [{ type: 'text', text: summary }],
      structuredContent: body,
    };
  },
};

// ---------- update_event ----------

const updateEventInput = z.object({
  eventId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  timezone: z.string().min(1).max(64).optional(),
  locationText: z.string().max(500).nullable().optional(),
  visibility: z.enum(['link_only', 'public']).optional(),
});

const updateEventJsonSchema = {
  type: 'object',
  properties: {
    eventId: { type: 'string', format: 'uuid' },
    title: { type: 'string', minLength: 1, maxLength: 200 },
    description: { type: ['string', 'null'], maxLength: 5000 },
    startsAt: { type: 'string', format: 'date-time' },
    endsAt: { type: ['string', 'null'], format: 'date-time' },
    timezone: { type: 'string', minLength: 1, maxLength: 64 },
    locationText: { type: ['string', 'null'], maxLength: 500 },
    visibility: { type: 'string', enum: ['link_only', 'public'] },
  },
  required: ['eventId'],
  additionalProperties: false,
} as const;

export const updateEventTool: ToolDefinition<z.infer<typeof updateEventInput>> = {
  name: 'update_event',
  description:
    'Update fields of an event owned by the authenticated user. Pass only the fields to change. Requires scope `events:write`.',
  inputSchema: updateEventJsonSchema,
  requiresAuth: true,

  async handler(env, args, ctx) {
    const parsed = updateEventInput.safeParse(args);
    if (!parsed.success) return error(`Invalid input: ${JSON.stringify(parsed.error.issues)}`);
    const headers = bearerHeaders(ctx);
    if (!headers) return authError();

    const { eventId, ...patch } = parsed.data;
    const res = await fetch(`${env.API_BASE_URL}/v1/events/${eventId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return apiError(res.status, 'updating the event');

    const event: EventPublic = await res.json();
    return {
      content: [{ type: 'text', text: `Updated "${event.title}" (${event.slug}).` }],
      structuredContent: event,
    };
  },
};

// ---------- delete_event ----------

const eventIdInput = z.object({ eventId: z.string().uuid() });
const eventIdJsonSchema = {
  type: 'object',
  properties: { eventId: { type: 'string', format: 'uuid' } },
  required: ['eventId'],
  additionalProperties: false,
} as const;

export const deleteEventTool: ToolDefinition<z.infer<typeof eventIdInput>> = {
  name: 'delete_event',
  description:
    'Soft-delete an event owned by the authenticated user. Recoverable for 30 days. Requires scope `events:write`.',
  inputSchema: eventIdJsonSchema,
  requiresAuth: true,

  async handler(env, args, ctx) {
    const parsed = eventIdInput.safeParse(args);
    if (!parsed.success) return error(`Invalid input: ${JSON.stringify(parsed.error.issues)}`);
    const headers = bearerHeaders(ctx);
    if (!headers) return authError();

    const res = await fetch(`${env.API_BASE_URL}/v1/events/${parsed.data.eventId}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) return apiError(res.status, 'deleting the event');

    return {
      content: [{ type: 'text', text: `Event ${parsed.data.eventId} soft-deleted.` }],
      structuredContent: { eventId: parsed.data.eventId, deleted: true },
    };
  },
};

// ---------- list_rsvps ----------

interface RsvpRow {
  id: string;
  name: string;
  email: string | null;
  status: 'yes' | 'maybe' | 'no';
  plusOnes: number;
  message: string | null;
  respondedAt: string;
}

export const listRsvpsTool: ToolDefinition<z.infer<typeof eventIdInput>> = {
  name: 'list_rsvps',
  description:
    'List RSVPs for an event owned by the authenticated user. Requires scope `rsvps:read`.',
  inputSchema: eventIdJsonSchema,
  requiresAuth: true,

  async handler(env, args, ctx) {
    const parsed = eventIdInput.safeParse(args);
    if (!parsed.success) return error(`Invalid input: ${JSON.stringify(parsed.error.issues)}`);
    const headers = bearerHeaders(ctx);
    if (!headers) return authError();

    const res = await fetch(`${env.API_BASE_URL}/v1/events/${parsed.data.eventId}/rsvps`, {
      headers,
    });
    if (!res.ok) return apiError(res.status, 'listing RSVPs');

    const body: { items: RsvpRow[] } = await res.json();
    const counts = body.items.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      },
      { yes: 0, maybe: 0, no: 0 } as Record<'yes' | 'maybe' | 'no', number>,
    );

    const lines = [
      `${String(body.items.length)} RSVPs — yes ${String(counts.yes)} · maybe ${String(counts.maybe)} · no ${String(counts.no)}`,
      ...body.items
        .slice(0, 20)
        .map((r) => `· ${r.name} — ${r.status}${r.plusOnes ? ` (+${String(r.plusOnes)})` : ''}`),
    ];

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: body,
    };
  },
};

// ---------- list_guests ----------

interface GuestRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  invitedVia: string;
  invitedAt: string;
}

export const listGuestsTool: ToolDefinition<z.infer<typeof eventIdInput>> = {
  name: 'list_guests',
  description:
    'List guests on the invite list for an event owned by the authenticated user. Requires scope `guests:read`.',
  inputSchema: eventIdJsonSchema,
  requiresAuth: true,

  async handler(env, args, ctx) {
    const parsed = eventIdInput.safeParse(args);
    if (!parsed.success) return error(`Invalid input: ${JSON.stringify(parsed.error.issues)}`);
    const headers = bearerHeaders(ctx);
    if (!headers) return authError();

    const res = await fetch(`${env.API_BASE_URL}/v1/events/${parsed.data.eventId}/guests`, {
      headers,
    });
    if (!res.ok) return apiError(res.status, 'listing guests');

    const body: { items: GuestRow[] } = await res.json();
    const lines = [
      `${String(body.items.length)} guest(s) invited.`,
      ...body.items
        .slice(0, 30)
        .map(
          (g) =>
            `· ${g.name ?? '(unnamed)'}${g.email ? ` <${g.email}>` : ''} — via ${g.invitedVia}`,
        ),
    ];

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: body,
    };
  },
};

// ---------- add_guest ----------

const addGuestInput = z.object({
  eventId: z.string().uuid(),
  name: z.string().max(200).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'E.164 phone number required')
    .nullable()
    .optional(),
  invitedVia: z.enum(['link', 'email', 'sms', 'whatsapp', 'agent']),
});

const addGuestJsonSchema = {
  type: 'object',
  properties: {
    eventId: { type: 'string', format: 'uuid' },
    name: { type: ['string', 'null'], maxLength: 200 },
    email: { type: ['string', 'null'], format: 'email' },
    phone: { type: ['string', 'null'] },
    invitedVia: { type: 'string', enum: ['link', 'email', 'sms', 'whatsapp', 'agent'] },
  },
  required: ['eventId', 'invitedVia'],
  additionalProperties: false,
} as const;

export const addGuestTool: ToolDefinition<z.infer<typeof addGuestInput>> = {
  name: 'add_guest',
  description:
    'Add one guest to the invite list of an event owned by the authenticated user. For bulk imports, call the tool in a loop. Requires scope `guests:write`.',
  inputSchema: addGuestJsonSchema,
  requiresAuth: true,

  async handler(env, args, ctx) {
    const parsed = addGuestInput.safeParse(args);
    if (!parsed.success) return error(`Invalid input: ${JSON.stringify(parsed.error.issues)}`);
    const headers = bearerHeaders(ctx);
    if (!headers) return authError();

    const { eventId, ...body } = parsed.data;
    const res = await fetch(`${env.API_BASE_URL}/v1/events/${eventId}/guests`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return apiError(res.status, 'adding the guest');

    const guest: GuestRow = await res.json();
    return {
      content: [
        {
          type: 'text',
          text: `Added ${guest.name ?? '(unnamed)'}${guest.email ? ` <${guest.email}>` : ''} via ${guest.invitedVia}.`,
        },
      ],
      structuredContent: guest,
    };
  },
};

// ---------- send_reminder ----------

export const sendReminderTool: ToolDefinition<z.infer<typeof eventIdInput>> = {
  name: 'send_reminder',
  description:
    'Queue an immediate reminder email to the creator of an event owned by the authenticated user. Requires scope `events:write`.',
  inputSchema: eventIdJsonSchema,
  requiresAuth: true,

  async handler(env, args, ctx) {
    const parsed = eventIdInput.safeParse(args);
    if (!parsed.success) return error(`Invalid input: ${JSON.stringify(parsed.error.issues)}`);
    const headers = bearerHeaders(ctx);
    if (!headers) return authError();

    const res = await fetch(`${env.API_BASE_URL}/v1/events/${parsed.data.eventId}/reminders/send`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) return apiError(res.status, 'queueing the reminder');

    const reminder: { id: string; scheduledAt: string } = await res.json();
    return {
      content: [
        {
          type: 'text',
          text: `Reminder queued (id ${reminder.id}). Will dispatch on the next cron run.`,
        },
      ],
      structuredContent: reminder,
    };
  },
};

// ---------- exports ----------

export const oauthEventTools: readonly ToolDefinition[] = [
  listEventsTool as ToolDefinition,
  updateEventTool as ToolDefinition,
  deleteEventTool as ToolDefinition,
  listRsvpsTool as ToolDefinition,
  listGuestsTool as ToolDefinition,
  addGuestTool as ToolDefinition,
  sendReminderTool as ToolDefinition,
];
