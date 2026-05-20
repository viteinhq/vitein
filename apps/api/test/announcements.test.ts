import { describe, expect, it } from 'vitest';
import {
  insertAnnouncement,
  listAnnouncements,
  loadAnnouncementContext,
} from '../src/domain/announcements/announcements.js';
import { seedEvent, seedGuest } from './helpers/seed.js';
import { createTestDb } from './helpers/test-db.js';

describe('loadAnnouncementContext', () => {
  it('loads the event + recipients without inserting a row', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db);
    await seedGuest(db, event.id, { email: 'a@example.com' });

    const ctx = await loadAnnouncementContext(db, event.id, 'save_the_date');
    expect(ctx.event.id).toBe(event.id);
    expect(ctx.recipients).toEqual(['a@example.com']);

    // The P0 fix: nothing is written here, so a tier-gate rejection that
    // runs after this leaves no orphan row to block a later retry.
    expect(await listAnnouncements(db, event.id)).toHaveLength(0);
  });

  it('rejects an event with no guest emails', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db);
    await expect(loadAnnouncementContext(db, event.id, 'invitation')).rejects.toMatchObject({
      code: 'validation_error',
    });
  });
});

describe('insertAnnouncement', () => {
  it('inserts one row and enforces once-per-stage', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db);

    const row = await insertAnnouncement(db, event.id, 'invitation', 3);
    expect(row.stage).toBe('invitation');
    expect(row.recipientCount).toBe(3);

    await expect(insertAnnouncement(db, event.id, 'invitation', 3)).rejects.toMatchObject({
      code: 'announcement.already_sent',
    });

    // A different stage on the same event is still allowed.
    const std = await insertAnnouncement(db, event.id, 'save_the_date', 3);
    expect(std.stage).toBe('save_the_date');
  });
});
