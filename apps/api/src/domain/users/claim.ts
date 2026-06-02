import { and, events, isNull, sql, type Db } from '@vitein/db-schema';
import { applyGrantIfMatch } from '../admin/grants.js';

/**
 * Link all non-deleted events whose `creatorEmail` matches the user's email
 * (case-insensitive) and whose `creator_user_id` is still NULL to the user.
 *
 * Returns the number of events newly claimed. Safe to call repeatedly; the
 * `IS NULL` predicate prevents double-claim from touching already-linked
 * events — a previously-claimed event stays attributed to whoever claimed it
 * first.
 *
 * Claiming is also where complimentary admin grants are applied. This is
 * the first point at which the creator email is *verified* (the caller
 * signed in via magic link to that address), so it is safe to upgrade —
 * unlike anonymous creation, where the email is unproven and auto-applying
 * a grant by raw email is abusable (GHSA-h8p7). A grant only ever reaches
 * an event the claimer actually owns, since the event was matched by that
 * verified email to begin with.
 */
export async function claimEventsForUser(
  db: Db,
  userId: string,
  email: string,
): Promise<{ claimed: number }> {
  const claimed = await db
    .update(events)
    .set({ creatorUserId: userId, updatedAt: new Date() })
    .where(
      and(
        sql`lower(${events.creatorEmail}) = lower(${email})`,
        isNull(events.creatorUserId),
        isNull(events.deletedAt),
      ),
    )
    .returning();

  for (const event of claimed) {
    // Best-effort: a grant-application failure must not fail the claim.
    // applyGrantIfMatch is a no-op for already-paid / unmatched events and
    // claiming is idempotent, so a transient miss just retries next call.
    try {
      await applyGrantIfMatch(db, event);
    } catch {
      /* swallow */
    }
  }

  return { claimed: claimed.length };
}
