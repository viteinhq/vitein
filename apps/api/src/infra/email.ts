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

export interface MagicLinkInput {
  to: string;
  eventTitle: string;
  manageUrl: string;
}

const FROM_ADDRESS = 'vite.in <no-reply@vite.in>';

export async function sendCreatorMagicLink(env: Env, input: MagicLinkInput): Promise<SendResult> {
  if (!env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY unset — skipping magic-link send', {
      to: input.to,
      eventTitle: input.eventTitle,
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
      subject: `Manage your event: ${input.eventTitle}`,
      text: creatorMagicLinkBody(input),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend returned ${String(res.status)}: ${body}`);
  }

  return { sent: true };
}

function creatorMagicLinkBody({ eventTitle, manageUrl }: MagicLinkInput): string {
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
