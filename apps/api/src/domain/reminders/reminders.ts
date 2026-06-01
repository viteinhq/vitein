import {
  and,
  auditLog,
  eq,
  events,
  inArray,
  isNull,
  reminders,
  sql,
  type Db,
} from '@vitein/db-schema';
import { DomainError, NotFoundError } from '../errors.js';
import { tierIncludes, tierOf } from '../payments/payments.js';

const DUE_BATCH_LIMIT = 100;

export interface DueReminder {
  reminder: typeof reminders.$inferSelect;
  event: typeof events.$inferSelect;
}

/**
 * Atomically claim the reminders that should fire now and have not been
 * sent, stamping `sentAt` in the SAME statement that selects them, then
 * return them joined with their (live) event.
 *
 * Claiming up front is what makes the cron safe under overlap/retry: the
 * `UPDATE … WHERE sent_at IS NULL … RETURNING` takes a row lock and
 * re-checks `sent_at IS NULL`, so two concurrent cron runs cannot both
 * claim the same reminder — eliminating the duplicate-send bug. The
 * trade-off is at-most-once delivery: a send that fails AFTER the claim is
 * logged but not retried (acceptable for hourly best-effort reminders, and
 * far better than mailing guests twice).
 */
export async function claimDueReminders(db: Db, now = new Date()): Promise<DueReminder[]> {
  // Sub-select the due, unsent reminders for live events (bounded). Postgres
  // UPDATE has no LIMIT, so the cap rides on this `IN (… LIMIT n)` subquery.
  const dueIds = db
    .select({ id: reminders.id })
    .from(reminders)
    .innerJoin(events, eq(events.id, reminders.eventId))
    .where(
      and(
        isNull(reminders.sentAt),
        isNull(events.deletedAt),
        sql`${reminders.scheduledAt} <= ${now}`,
      ),
    )
    .limit(DUE_BATCH_LIMIT);

  const claimed = await db
    .update(reminders)
    .set({ sentAt: now })
    .where(and(isNull(reminders.sentAt), inArray(reminders.id, dueIds)))
    .returning({ id: reminders.id });

  if (claimed.length === 0) return [];

  const ids = claimed.map((r) => r.id);
  return db
    .select({ reminder: reminders, event: events })
    .from(reminders)
    .innerJoin(events, eq(events.id, reminders.eventId))
    .where(inArray(reminders.id, ids));
}

/**
 * Record that a claimed reminder was dispatched. `sentAt` is already stamped
 * at claim time (see `claimDueReminders`); this only appends the audit row.
 */
export async function recordReminderSent(
  db: Db,
  reminderId: string,
  eventId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await db.insert(auditLog).values({
    actorType: 'system',
    actorId: 'cron:reminders',
    eventId,
    action: 'reminder.sent',
    metadata: { reminderId, ...metadata },
  });
}

/**
 * Manually queue an immediate reminder (used by `POST /v1/events/:id/reminders/send`).
 * The cron loop picks it up on its next run; we do not send synchronously
 * here so the route stays fast and bounded.
 *
 * Reminder emails are a premium feature (`reminders`, included on Basic and
 * Plus) — unpaid events are gated here so the paid tier is enforced, not
 * just advertised.
 */
export async function queueImmediateReminder(
  db: Db,
  eventId: string,
): Promise<typeof reminders.$inferSelect> {
  const [event] = await db
    .select({ isPaid: events.isPaid, paidFeatures: events.paidFeatures })
    .from(events)
    .where(and(eq(events.id, eventId), isNull(events.deletedAt)))
    .limit(1);
  if (!event) throw new NotFoundError('event.not_found', 'Event not found');

  const tier = tierOf(event);
  if (!tier || !tierIncludes(tier, 'reminders')) {
    throw new DomainError('event.feature_gated', 'Reminder emails are a premium feature', 403);
  }

  const [row] = await db
    .insert(reminders)
    .values({
      eventId,
      scheduledAt: new Date(),
      kind: 'manual',
    })
    .returning();
  if (!row) throw new Error('Reminder insert returned no row');
  return row;
}
