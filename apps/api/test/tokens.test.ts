import { describe, expect, it } from 'vitest';
import { hashToken, issueCreatorToken } from '../src/domain/auth/tokens.js';

// Node ≥20 exposes WebCrypto on globalThis, matching the Workers runtime.

describe('creator tokens', () => {
  it('issueCreatorToken returns a base64url string with ≥43 chars (256 bits)', () => {
    const t = issueCreatorToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t.length).toBeGreaterThanOrEqual(43);
  });

  it('issueCreatorToken is non-deterministic', () => {
    const a = issueCreatorToken();
    const b = issueCreatorToken();
    expect(a).not.toBe(b);
  });

  it('hashToken is deterministic for the same input', async () => {
    const t = issueCreatorToken();
    const h1 = await hashToken(t);
    const h2 = await hashToken(t);
    expect(h1).toBe(h2);
  });

  it('hashToken differs for different tokens', async () => {
    const h1 = await hashToken(issueCreatorToken());
    const h2 = await hashToken(issueCreatorToken());
    expect(h1).not.toBe(h2);
  });

  it('hashToken output is base64url and 43 chars (SHA-256 → 32 bytes)', async () => {
    const h = await hashToken(issueCreatorToken());
    expect(h).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(h.length).toBe(43);
  });
});
