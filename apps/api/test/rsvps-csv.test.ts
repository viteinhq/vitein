import { describe, expect, it } from 'vitest';
import { csvCell, renderRsvpsCsv, type CsvRow } from '../src/domain/rsvps/csv.js';

describe('csvCell — formula injection (GHSA-hj85)', () => {
  it('neutralizes cells starting with a formula trigger', () => {
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('+1+1')).toBe("'+1+1");
    expect(csvCell('-1+1')).toBe("'-1+1");
    expect(csvCell('@SUM(A1:A9)')).toBe("'@SUM(A1:A9)");
    // A leading tab is a trigger; it gets the ' prefix (no RFC quoting since
    // tab is not one of , " \n \r).
    expect(csvCell('\tcmd')).toBe("'\tcmd");
  });

  it('neutralizes the classic DDE / command payload', () => {
    // =cmd|'/C calc'!A1 has no comma/double-quote/newline, so it is only
    // prefixed with ' (not RFC-quoted) — the prefix alone defuses it.
    expect(csvCell("=cmd|'/C calc'!A1")).toBe("'=cmd|'/C calc'!A1");
  });

  it('leaves ordinary values untouched', () => {
    expect(csvCell('Anna')).toBe('Anna');
    expect(csvCell('anna@example.com')).toBe('anna@example.com'); // @ not leading
    expect(csvCell(3)).toBe('3');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('still applies RFC-4180 quoting for commas/quotes/newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('renderRsvpsCsv', () => {
  const row: CsvRow = {
    name: '=HYPERLINK("http://evil")',
    email: 'guest@example.com',
    status: 'yes',
    plusOnes: 2,
    plusOnesDetails: [{ name: '+ evil' }, { name: 'Bob' }],
    message: 'see you!',
    respondedAt: '2026-06-01T10:00:00.000Z',
  };

  it('neutralizes attacker-controlled name and plus-one cells', () => {
    const csv = renderRsvpsCsv([row]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('name,email,status,plus_ones,plus_ones_details,message,responded_at');
    // The =HYPERLINK name is prefixed with ' then quoted (contains quotes).
    expect(lines[1]).toContain('"\'=HYPERLINK');
    // The joined plus-one details start with "+ evil" → neutralized.
    expect(lines[1]).toContain("'+ evil; Bob");
  });

  it('emits a trailing CRLF', () => {
    expect(renderRsvpsCsv([row]).endsWith('\r\n')).toBe(true);
  });
});
