import { describe, expect, it } from 'vitest';
import { canSendBulkEmail } from '../src/domain/auth/bulk-email.js';
import type { AuthContext } from '../src/domain/auth/context.js';

describe('canSendBulkEmail (ADR 0012)', () => {
  it('returns false for every auth context today', () => {
    const contexts: AuthContext[] = [
      { kind: 'anonymous' },
      { kind: 'creator', eventId: '00000000-0000-7000-8000-000000000000', tokenId: 'tok' },
      { kind: 'user', userId: '00000000-0000-7000-8000-000000000000', scopes: ['*'] },
      {
        kind: 'oauth',
        userId: '00000000-0000-7000-8000-000000000000',
        clientId: 'client',
        scopes: ['events:write'],
      },
    ];

    for (const ctx of contexts) {
      expect(canSendBulkEmail(ctx)).toBe(false);
    }
  });
});
