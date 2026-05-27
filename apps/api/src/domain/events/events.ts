import { and, eq, events, eventTokens, isNull, type Db } from '@vitein/db-schema';
import { hashToken, issueCreatorToken } from '../auth/tokens.js';
import { isUniqueViolation } from '../db-errors.js';
import { DomainError, NotFoundError, ValidationError } from '../errors.js';
import { hashPassword } from './password.js';
import { generateSlug } from './slug.js';

export interface EventCreateInput {
  title: string;
  description?: string | null | undefined;
  startsAt: Date;
  endsAt?: Date | null | undefined;
  timezone: string;
  locationText?: string | null | undefined;
  creatorEmail: string;
  defaultLocale?: string | undefined;
  visibility?: 'link_only' | 'public' | undefined;
  themeId?: string | undefined;
  layout?: string | undefined;
  fontPairing?: string | undefined;
}

export interface EventUpdateInput {
  title?: string | undefined;
  description?: string | null | undefined;
  startsAt?: Date | undefined;
  endsAt?: Date | null | undefined;
  timezone?: string | undefined;
  locationText?: string | null | undefined;
  defaultLocale?: string | undefined;
  visibility?: 'link_only' | 'public' | undefined;
  /**
   * A.6b.2 password protection. `string` = set/replace, `null` = clear,
   * `undefined` = leave as-is. Tier gating is enforced by the route.
   */
  password?: string | null | undefined;
  /** Colour theme id (ADR 0011). Tier gating is enforced by the route. */
  themeId?: string | undefined;
  /** Layout id (ADR 0011). Validated by the route; no tier gate. */
  layout?: string | undefined;
  /** Type-pairing id (third axis, 2026-05-26). Validated by the route; no tier gate. */
  fontPairing?: string | undefined;
  /** Custom URL slug. Format-validated and tier-gated by the route. */
  slug?: string | undefined;
}

export interface CreatedEvent {
  event: typeof events.$inferSelect;
  creatorToken: string;
}

const SLUG_RETRIES = 5;

/**
 * Create an event anonymously. Issues a fresh creator token, stores only its
 * hash, and returns the plaintext once so the caller can email it to the
 * creator. The DB unique index on `slug` handles the collision case; we
 * retry a bounded number of times.
 */
export async function createEvent(db: Db, input: EventCreateInput): Promise<CreatedEvent> {
  const creatorToken = issueCreatorToken();
  const tokenHash = await hashToken(creatorToken);

  let lastErr: unknown;
  for (let attempt = 0; attempt < SLUG_RETRIES; attempt++) {
    const slug = generateSlug();
    try {
      const [row] = await db
        .insert(events)
        .values({
          slug,
          title: input.title,
          description: input.description ?? null,
          startsAt: input.startsAt,
          endsAt: input.endsAt ?? null,
          timezone: input.timezone,
          locationText: input.locationText ?? null,
          creatorEmail: input.creatorEmail,
          defaultLocale: input.defaultLocale ?? 'en',
          visibility: input.visibility ?? 'link_only',
          // Omitted when undefined — the columns default to
          // 'volt' / 'standard' / 'bricolage-geist' (ADR 0011 +
          // 2026-05-26 theme-engine expansion).
          themeId: input.themeId,
          layout: input.layout,
          fontPairing: input.fontPairing,
        })
        .returning();

      if (!row) throw new Error('Insert returned no row');

      await db.insert(eventTokens).values({
        eventId: row.id,
        tokenHash,
        purpose: 'manage',
      });

      return { event: row, creatorToken };
    } catch (err) {
      lastErr = err;
      if (!isUniqueSlugError(err)) throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Failed to generate a unique slug');
}

/**
 * Mint and persist a fresh `manage` token for an existing event, returning
 * the plaintext (only the hash is stored). Lets creator-bound mail — e.g. an
 * RSVP notification — carry a directly-usable management link without the
 * caller already holding a token. Additive: existing tokens stay valid.
 */
export async function mintManageToken(db: Db, eventId: string): Promise<string> {
  const token = issueCreatorToken();
  const tokenHash = await hashToken(token);
  await db.insert(eventTokens).values({ eventId, tokenHash, purpose: 'manage' });
  return token;
}

export async function getEventPublic(db: Db, id: string): Promise<typeof events.$inferSelect> {
  const row = await findActiveEvent(db, id);
  if (!row) throw new NotFoundError('event.not_found', 'Event not found');
  return row;
}

export async function getEventBySlug(db: Db, slug: string): Promise<typeof events.$inferSelect> {
  const [row] = await db
    .select()
    .from(events)
    .where(and(eq(events.slug, slug), isNull(events.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError('event.not_found', 'Event not found');
  return row;
}

export async function getEventForCreator(db: Db, id: string): Promise<typeof events.$inferSelect> {
  const row = await findActiveEvent(db, id);
  if (!row) throw new NotFoundError('event.not_found', 'Event not found');
  return row;
}

export async function updateEvent(
  db: Db,
  id: string,
  input: EventUpdateInput,
): Promise<typeof events.$inferSelect> {
  const existing = await findActiveEvent(db, id);
  if (!existing) throw new NotFoundError('event.not_found', 'Event not found');

  let passwordHash: string | null | undefined;
  if (input.password === null) {
    passwordHash = null;
  } else if (typeof input.password === 'string') {
    if (input.password.length < 4)
      throw new ValidationError('Password must be at least 4 characters');
    passwordHash = await hashPassword(input.password);
  }

  const patch = pruneUndefined({
    title: input.title,
    description: input.description,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    timezone: input.timezone,
    locationText: input.locationText,
    defaultLocale: input.defaultLocale,
    visibility: input.visibility,
    themeId: input.themeId,
    layout: input.layout,
    fontPairing: input.fontPairing,
    slug: input.slug,
    passwordHash,
    updatedAt: new Date(),
  });

  let row: typeof events.$inferSelect | undefined;
  try {
    [row] = await db.update(events).set(patch).where(eq(events.id, id)).returning();
  } catch (err) {
    // The only unique constraint a creator update can hit is the slug.
    if (isUniqueViolation(err)) {
      throw new DomainError('event.slug_taken', 'That event URL is already taken', 409);
    }
    throw err;
  }

  if (!row) throw new NotFoundError('event.not_found', 'Event not found');
  return row;
}

export async function softDeleteEvent(db: Db, id: string): Promise<void> {
  const existing = await findActiveEvent(db, id);
  if (!existing) throw new NotFoundError('event.not_found', 'Event not found');

  await db.update(events).set({ deletedAt: new Date() }).where(eq(events.id, id));
}

async function findActiveEvent(
  db: Db,
  id: string,
): Promise<typeof events.$inferSelect | undefined> {
  const [row] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), isNull(events.deletedAt)))
    .limit(1);
  return row;
}

function pruneUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

function isUniqueSlugError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const message = 'message' in err && typeof err.message === 'string' ? err.message : '';
  return message.includes('events_slug_idx') || message.includes('duplicate key');
}
