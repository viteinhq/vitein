import { type Db } from '@vitein/db-schema';
import { findDueReminders, markReminderSent } from './domain/reminders/reminders.js';
import { purgeSoftDeleted } from './domain/retention/purge.js';
import { dbConnectionString, withDb } from './infra/db.js';
import { localeFromAcceptLanguage, sendReminder } from './infra/email.js';
import { createLogger, type Logger } from './infra/logger.js';
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
  const log = createLogger({
    env: env.ENVIRONMENT,
    requestId: `cron:${Date.now().toString()}`,
  });

  if (!dbConnectionString(env)) {
    log.warn('cron_skipped_no_database');
    return;
  }

  await withDb(env, async (client) => {
    try {
      await sendDueReminders(env, client, log);
    } catch (err) {
      log.error('cron_reminder_job_failed', { err: err as Error });
    }

    try {
      const result = await purgeSoftDeleted(client);
      if (result.eventsDeleted > 0 || result.usersDeleted > 0) {
        log.info('cron_purge_complete', {
          events_deleted: result.eventsDeleted,
          users_deleted: result.usersDeleted,
        });
      }
    } catch (err) {
      log.error('cron_purge_job_failed', { err: err as Error });
    }
  });
}

async function sendDueReminders(env: Env, client: Db, log: Logger): Promise<void> {
  const due = await findDueReminders(client);
  if (due.length === 0) return;

  const webBase = env.WEB_BASE_URL ?? 'https://vite.in';
  log.info('cron_reminders_sending', { count: due.length });

  for (const { reminder, event } of due) {
    try {
      const result = await sendReminder(
        env,
        {
          to: event.creatorEmail,
          eventTitle: event.title,
          startsAt: event.startsAt,
          eventUrl: `${webBase}/e/${event.slug}`,
        },
        localeFromAcceptLanguage(event.defaultLocale),
      );
      await markReminderSent(client, reminder.id, event.id, {
        sent: result.sent,
        kind: reminder.kind,
      });
    } catch (err) {
      log.error('cron_reminder_send_failed', {
        reminder_id: reminder.id,
        err: err as Error,
      });
    }
  }
}
