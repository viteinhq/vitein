// Render sample emails using the live shell + each template body,
// then screenshot each one in a desktop and a mobile viewport.
// Output: PNGs in /tmp/email-previews/.
//
// Self-contained replica of email-shell.ts inlined so the script
// has zero workspace import-attribute friction. Keep in sync if
// the shell changes.

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT = '/tmp/email-previews';
await mkdir(OUT, { recursive: true });

const PALETTE = {
  paper: '#f1eee7',
  card: '#ffffff',
  ink: '#0a0a0a',
  inkMuted: '#7a7670',
  rule: '#e2dfd6',
  coral: '#e0533a',
};

const URL_LINE_RE = /^https?:\/\/\S+$/i;

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buttonLabel(href) {
  if (/\/manage(\b|\/|\?)/.test(href)) return 'Manage event';
  if (/\/auth\/continue/.test(href)) return 'Continue';
  if (/\/e\/[^/?#]+(\/?)(\?|#|$)/.test(href)) return 'Open event';
  return 'Open link';
}

function renderButton(href) {
  const safeHref = escapeHtml(href);
  const label = buttonLabel(href);
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="border-radius:9999px;background:${PALETTE.ink};padding:0"><a href="${safeHref}" style="display:inline-block;padding:12px 20px;font:600 14px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:${PALETTE.paper};text-decoration:none;border-radius:9999px">${label}</a></td></tr></table>`;
}

function renderTextBlock(text) {
  const lines = text
    .split('\n')
    .map((line) =>
      escapeHtml(line).replace(
        /(https?:\/\/[^\s<]+)/g,
        (m) => `<a href="${m}" style="color:${PALETTE.coral};text-decoration:underline">${m}</a>`,
      ),
    )
    .join('<br>');
  return `<p style="margin:0 0 16px;font:400 15px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:${PALETTE.ink}">${lines}</p>`;
}

function renderHtmlEmail({ subject, bodyText }) {
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const blocks = [];
  for (const p of paragraphs) {
    if (p.startsWith('— ')) {
      blocks.push(
        `<p style="margin:24px 0 0;font:400 12px/1.5 ui-monospace,Menlo,monospace;color:${PALETTE.inkMuted};letter-spacing:0.04em">${escapeHtml(p)}</p>`,
      );
      continue;
    }
    const lines = p.split('\n');
    let textBuffer = [];
    const flush = () => {
      if (textBuffer.length === 0) return;
      blocks.push(renderTextBlock(textBuffer.join('\n')));
      textBuffer = [];
    };
    for (const line of lines) {
      if (URL_LINE_RE.test(line)) {
        flush();
        blocks.push(renderButton(line));
      } else {
        textBuffer.push(line);
      }
    }
    flush();
  }

  const preheader = paragraphs.find((p) => !URL_LINE_RE.test(p)) ?? subject;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;background:${PALETTE.paper};font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:${PALETTE.ink}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PALETTE.paper};padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:${PALETTE.card};border:1px solid ${PALETTE.rule};border-radius:16px;padding:32px" cellpadding="0" cellspacing="0">
<tr><td>
<div style="font:700 26px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:-0.04em;color:${PALETTE.ink};margin-bottom:24px"><span style="font-style:italic">vite</span><span style="color:${PALETTE.coral}">.in</span></div>
${blocks.join('\n')}
</td></tr>
</table>
<p style="margin:20px 0 0;font:400 11px/1.4 ui-monospace,Menlo,monospace;color:${PALETTE.inkMuted};letter-spacing:0.08em">vite.in · open source · AGPL-3.0</p>
</td></tr>
</table>
</body>
</html>`;
}

const samples = {
  creator_magic_link: {
    subject: 'Manage your event: Studio Launch',
    bodyText: [
      'Your event "Studio Launch" is live on vite.in.',
      '',
      'Use the link below to manage it — view RSVPs, edit details, send reminders:',
      'https://vite.in/e/studio-launch/manage?token=8fb2c8c4',
      '',
      'Keep this link private. Anyone with the link can manage the event.',
      '',
      '— vite.in',
    ].join('\n'),
  },
  creator_recovery: {
    subject: 'Your vite.in event management links',
    bodyText: [
      'Here are management links for your events on vite.in:',
      '',
      'Studio Launch',
      'https://vite.in/e/studio-launch/manage?token=1a2b3c',
      '',
      'Sunday roast',
      'https://vite.in/e/sunday-roast/manage?token=4d5e6f',
      '',
      'Maya turns 30',
      'https://vite.in/e/maya-turns-30/manage?token=7g8h9i',
      '',
      'Keep these links private. Anyone with a link can manage that event.',
      'If you did not request this email, you can ignore it.',
      '',
      '— vite.in',
    ].join('\n'),
  },
  signin_magic_link: {
    subject: 'Your vite.in sign-in link',
    bodyText: [
      'Click the link below to sign in to vite.in:',
      'https://vite.in/auth/continue?token=abcdef1234',
      '',
      'This link expires in 10 minutes. If you did not request it, you can ignore this email.',
      '',
      '— vite.in',
    ].join('\n'),
  },
  rsvp_confirmation: {
    subject: 'RSVP recorded: Studio Launch',
    bodyText: [
      'Thanks — we recorded your RSVP for "Studio Launch".',
      'You are going to this event.',
      '',
      'Event details:',
      'https://vite.in/e/studio-launch',
      '',
      'You can update your RSVP any time by re-submitting the form.',
      '',
      '— vite.in',
    ].join('\n'),
  },
  rsvp_notification: {
    subject: 'New RSVP for Studio Launch',
    bodyText: [
      'New RSVP on "Studio Launch": Anna Müller — yes (+2).',
      '',
      'Manage your event and see all RSVPs:',
      'https://vite.in/e/studio-launch/manage?token=8fb2c8c4',
      '',
      '— vite.in',
    ].join('\n'),
  },
  reminder: {
    subject: 'Reminder: Studio Launch',
    bodyText: [
      'Reminder: "Studio Launch" is coming up at Saturday, August 15, 2026 at 9:00 PM CEST.',
      '',
      'Event details:',
      'https://vite.in/e/studio-launch',
      '',
      '— vite.in',
    ].join('\n'),
  },
  announcement_save_the_date: {
    subject: 'Save the date — Studio Launch',
    bodyText: [
      'Save the date: "Studio Launch" — Saturday, August 15, 2026 at 9:00 PM CEST.',
      '',
      'The full invitation with location and details will follow. For now, please hold the date in your calendar.',
      '',
      'https://vite.in/e/studio-launch',
      '',
      '— vite.in',
    ].join('\n'),
  },
  announcement_invitation: {
    subject: "You're invited: Studio Launch",
    bodyText: [
      'You\'re invited to "Studio Launch" on Saturday, August 15, 2026 at 9:00 PM CEST.',
      '',
      'Details and RSVP:',
      'https://vite.in/e/studio-launch',
      '',
      '— vite.in',
    ].join('\n'),
  },
};

const browser = await chromium.launch();
try {
  for (const [name, sample] of Object.entries(samples)) {
    const html = renderHtmlEmail(sample);
    await writeFile(path.join(OUT, `${name}.html`), html);
    for (const [viewportName, viewport] of /** @type {const} */ ([
      ['desktop', { width: 720, height: 800 }],
      ['mobile', { width: 390, height: 800 }],
    ])) {
      const ctx = await browser.newContext({ viewport });
      const page = await ctx.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      await page.screenshot({
        path: path.join(OUT, `${name}.${viewportName}.png`),
        fullPage: true,
      });
      await ctx.close();
      console.log(`✓ ${name}.${viewportName}.png`);
    }
  }
} finally {
  await browser.close();
}
console.log('\nAll previews written to', OUT);
