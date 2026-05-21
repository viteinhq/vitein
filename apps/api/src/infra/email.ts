import { negotiateLocale, type Locale } from '@vitein/i18n-messages';
import { templatesFor } from './email-templates.js';
import type {
  AnnouncementInput,
  CreatorMagicLinkInput,
  CreatorRecoveryInput,
  EmailJob,
  ReminderInput,
  RsvpConfirmationInput,
  RsvpNotificationInput,
  SignInMagicLinkInput,
} from './email-types.js';
import type { Env } from '../types/env.js';
import { rootLogger } from './logger.js';

/**
 * Email dispatch. Each `send*` function renders a localized template and
 * hands the result to `sendEmail`, which prefers the `QUEUE_EMAIL` Cloudflare
 * Queue: the request returns immediately and the queue consumer
 * (`consumeEmailBatch` → `deliverEmail`) performs the Resend call with
 * retries. Without the queue binding (local dev) it falls back to a
 * synchronous Resend call, or a logged no-op when `RESEND_API_KEY` is unset.
 *
 * `SendResult.sent` therefore means "dispatched" (enqueued or sent), not
 * "delivered" — actual delivery failures surface on the consumer.
 *
 * Locale plumbing: every send function takes a `locale: Locale | undefined`
 * and looks up the matching template bundle in `email-templates.ts`. Caller
 * decides which signal feeds it — event.default_locale for creator-bound
 * mail, Accept-Language for guest-bound, etc.
 */

export type {
  CreatorMagicLinkInput,
  CreatorRecoveryInput,
  SignInMagicLinkInput,
  RsvpConfirmationInput,
  RsvpNotificationInput,
  ReminderInput,
  AnnouncementInput,
};

export interface SendResult {
  sent: boolean;
}

const FROM_ADDRESS = 'vite.in <no-reply@vite.in>';

export async function sendCreatorMagicLink(
  env: Env,
  input: CreatorMagicLinkInput,
  locale: Locale | undefined,
): Promise<SendResult> {
  const t = templatesFor(locale).creatorMagicLink;
  return sendEmail(env, {
    to: input.to,
    subject: t.subject(input),
    text: t.body(input),
    logHint: { eventTitle: input.eventTitle, locale: locale ?? 'fallback' },
  });
}

export async function sendCreatorRecovery(
  env: Env,
  input: CreatorRecoveryInput,
  locale: Locale | undefined,
): Promise<SendResult> {
  const t = templatesFor(locale).creatorRecovery;
  return sendEmail(env, {
    to: input.to,
    subject: t.subject(input),
    text: t.body(input),
    logHint: {
      kind: 'creator-recovery',
      events: String(input.events.length),
      locale: locale ?? 'fallback',
    },
  });
}

export async function sendSignInMagicLink(
  env: Env,
  input: SignInMagicLinkInput,
  locale: Locale | undefined,
): Promise<SendResult> {
  const t = templatesFor(locale).signInMagicLink;
  return sendEmail(env, {
    to: input.to,
    subject: t.subject(input),
    text: t.body(input),
    logHint: { kind: 'sign-in', locale: locale ?? 'fallback' },
  });
}

export async function sendRsvpConfirmation(
  env: Env,
  input: RsvpConfirmationInput,
  locale: Locale | undefined,
): Promise<SendResult> {
  const t = templatesFor(locale).rsvpConfirmation;
  return sendEmail(env, {
    to: input.to,
    subject: t.subject(input),
    text: t.body(input),
    logHint: { kind: 'rsvp-confirmation', locale: locale ?? 'fallback' },
  });
}

export async function sendRsvpNotification(
  env: Env,
  input: RsvpNotificationInput,
  locale: Locale | undefined,
): Promise<SendResult> {
  const t = templatesFor(locale).rsvpNotification;
  return sendEmail(env, {
    to: input.to,
    subject: t.subject(input),
    text: t.body(input),
    logHint: { kind: 'rsvp-notification', locale: locale ?? 'fallback' },
  });
}

export async function sendReminder(
  env: Env,
  input: ReminderInput,
  locale: Locale | undefined,
): Promise<SendResult> {
  const t = templatesFor(locale).reminder;
  return sendEmail(env, {
    to: input.to,
    subject: t.subject(input),
    text: t.body(input),
    logHint: { kind: 'reminder', locale: locale ?? 'fallback' },
  });
}

export async function sendAnnouncement(
  env: Env,
  input: AnnouncementInput,
  locale: Locale | undefined,
): Promise<SendResult> {
  const t = templatesFor(locale).announcement;
  return sendEmail(env, {
    to: input.to,
    subject: t.subject(input),
    text: t.body(input),
    logHint: { kind: 'announcement', stage: input.stage, locale: locale ?? 'fallback' },
  });
}

/**
 * Helper: callers that have an `Accept-Language` header (sign-in,
 * RSVP confirmation) can derive a supported locale from it.
 */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  return negotiateLocale(header);
}

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  logHint?: Record<string, string>;
}

async function sendEmail(env: Env, input: SendEmailInput): Promise<SendResult> {
  const job: EmailJob = {
    to: input.to,
    subject: input.subject,
    text: input.text,
    ...(input.logHint ? { logHint: input.logHint } : {}),
  };

  // Preferred path: hand the rendered email to the queue and return now.
  // The consumer performs the Resend call, with the queue's retry semantics.
  if (env.QUEUE_EMAIL) {
    await env.QUEUE_EMAIL.send(job);
    return { sent: true };
  }

  // No queue (local dev): send synchronously, or no-op when Resend is unset.
  if (!env.RESEND_API_KEY) {
    rootLogger.warn('email_skipped_resend_api_key_unset', {
      to: input.to,
      ...(input.logHint ?? {}),
    });
    return { sent: false };
  }
  await deliverEmail(env, job);
  return { sent: true };
}

/**
 * Perform the actual Resend API call for one rendered email job. Used by the
 * `QUEUE_EMAIL` consumer and by `sendEmail`'s synchronous local-dev fallback.
 * Throws on a non-OK Resend response so the queue retries the message.
 */
export async function deliverEmail(env: Env, job: EmailJob): Promise<void> {
  if (!env.RESEND_API_KEY) {
    rootLogger.warn('email_skipped_resend_api_key_unset', {
      to: job.to,
      ...(job.logHint ?? {}),
    });
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: job.to,
      subject: job.subject,
      text: job.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend returned ${String(res.status)}: ${body}`);
  }
}

/**
 * `QUEUE_EMAIL` consumer. Delivers each queued email via Resend; a failed
 * message is retried by the queue and dropped after `max_retries`.
 */
export async function consumeEmailBatch(batch: MessageBatch<EmailJob>, env: Env): Promise<void> {
  for (const msg of batch.messages) {
    try {
      await deliverEmail(env, msg.body);
      msg.ack();
    } catch (err) {
      rootLogger.warn('email_delivery_failed', {
        to: msg.body.to,
        attempt: String(msg.attempts),
        ...(msg.body.logHint ?? {}),
        err: err as Error,
      });
      msg.retry();
    }
  }
}
