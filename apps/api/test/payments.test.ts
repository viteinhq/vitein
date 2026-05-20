import { describe, expect, it } from 'vitest';
import { tierIncludes, tierOf } from '../src/domain/payments/payments.js';

describe('tierOf', () => {
  it('returns null for an unpaid event', () => {
    expect(tierOf({ isPaid: false, paidFeatures: {} })).toBeNull();
    expect(tierOf({ isPaid: false, paidFeatures: { tier: 'plus' } })).toBeNull();
  });

  it('reads the stored tier for a paid event', () => {
    expect(tierOf({ isPaid: true, paidFeatures: { tier: 'basic' } })).toBe('basic');
    expect(tierOf({ isPaid: true, paidFeatures: { tier: 'plus' } })).toBe('plus');
  });

  it('returns null for a paid event with no / unknown tier', () => {
    // Paid before the two-tier model existed.
    expect(tierOf({ isPaid: true, paidFeatures: {} })).toBeNull();
    expect(tierOf({ isPaid: true, paidFeatures: null })).toBeNull();
    expect(tierOf({ isPaid: true, paidFeatures: { tier: 'gold' } })).toBeNull();
  });
});

describe('tierIncludes', () => {
  it('grants the Basic bundle on Basic', () => {
    expect(tierIncludes('basic', 'no_branding')).toBe(true);
    expect(tierIncludes('basic', 'custom_slug')).toBe(true);
    expect(tierIncludes('basic', 'reminders')).toBe(true);
  });

  it('withholds Plus-only features from Basic', () => {
    expect(tierIncludes('basic', 'plus_ones')).toBe(false);
    expect(tierIncludes('basic', 'password_protected')).toBe(false);
    expect(tierIncludes('basic', 'save_the_date')).toBe(false);
  });

  it('grants the full bundle on Plus', () => {
    for (const feature of [
      'no_branding',
      'custom_slug',
      'reminders',
      'plus_ones',
      'password_protected',
      'save_the_date',
    ]) {
      expect(tierIncludes('plus', feature)).toBe(true);
    }
  });

  it('rejects unknown feature keys', () => {
    expect(tierIncludes('basic', 'teleportation')).toBe(false);
    expect(tierIncludes('plus', 'teleportation')).toBe(false);
  });
});
