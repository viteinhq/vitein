import { and, auditLog, eq, events, isNull, type Db } from '@vitein/db-schema';
import { NotFoundError, ValidationError } from '../errors.js';

export type PremiumTier = 'basic' | 'plus';

/**
 * Current bundle version for premium feature sets. Bumping this is how we
 * deliver a feature-bundle change without affecting historical events:
 * each event's `paid_features.bundle_version` is frozen at purchase time.
 */
export const CURRENT_BUNDLE_VERSION = 1 as const;

/**
 * Feature membership per tier. This is the read-path source of truth —
 * callers use `tierIncludes(tier, 'password_protected')` to gate behaviour.
 * Paid_features itself stores only { tier, bundle_version }; the feature
 * list is derived so we can evolve it without DB migrations.
 */
const TIER_FEATURES: Record<PremiumTier, ReadonlySet<string>> = {
  basic: new Set(['no_branding', 'custom_slug', 'reminders']),
  plus: new Set([
    'no_branding',
    'custom_slug',
    'reminders',
    'plus_ones',
    'password_protected',
    'save_the_date',
  ]),
};

export function tierIncludes(tier: PremiumTier, feature: string): boolean {
  return TIER_FEATURES[tier].has(feature);
}

export interface MarkEventPaidInput {
  eventId: string;
  tier: PremiumTier;
  paymentRef: string;
  actorType?: 'system' | 'user' | 'creator_token';
  actorId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Idempotent at the DB-state level: replaying the same Stripe event produces
 * the same row contents. The audit log still gets one entry per call — dedup
 * of retries happens upstream (or not; it's a cheap append).
 */
export async function markEventPaid(db: Db, input: MarkEventPaidInput): Promise<void> {
  const [existing] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, input.eventId), isNull(events.deletedAt)))
    .limit(1);
  if (!existing) throw new NotFoundError('event.not_found', 'Event not found');

  if (input.tier !== 'basic' && input.tier !== 'plus') {
    throw new ValidationError('Unknown premium tier', { tier: input.tier });
  }

  await db
    .update(events)
    .set({
      isPaid: true,
      paidFeatures: { tier: input.tier, bundle_version: CURRENT_BUNDLE_VERSION },
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
    metadata: {
      tier: input.tier,
      bundleVersion: CURRENT_BUNDLE_VERSION,
      paymentRef: input.paymentRef,
      ...(input.metadata ?? {}),
    },
  });
}

/**
 * Read the stored premium tier off an event row. Returns null for unpaid
 * events, and for paid events that pre-date the two-tier model (no
 * `tier` field in paid_features).
 */
export function tierOf(event: { isPaid: boolean; paidFeatures: unknown }): PremiumTier | null {
  if (!event.isPaid) return null;
  const pf = event.paidFeatures;
  if (!pf || typeof pf !== 'object') return null;
  const tier = (pf as Record<string, unknown>)['tier'];
  if (tier === 'basic' || tier === 'plus') return tier;
  return null;
}
