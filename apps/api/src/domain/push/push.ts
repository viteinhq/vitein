import { type Db, eq, or, pushSubscriptions } from '@vitein/db-schema';

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
