import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { ValidationError } from '../domain/errors.js';
import { queueImmediateReminder } from '../domain/reminders/reminders.js';
import { db } from '../infra/db.js';
import { requireEventOwnership } from '../middleware/require-event-ownership.js';
import type { AppVariables, Env } from '../types/env.js';

export const remindersRoute = new Hono<{ Bindings: Env; Variables: AppVariables }>();

const idParamSchema = z.object({ id: z.string().uuid() });

remindersRoute.post(
  '/send',
  zValidator('param', idParamSchema, (r) => {
    if (!r.success) throw new ValidationError('Invalid event id', { issues: r.error.issues });
  }),
  requireEventOwnership('id', { scope: 'events:write' }),
  async (c) => {
    const { id } = c.req.valid('param');
    const reminder = await queueImmediateReminder(db(c), id);
    return c.json(
      {
        id: reminder.id,
        eventId: reminder.eventId,
        scheduledAt: reminder.scheduledAt.toISOString(),
        kind: reminder.kind,
      },
      202,
    );
  },
);
