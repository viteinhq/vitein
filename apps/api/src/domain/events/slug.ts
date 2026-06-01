/**
 * Random slug generator. Uses Crockford-base32 over CSPRNG bytes — no
 * lookalikes (`I`/`l`/`1`, `O`/`0`), case-insensitive, URL-safe.
 *
 * 16 chars = 80 bits. For link-only events the slug is the only thing
 * guarding the URL (ARCHITECTURE §9.1), so it must resist enumeration, not
 * just accidental collision — 40 bits (the old 8-char length) is brute-
 * forceable for a targeted event over time. Generation is collision-checked
 * at the DB layer (the `slug` unique index); if a collision occurs, callers
 * should retry.
 */

const CROCKFORD = '0123456789abcdefghjkmnpqrstvwxyz';

const DEFAULT_LENGTH = 16;

export function generateSlug(length = DEFAULT_LENGTH): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (const byte of bytes) {
    out += CROCKFORD[byte & 0x1f];
  }
  return out;
}
