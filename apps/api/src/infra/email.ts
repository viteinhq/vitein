import type { Env } from '../types/env.js';

/**
 * Thin Resend wrapper. When `RESEND_API_KEY` is unset (local dev without an
 * account), this is a no-op that logs the intended send and reports
 * `sent: false`. That keeps `/v1/events` working end-to-end without external
 * accounts, so UI and integration tests can drive the flow in dev.
 */

export interface SendResult {
  sent: boolean;
}

export interface CreatorMagicLinkInput {
  to: string;
  eventTitle: string;
  manageUrl: string;
}

export interface SignInMagicLinkInput {
  to: string;
  url: string;
}

const FROM_ADDRESS = 'vite.in <no-reply@vite.in>';

export async function sendCreatorMagicLink(
  env: Env,
  input: CreatorMagicLinkInput,
): Promise<SendResult> {
  return sendEmail(env, {
    to: input.to,
    subject: `Manage your event: ${input.eventTitle}`,
    text: creatorMagicLinkBody(input),
    logHint: { eventTitle: input.eventTitle },
  });
}

export async function sendSignInMagicLink(
  env: Env,
  input: SignInMagicLinkInput,
): Promise<SendResult> {
  return sendEmail(env, {
    to: input.to,
    subject: 'Your vite.in sign-in link',
    text: signInMagicLinkBody(input),
    logHint: { kind: 'sign-in' },
  });
}

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  logHint?: Record<string, string>;
}

async function sendEmail(env: Env, input: SendEmailInput): Promise<SendResult> {
  if (!env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY unset — skipping send', {
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

function creatorMagicLinkBody({ eventTitle, manageUrl }: CreatorMagicLinkInput): string {
  return [
    `Your event "${eventTitle}" is live on vite.in.`,
    '',
    'Use the link below to manage it — view RSVPs, edit details, send reminders:',
    manageUrl,
    '',
    'Keep this link private. Anyone with the link can manage the event.',
    '',
    '— vite.in',
  ].join('\n');
}

function signInMagicLinkBody({ url }: SignInMagicLinkInput): string {
  return [
    'Click the link below to sign in to vite.in:',
    url,
    '',
    'This link expires in 10 minutes. If you did not request it, you can ignore this email.',
    '',
    '— vite.in',
  ].join('\n');
}
