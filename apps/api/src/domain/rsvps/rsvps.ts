import { and, eq, events, isNull, rsvps, sql, type Db } from '@vitein/db-schema';
import { DomainError, NotFoundError } from '../errors.js';
import { tierOf } from '../payments/payments.js';

export type RsvpStatus = 'yes' | 'maybe' | 'no';

/**
 * Generous-but-finite ceiling on RSVPs per event. RSVP submission is
 * unauthenticated, so without a cap a single event's response set is
 * unbounded — a memory/DoS hazard for the list + CSV paths that load it
 * all into a 128 MB Worker. 5000 comfortably covers real events; beyond it
 * the host should be on a plan with proper pagination (follow-up).
 */
export const MAX_RSVPS_PER_EVENT = 5000;

/** Hard cap on rows any single list query loads into the Worker. */
const LIST_HARD_CAP = MAX_RSVPS_PER_EVENT;

export interface PlusOneDetail {
  name: string;
}

export interface RsvpInput {
  name: string;
  email?: string | null | undefined;
  status: RsvpStatus;
  message?: string | null | undefined;
  plusOnes?: number | undefined;
  /**
   * Named plus-one entries (A.6b, Plus tier only). Ignored on Basic events;
   * if the length doesn't match `plusOnes`, we trust the count and store
   * what was sent anyway — the UI controls both together.
   */
  plusOnesDetails?: PlusOneDetail[] | undefined;
  guestId?: string | null | undefined;
}

export interface SubmittedRsvp {
  rsvp: typeof rsvps.$inferSelect;
  event: typeof events.$inferSelect;
}

export async function submitRsvp(
  db: Db,
  eventId: string,
  input: RsvpInput,
): Promise<SubmittedRsvp> {
  const event = await findActiveEvent(db, eventId);

  // Bound the unauthenticated write path: refuse new RSVPs once the event
  // hits its ceiling, so the response set (and the list/CSV that load it)
  // stays finite.
  const countRows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(rsvps)
    .where(eq(rsvps.eventId, eventId));
  const n = countRows[0]?.n ?? 0;
  if (n >= MAX_RSVPS_PER_EVENT) {
    throw new DomainError('event.rsvp_limit_reached', 'This event has reached its RSVP limit', 429);
  }

  // Named plus-one details are a Plus-tier feature. Basic-tier events (and
  // unpaid ones) keep the integer count but we drop the names, so the
  // feature can't be abused without paying.
  const isPlus = tierOf(event) === 'plus';
  const plusOnesDetails = isPlus && input.plusOnesDetails ? input.plusOnesDetails : [];

  const [row] = await db
    .insert(rsvps)
    .values({
      eventId,
      guestId: input.guestId ?? null,
      name: input.name,
      email: input.email ?? null,
      status: input.status,
      plusOnes: input.plusOnes ?? 0,
      plusOnesDetails,
      message: input.message ?? null,
    })
    .returning();

  if (!row) throw new Error('RSVP insert returned no row');
  return { rsvp: row, event };
}

export async function listRsvps(db: Db, eventId: string): Promise<(typeof rsvps.$inferSelect)[]> {
  await findActiveEvent(db, eventId);
  return db
    .select()
    .from(rsvps)
    .where(eq(rsvps.eventId, eventId))
    .orderBy(rsvps.respondedAt)
    .limit(LIST_HARD_CAP);
}

async function findActiveEvent(db: Db, id: string): Promise<typeof events.$inferSelect> {
  const [row] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), isNull(events.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('event.not_found', 'Event not found');
  return row;
}
