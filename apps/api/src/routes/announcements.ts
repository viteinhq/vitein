import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  listAnnouncements,
  markAnnouncementSent,
  prepareAnnouncement,
  type AnnouncementStage,
} from '../domain/announcements/announcements.js';
import { DomainError, ValidationError } from '../domain/errors.js';
import { tierIncludes, tierOf } from '../domain/payments/payments.js';
import { db } from '../infra/db.js';
import { sendAnnouncement } from '../infra/email.js';
import { requireCreator } from '../middleware/require-creator.js';
import type { AppVariables, Env } from '../types/env.js';

export const announcementsRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const idParamSchema = z.object({ id: z.string().uuid() });
const postSchema = z.object({
  stage: z.enum(['save_the_date', 'invitation']),
});

announcementsRoute.get(
  '/',
  zValidator('param', idParamSchema, (r) => {
    if (!r.success) throw new ValidationError('Invalid event id', { issues: r.error.issues });
  }),
  requireCreator('id'),
  async (c) => {
    const { id } = c.req.valid('param');
    const items = await listAnnouncements(db(c.env), id);
    return c.json({
      items: items.map((r) => ({
        id: r.id,
        eventId: r.eventId,
        stage: r.stage,
        sentAt: r.sentAt ? r.sentAt.toISOString() : null,
        recipientCount: r.recipientCount,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  },
);

/**
 * Send an announcement of the requested stage to every guest with an email.
 * Save-the-Date is a Plus-tier feature. Invitation is open to all paid
 * tiers (but the endpoint stays behind the creator token, so no abuse).
 *
 * Synchronous path for MVP (capped at 100 recipients). Async via cron is a
 * follow-up — we already have the reminder cron scaffolding to reuse.
 */
announcementsRoute.post(
  '/',
  zValidator('param', idParamSchema, (r) => {
    if (!r.success) throw new ValidationError('Invalid event id', { issues: r.error.issues });
  }),
  requireCreator('id'),
  zValidator('json', postSchema, (r) => {
    if (!r.success) throw new ValidationError('Invalid announcement body', { issues: r.error.issues });
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const { stage } = c.req.valid('json');

    const { event, recipients, row } = await prepareAnnouncement(db(c.env), id, stage);

    if (stage === 'save_the_date') {
      const tier = tierOf(event);
      if (!tier || !tierIncludes(tier, 'save_the_date')) {
        throw new DomainError(
          'event.feature_gated',
          'Save-the-Date is a Plus-tier feature',
          403,
        );
      }
    }

    const webBase = c.env.WEB_BASE_URL ?? 'https://vite.in';
    const eventUrl = `${webBase}/e/${event.slug}`;

    let sentOk = 0;
    let failed = 0;
    for (const to of recipients) {
      try {
        const result = await sendAnnouncement(c.env, {
          to,
          eventTitle: event.title,
          startsAt: event.startsAt,
          eventUrl,
          stage: stage as AnnouncementStage,
        });
        if (result.sent) sentOk += 1;
      } catch (err) {
        failed += 1;
        c.var.logger.warn('announcement_send_failed', {
          to,
          stage,
          err: err as Error,
        });
      }
    }

    await markAnnouncementSent(db(c.env), row.id, event.id, stage as AnnouncementStage, {
      recipientCount: recipients.length,
      sent: sentOk,
      failed,
    });

    return c.json(
      {
        id: row.id,
        eventId: event.id,
        stage,
        recipientCount: recipients.length,
        sent: sentOk,
        failed,
        sentAt: new Date().toISOString(),
      },
      202,
    );
  },
);
