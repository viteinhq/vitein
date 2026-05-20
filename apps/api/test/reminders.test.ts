import { describe, expect, it } from 'vitest';
import { queueImmediateReminder } from '../src/domain/reminders/reminders.js';
import { seedEvent } from './helpers/seed.js';
import { createTestDb } from './helpers/test-db.js';

describe('queueImmediateReminder', () => {
  it('rejects an unpaid event — reminders are a premium feature', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db, { isPaid: false });
    await expect(queueImmediateReminder(db, event.id)).rejects.toMatchObject({
      code: 'event.feature_gated',
      status: 403,
    });
  });

  it('queues a reminder for a Basic-tier event', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db, { isPaid: true, paidFeatures: { tier: 'basic' } });
    const reminder = await queueImmediateReminder(db, event.id);
    expect(reminder.eventId).toBe(event.id);
    expect(reminder.kind).toBe('manual');
  });

  it('queues a reminder for a Plus-tier event', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db, { isPaid: true, paidFeatures: { tier: 'plus' } });
    const reminder = await queueImmediateReminder(db, event.id);
    expect(reminder.eventId).toBe(event.id);
  });

  it('throws not_found for a missing event', async () => {
    const db = await createTestDb();
    await expect(
      queueImmediateReminder(db, '01900000-0000-7000-8000-000000000000'),
    ).rejects.toMatchObject({ code: 'event.not_found' });
  });
});
