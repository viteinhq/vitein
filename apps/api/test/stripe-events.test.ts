import { describe, expect, it } from 'vitest';
import { claimStripeEvent, releaseStripeEvent } from '../src/domain/payments/payments.js';
import { createTestDb } from './helpers/test-db.js';

describe('claimStripeEvent', () => {
  it('claims a fresh event id once, then reports duplicates', async () => {
    const db = await createTestDb();
    expect(await claimStripeEvent(db, 'evt_1', 'checkout.session.completed')).toBe(true);
    // A re-delivery of the same Stripe event is recognised as a duplicate.
    expect(await claimStripeEvent(db, 'evt_1', 'checkout.session.completed')).toBe(false);
  });

  it('releasing a claim lets the id be processed again', async () => {
    const db = await createTestDb();
    expect(await claimStripeEvent(db, 'evt_2', 'checkout.session.completed')).toBe(true);
    await releaseStripeEvent(db, 'evt_2');
    // After a processing failure released the claim, Stripe's retry re-runs.
    expect(await claimStripeEvent(db, 'evt_2', 'checkout.session.completed')).toBe(true);
  });
});
