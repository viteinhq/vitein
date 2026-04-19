import { and, events, isNull, sql, type Db } from '@vitein/db-schema';

/**
 * Link all non-deleted events whose `creatorEmail` matches the user's email
 * (case-insensitive) and whose `creator_user_id` is still NULL to the user.
 *
 * Returns the number of events newly claimed. Safe to call repeatedly; the
 * `IS NULL` predicate prevents double-claim from touching already-linked
 * events — a previously-claimed event stays attributed to whoever claimed it
 * first.
 */
export async function claimEventsForUser(
  db: Db,
  userId: string,
  email: string,
): Promise<{ claimed: number }> {
  const result = await db
    .update(events)
    .set({ creatorUserId: userId, updatedAt: new Date() })
    .where(
      and(
        sql`lower(${events.creatorEmail}) = lower(${email})`,
        isNull(events.creatorUserId),
        isNull(events.deletedAt),
      ),
    )
    .returning({ id: events.id });
  return { claimed: result.length };
}
