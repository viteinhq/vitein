import { describe, expect, it } from 'vitest';
import { cspFor, isLocalhost, productionCsp } from './csp';

const platform = {
  env: { API_BASE_URL: 'https://api-staging.vite.in' },
} as unknown as App.Platform;

describe('cspFor (issue #293 — frame-ancestors in every env)', () => {
  it("emits frame-ancestors 'none' on localhost (without script/style restrictions)", () => {
    const csp = cspFor(new URL('http://localhost:5173/'), undefined);
    expect(csp).toBe("frame-ancestors 'none'");
  });

  it("emits frame-ancestors 'none' as part of the full prod policy", () => {
    const csp = cspFor(new URL('https://next.vite.in/'), platform);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('connect-src');
  });

  it('treats 127.0.0.1 as localhost', () => {
    expect(isLocalhost(new URL('http://127.0.0.1:5173/'))).toBe(true);
    expect(isLocalhost(new URL('https://next.vite.in/'))).toBe(false);
  });

  it('production policy pins connect-src to the configured API origin', () => {
    expect(productionCsp(platform)).toContain('connect-src ');
    expect(productionCsp(platform)).toContain('https://api-staging.vite.in');
  });
});
