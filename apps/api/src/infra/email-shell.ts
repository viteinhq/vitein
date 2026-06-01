/**
 * Shared HTML shell + content helpers for transactional emails.
 *
 * Each template still defines a plain-text body (single source of
 * truth for what the email says); the shell here turns that text
 * into a vite.in-branded HTML rendering. The two are sent together —
 * Resend forwards both via the `text` and `html` fields and the
 * recipient's client picks one.
 *
 * Why auto-wrap plain text instead of per-locale HTML templates:
 * the email-templates.ts file holds bundles for ~8 locales; adding
 * an HTML body to each would multiply maintenance for no design
 * gain (the shell is uniform across locales). Treating text as the
 * canonical body and deriving HTML from it keeps the per-locale
 * surface tight.
 */

import { DEFAULT_LOCALE, type Locale } from '@vitein/i18n-messages';

/**
 * Format an event date for a recipient. Uses Intl.DateTimeFormat
 * pinned to the event's IANA timezone (not the Worker's UTC, not
 * the recipient's local zone — the event's time is what they need
 * to read).
 */
export function formatEventDate(date: Date, locale: Locale | undefined, timezone: string): string {
  try {
    return new Intl.DateTimeFormat(locale ?? DEFAULT_LOCALE, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
      timeZoneName: 'short',
    }).format(date);
  } catch {
    // Unknown tz / locale id → ISO fallback. Less pretty but never
    // crashes the queue consumer.
    return date.toISOString();
  }
}

const PALETTE = {
  paper: '#f1eee7',
  card: '#ffffff',
  ink: '#0a0a0a',
  inkMuted: '#7a7670',
  rule: '#e2dfd6',
  coral: '#e0533a',
  accent: '#e3ff3a',
  accentInk: '#0a0a0a',
} as const;

const URL_LINE_RE = /^https?:\/\/\S+$/i;

/**
 * Escape a string for safe insertion into HTML text nodes / attribute
 * values. Targets the four characters that can break out of context.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Pick a sensible label for the action button based on the URL shape.
 * The text templates don't ship a per-link label, so the shell
 * infers one from path segments we already control:
 *
 *  - .../manage... -> "Manage event"
 *  - .../auth/continue... -> "Continue"
 *  - .../e/<slug>(/) -> "Open event"
 *  - otherwise -> "Open link"
 */
function buttonLabel(href: string): string {
  if (/\/manage(\b|\/|\?)/.test(href)) return 'Manage event';
  if (/\/auth\/continue/.test(href)) return 'Continue';
  if (/\/e\/[^/?#]+(\/?)(\?|#|$)/.test(href)) return 'Open event';
  return 'Open link';
}

function renderButton(href: string): string {
  const safeHref = escapeHtml(href);
  const label = buttonLabel(href);
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0"><tr><td style="border-radius:9999px;background:${PALETTE.ink};padding:0"><a href="${safeHref}" style="display:inline-block;padding:12px 20px;font:600 14px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:${PALETTE.paper};text-decoration:none;border-radius:9999px">${label}</a></td></tr></table>`;
}

function renderTextBlock(text: string): string {
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

/**
 * Turn a plain-text email body into HTML. Heuristics:
 *
 *  - Paragraphs break on a blank line.
 *  - Inside a paragraph, any line that's a bare URL is promoted to
 *    its own styled button block. The lines above (if any) render
 *    as a normal text paragraph; the URL becomes a CTA below them.
 *    This is why templates can write "Open it:\n<url>" without a
 *    blank line and still get a real button.
 *  - A sign-off paragraph starting with an em-dash + space renders
 *    as muted mono footer text.
 *  - URLs embedded inside a text line are auto-linkified.
 *  - All output is HTML-escaped.
 *
 * The shell wraps the body in a vite.in-branded card.
 */
export function renderHtmlEmail(opts: { subject: string; bodyText: string }): string {
  const paragraphs = opts.bodyText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const blocks: string[] = [];
  for (const p of paragraphs) {
    if (p.startsWith('— ')) {
      blocks.push(
        `<p style="margin:24px 0 0;font:400 12px/1.5 ui-monospace,Menlo,monospace;color:${PALETTE.inkMuted};letter-spacing:0.04em">${escapeHtml(p)}</p>`,
      );
      continue;
    }
    const lines = p.split('\n');
    let textBuffer: string[] = [];
    const flushText = () => {
      if (textBuffer.length === 0) return;
      blocks.push(renderTextBlock(textBuffer.join('\n')));
      textBuffer = [];
    };
    for (const line of lines) {
      if (URL_LINE_RE.test(line)) {
        flushText();
        blocks.push(renderButton(line));
      } else {
        textBuffer.push(line);
      }
    }
    flushText();
  }

  // Preheader: invisible preview text shown in inbox lists by most
  // clients (Gmail/Apple Mail). Pull the first non-URL paragraph.
  const preheader = paragraphs.find((p) => !URL_LINE_RE.test(p)) ?? opts.subject;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(opts.subject)}</title>
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
