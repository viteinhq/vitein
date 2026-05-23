import {
  and,
  auditLog,
  desc,
  eq,
  events,
  isNull,
  premiumEmailGrants,
  sql,
  type Db,
  type Event,
  type PremiumEmailGrant,
} from '@vitein/db-schema';
import { isUniqueViolation } from '../db-errors.js';
import { ConflictError, NotFoundError, ValidationError } from '../errors.js';
import { CURRENT_BUNDLE_VERSION, type PremiumTier, tierOf } from '../payments/payments.js';

export interface AppliedGrant {
  event: Event;
  grant: PremiumEmailGrant;
}

export type GrantTier = PremiumTier;

export interface CreateGrantInput {
  email: string;
  tier?: GrantTier;
  note?: string | null;
  grantedByUserId: string;
}

const ALLOWED_TIERS: ReadonlySet<GrantTier> = new Set(['basic', 'plus']);

export async function listGrants(db: Db): Promise<PremiumEmailGrant[]> {
  return db.select().from(premiumEmailGrants).orderBy(desc(premiumEmailGrants.createdAt));
}

export async function createGrant(db: Db, input: CreateGrantInput): Promise<PremiumEmailGrant> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new ValidationError('Invalid email');
  }
  const tier: GrantTier = input.tier ?? 'plus';
  if (!ALLOWED_TIERS.has(tier)) {
    throw new ValidationError('Unknown tier', { tier });
  }

  try {
    const [row] = await db
      .insert(premiumEmailGrants)
      .values({
        email,
        tier,
        note: input.note ?? null,
        grantedByUserId: input.grantedByUserId,
      })
      .returning();
    if (!row) throw new Error('Insert returned no row');
    return row;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ConflictError(
        'grant.already_exists',
        'An active grant for this email already exists',
      );
    }
    throw err;
  }
}

export async function revokeGrant(db: Db, id: string): Promise<void> {
  const [row] = await db
    .select({ id: premiumEmailGrants.id, revokedAt: premiumEmailGrants.revokedAt })
    .from(premiumEmailGrants)
    .where(eq(premiumEmailGrants.id, id))
    .limit(1);
  if (!row) throw new NotFoundError('grant.not_found', 'Grant not found');
  if (row.revokedAt) return;
  await db
    .update(premiumEmailGrants)
    .set({ revokedAt: new Date() })
    .where(eq(premiumEmailGrants.id, id));
}

export async function findActiveGrantForEmail(
  db: Db,
  email: string,
): Promise<PremiumEmailGrant | null> {
  const [row] = await db
    .select()
    .from(premiumEmailGrants)
    .where(
      and(
        sql`lower(${premiumEmailGrants.email}) = ${email.trim().toLowerCase()}`,
        isNull(premiumEmailGrants.revokedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * If the event's creator email matches an active grant, upgrade the event
 * to the granted tier and return the new row + the applied grant. Returns
 * null if no grant matches (or the event was already paid). Idempotent at
 * the DB-state level — re-running on an already-paid event is a no-op.
 */
export async function applyGrantIfMatch(db: Db, event: Event): Promise<AppliedGrant | null> {
  if (tierOf(event)) return null;

  const grant = await findActiveGrantForEmail(db, event.creatorEmail);
  if (!grant) return null;

  const tier: PremiumTier = grant.tier === 'basic' || grant.tier === 'plus' ? grant.tier : 'plus';

  const [updated] = await db
    .update(events)
    .set({
      isPaid: true,
      paidFeatures: { tier, bundle_version: CURRENT_BUNDLE_VERSION },
      paymentProvider: 'admin_grant',
      paymentRef: `grant:${grant.id}`,
      updatedAt: new Date(),
    })
    .where(eq(events.id, event.id))
    .returning();

  if (!updated) return null;

  await db.insert(auditLog).values({
    actorType: 'system',
    actorId: `grant:${grant.id}`,
    eventId: event.id,
    action: 'event.premium_granted',
    metadata: {
      tier,
      bundleVersion: CURRENT_BUNDLE_VERSION,
      grantId: grant.id,
      email: grant.email,
    },
  });

  return { event: updated, grant };
}
