/**
 * Input shapes for Web Push delivery. Lifted into its own file so
 * `types/env.ts` can reference `PushJob` without a circular import.
 */

/**
 * A push-notification job carried on the `QUEUE_PUSH` Cloudflare Queue.
 * It names the event whose subscribers should be notified plus the
 * rendered notification content; the queue consumer resolves the matching
 * `push_subscriptions` rows and performs the Web Push delivery.
 */
export interface PushJob {
  eventId: string;
  title: string;
  body: string;
  /** Path the notification opens, relative to the web origin (e.g. `/e/abc/manage`). */
  url?: string;
}
