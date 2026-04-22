import { and, eq, eventTokens, type Db } from '@vitein/db-schema';
import { hashToken, issueCreatorToken } from '../auth/tokens.js';

/**
 * Short-lived view tokens for password-protected events. A guest posts the
 * password to /verify-password, the API issues a 32-byte random token, stores
 * only its SHA-256 hash in `event_tokens` (purpose='view', expires in 24h),
 * and returns the plaintext. The web stashes it in an httpOnly cookie scoped
 * to `/e/{slug}` and forwards it on subsequent loads as `X-Event-View-Token`.
 *
 * Token reuses creator-token entropy (32 bytes random) — 256 bits of
 * entropy means SHA-256 is sufficient, no PBKDF2 needed for storage.
 */

const VIEW_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const VIEW_TOKEN_TTL_SECONDS = VIEW_TOKEN_TTL_MS / 1000;

export interface IssuedViewToken {
  token: string;
  expiresAt: Date;
}

export async function issueViewToken(db: Db, eventId: string): Promise<IssuedViewToken> {
  const token = issueCreatorToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + VIEW_TOKEN_TTL_MS);
  await db.insert(eventTokens).values({
    eventId,
    tokenHash,
    purpose: 'view',
    expiresAt,
  });
  return { token, expiresAt };
}

export async function isViewTokenValid(
  db: Db,
  eventId: string,
  token: string,
): Promise<boolean> {
  const hash = await hashToken(token);
  const [row] = await db
    .select({
      id: eventTokens.id,
      expiresAt: eventTokens.expiresAt,
      revokedAt: eventTokens.revokedAt,
    })
    .from(eventTokens)
    .where(
      and(
        eq(eventTokens.tokenHash, hash),
        eq(eventTokens.purpose, 'view'),
        eq(eventTokens.eventId, eventId),
      ),
    )
    .limit(1);
  if (!row) return false;
  if (row.revokedAt) return false;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return false;
  return true;
}
