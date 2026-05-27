import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { getEventPublic, mintManageToken } from '../domain/events/events.js';
import { ValidationError } from '../domain/errors.js';
import { listRsvps, submitRsvp } from '../domain/rsvps/rsvps.js';
import { db } from '../infra/db.js';
import {
  localeFromAcceptLanguage,
  sendRsvpConfirmation,
  sendRsvpNotification,
} from '../infra/email.js';
import { rsvpPushText } from '../infra/push-templates.js';
import { requireEventOwnership } from '../middleware/require-event-ownership.js';
import type { AppVariables, Env } from '../types/env.js';

export const rsvpsRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const idParamSchema = z.object({ id: z.string().uuid() });

const rsvpInputSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional(),
  status: z.enum(['yes', 'maybe', 'no']),
  message: z.string().max(2000).nullable().optional(),
  plusOnes: z.number().int().min(0).max(20).optional(),
  plusOnesDetails: z
    .array(z.object({ name: z.string().min(1).max(200) }))
    .max(20)
    .optional(),
  guestId: z.string().uuid().nullable().optional(),
});

rsvpsRoute.post(
  '/',
  zValidator('param', idParamSchema, (r) => {
    if (!r.success) throw new ValidationError('Invalid event id', { issues: r.error.issues });
  }),
  zValidator('json', rsvpInputSchema, (r) => {
    if (!r.success) throw new ValidationError('Invalid RSVP body', { issues: r.error.issues });
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const input = c.req.valid('json');
    const { rsvp, event } = await submitRsvp(db(c), id, input);

    const webBase = c.env.WEB_BASE_URL ?? 'https://vite.in';
    const eventUrl = `${webBase}/e/${event.slug}`;

    // Guest-bound mail: the submitter's Accept-Language is the best
    // signal for which locale to send the confirmation in.
    const guestLocale = localeFromAcceptLanguage(c.req.header('accept-language'));
    // Creator-bound mail: stays in the event's authoring locale.
    const creatorLocale = localeFromAcceptLanguage(event.defaultLocale);

    if (input.email) {
      await sendRsvpConfirmation(
        c.env,
        {
          to: input.email,
          eventTitle: event.title,
          status: input.status,
          eventUrl,
        },
        guestLocale,
      ).catch((err: unknown) => {
        c.var.logger.warn('rsvp_confirmation_email_failed', { err: err as Error });
      });
    }

    // Mint a fresh manage token so the notification carries a one-click
    // management link. Best-effort: a mint failure falls back to the
    // token-less URL (which still works — it routes via /recover).
    let manageUrl = `${webBase}/e/${event.slug}/manage`;
    try {
      const manageToken = await mintManageToken(db(c), event.id);
      manageUrl = `${manageUrl}?token=${manageToken}`;
    } catch (err: unknown) {
      c.var.logger.warn('rsvp_manage_token_mint_failed', { err: err as Error });
    }

    await sendRsvpNotification(
      c.env,
      {
        to: event.creatorEmail,
        eventTitle: event.title,
        guestName: input.name,
        status: input.status,
        plusOnes: input.plusOnes ?? 0,
        manageUrl,
      },
      creatorLocale,
    ).catch((err: unknown) => {
      c.var.logger.warn('rsvp_notification_email_failed', { err: err as Error });
    });

    // Web Push to whoever subscribed for this event (the creator).
    if (c.env.QUEUE_PUSH) {
      const push = rsvpPushText(creatorLocale, {
        guestName: input.name,
        status: input.status,
        eventTitle: event.title,
      });
      await c.env.QUEUE_PUSH.send({
        eventId: event.id,
        title: push.title,
        body: push.body,
        url: `/e/${event.slug}/manage`,
      }).catch((err: unknown) => {
        c.var.logger.warn('rsvp_push_enqueue_failed', { err: err as Error });
      });
    }

    return c.json(toRsvp(rsvp), 201);
  },
);

rsvpsRoute.get(
  '/',
  zValidator('param', idParamSchema, (r) => {
    if (!r.success) throw new ValidationError('Invalid event id', { issues: r.error.issues });
  }),
  requireEventOwnership('id', { scope: 'rsvps:read' }),
  async (c) => {
    const { id } = c.req.valid('param');
    const items = await listRsvps(db(c), id);
    return c.json({ items: items.map(toRsvp) });
  },
);

rsvpsRoute.get(
  '/csv',
  zValidator('param', idParamSchema, (r) => {
    if (!r.success) throw new ValidationError('Invalid event id', { issues: r.error.issues });
  }),
  requireEventOwnership('id', { scope: 'rsvps:read' }),
  async (c) => {
    const { id } = c.req.valid('param');
    const [event, items] = await Promise.all([getEventPublic(db(c), id), listRsvps(db(c), id)]);
    const csv = renderRsvpsCsv(items.map(toRsvp));
    // BOM so Excel opens UTF-8 CSVs with the right encoding — without
    // it, ä/ö/ü land as mojibake on Windows. CSV viewers that don't
    // care (Numbers, Sheets) ignore the BOM.
    const body = '﻿' + csv;
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${event.slug}-rsvps.csv"`,
        'Cache-Control': 'private, no-store',
      },
    });
  },
);

type RsvpRow = Awaited<ReturnType<typeof submitRsvp>>['rsvp'];

/**
 * RFC 4180 cell quoting — wrap in double quotes when the value contains
 * a comma, double quote, or newline; escape internal double quotes by
 * doubling. Otherwise return the value unchanged.
 */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

interface CsvRow {
  name: string;
  email: string | null;
  status: 'yes' | 'maybe' | 'no';
  plusOnes: number;
  plusOnesDetails: Array<{ name: string }>;
  message: string | null;
  respondedAt: string;
}

function renderRsvpsCsv(rows: CsvRow[]): string {
  const header = [
    'name',
    'email',
    'status',
    'plus_ones',
    'plus_ones_details',
    'message',
    'responded_at',
  ];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.name),
        csvCell(r.email ?? ''),
        csvCell(r.status),
        csvCell(r.plusOnes),
        csvCell(r.plusOnesDetails.map((d) => d.name).join('; ')),
        csvCell(r.message ?? ''),
        csvCell(r.respondedAt),
      ].join(','),
    );
  }
  // Trailing CRLF per the RFC; matters for some pickier parsers.
  return lines.join('\r\n') + '\r\n';
}

function toRsvp(r: RsvpRow) {
  return {
    id: r.id,
    eventId: r.eventId,
    guestId: r.guestId,
    name: r.name,
    email: r.email,
    status: r.status as 'yes' | 'maybe' | 'no',
    plusOnes: r.plusOnes,
    plusOnesDetails: Array.isArray(r.plusOnesDetails)
      ? (r.plusOnesDetails as Array<{ name: string }>)
      : [],
    message: r.message,
    respondedAt: r.respondedAt.toISOString(),
  };
}
