import { findDueReminders, markReminderSent } from './domain/reminders/reminders.js';
import { db } from './infra/db.js';
import { sendReminder } from './infra/email.js';
import type { Env } from './types/env.js';

/**
 * Hourly cron handler. Cloudflare schedules this via the `[triggers]` block
 * in `wrangler.toml`. Sends due reminders, batched.
 *
 * Idempotency: each reminder row is single-fire — `sentAt` is set the
 * moment the email is dispatched, so a re-run only picks up the un-sent
 * tail. The audit_log row records each successful send.
 */
export async function runScheduled(env: Env): Promise<void> {
  if (!env.DATABASE_URL) {
    console.warn('[cron] DATABASE_URL unset — skipping reminder run');
    return;
  }

  const client = db(env);
  const due = await findDueReminders(client);
  if (due.length === 0) {
    return;
  }

  const webBase = env.WEB_BASE_URL ?? 'https://vite.in';
  console.log(`[cron] sending ${String(due.length)} reminders`);

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
