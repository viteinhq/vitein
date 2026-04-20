import { and, auditLog, eq, events, inArray, isNull, sql, type Db } from '@vitein/db-schema';

const DEFAULT_LIMIT = 100;

export interface AuditEntry {
  id: string;
  action: string;
  eventId: string | null;
  metadata: unknown;
  createdAt: Date;
}

/**
 * Recent audit rows for events owned by the user. We scope by ownership
 * rather than `actor_id` because historical rows may predate the user's
 * sign-in (auto-claim backfills ownership but does not rewrite the log).
 */
export async function listAuditForUser(
  db: Db,
  userId: string,
  limit = DEFAULT_LIMIT,
): Promise<AuditEntry[]> {
  const ownedEventIds = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.creatorUserId, userId), isNull(events.deletedAt)));

  if (ownedEventIds.length === 0) return [];

  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      eventId: auditLog.eventId,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(
      inArray(
        auditLog.eventId,
        ownedEventIds.map((row) => row.id),
      ),
    )
    .orderBy(sql`${auditLog.createdAt} desc`)
    .limit(limit);

  return rows;
}
