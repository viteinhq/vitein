import { events, guests, type Db } from '@vitein/db-schema';

let slugCounter = 0;

/** Insert a minimal event row. Override any column via `overrides`. */
export async function seedEvent(
  db: Db,
  overrides: Partial<typeof events.$inferInsert> = {},
): Promise<typeof events.$inferSelect> {
  slugCounter += 1;
  const [row] = await db
    .insert(events)
    .values({
      slug: `test-event-${String(slugCounter)}`,
      title: 'Test event',
      startsAt: new Date('2030-06-01T18:00:00Z'),
      timezone: 'UTC',
      creatorEmail: 'creator@example.com',
      ...overrides,
    })
    .returning();
  if (!row) throw new Error('seedEvent insert returned no row');
  return row;
}

/** Insert a guest on an event. */
export async function seedGuest(
  db: Db,
  eventId: string,
  overrides: Partial<typeof guests.$inferInsert> = {},
): Promise<typeof guests.$inferSelect> {
  const [row] = await db
    .insert(guests)
    .values({
      eventId,
      email: 'guest@example.com',
      invitedVia: 'email',
      ...overrides,
    })
    .returning();
  if (!row) throw new Error('seedGuest insert returned no row');
  return row;
}
