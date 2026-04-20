import type { events } from '@vitein/db-schema';

type EventRow = typeof events.$inferSelect;

/**
 * Build an iCalendar (RFC 5545) document for a single event.
 *
 * We target the subset all major calendar apps accept: VCALENDAR wrapping
 * one VEVENT with UID, DTSTAMP, DTSTART, DTEND, SUMMARY, DESCRIPTION,
 * LOCATION, and URL. All timestamps are UTC (`Z`-suffixed) so we don't have
 * to ship a VTIMEZONE block for every IANA zone.
 */
export function buildEventIcs(event: EventRow, publicUrl: string): string {
  const now = new Date();
  const dtend = event.endsAt ?? addHours(event.startsAt, 1);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//vite.in//v2//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@vite.in`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART:${formatUtc(event.startsAt)}`,
    `DTEND:${formatUtc(dtend)}`,
    `SUMMARY:${escapeText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : undefined,
    event.locationText ? `LOCATION:${escapeText(event.locationText)}` : undefined,
    `URL:${publicUrl}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((line): line is string => Boolean(line));

  return lines.join('\r\n') + '\r\n';
}

function formatUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${String(date.getUTCFullYear())}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

/** Escape per RFC 5545 §3.3.11 (backslash, newlines, commas, semicolons). */
function escapeText(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}
