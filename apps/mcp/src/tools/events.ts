import { z } from 'zod';
import type { Env, ToolDefinition, ToolResult } from '../types.js';

/**
 * Phase 1 tool set: the operations that don't need authentication.
 *
 * - Public reads (`get_event_by_slug`, `get_event_ics`, `get_event_share_url`).
 * - Anonymous writes (`create_event`, `submit_rsvp`) — the Core API accepts
 *   these without a token by design (creator gets a magic-link by email;
 *   RSVPs are open).
 * - One discovery helper (`list_locales`).
 *
 * Creator- and user-scoped tools (list_events, update_event, list_rsvps,
 * send_reminders, add_guests, …) are deferred until the Phase 2 OAuth flow
 * lands — see apps/mcp/CLAUDE.md and ARCHITECTURE §5.3.
 */

// ---------- get_event_by_slug ----------

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

// ---------- get_event_share_url ----------

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

// ---------- get_event_ics ----------

export const getEventIcsTool: ToolDefinition<z.infer<typeof slugInput>> = {
  name: 'get_event_ics',
  description:
    'Fetch the iCalendar (RFC 5545) file for a vite.in event so it can be imported into Google Calendar, Apple Calendar, Outlook, etc.',
  inputSchema: slugInputJsonSchema,

  async handler(env, args) {
    const parsed = slugInput.safeParse(args);
    if (!parsed.success) return validationError(parsed.error.issues);

    const res = await fetch(`${env.API_BASE_URL}/v1/events/by-slug/${parsed.data.slug}/ics`);
    if (res.status === 404) return error(`No event found with slug "${parsed.data.slug}".`);
    if (!res.ok) {
      return error(`Core API returned ${String(res.status)} while fetching the iCalendar.`);
    }
    const ics = await res.text();
    return {
      content: [{ type: 'text', text: ics }],
      structuredContent: { ics, slug: parsed.data.slug },
    };
  },
};

// ---------- create_event ----------

const createEventInput = z.object({
  title: z.string().min(1).max(200),
  startsAt: z
    .string()
    .datetime()
    .describe('ISO-8601 timestamp in UTC. Pair with `timezone` for the human-readable wall clock.'),
  timezone: z
    .string()
    .min(1)
    .max(64)
    .describe('IANA timezone like `Europe/Zurich` or `America/New_York`.'),
  creatorEmail: z.string().email().describe('Where the management magic-link will be sent.'),
  description: z.string().max(5000).optional(),
  endsAt: z.string().datetime().optional(),
  locationText: z.string().max(500).optional(),
  defaultLocale: z
    .string()
    .min(2)
    .max(10)
    .optional()
    .describe('Two-letter language tag for emails and the public page (en, de, fr, …).'),
  visibility: z.enum(['link_only', 'public']).optional(),
});

const createEventJsonSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 200 },
    startsAt: { type: 'string', format: 'date-time' },
    timezone: { type: 'string', minLength: 1, maxLength: 64 },
    creatorEmail: { type: 'string', format: 'email' },
    description: { type: 'string', maxLength: 5000 },
    endsAt: { type: 'string', format: 'date-time' },
    locationText: { type: 'string', maxLength: 500 },
    defaultLocale: { type: 'string', minLength: 2, maxLength: 10 },
    visibility: { type: 'string', enum: ['link_only', 'public'] },
  },
  required: ['title', 'startsAt', 'timezone', 'creatorEmail'],
  additionalProperties: false,
} as const;

interface CreateEventResponse {
  event: EventPublic;
  magicLinkSent: boolean;
  creatorTokenPreview: string | null;
}

export const createEventTool: ToolDefinition<z.infer<typeof createEventInput>> = {
  name: 'create_event',
  description:
    'Create a new vite.in event anonymously. No account required. The creator gets a one-time magic-link by email to manage the event; the LLM gets the shareable URL back.',
  inputSchema: createEventJsonSchema,

  async handler(env, args) {
    const parsed = createEventInput.safeParse(args);
    if (!parsed.success) return validationError(parsed.error.issues);

    const res = await fetch(`${env.API_BASE_URL}/v1/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(parsed.data),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return error(`Core API returned ${String(res.status)} while creating the event. ${detail}`);
    }
    const body: CreateEventResponse = await res.json();
    const webBase = deriveWebBase(env);
    const url = `${webBase}/e/${body.event.slug}`;
    const lines = [
      `Event "${body.event.title}" created.`,
      `Shareable link: ${url}`,
      body.magicLinkSent
        ? `A magic link to manage the event was emailed to ${parsed.data.creatorEmail}.`
        : `Email delivery is disabled in this environment; magic-link token preview: ${body.creatorTokenPreview ?? '(none)'}`,
    ];
    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: { ...body, shareUrl: url },
    };
  },
};

// ---------- submit_rsvp ----------

const submitRsvpInput = z.object({
  eventId: z
    .string()
    .uuid()
    .describe('UUID of the event. Get it from `create_event` or `get_event_by_slug`.'),
  name: z.string().min(1).max(200).describe("Guest's display name."),
  status: z.enum(['yes', 'maybe', 'no']),
  email: z
    .string()
    .email()
    .optional()
    .describe('If provided, the guest gets a confirmation email.'),
  message: z.string().max(2000).optional(),
  plusOnes: z.number().int().min(0).max(20).optional(),
});

const submitRsvpJsonSchema = {
  type: 'object',
  properties: {
    eventId: { type: 'string', format: 'uuid' },
    name: { type: 'string', minLength: 1, maxLength: 200 },
    status: { type: 'string', enum: ['yes', 'maybe', 'no'] },
    email: { type: 'string', format: 'email' },
    message: { type: 'string', maxLength: 2000 },
    plusOnes: { type: 'integer', minimum: 0, maximum: 20 },
  },
  required: ['eventId', 'name', 'status'],
  additionalProperties: false,
} as const;

interface RsvpResponse {
  id: string;
  status: 'yes' | 'maybe' | 'no';
  respondedAt: string;
}

export const submitRsvpTool: ToolDefinition<z.infer<typeof submitRsvpInput>> = {
  name: 'submit_rsvp',
  description:
    "Submit an RSVP to a vite.in event on a guest's behalf. Public endpoint — no token needed. Pass the event UUID, the guest's name, and yes/maybe/no.",
  inputSchema: submitRsvpJsonSchema,

  async handler(env, args) {
    const parsed = submitRsvpInput.safeParse(args);
    if (!parsed.success) return validationError(parsed.error.issues);

    const { eventId, ...body } = parsed.data;
    const res = await fetch(`${env.API_BASE_URL}/v1/events/${eventId}/rsvps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 404) return error('Event not found.');
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return error(`Core API returned ${String(res.status)} while recording the RSVP. ${detail}`);
    }
    const rsvp: RsvpResponse = await res.json();
    return {
      content: [
        {
          type: 'text',
          text: `RSVP recorded for ${parsed.data.name}: ${rsvp.status} (id ${rsvp.id}).`,
        },
      ],
      structuredContent: rsvp,
    };
  },
};

// ---------- list_locales ----------

const noInputJsonSchema = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
} as const;

export const listLocalesTool: ToolDefinition<unknown> = {
  name: 'list_locales',
  description:
    'List the supported locales for vite.in. Useful before calling `create_event` so the LLM picks a `defaultLocale` the platform accepts.',
  inputSchema: noInputJsonSchema,

  handler: () => {
    const locales = [
      { code: 'en', endonym: 'English' },
      { code: 'de', endonym: 'Deutsch' },
      { code: 'fr', endonym: 'Français' },
      { code: 'es', endonym: 'Español' },
      { code: 'it', endonym: 'Italiano' },
      { code: 'pt', endonym: 'Português' },
      { code: 'nl', endonym: 'Nederlands' },
      { code: 'pl', endonym: 'Polski' },
    ];
    return Promise.resolve({
      content: [
        {
          type: 'text',
          text: `Supported locales: ${locales.map((l) => `${l.code} (${l.endonym})`).join(', ')}.`,
        },
      ],
      structuredContent: { locales },
    });
  },
};

// ---------- exports ----------

export const eventTools: readonly ToolDefinition[] = [
  getEventBySlugTool as ToolDefinition,
  getEventShareUrlTool as ToolDefinition,
  getEventIcsTool as ToolDefinition,
  createEventTool as ToolDefinition,
  submitRsvpTool as ToolDefinition,
  listLocalesTool,
];

// ---------- helpers ----------

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
