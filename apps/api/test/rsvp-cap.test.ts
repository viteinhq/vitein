import { rsvps } from '@vitein/db-schema';
import { describe, expect, it } from 'vitest';
import { MAX_RSVPS_PER_EVENT, listRsvps, submitRsvp } from '../src/domain/rsvps/rsvps.js';
import { seedEvent } from './helpers/seed.js';
import { createTestDb } from './helpers/test-db.js';

describe('RSVP cap (issue #292)', () => {
  it('accepts an RSVP on an event below the cap', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db);
    const { rsvp } = await submitRsvp(db, event.id, { name: 'Anna', status: 'yes' });
    expect(rsvp.eventId).toBe(event.id);
  });

  it('rejects an RSVP once the event reaches MAX_RSVPS_PER_EVENT', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db);

    // Fill to the ceiling with a single bulk insert.
    const filler = Array.from({ length: MAX_RSVPS_PER_EVENT }, (_, i) => ({
      eventId: event.id,
      name: `guest-${String(i)}`,
      status: 'yes' as const,
      plusOnesDetails: [],
    }));
    await db.insert(rsvps).values(filler);

    await expect(submitRsvp(db, event.id, { name: 'Over', status: 'yes' })).rejects.toMatchObject({
      code: 'event.rsvp_limit_reached',
      status: 429,
    });
  });

  it('listRsvps never returns more than the hard cap', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db);
    const filler = Array.from({ length: 10 }, (_, i) => ({
      eventId: event.id,
      name: `g-${String(i)}`,
      status: 'yes' as const,
      plusOnesDetails: [],
    }));
    await db.insert(rsvps).values(filler);

    const rows = await listRsvps(db, event.id);
    expect(rows.length).toBeLessThanOrEqual(MAX_RSVPS_PER_EVENT);
    expect(rows).toHaveLength(10);
  });
});
