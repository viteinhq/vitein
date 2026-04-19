/**
 * Random slug generator. Uses Crockford-base32 over CSPRNG bytes — no
 * lookalikes (`I`/`l`/`1`, `O`/`0`), case-insensitive, URL-safe.
 *
 * 8 chars = 40 bits. With 1M events that's ~0.05% collision odds. Generation
 * is collision-checked at the DB layer (the `slug` unique index); if a
 * collision occurs, callers should retry.
 */

const CROCKFORD = '0123456789abcdefghjkmnpqrstvwxyz';

const DEFAULT_LENGTH = 8;

export function generateSlug(length = DEFAULT_LENGTH): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (const byte of bytes) {
    out += CROCKFORD[byte & 0x1f];
  }
  return out;
}
