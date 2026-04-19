/**
 * Event Creator Token helpers.
 *
 * A creator token is an opaque 32-byte random string (256 bits of entropy,
 * base64url-encoded). We store only the SHA-256 hash in `event_tokens.token_hash`.
 *
 * Because the token is high-entropy and random, SHA-256 is sufficient — we
 * do not need a password-hashing function. An attacker cannot enumerate a
 * 2^256 space, so slow hashing gives no additional safety here. (Argon2id
 * would be the right tool for low-entropy secrets such as user passwords;
 * Better-Auth owns that path.)
 *
 * The plaintext token is returned to the creator exactly once — by email,
 * on event creation — and never stored server-side.
 */

const TOKEN_BYTES = 32;

/** Issue a fresh creator token. Returns the plaintext — store only the hash. */
export function issueCreatorToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  return base64urlEncode(bytes);
}

/** SHA-256 the token; the resulting base64url string is what goes in the DB. */
export async function hashToken(token: string): Promise<string> {
  const input = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', input);
  return base64urlEncode(new Uint8Array(digest));
}

function base64urlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
