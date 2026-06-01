import { type Db, eq, or, pushSubscriptions } from '@vitein/db-schema';
import { isUniqueViolation } from '../db-errors.js';

/**
 * Who a push subscription belongs to. A signed-in user binds it to their
 * account; an anonymous creator binds it to a single event (no account
 * needed). Exactly one of the two is set.
 */
export interface PushBinding {
  userId?: string;
  eventId?: string;
}

export interface RegisterPushInput {
  binding: PushBinding;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Store a Web Push subscription. Idempotent on `endpoint` — a browser that
 * re-subscribes with the same endpoint updates its keys and binding rather
 * than creating a duplicate row.
 */
export async function registerPushSubscription(db: Db, input: RegisterPushInput): Promise<void> {
  const values = {
    userId: input.binding.userId ?? null,
    eventId: input.binding.eventId ?? null,
    p256dh: input.p256dh,
    auth: input.auth,
  };
  await db
    .insert(pushSubscriptions)
    .values({ transport: 'webpush', endpoint: input.endpoint, ...values })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: values });
}

/** Remove a subscription by its endpoint. A no-op if it is already gone. */
export async function deletePushSubscription(db: Db, endpoint: string): Promise<void> {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export interface RefreshPushInput {
  oldEndpoint: string;
  /**
   * The rotating subscription's existing `auth` secret. Proves the caller
   * actually holds the old subscription — the push endpoint URL is not a
   * secret (it appears in logs), but `auth` never leaves the browser/server
   * encryption path, so it is the right capability for re-pointing.
   */
  oldAuth: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Constant-time string compare, so a mismatched `auth` secret cannot be
 * recovered byte-by-byte through response timing.
 */
export function pushSecretMatches(stored: string, provided: string): boolean {
  if (stored.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < stored.length; i++) {
    diff |= stored.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Migrate a subscription the browser has rotated (`pushsubscriptionchange`).
 * The row matching `oldEndpoint` keeps its owner binding (user or event)
 * and adopts the new endpoint and keys.
 *
 * Re-pointing is gated on proving possession of the OLD subscription's
 * `auth` secret — without it, anyone who learned a victim's endpoint (e.g.
 * from logs) could redirect that owner's notifications to attacker keys.
 * An unknown `oldEndpoint`, or a mismatched secret, is a silent no-op. If
 * the new endpoint is already stored — a concurrent re-register raced
 * ahead — the unique-constraint violation is swallowed.
 */
export async function refreshPushSubscription(db: Db, input: RefreshPushInput): Promise<void> {
  const [row] = await db
    .select({ auth: pushSubscriptions.auth })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, input.oldEndpoint))
    .limit(1);
  if (!row || row.auth === null || !pushSecretMatches(row.auth, input.oldAuth)) return;

  try {
    await db
      .update(pushSubscriptions)
      .set({ endpoint: input.endpoint, p256dh: input.p256dh, auth: input.auth })
      .where(eq(pushSubscriptions.endpoint, input.oldEndpoint));
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
  }
}

/**
 * All push subscriptions that should be notified about an event: those
 * bound directly to the event, plus those bound to the event's creator
 * account (once the event has been claimed).
 */
export async function findPushSubscriptionsForEvent(
  db: Db,
  eventId: string,
  creatorUserId: string | null,
): Promise<(typeof pushSubscriptions.$inferSelect)[]> {
  const byEvent = eq(pushSubscriptions.eventId, eventId);
  const filter = creatorUserId ? or(byEvent, eq(pushSubscriptions.userId, creatorUserId)) : byEvent;
  return db.select().from(pushSubscriptions).where(filter);
}
