import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/domain/events/password.js';

describe('event password hashing', () => {
  it('verifies a correct password', async () => {
    const stored = await hashPassword('hunter2');
    expect(stored.startsWith('pbkdf2-sha256$')).toBe(true);
    expect(await verifyPassword('hunter2', stored)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const stored = await hashPassword('hunter2');
    expect(await verifyPassword('hunter3', stored)).toBe(false);
  });

  it('emits a different hash for the same password (per-password salt)', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
    expect(await verifyPassword('same', a)).toBe(true);
    expect(await verifyPassword('same', b)).toBe(true);
  });

  it('rejects a malformed stored hash', async () => {
    expect(await verifyPassword('whatever', 'not-a-real-hash')).toBe(false);
    expect(await verifyPassword('whatever', 'pbkdf2-sha256$notnumber$abc$xyz')).toBe(false);
  });

  it('handles unicode passwords', async () => {
    const stored = await hashPassword('für-die-🎉');
    expect(await verifyPassword('für-die-🎉', stored)).toBe(true);
    expect(await verifyPassword('für-die', stored)).toBe(false);
  });
});
