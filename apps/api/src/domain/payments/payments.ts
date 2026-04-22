import { and, auditLog, eq, events, isNull, type Db } from '@vitein/db-schema';
import { NotFoundError } from '../errors.js';

/**
 * Premium feature bundle unlocked on successful payment. See ARCHITECTURE §6.1
 * (`paid_features` jsonb) — each flag is a typed boolean in code, so adding a
 * new flag is one line here plus a gate check at the enforcement site.
 */
export const PREMIUM_FEATURE_BUNDLE = {
  no_branding: true,
  custom_slug: true,
  media_upload: true,
  reminders: true,
  password_protected: true,
} as const;

export interface MarkEventPaidInput {
  eventId: string;
  paymentRef: string;
  actorType?: 'system' | 'user' | 'creator_token';
  actorId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Idempotent: re-running with the same payment_ref is a no-op (the `UPDATE`
 * overwrites with the same values). We still append an audit row so the log
 * reflects every webhook we've processed — the dedup decision lives upstream
 * if Stripe ever retries a delivered event.
 */
export async function markEventPaid(db: Db, input: MarkEventPaidInput): Promise<void> {
  const [existing] = await db
    .select({ id: events.id, isPaid: events.isPaid, paymentRef: events.paymentRef })
    .from(events)
    .where(and(eq(events.id, input.eventId), isNull(events.deletedAt)))
    .limit(1);
  if (!existing) throw new NotFoundError('event.not_found', 'Event not found');

  await db
    .update(events)
    .set({
      isPaid: true,
      paidFeatures: PREMIUM_FEATURE_BUNDLE,
      paymentProvider: 'stripe',
      paymentRef: input.paymentRef,
      updatedAt: new Date(),
    })
    .where(eq(events.id, input.eventId));

  await db.insert(auditLog).values({
    actorType: input.actorType ?? 'system',
    actorId: input.actorId ?? 'stripe:webhook',
    eventId: input.eventId,
    action: 'payment.completed',
    metadata: { paymentRef: input.paymentRef, ...(input.metadata ?? {}) },
  });
}
