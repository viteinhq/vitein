import { and, eq, events, isNull, rsvps, type Db } from '@vitein/db-schema';
import { NotFoundError } from '../errors.js';
import { tierOf } from '../payments/payments.js';

export type RsvpStatus = 'yes' | 'maybe' | 'no';

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
  return db.select().from(rsvps).where(eq(rsvps.eventId, eventId)).orderBy(rsvps.respondedAt);
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
