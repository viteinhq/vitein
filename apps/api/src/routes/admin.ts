import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { createGrant, listGrants, revokeGrant } from '../domain/admin/grants.js';
import { getAdminStats } from '../domain/admin/stats.js';
import { ValidationError } from '../domain/errors.js';
import { db } from '../infra/db.js';
import { requireAdmin } from '../middleware/require-admin.js';
import { requireUser } from '../middleware/require-user.js';
import type { AppVariables, Env } from '../types/env.js';
import type { PremiumEmailGrant } from '@vitein/db-schema';

export const adminRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

adminRoute.use('*', requireUser, requireAdmin);

adminRoute.get('/stats', async (c) => {
  const stats = await getAdminStats(db(c));
  return c.json(stats);
});

adminRoute.get('/grants', async (c) => {
  const rows = await listGrants(db(c));
  return c.json({ items: rows.map(toGrantDto) });
});

const grantCreateSchema = z.object({
  email: z.string().email().max(320),
  tier: z.enum(['basic', 'plus']).optional(),
  note: z.string().max(500).nullable().optional(),
});

adminRoute.post(
  '/grants',
  zValidator('json', grantCreateSchema, (result) => {
    if (!result.success) {
      throw new ValidationError('Invalid grant body', { issues: result.error.issues });
    }
  }),
  async (c) => {
    const input = c.req.valid('json');
    const auth = c.var.auth;
    if (auth.kind !== 'user') {
      throw new ValidationError('admin.unauthorized');
    }
    const row = await createGrant(db(c), {
      email: input.email,
      tier: input.tier,
      note: input.note ?? null,
      grantedByUserId: auth.userId,
    });
    return c.json(toGrantDto(row), 201);
  },
);

adminRoute.delete(
  '/grants/:id',
  zValidator('param', z.object({ id: z.string().uuid() }), (result) => {
    if (!result.success) {
      throw new ValidationError('Invalid grant id', { issues: result.error.issues });
    }
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    await revokeGrant(db(c), id);
    return c.body(null, 204);
  },
);

function toGrantDto(row: PremiumEmailGrant) {
  return {
    id: row.id,
    email: row.email,
    tier: row.tier,
    note: row.note,
    grantedByUserId: row.grantedByUserId,
    createdAt: row.createdAt.toISOString(),
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
  };
}
