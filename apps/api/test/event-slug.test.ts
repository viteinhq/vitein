import { describe, expect, it } from 'vitest';
import { updateEvent } from '../src/domain/events/events.js';
import { seedEvent } from './helpers/seed.js';
import { createTestDb } from './helpers/test-db.js';

describe('updateEvent — custom slug', () => {
  it('updates the slug to an unused value', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db);

    const updated = await updateEvent(db, event.id, { slug: 'annas-30ter' });
    expect(updated.slug).toBe('annas-30ter');
  });

  it('rejects a slug already taken by another event', async () => {
    const db = await createTestDb();
    const a = await seedEvent(db);
    const b = await seedEvent(db);

    await expect(updateEvent(db, b.id, { slug: a.slug })).rejects.toMatchObject({
      code: 'event.slug_taken',
    });
  });
});
