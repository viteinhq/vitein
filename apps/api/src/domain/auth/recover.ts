import { and, auditLog, eventTokens, events, isNull, sql, type Db } from '@vitein/db-schema';
import { hashToken, issueCreatorToken } from './tokens.js';

/**
 * One event whose management link is being re-issued by the recovery flow.
 * `creatorToken` is the freshly-minted plaintext token — emailed once, never
 * stored — the caller builds the manage URL from `slug` + `creatorToken`.
 */
export interface RecoveredEvent {
  eventId: string;
  slug: string;
  title: string;
  defaultLocale: string;
  creatorToken: string;
}

/**
 * Mint a fresh `manage` token for every non-deleted event whose
 * `creatorEmail` matches `email` (case-insensitive) and return the plaintext
 * tokens so the caller can email management links.
 *
 * Additive: existing tokens are left intact — a creator may still hold a
 * working link, and recovery should not break it. Each issued token is
 * appended to `event_tokens`; an `event.recovery` row goes to `audit_log`.
 *
 * Returns an empty array when nothing matches. The caller treats that the
 * same as success and sends no email, so the endpoint never reveals whether
 * an address has events.
 */
export async function issueRecoveryTokens(db: Db, email: string): Promise<RecoveredEvent[]> {
  const matched = await db
    .select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      defaultLocale: events.defaultLocale,
    })
    .from(events)
    .where(and(sql`lower(${events.creatorEmail}) = lower(${email})`, isNull(events.deletedAt)));

  const recovered: RecoveredEvent[] = [];
  for (const ev of matched) {
    const creatorToken = issueCreatorToken();
    const tokenHash = await hashToken(creatorToken);
    await db.insert(eventTokens).values({ eventId: ev.id, tokenHash, purpose: 'manage' });
    await db.insert(auditLog).values({
      actorType: 'system',
      actorId: 'recovery',
      eventId: ev.id,
      action: 'event.recovery',
    });
    recovered.push({
      eventId: ev.id,
      slug: ev.slug,
      title: ev.title,
      defaultLocale: ev.defaultLocale,
      creatorToken,
    });
  }
  return recovered;
}
