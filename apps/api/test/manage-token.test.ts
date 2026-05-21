import { eq, eventTokens } from '@vitein/db-schema';
import { describe, expect, it } from 'vitest';
import { hashToken } from '../src/domain/auth/tokens.js';
import { mintManageToken } from '../src/domain/events/events.js';
import { seedEvent } from './helpers/seed.js';
import { createTestDb } from './helpers/test-db.js';

describe('mintManageToken', () => {
  it('mints a manage token that hashes to a stored event_token row', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db);

    const token = await mintManageToken(db, event.id);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);

    const hash = await hashToken(token);
    const rows = await db.select().from(eventTokens).where(eq(eventTokens.eventId, event.id));
    const match = rows.find((r) => r.tokenHash === hash);
    expect(match?.purpose).toBe('manage');
  });

  it('mints a distinct token each call (additive)', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db);

    const a = await mintManageToken(db, event.id);
    const b = await mintManageToken(db, event.id);
    expect(a).not.toBe(b);

    const rows = await db.select().from(eventTokens).where(eq(eventTokens.eventId, event.id));
    expect(rows).toHaveLength(2);
  });
});
