/**
 * Phase 1 MVP schema. Mirrors planning/ARCHITECTURE.md §6.1.
 *
 * Email columns are `text` with a `lower(email)` unique index. ARCHITECTURE.md
 * specifies `citext`; migrating to citext is tracked as a Phase-2 task and does
 * not block MVP correctness.
 *
 * IDs are UUIDv7 generated in application code via `uuidv7()`; this keeps them
 * time-sortable without needing a Postgres extension.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

const genId = () => uuidv7();
const nowTs = () => timestamp({ withTimezone: true, mode: 'date' }).defaultNow().notNull();

export const users = pgTable(
  'users',
  {
    id: uuid().primaryKey().$defaultFn(genId),
    email: text().notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    passwordHash: text('password_hash'),
    locale: text().notNull().default('en'),
    timezone: text().notNull().default('UTC'),
    displayName: text('display_name'),
    createdAt: nowTs(),
    updatedAt: nowTs(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('users_email_lower_idx').on(sql`lower(${t.email})`)],
);

export const events = pgTable(
  'events',
  {
    id: uuid().primaryKey().$defaultFn(genId),
    slug: text().notNull(),
    title: text().notNull(),
    description: text(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    timezone: text().notNull(),
    locationText: text('location_text'),
    locationLat: numeric('location_lat', { precision: 10, scale: 7 }),
    locationLng: numeric('location_lng', { precision: 10, scale: 7 }),
    creatorEmail: text('creator_email').notNull(),
    creatorUserId: uuid('creator_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    isPaid: boolean('is_paid').notNull().default(false),
    paidFeatures: jsonb('paid_features').notNull().default({}),
    paymentProvider: text('payment_provider'),
    paymentRef: text('payment_ref'),
    passwordHash: text('password_hash'),
    coverMediaId: uuid('cover_media_id'),
    defaultLocale: text('default_locale').notNull().default('en'),
    visibility: text().notNull().default('link_only'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: nowTs(),
    updatedAt: nowTs(),
  },
  (t) => [
    uniqueIndex('events_slug_idx').on(t.slug),
    uniqueIndex('events_creator_email_lower_idx').on(sql`lower(${t.creatorEmail})`, t.id),
    index('events_creator_user_idx').on(t.creatorUserId),
    index('events_starts_at_idx').on(t.startsAt),
  ],
);

export const eventTokens = pgTable(
  'event_tokens',
  {
    id: uuid().primaryKey().$defaultFn(genId),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    purpose: text().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: nowTs(),
  },
  (t) => [
    uniqueIndex('event_tokens_token_hash_idx').on(t.tokenHash),
    index('event_tokens_event_idx').on(t.eventId),
  ],
);

export const guests = pgTable(
  'guests',
  {
    id: uuid().primaryKey().$defaultFn(genId),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: text(),
    email: text(),
    phone: text(),
    invitedVia: text('invited_via').notNull(),
    invitedAt: nowTs(),
  },
  (t) => [index('guests_event_idx').on(t.eventId)],
);

export const rsvps = pgTable(
  'rsvps',
  {
    id: uuid().primaryKey().$defaultFn(genId),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    guestId: uuid('guest_id').references(() => guests.id, { onDelete: 'set null' }),
    name: text().notNull(),
    email: text(),
    status: text().notNull(),
    plusOnes: integer('plus_ones').notNull().default(0),
    message: text(),
    respondedAt: nowTs(),
  },
  (t) => [index('rsvps_event_idx').on(t.eventId), index('rsvps_guest_idx').on(t.guestId)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type EventToken = typeof eventTokens.$inferSelect;
export type NewEventToken = typeof eventTokens.$inferInsert;
export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;
export type Rsvp = typeof rsvps.$inferSelect;
export type NewRsvp = typeof rsvps.$inferInsert;

export const schema = { users, events, eventTokens, guests, rsvps };
