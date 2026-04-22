/**
 * Event password hashing. Low-entropy user input → PBKDF2-SHA-256 with a
 * random per-password salt. Creator tokens use plain SHA-256 (high-entropy
 * 32-byte secrets); passwords need a slow hash so offline brute-force is
 * expensive.
 *
 * Storage format (self-describing so the iteration count can evolve):
 *   `pbkdf2-sha256$<iterations>$<base64url salt>$<base64url hash>`
 *
 * Iterations: 100k is the hard cap on Cloudflare Workers' Web Crypto
 * implementation (runtime rejects anything above with NotSupportedError).
 * OWASP 2023 guidance is 600k+ for SHA-256 — accepted debt for the Workers
 * runtime. Event passwords are medium-entropy low-stakes secrets; the
 * random 16-byte salt + SHA-256 still defeats rainbow tables.
 */

const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

export async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const bits = await derive(plain, salt, ITERATIONS, HASH_BITS);
  return `pbkdf2-sha256$${String(ITERATIONS)}$${b64u(salt)}$${b64u(new Uint8Array(bits))}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4) return false;
  const [algo, iterStr, saltB64, hashB64] = parts;
  if (algo !== 'pbkdf2-sha256') return false;
  const iterations = Number(iterStr);
  if (!Number.isFinite(iterations) || iterations < 1) return false;
  const salt = b64uDecode(saltB64 ?? '');
  const expected = b64uDecode(hashB64 ?? '');
  const bits = await derive(plain, salt, iterations, expected.byteLength * 8);
  return constantTimeEqual(new Uint8Array(bits), expected);
}

async function derive(
  plain: string,
  salt: Uint8Array,
  iterations: number,
  outputBits: number,
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(plain),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    outputBits,
  );
}

function b64u(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64uDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '===='.slice(s.length % 4);
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}
