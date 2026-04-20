import { describe, expect, it } from 'vitest';
import { buildEventIcs } from '../src/domain/events/ics.js';

const baseEvent = {
  id: '01920000-0000-7000-8000-000000000001',
  slug: 'test-event',
  title: 'Kim, comma, and "quotes"',
  description: 'Line one\nLine two; with ; semicolons',
  startsAt: new Date(Date.UTC(2026, 4, 1, 18, 0, 0)),
  endsAt: new Date(Date.UTC(2026, 4, 1, 21, 0, 0)),
  timezone: 'Europe/Zurich',
  locationText: 'Bahnhofstrasse 1, Zürich',
  locationLat: null,
  locationLng: null,
  creatorEmail: 'kim@example.com',
  creatorUserId: null,
  isPaid: false,
  paidFeatures: {},
  paymentProvider: null,
  paymentRef: null,
  passwordHash: null,
  coverMediaId: null,
  defaultLocale: 'en',
  visibility: 'link_only',
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as const;

describe('buildEventIcs', () => {
  it('produces a valid single-event VCALENDAR', () => {
    const ics = buildEventIcs({ ...baseEvent }, 'https://vite.in/e/test-event');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain(`UID:${baseEvent.id}@vite.in`);
    expect(ics).toContain('DTSTART:20260501T180000Z');
    expect(ics).toContain('DTEND:20260501T210000Z');
    expect(ics).toContain('URL:https://vite.in/e/test-event');
  });

  it('escapes commas, semicolons, backslashes, and newlines per RFC 5545', () => {
    const ics = buildEventIcs({ ...baseEvent }, 'https://vite.in/e/test-event');
    expect(ics).toContain('SUMMARY:Kim\\, comma\\, and "quotes"');
    expect(ics).toContain('DESCRIPTION:Line one\\nLine two\\; with \\; semicolons');
    expect(ics).toContain('LOCATION:Bahnhofstrasse 1\\, Zürich');
  });

  it('defaults DTEND to +1h when endsAt is null', () => {
    const ics = buildEventIcs({ ...baseEvent, endsAt: null }, 'https://vite.in/e/test-event');
    expect(ics).toContain('DTSTART:20260501T180000Z');
    expect(ics).toContain('DTEND:20260501T190000Z');
  });
});
