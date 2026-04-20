import { and, auditLog, events, lt, sql, users, type Db } from '@vitein/db-schema';

const GRACE_DAYS = 30;
const GRACE_MS = GRACE_DAYS * 24 * 60 * 60 * 1000;

export interface PurgeResult {
  eventsDeleted: number;
  usersDeleted: number;
}

/**
 * Hard-delete rows that have been soft-deleted longer than the grace window.
 *
 * - Events: FK cascades take care of `event_tokens`, `guests`, `rsvps`,
 *   `reminders`. `audit_log.event_id` intentionally has no FK so the audit
 *   trail survives.
 * - Users: FK from `events.creator_user_id` is `ON DELETE SET NULL`, so
 *   historical events stay intact but detach from the deleted user.
 */
export async function purgeSoftDeleted(db: Db, now = new Date()): Promise<PurgeResult> {
  const cutoff = new Date(now.getTime() - GRACE_MS);

  const deletedEvents = await db
    .delete(events)
    .where(and(sql`${events.deletedAt} IS NOT NULL`, lt(events.deletedAt, cutoff)))
    .returning({ id: events.id });

  for (const row of deletedEvents) {
    await db.insert(auditLog).values({
      actorType: 'system',
      actorId: 'cron:purge',
      eventId: row.id,
      action: 'event.hard_delete',
      metadata: { grace_days: GRACE_DAYS },
    });
  }

  const deletedUsers = await db
    .delete(users)
    .where(and(sql`${users.deletedAt} IS NOT NULL`, lt(users.deletedAt, cutoff)))
    .returning({ id: users.id });

  for (const row of deletedUsers) {
    await db.insert(auditLog).values({
      actorType: 'system',
      actorId: 'cron:purge',
      action: 'user.hard_delete',
      metadata: { user_id: row.id, grace_days: GRACE_DAYS },
    });
  }

  return {
    eventsDeleted: deletedEvents.length,
    usersDeleted: deletedUsers.length,
  };
}
