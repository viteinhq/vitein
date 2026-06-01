import { describe, expect, it } from 'vitest';
import { deriveMcpUrl } from '../src/infra/auth.js';

describe('deriveMcpUrl (GHSA-rx56 audience narrowing)', () => {
  it('maps the production api host to the mcp host', () => {
    expect(deriveMcpUrl('https://api.vite.in')).toBe('https://mcp.vite.in/mcp');
  });

  it('maps the staging api host to the mcp host', () => {
    expect(deriveMcpUrl('https://api-staging.vite.in')).toBe('https://mcp-staging.vite.in/mcp');
  });

  it('handles local dev', () => {
    expect(deriveMcpUrl('http://localhost:8787')).toBe('http://localhost:8787/mcp');
  });

  it('never yields the bare API origin (which must not be a valid audience)', () => {
    for (const base of ['https://api.vite.in', 'https://api-staging.vite.in']) {
      expect(deriveMcpUrl(base)).not.toBe(base);
    }
  });
});
