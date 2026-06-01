/**
 * RFC 4180 RSVP-export rendering, with CSV formula-injection mitigation.
 *
 * RSVP fields (`name`, `message`, plus-one names) are unauthenticated,
 * attacker-controlled free text. RFC 4180 quoting alone does not stop a
 * spreadsheet (Excel / Sheets / LibreOffice) from evaluating a cell that
 * begins with a formula trigger, so we neutralize those before quoting.
 */

export interface CsvRow {
  name: string;
  email: string | null;
  status: 'yes' | 'maybe' | 'no';
  plusOnes: number;
  plusOnesDetails: { name: string }[];
  message: string | null;
  respondedAt: string;
}

/**
 * Leading characters that make a spreadsheet treat the cell as a formula.
 * `=`, `+`, `-`, `@` are the classic ones; a leading TAB (`\t`) or CR
 * (`\r`) can also smuggle a formula past naive guards.
 */
const FORMULA_TRIGGERS = new Set(['=', '+', '-', '@', '\t', '\r']);

/**
 * Quote a single CSV cell. Neutralizes formula injection (prefix a `'` so
 * the cell is treated as text) BEFORE applying RFC 4180 quoting (wrap in
 * double quotes when the value contains `,` `"` or a newline; double any
 * internal quote).
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  if (s.length > 0 && FORMULA_TRIGGERS.has(s.charAt(0))) {
    s = `'${s}`;
  }
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function renderRsvpsCsv(rows: CsvRow[]): string {
  const header = [
    'name',
    'email',
    'status',
    'plus_ones',
    'plus_ones_details',
    'message',
    'responded_at',
  ];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        csvCell(r.name),
        csvCell(r.email ?? ''),
        csvCell(r.status),
        csvCell(r.plusOnes),
        csvCell(r.plusOnesDetails.map((d) => d.name).join('; ')),
        csvCell(r.message ?? ''),
        csvCell(r.respondedAt),
      ].join(','),
    );
  }
  // Trailing CRLF per the RFC; matters for some pickier parsers.
  return lines.join('\r\n') + '\r\n';
}
