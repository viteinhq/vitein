import {
  auditLog,
  events,
  isNull,
  premiumEmailGrants,
  rsvps,
  sql,
  users,
  type Db,
} from '@vitein/db-schema';

export interface AdminStats {
  users: {
    total: number;
    last30d: number;
  };
  events: {
    total: number;
    paid: number;
    basic: number;
    plus: number;
    free: number;
    last30d: number;
  };
  rsvps: {
    total: number;
    plusOnes: number;
  };
  payments: {
    last30dCount: number;
  };
  grants: {
    active: number;
    revoked: number;
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getAdminStats(db: Db): Promise<AdminStats> {
  const since = new Date(Date.now() - 30 * DAY_MS);

  const [usersTotal, usersRecent, eventsAgg, rsvpsAgg, paymentsRecent, grantsAgg] =
    await Promise.all([
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(users)
        .where(isNull(users.deletedAt)),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(users)
        .where(sql`${users.createdAt} >= ${since} and ${users.deletedAt} is null`),
      db
        .select({
          total: sql<number>`count(*)::int`,
          paid: sql<number>`count(*) filter (where ${events.isPaid})::int`,
          basic: sql<number>`count(*) filter (where ${events.paidFeatures} ->> 'tier' = 'basic')::int`,
          plus: sql<number>`count(*) filter (where ${events.paidFeatures} ->> 'tier' = 'plus')::int`,
          recent: sql<number>`count(*) filter (where ${events.createdAt} >= ${since})::int`,
        })
        .from(events)
        .where(isNull(events.deletedAt)),
      db
        .select({
          total: sql<number>`count(*)::int`,
          plusOnes: sql<number>`coalesce(sum(${rsvps.plusOnes}), 0)::int`,
        })
        .from(rsvps),
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(auditLog)
        .where(sql`${auditLog.action} = 'payment.completed' and ${auditLog.createdAt} >= ${since}`),
      db
        .select({
          active: sql<number>`count(*) filter (where ${premiumEmailGrants.revokedAt} is null)::int`,
          revoked: sql<number>`count(*) filter (where ${premiumEmailGrants.revokedAt} is not null)::int`,
        })
        .from(premiumEmailGrants),
    ]);

  const eventsRow = eventsAgg[0] ?? { total: 0, paid: 0, basic: 0, plus: 0, recent: 0 };
  const rsvpsRow = rsvpsAgg[0] ?? { total: 0, plusOnes: 0 };
  const grantsRow = grantsAgg[0] ?? { active: 0, revoked: 0 };

  return {
    users: {
      total: usersTotal[0]?.c ?? 0,
      last30d: usersRecent[0]?.c ?? 0,
    },
    events: {
      total: eventsRow.total,
      paid: eventsRow.paid,
      basic: eventsRow.basic,
      plus: eventsRow.plus,
      free: eventsRow.total - eventsRow.paid,
      last30d: eventsRow.recent,
    },
    rsvps: {
      total: rsvpsRow.total,
      plusOnes: rsvpsRow.plusOnes,
    },
    payments: {
      last30dCount: paymentsRecent[0]?.c ?? 0,
    },
    grants: {
      active: grantsRow.active,
      revoked: grantsRow.revoked,
    },
  };
}
