import { pushSubscriptions } from '@vitein/db-schema';
import { describe, expect, it } from 'vitest';
import { refreshPushSubscription, registerPushSubscription } from '../src/domain/push/push.js';
import { seedEvent } from './helpers/seed.js';
import { createTestDb } from './helpers/test-db.js';

describe('refreshPushSubscription', () => {
  it('migrates endpoint + keys and keeps the event binding', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db);
    await registerPushSubscription(db, {
      binding: { eventId: event.id },
      endpoint: 'https://push.example.com/old',
      p256dh: 'old-p256dh',
      auth: 'old-auth',
    });

    await refreshPushSubscription(db, {
      oldEndpoint: 'https://push.example.com/old',
      endpoint: 'https://push.example.com/new',
      p256dh: 'new-p256dh',
      auth: 'new-auth',
    });

    const rows = await db.select().from(pushSubscriptions);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      endpoint: 'https://push.example.com/new',
      p256dh: 'new-p256dh',
      auth: 'new-auth',
      eventId: event.id,
    });
  });

  it('is a no-op when the old endpoint is unknown', async () => {
    const db = await createTestDb();

    await refreshPushSubscription(db, {
      oldEndpoint: 'https://push.example.com/missing',
      endpoint: 'https://push.example.com/new',
      p256dh: 'p',
      auth: 'a',
    });

    expect(await db.select().from(pushSubscriptions)).toHaveLength(0);
  });

  it('swallows the conflict when the new endpoint is already stored', async () => {
    const db = await createTestDb();
    const event = await seedEvent(db);
    await registerPushSubscription(db, {
      binding: { eventId: event.id },
      endpoint: 'https://push.example.com/old',
      p256dh: 'p1',
      auth: 'a1',
    });
    await registerPushSubscription(db, {
      binding: { eventId: event.id },
      endpoint: 'https://push.example.com/taken',
      p256dh: 'p2',
      auth: 'a2',
    });

    // Refreshing onto an endpoint that already has a row must not throw —
    // that browser is already subscribed, nothing left to migrate.
    await expect(
      refreshPushSubscription(db, {
        oldEndpoint: 'https://push.example.com/old',
        endpoint: 'https://push.example.com/taken',
        p256dh: 'p3',
        auth: 'a3',
      }),
    ).resolves.toBeUndefined();
  });
});
