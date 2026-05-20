/**
 * Decode a base64url-encoded VAPID public key into the byte array that
 * `PushManager.subscribe({ applicationServerKey })` expects. Shared by the
 * push opt-in component and the service worker's re-subscribe path.
 */
export function decodeVapidKey(b64: string): Uint8Array<ArrayBuffer> {
  const padded = (b64 + '='.repeat((4 - (b64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}
