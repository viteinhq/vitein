import { and, auditLog, eq, events, isNull, reminders, sql, type Db } from '@vitein/db-schema';
import { NotFoundError } from '../errors.js';

const DUE_BATCH_LIMIT = 100;

export interface DueReminder {
  reminder: typeof reminders.$inferSelect;
  event: typeof events.$inferSelect;
}

/** List reminders that should fire now and have not been sent yet. */
export async function findDueReminders(db: Db, now = new Date()): Promise<DueReminder[]> {
  const rows = await db
    .select({ reminder: reminders, event: events })
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
  return rows;
}

/** Mark a reminder as sent and append an audit-log row. */
export async function markReminderSent(
  db: Db,
  reminderId: string,
  eventId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await db.update(reminders).set({ sentAt: new Date() }).where(eq(reminders.id, reminderId));
  await db.insert(auditLog).values({
    actorType: 'system',
    actorId: 'cron:reminders',
    eventId,
    action: 'reminder.sent',
    metadata,
  });
}

/**
 * Manually queue an immediate reminder (used by `POST /v1/events/:id/reminders/send`).
 * The cron loop picks it up on its next run; we do not send synchronously
 * here so the route stays fast and bounded.
 */
export async function queueImmediateReminder(
  db: Db,
  eventId: string,
): Promise<typeof reminders.$inferSelect> {
  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), isNull(events.deletedAt)))
    .limit(1);
  if (!event) throw new NotFoundError('event.not_found', 'Event not found');

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
