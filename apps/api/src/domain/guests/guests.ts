import { eq, events, guests, isNull, and, type Db } from '@vitein/db-schema';
import { NotFoundError } from '../errors.js';

export type InvitedVia = 'link' | 'email' | 'sms' | 'whatsapp' | 'agent';

export interface GuestInput {
  name?: string | null | undefined;
  email?: string | null | undefined;
  phone?: string | null | undefined;
  invitedVia: InvitedVia;
}

export async function addGuest(
  db: Db,
  eventId: string,
  input: GuestInput,
): Promise<typeof guests.$inferSelect> {
  await assertEventActive(db, eventId);

  const [row] = await db
    .insert(guests)
    .values({
      eventId,
      name: input.name ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      invitedVia: input.invitedVia,
    })
    .returning();

  if (!row) throw new Error('Guest insert returned no row');
  return row;
}

export async function listGuests(db: Db, eventId: string): Promise<(typeof guests.$inferSelect)[]> {
  await assertEventActive(db, eventId);
  return db.select().from(guests).where(eq(guests.eventId, eventId)).orderBy(guests.invitedAt);
}

async function assertEventActive(db: Db, eventId: string): Promise<void> {
  const [row] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), isNull(events.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('event.not_found', 'Event not found');
}
