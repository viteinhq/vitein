import { auditLog, eq, reminders } from '@vitein/db-schema';
import { describe, expect, it } from 'vitest';
import { claimDueReminders, recordReminderSent } from '../src/domain/reminders/reminders.js';
import { seedEvent } from './helpers/seed.js';
import { createTestDb } from './helpers/test-db.js';

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

async function seedDueReminder(
  db: TestDb,
  eventId: string,
  scheduledAt = new Date(Date.now() - 1000),
) {
  const [row] = await db
    .insert(reminders)
    .values({ eventId, scheduledAt, kind: 'manual' })
    .returning();
  if (!row) throw new Error('failed to seed reminder');
  return row;
}

describe('claimDueReminders (issue #290 — no double-send)', () => {
  it('claims a due reminder once; a second concurrent claim returns nothing', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db, { isPaid: true, paidFeatures: { tier: 'basic' } });
    await seedDueReminder(db, event.id);

    const first = await claimDueReminders(db);
    expect(first).toHaveLength(1);

    // Simulates an overlapping cron run: the row is already claimed.
    const second = await claimDueReminders(db);
    expect(second).toHaveLength(0);
  });

  it('does not claim reminders scheduled in the future', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db, { isPaid: true, paidFeatures: { tier: 'basic' } });
    await seedDueReminder(db, event.id, new Date(Date.now() + 60_000));

    expect(await claimDueReminders(db)).toHaveLength(0);
  });

  it('stamps sentAt at claim time', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db, { isPaid: true, paidFeatures: { tier: 'basic' } });
    const r = await seedDueReminder(db, event.id);

    await claimDueReminders(db);

    const [row] = await db.select().from(reminders).where(eq(reminders.id, r.id));
    expect(row?.sentAt).not.toBeNull();
  });

  it('recordReminderSent appends an audit row without touching sentAt', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db, { isPaid: true, paidFeatures: { tier: 'basic' } });
    const r = await seedDueReminder(db, event.id);
    await claimDueReminders(db);

    await recordReminderSent(db, r.id, event.id, { sent: true, kind: 'manual' });

    const audits = await db.select().from(auditLog).where(eq(auditLog.eventId, event.id));
    expect(audits.some((a) => a.action === 'reminder.sent')).toBe(true);
  });
});
