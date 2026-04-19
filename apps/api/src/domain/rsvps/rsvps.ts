import { and, eq, events, isNull, rsvps, type Db } from '@vitein/db-schema';
import { NotFoundError } from '../errors.js';

export type RsvpStatus = 'yes' | 'maybe' | 'no';

export interface RsvpInput {
  name: string;
  email?: string | null | undefined;
  status: RsvpStatus;
  message?: string | null | undefined;
  plusOnes?: number | undefined;
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

  const [row] = await db
    .insert(rsvps)
    .values({
      eventId,
      guestId: input.guestId ?? null,
      name: input.name,
      email: input.email ?? null,
      status: input.status,
      plusOnes: input.plusOnes ?? 0,
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
