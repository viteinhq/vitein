import {
  and,
  auditLog,
  eq,
  eventTokens,
  events,
  gte,
  inArray,
  isNull,
  sql,
  type Db,
} from '@vitein/db-schema';
import { hashToken, issueCreatorToken } from './tokens.js';

/**
 * One recovery email per address per this window. Recovery mints management
 * tokens and sends mail, so without a throttle `/recover` could be used to
 * mail-bomb a creator from rotating IPs (past the per-IP rate limit). Five
 * minutes still lets a legitimate creator retry if the first mail is slow.
 */
const RECOVERY_COOLDOWN_MS = 5 * 60 * 1000;

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
 * Returns an empty array when nothing matches OR when the cooldown is still
 * active. The caller treats both the same as success and sends no email, so
 * the endpoint never reveals whether an address has events.
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

  if (matched.length === 0) return [];

  // Cooldown: skip if any of these events was recovered within the window.
  // Each recovery writes an `event.recovery` audit row, so that log is the
  // throttle's source of truth — no extra storage needed.
  const cutoff = new Date(Date.now() - RECOVERY_COOLDOWN_MS);
  const recent = await db
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.action, 'event.recovery'),
        inArray(
          auditLog.eventId,
          matched.map((e) => e.id),
        ),
        gte(auditLog.createdAt, cutoff),
      ),
    )
    .limit(1);
  if (recent.length > 0) return [];

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
