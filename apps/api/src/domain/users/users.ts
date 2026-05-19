import { and, desc, eq, events, isNull, rsvps, users, type Db } from '@vitein/db-schema';
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

/**
 * Patch the user's profile fields. `email` is intentionally not in the
 * accepted set — that flows through Better-Auth's change-email path with
 * a magic-link confirmation. Undefined fields are left untouched; passing
 * `name: null` clears it.
 */
export interface UpdateMeInput {
  name?: string | null;
  locale?: string;
  timezone?: string;
}

export async function updateMe(
  db: Db,
  userId: string,
  input: UpdateMeInput,
): Promise<typeof users.$inferSelect> {
  const patch: Partial<typeof users.$inferInsert> = {};
  if ('name' in input) patch.name = input.name ?? null;
  if (input.locale !== undefined) patch.locale = input.locale;
  if (input.timezone !== undefined) patch.timezone = input.timezone;
  patch.updatedAt = new Date();
  await db
    .update(users)
    .set(patch)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));
  return getMe(db, userId);
}

/**
 * Events owned by the authenticated user. Ordered by start date,
 * most recent first — matches the dashboard's expectation that the
 * "next thing I'm hosting" sits at the top. The dashboard further
 * splits upcoming vs past on the client side.
 */
export async function getMyEvents(db: Db, userId: string): Promise<(typeof events.$inferSelect)[]> {
  return db
    .select()
    .from(events)
    .where(and(eq(events.creatorUserId, userId), isNull(events.deletedAt)))
    .orderBy(desc(events.startsAt));
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
