import { eq, events } from '@vitein/db-schema';
import { describe, expect, it } from 'vitest';
import { markEventPaid, tierOf } from '../src/domain/payments/payments.js';
import { seedEvent } from './helpers/seed.js';
import { createTestDb } from './helpers/test-db.js';

describe('markEventPaid', () => {
  it('throws a NotFoundError for a missing event (issue #291 ack contract)', async () => {
    const db = await createTestDb();
    // The webhook branches on this error type to 200-ack (not retry) a
    // permanently-bad event id.
    await expect(
      markEventPaid(db, {
        eventId: '01900000-0000-7000-8000-000000000000',
        tier: 'plus',
        paymentRef: 'cs_test_missing',
      }),
    ).rejects.toMatchObject({ code: 'event.not_found' });
  });

  it('throws NotFoundError for a soft-deleted event', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db);
    await db.update(events).set({ deletedAt: new Date() }).where(eq(events.id, event.id));

    await expect(
      markEventPaid(db, { eventId: event.id, tier: 'basic', paymentRef: 'cs_x' }),
    ).rejects.toMatchObject({ code: 'event.not_found' });
  });

  it('marks a live event paid at the given tier', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db);

    await markEventPaid(db, { eventId: event.id, tier: 'plus', paymentRef: 'cs_ok' });

    const [row] = await db.select().from(events).where(eq(events.id, event.id));
    expect(row?.isPaid).toBe(true);
    expect(tierOf(row!)).toBe('plus');
  });
});
