import { and, eq, events, isNull, rsvps, users, type Db } from '@vitein/db-schema';
import { NotFoundError } from '../errors.js';

export async function getMe(db: Db, userId: string): Promise<typeof users.$inferSelect> {
  const [row] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('user.not_found', 'User not found');
  return row;
}

/** Events owned by the authenticated user (claimed or created while signed in). */
export async function getMyEvents(db: Db, userId: string): Promise<(typeof events.$inferSelect)[]> {
  return db
    .select()
    .from(events)
    .where(and(eq(events.creatorUserId, userId), isNull(events.deletedAt)))
    .orderBy(events.startsAt);
}

/**
 * Soft-delete the user. 30-day grace period before hard delete is enforced
 * by a separate cron worker (not implemented yet — tracked as follow-up).
 * The existing events keep working via creator tokens even while the user
 * is soft-deleted; the FK on `events.creator_user_id` uses SET NULL on the
 * hard delete, so event ownership disconnects cleanly.
 */
export async function softDeleteMe(db: Db, userId: string): Promise<void> {
  await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, userId));
}

export interface UserExport {
  exportedAt: Date;
  user: typeof users.$inferSelect;
  events: (typeof events.$inferSelect)[];
  rsvps: (typeof rsvps.$inferSelect)[];
}

/**
 * GDPR export. Returns the user row plus every event they own and every
 * RSVP tied to their email. Non-owned data (e.g. public-link RSVPs that
 * happen to share an email) is intentionally included — the user can prove
 * ownership of that email at export time.
 */
export async function exportMe(db: Db, userId: string): Promise<UserExport> {
  const user = await getMe(db, userId);
  const [ownedEvents, myRsvps] = await Promise.all([
    db
      .select()
      .from(events)
      .where(and(eq(events.creatorUserId, userId), isNull(events.deletedAt))),
    db.select().from(rsvps).where(eq(rsvps.email, user.email)),
  ]);
  return {
    exportedAt: new Date(),
    user,
    events: ownedEvents,
    rsvps: myRsvps,
  };
}
