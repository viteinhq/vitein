import { auditLog, eq, eventTokens } from '@vitein/db-schema';
import { describe, expect, it } from 'vitest';
import { issueRecoveryTokens } from '../src/domain/auth/recover.js';
import { hashToken } from '../src/domain/auth/tokens.js';
import { seedEvent } from './helpers/seed.js';
import { createTestDb } from './helpers/test-db.js';

describe('issueRecoveryTokens', () => {
  it('mints a token for every non-deleted event matching the email', async () => {
    const db = await createTestDb();
    const a = await seedEvent(db, { creatorEmail: 'host@example.com', title: 'Party A' });
    const b = await seedEvent(db, { creatorEmail: 'host@example.com', title: 'Party B' });
    await seedEvent(db, { creatorEmail: 'someone-else@example.com' });

    const recovered = await issueRecoveryTokens(db, 'host@example.com');

    expect(recovered).toHaveLength(2);
    expect(recovered.map((r) => r.eventId).sort()).toEqual([a.id, b.id].sort());
    for (const r of recovered) {
      expect(r.creatorToken).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it('matches the email case-insensitively', async () => {
    const db = await createTestDb();
    await seedEvent(db, { creatorEmail: 'Host@Example.com' });
    const recovered = await issueRecoveryTokens(db, 'host@example.com');
    expect(recovered).toHaveLength(1);
  });

  it('the minted token hashes to a stored manage event_token row', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db, { creatorEmail: 'host@example.com' });

    const recovered = await issueRecoveryTokens(db, 'host@example.com');
    const first = recovered[0];
    expect(first).toBeDefined();
    if (!first) throw new Error('expected one recovered event');

    const tokenHash = await hashToken(first.creatorToken);
    const rows = await db.select().from(eventTokens).where(eq(eventTokens.eventId, event.id));
    const match = rows.find((r) => r.tokenHash === tokenHash);
    expect(match?.purpose).toBe('manage');
  });

  it('ignores soft-deleted events', async () => {
    const db = await createTestDb();
    await seedEvent(db, { creatorEmail: 'host@example.com', deletedAt: new Date() });
    const recovered = await issueRecoveryTokens(db, 'host@example.com');
    expect(recovered).toHaveLength(0);
  });

  it('returns empty for an email with no events', async () => {
    const db = await createTestDb();
    await seedEvent(db, { creatorEmail: 'host@example.com' });
    const recovered = await issueRecoveryTokens(db, 'nobody@example.com');
    expect(recovered).toEqual([]);
  });

  it('writes an event.recovery audit row per recovered event', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db, { creatorEmail: 'host@example.com' });
    await issueRecoveryTokens(db, 'host@example.com');
    const rows = await db.select().from(auditLog).where(eq(auditLog.eventId, event.id));
    expect(rows.some((r) => r.action === 'event.recovery')).toBe(true);
  });

  it('does not re-issue within the cooldown window', async () => {
    const db = await createTestDb();
    await seedEvent(db, { creatorEmail: 'host@example.com' });

    const first = await issueRecoveryTokens(db, 'host@example.com');
    expect(first).toHaveLength(1);

    // A second request moments later is silently throttled — empty result,
    // so the route sends no email.
    const second = await issueRecoveryTokens(db, 'host@example.com');
    expect(second).toEqual([]);
  });
});
