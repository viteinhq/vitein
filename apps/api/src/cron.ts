import { findDueReminders, markReminderSent } from './domain/reminders/reminders.js';
import { purgeSoftDeleted } from './domain/retention/purge.js';
import { db } from './infra/db.js';
import { sendReminder } from './infra/email.js';
import type { Env } from './types/env.js';

/**
 * Hourly cron handler. Cloudflare schedules this via the `[triggers]` block
 * in `wrangler.toml`. Two jobs:
 *
 * 1. Send due reminders (idempotent — each reminder row is single-fire;
 *    `sentAt` is stamped the moment the email is dispatched).
 * 2. Hard-delete soft-deleted rows past their 30-day grace. FK cascades
 *    handle dependent rows; audit_log survives by design.
 *
 * Each job is isolated in its own try/catch so a failure in one does not
 * skip the other.
 */
export async function runScheduled(env: Env): Promise<void> {
  if (!env.DATABASE_URL) {
    console.warn('[cron] DATABASE_URL unset — skipping scheduled run');
    return;
  }

  const client = db(env);

  try {
    await sendDueReminders(env, client);
  } catch (err) {
    console.error('[cron] reminder job failed', err);
  }

  try {
    const result = await purgeSoftDeleted(client);
    if (result.eventsDeleted > 0 || result.usersDeleted > 0) {
      console.warn(
        `[cron] purged ${String(result.eventsDeleted)} events, ${String(result.usersDeleted)} users`,
      );
    }
  } catch (err) {
    console.error('[cron] purge job failed', err);
  }
}

async function sendDueReminders(env: Env, client: ReturnType<typeof db>): Promise<void> {
  const due = await findDueReminders(client);
  if (due.length === 0) return;

  const webBase = env.WEB_BASE_URL ?? 'https://vite.in';
  console.warn(`[cron] sending ${String(due.length)} reminders`);

  for (const { reminder, event } of due) {
    try {
      const result = await sendReminder(env, {
        to: event.creatorEmail,
        eventTitle: event.title,
        startsAt: event.startsAt,
        eventUrl: `${webBase}/e/${event.slug}`,
      });
      await markReminderSent(client, reminder.id, event.id, {
        sent: result.sent,
        kind: reminder.kind,
      });
    } catch (err) {
      console.error('[cron] reminder send failed', { reminderId: reminder.id, err });
    }
  }
}
