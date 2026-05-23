import { auditLog, eq, premiumEmailGrants, users } from '@vitein/db-schema';
import { describe, expect, it } from 'vitest';
import {
  applyGrantIfMatch,
  createGrant,
  findActiveGrantForEmail,
  listGrants,
  revokeGrant,
} from '../src/domain/admin/grants.js';
import { tierOf } from '../src/domain/payments/payments.js';
import { seedEvent } from './helpers/seed.js';
import { createTestDb } from './helpers/test-db.js';

async function seedAdminUser(db: Awaited<ReturnType<typeof createTestDb>>) {
  const [row] = await db.insert(users).values({ email: 'admin@example.com' }).returning();
  if (!row) throw new Error('failed to seed admin user');
  return row;
}

describe('premium email grants', () => {
  it('creates and lists a grant, normalizing the email', async () => {
    const db = await createTestDb();
    const admin = await seedAdminUser(db);

    const grant = await createGrant(db, {
      email: 'Friend@Example.COM',
      grantedByUserId: admin.id,
      note: 'family',
    });
    expect(grant.email).toBe('friend@example.com');
    expect(grant.tier).toBe('plus');

    const all = await listGrants(db);
    expect(all).toHaveLength(1);
    expect(all[0]?.id).toBe(grant.id);
  });

  it('rejects a second active grant for the same email (case-insensitive)', async () => {
    const db = await createTestDb();
    const admin = await seedAdminUser(db);

    await createGrant(db, { email: 'dup@example.com', grantedByUserId: admin.id });
    await expect(
      createGrant(db, { email: 'DUP@example.com', grantedByUserId: admin.id }),
    ).rejects.toMatchObject({ code: 'grant.already_exists' });
  });

  it('allows re-granting an email after revocation', async () => {
    const db = await createTestDb();
    const admin = await seedAdminUser(db);

    const first = await createGrant(db, { email: 'a@example.com', grantedByUserId: admin.id });
    await revokeGrant(db, first.id);

    const second = await createGrant(db, { email: 'a@example.com', grantedByUserId: admin.id });
    expect(second.id).not.toBe(first.id);
  });

  it('revoke is idempotent and surfaces not_found for unknown ids', async () => {
    const db = await createTestDb();
    const admin = await seedAdminUser(db);
    const grant = await createGrant(db, { email: 'r@example.com', grantedByUserId: admin.id });

    await revokeGrant(db, grant.id);
    await revokeGrant(db, grant.id); // second call must not throw

    await expect(revokeGrant(db, '00000000-0000-7000-8000-000000000000')).rejects.toMatchObject({
      code: 'grant.not_found',
    });
  });

  it('findActiveGrantForEmail ignores revoked rows and matches case-insensitively', async () => {
    const db = await createTestDb();
    const admin = await seedAdminUser(db);
    const grant = await createGrant(db, { email: 'find@example.com', grantedByUserId: admin.id });

    expect(await findActiveGrantForEmail(db, 'FIND@example.com')).not.toBeNull();
    await revokeGrant(db, grant.id);
    expect(await findActiveGrantForEmail(db, 'find@example.com')).toBeNull();
  });

  it('applyGrantIfMatch upgrades an event and writes an audit row', async () => {
    const db = await createTestDb();
    const admin = await seedAdminUser(db);
    await createGrant(db, { email: 'creator@example.com', grantedByUserId: admin.id });

    const event = await seedEvent(db, { creatorEmail: 'CREATOR@example.com' });
    expect(tierOf(event)).toBeNull();

    const applied = await applyGrantIfMatch(db, event);
    expect(applied).not.toBeNull();
    expect(applied?.event.isPaid).toBe(true);
    expect(tierOf(applied!.event)).toBe('plus');
    expect(applied?.event.paymentProvider).toBe('admin_grant');
    expect(applied?.event.paymentRef).toMatch(/^grant:/);

    const audits = await db.select().from(auditLog).where(eq(auditLog.eventId, event.id));
    expect(audits.some((a) => a.action === 'event.premium_granted')).toBe(true);
  });

  it('applyGrantIfMatch is a no-op without a matching grant', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db, { creatorEmail: 'nobody@example.com' });
    const applied = await applyGrantIfMatch(db, event);
    expect(applied).toBeNull();

    const [row] = await db.select().from(premiumEmailGrants);
    expect(row).toBeUndefined();
  });

  it('applyGrantIfMatch leaves already-paid events untouched', async () => {
    const db = await createTestDb();
    const admin = await seedAdminUser(db);
    await createGrant(db, { email: 'paid@example.com', grantedByUserId: admin.id });

    const event = await seedEvent(db, {
      creatorEmail: 'paid@example.com',
      isPaid: true,
      paidFeatures: { tier: 'basic', bundle_version: 1 },
      paymentRef: 'cs_test_existing',
      paymentProvider: 'stripe',
    });

    const applied = await applyGrantIfMatch(db, event);
    expect(applied).toBeNull();
  });
});
