import { describe, it, expect } from 'vitest';
import { formatEventDate, renderHtmlEmail } from '../src/infra/email-shell.js';

describe('formatEventDate', () => {
  it('formats in the event timezone, not UTC', () => {
    // 19:00 UTC on 2026-08-15 → 21:00 in Zurich (CEST, +2)
    const out = formatEventDate(new Date('2026-08-15T19:00:00Z'), 'en', 'Europe/Zurich');
    // The exact wording depends on ICU but the time should be 21
    // and the date should still be 2026-08-15 (not 14 or 16).
    expect(out).toMatch(/9:00/);
    expect(out).toMatch(/15/);
    expect(out).toMatch(/2026/);
  });

  it('honours the locale for weekday/month words', () => {
    const en = formatEventDate(new Date('2026-08-15T19:00:00Z'), 'en', 'UTC');
    const de = formatEventDate(new Date('2026-08-15T19:00:00Z'), 'de', 'UTC');
    expect(en).toMatch(/Saturday|Aug/);
    expect(de).toMatch(/Samstag|Aug/);
  });

  it('falls back to ISO when the timezone is bogus', () => {
    const out = formatEventDate(new Date('2026-08-15T19:00:00Z'), 'en', 'Not/A_Timezone');
    expect(out).toBe('2026-08-15T19:00:00.000Z');
  });
});

describe('renderHtmlEmail', () => {
  const sample = renderHtmlEmail({
    subject: 'Manage your event: Studio Launch',
    bodyText: [
      'Your event "Studio Launch" is live on vite.in.',
      '',
      'Use the link below to manage it:',
      'https://vite.in/e/studio-launch/manage?token=abc',
      '',
      '— vite.in',
    ].join('\n'),
  });

  it('renders a full HTML document with the subject in the title', () => {
    expect(sample).toMatch(/^<!DOCTYPE html>/);
    expect(sample).toMatch(/<title>Manage your event: Studio Launch<\/title>/);
  });

  it('renders the vite.in wordmark', () => {
    expect(sample).toMatch(/<span style="font-style:italic">vite<\/span>/);
  });

  it('turns a URL-only paragraph into a button (anchor tag with the URL)', () => {
    expect(sample).toContain(
      'href="https://vite.in/e/studio-launch/manage?token=abc"',
    );
  });

  it('renders the sign-off as muted footer text', () => {
    expect(sample).toMatch(/— vite\.in/);
  });

  it('escapes HTML in the subject', () => {
    const dangerous = renderHtmlEmail({
      subject: '<script>alert(1)</script>',
      bodyText: 'hi',
    });
    expect(dangerous).not.toContain('<script>alert(1)</script>');
    expect(dangerous).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
