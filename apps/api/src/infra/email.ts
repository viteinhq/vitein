import { negotiateLocale, type Locale } from '@vitein/i18n-messages';
import { templatesFor } from './email-templates.js';
import type {
  AnnouncementInput,
  CreatorMagicLinkInput,
  ReminderInput,
  RsvpConfirmationInput,
  RsvpNotificationInput,
  SignInMagicLinkInput,
} from './email-types.js';
import type { Env } from '../types/env.js';
import { rootLogger } from './logger.js';

/**
 * Thin Resend wrapper. When `RESEND_API_KEY` is unset (local dev without an
 * account), this is a no-op that logs the intended send and reports
 * `sent: false`. That keeps `/v1/events` working end-to-end without external
 * accounts, so UI and integration tests can drive the flow in dev.
 *
 * Locale plumbing: every send function takes a `locale: Locale | undefined`
 * and looks up the matching template bundle in `email-templates.ts`. Caller
 * decides which signal feeds it — event.default_locale for creator-bound
 * mail, Accept-Language for guest-bound, etc.
 */

export type {
  CreatorMagicLinkInput,
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
  if (!env.RESEND_API_KEY) {
    rootLogger.warn('email_skipped_resend_api_key_unset', {
      to: input.to,
      ...(input.logHint ?? {}),
    });
    return { sent: false };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: input.to,
      subject: input.subject,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend returned ${String(res.status)}: ${body}`);
  }

  return { sent: true };
}
