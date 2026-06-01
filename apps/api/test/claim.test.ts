import { eq, events, users } from '@vitein/db-schema';
import { describe, expect, it } from 'vitest';
import { createGrant } from '../src/domain/admin/grants.js';
import { tierOf } from '../src/domain/payments/payments.js';
import { claimEventsForUser } from '../src/domain/users/claim.js';
import { seedEvent } from './helpers/seed.js';
import { createTestDb } from './helpers/test-db.js';

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

async function seedUser(db: TestDb, email: string) {
  const [row] = await db.insert(users).values({ email }).returning();
  if (!row) throw new Error('failed to seed user');
  return row;
}

describe('claimEventsForUser', () => {
  it('links matching anonymous events to the user', async () => {
    const db = await createTestDb();
    const user = await seedUser(db, 'owner@example.com');
    const event = await seedEvent(db, { creatorEmail: 'OWNER@example.com' });

    const { claimed } = await claimEventsForUser(db, user.id, 'owner@example.com');
    expect(claimed).toBe(1);

    const [row] = await db.select().from(events).where(eq(events.id, event.id));
    expect(row?.creatorUserId).toBe(user.id);
  });

  it('applies a complimentary grant only on claim, by verified email (GHSA-h8p7)', async () => {
    const db = await createTestDb();
    const admin = await seedUser(db, 'admin@example.com');
    await createGrant(db, { email: 'vip@example.com', grantedByUserId: admin.id, tier: 'plus' });

    // Anonymous event with the granted email — must NOT be premium yet.
    const event = await seedEvent(db, { creatorEmail: 'vip@example.com' });
    expect(tierOf(event)).toBeNull();

    // The grant holder signs in (verified email) and claims.
    const user = await seedUser(db, 'vip@example.com');
    await claimEventsForUser(db, user.id, 'vip@example.com');

    const [row] = await db.select().from(events).where(eq(events.id, event.id));
    expect(row).toBeDefined();
    expect(tierOf(row!)).toBe('plus');
    expect(row!.paymentProvider).toBe('admin_grant');
  });

  it('leaves a claimed event free when no grant matches the email', async () => {
    const db = await createTestDb();
    const user = await seedUser(db, 'plain@example.com');
    const event = await seedEvent(db, { creatorEmail: 'plain@example.com' });

    await claimEventsForUser(db, user.id, 'plain@example.com');

    const [row] = await db.select().from(events).where(eq(events.id, event.id));
    expect(row).toBeDefined();
    expect(tierOf(row!)).toBeNull();
  });
});
