import { describe, expect, it } from 'vitest';
import { generateSlug } from '../src/domain/events/slug.js';

describe('generateSlug', () => {
  it('returns a string of the requested length (default 8)', () => {
    expect(generateSlug()).toHaveLength(8);
    expect(generateSlug(12)).toHaveLength(12);
  });

  it('contains only Crockford base32 characters (excludes i, l, o, u)', () => {
    const s = generateSlug(32);
    expect(s).toMatch(/^[0-9abcdefghjkmnpqrstvwxyz]+$/);
    expect(s).not.toMatch(/[ilou]/);
  });

  it('is (virtually) non-repeating — 1000 draws all unique', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(generateSlug());
    expect(seen.size).toBe(1000);
  });
});
