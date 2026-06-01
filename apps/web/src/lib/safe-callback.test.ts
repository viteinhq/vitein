import { describe, expect, it } from 'vitest';
import { safeCallback } from './safe-callback';

const ORIGIN = 'https://next.vite.in';

describe('safeCallback (GHSA-fqm5 open-redirect guard)', () => {
  it('keeps a same-origin relative path (made absolute)', () => {
    expect(safeCallback('/account/settings', ORIGIN)).toBe('https://next.vite.in/account/settings');
    expect(safeCallback('/e/abc/manage?token=x', ORIGIN)).toBe(
      'https://next.vite.in/e/abc/manage?token=x',
    );
  });

  it('keeps a same-origin absolute URL', () => {
    expect(safeCallback('https://next.vite.in/account/dashboard', ORIGIN)).toBe(
      'https://next.vite.in/account/dashboard',
    );
  });

  it('rejects a cross-origin absolute URL', () => {
    expect(safeCallback('https://evil.example/phish', ORIGIN)).toBe(
      'https://next.vite.in/account/dashboard',
    );
  });

  it('rejects a protocol-relative URL (//evil)', () => {
    expect(safeCallback('//evil.example', ORIGIN)).toBe('https://next.vite.in/account/dashboard');
  });

  it('rejects a backslash-tricked authority', () => {
    // new URL normalizes backslashes; resulting origin must still match.
    const out = safeCallback('/\\evil.example', ORIGIN);
    expect(out.startsWith('https://next.vite.in/')).toBe(true);
  });

  it('falls back when cb is missing/empty', () => {
    expect(safeCallback(null, ORIGIN)).toBe('https://next.vite.in/account/dashboard');
    expect(safeCallback('', ORIGIN)).toBe('https://next.vite.in/account/dashboard');
  });

  it('honours a custom fallback path', () => {
    expect(safeCallback('https://evil.example', ORIGIN, '/signin')).toBe(
      'https://next.vite.in/signin',
    );
  });
});
