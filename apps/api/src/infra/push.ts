import {
  buildPushPayload,
  type PushMessage,
  type PushSubscription,
} from '@block65/webcrypto-web-push';
import { type Db, eq, events } from '@vitein/db-schema';
import { deletePushSubscription, findPushSubscriptionsForEvent } from '../domain/push/push.js';
import type { Env } from '../types/env.js';
import { withDb } from './db.js';
import { rootLogger } from './logger.js';
import type { PushJob } from './push-types.js';

// VAPID subject: a contact point the push service uses if our
// deliveries cause problems. Aligned with the email FROM address
// (see `email.ts`) — single inbox for anything ops-related.
const VAPID_SUBJECT = 'mailto:hello@vite.in';

/**
 * Reduce a push endpoint to its origin for logging. The full endpoint URL
 * is a per-subscriber capability (its path is effectively a bearer token);
 * logging it verbatim let anyone with log access re-point a subscription.
 * The origin alone is enough to tell which push provider rejected us.
 */
function redactEndpoint(endpoint: string): string {
  try {
    return new URL(endpoint).origin;
  } catch {
    return 'invalid';
  }
}

/**
 * `QUEUE_PUSH` consumer. For each job, resolve the event's push
 * subscriptions and deliver a Web Push notification to each. Subscriptions
 * the push service reports as gone (404 / 410) are pruned.
 */
export async function consumePushBatch(batch: MessageBatch<PushJob>, env: Env): Promise<void> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    rootLogger.warn('push_skipped_vapid_unset');
    for (const msg of batch.messages) msg.ack();
    return;
  }

  await withDb(env, async (db) => {
    for (const msg of batch.messages) {
      try {
        await deliverPushJob(env, db, msg.body);
        msg.ack();
      } catch (err) {
        rootLogger.warn('push_job_failed', { eventId: msg.body.eventId, err: err as Error });
        msg.retry();
      }
    }
  });
}

async function deliverPushJob(env: Env, db: Db, job: PushJob): Promise<void> {
  const [event] = await db
    .select({ creatorUserId: events.creatorUserId })
    .from(events)
    .where(eq(events.id, job.eventId))
    .limit(1);

  const subs = await findPushSubscriptionsForEvent(db, job.eventId, event?.creatorUserId ?? null);
  if (subs.length === 0) return;

  const vapid = {
    subject: VAPID_SUBJECT,
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
  };
  const webBase = env.WEB_BASE_URL ?? 'https://vite.in';
  const message: PushMessage = {
    data: JSON.stringify({
      title: job.title,
      body: job.body,
      url: job.url ? `${webBase}${job.url}` : webBase,
    }),
    options: { ttl: 60 * 60 * 24, urgency: 'normal' },
  };

  for (const sub of subs) {
    // Only Web Push rows are deliverable here; APNs/FCM land with native.
    if (sub.transport !== 'webpush' || !sub.p256dh || !sub.auth) continue;

    const subscription: PushSubscription = {
      endpoint: sub.endpoint,
      expirationTime: null,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };

    try {
      const payload = await buildPushPayload(message, subscription, vapid);
      const res = await fetch(sub.endpoint, payload);
      if (res.status === 404 || res.status === 410) {
        await deletePushSubscription(db, sub.endpoint); // subscription expired — prune
      } else if (!res.ok) {
        rootLogger.warn('push_send_rejected', {
          endpoint: redactEndpoint(sub.endpoint),
          status: res.status,
        });
      }
    } catch (err) {
      rootLogger.warn('push_send_failed', {
        endpoint: redactEndpoint(sub.endpoint),
        err: err as Error,
      });
    }
  }
}
