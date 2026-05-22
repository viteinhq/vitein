/**
 * Wall-clock ↔ UTC conversions for the event date fields.
 *
 * A `<input type="datetime-local">` yields a *naive* `YYYY-MM-DDTHH:mm`
 * string with no zone. `new Date(naive)` interprets it in the runtime's
 * zone — UTC on Cloudflare Workers — which silently shifts the time. These
 * helpers interpret the naive value in the event's chosen IANA timezone so
 * the stored instant is correct and the create ↔ edit round-trip is stable.
 */

function wallFieldsAsUtcMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(instant);
  const field = (type: string): number => Number(parts.find((p) => p.type === type)?.value);
  const hour = field('hour');
  return Date.UTC(
    field('year'),
    field('month') - 1,
    field('day'),
    hour === 24 ? 0 : hour,
    field('minute'),
    field('second'),
  );
}

/**
 * Interpret a naive `YYYY-MM-DDTHH:mm` wall-clock string as a time in
 * `timeZone` and return the matching UTC `Date`.
 */
export function zonedWallTimeToUtc(wall: string, timeZone: string): Date {
  const [datePart, timePart] = wall.split('T');
  if (!datePart || !timePart) return new Date(NaN);
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  // First read the wall fields as if they were already UTC, then measure
  // the zone's offset at that instant and correct. A second pass settles
  // the rare case where the correction crosses a DST boundary.
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offset1 = wallFieldsAsUtcMs(new Date(guess), timeZone) - guess;
  const candidate = guess - offset1;
  const offset2 = wallFieldsAsUtcMs(new Date(candidate), timeZone) - candidate;
  return new Date(guess - offset2);
}

/**
 * Render a UTC instant as the naive `YYYY-MM-DDTHH:mm` wall-clock string it
 * shows in `timeZone` — for pre-filling a `datetime-local` input.
 */
export function utcToZonedWallTime(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const field = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  const hour = field('hour') === '24' ? '00' : field('hour');
  return `${field('year')}-${field('month')}-${field('day')}T${hour}:${field('minute')}`;
}

/**
 * Add `hours` to a naive `YYYY-MM-DDTHH:mm` wall-clock string, rolling the
 * date over as needed. Pure wall arithmetic — no timezone involved.
 */
export function addHoursToWall(wall: string, hours: number): string {
  const [datePart, timePart] = wall.split('T');
  if (!datePart || !timePart) return wall;
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, hour + hours, minute));
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${String(d.getUTCFullYear())}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
