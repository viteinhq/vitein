import { describe, expect, it } from 'vitest';
import { verifyWebhookSignature, WebhookVerificationError } from '../src/infra/stripe.js';

const SECRET = 'whsec_test_secret';

async function signPayload(secret: string, payload: string, ts: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${String(ts)}.${payload}`),
  );
  return [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

describe('verifyWebhookSignature', () => {
  const payload = JSON.stringify({
    id: 'evt_test_1',
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_1' } },
    created: 1,
  });

  it('accepts a valid signature within tolerance', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const sig = await signPayload(SECRET, payload, ts);
    const header = `t=${String(ts)},v1=${sig}`;
    const evt = await verifyWebhookSignature(SECRET, payload, header);
    expect(evt.id).toBe('evt_test_1');
    expect(evt.type).toBe('checkout.session.completed');
  });

  it('rejects a signature produced with the wrong secret', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const sig = await signPayload('whsec_wrong', payload, ts);
    const header = `t=${String(ts)},v1=${sig}`;
    await expect(verifyWebhookSignature(SECRET, payload, header)).rejects.toBeInstanceOf(
      WebhookVerificationError,
    );
  });

  it('rejects a timestamp outside tolerance', async () => {
    const ts = Math.floor(Date.now() / 1000) - 600;
    const sig = await signPayload(SECRET, payload, ts);
    const header = `t=${String(ts)},v1=${sig}`;
    await expect(verifyWebhookSignature(SECRET, payload, header, 300)).rejects.toThrow(
      /timestamp_out_of_tolerance/,
    );
  });

  it('rejects a header with no v1 signature', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const header = `t=${String(ts)}`;
    await expect(verifyWebhookSignature(SECRET, payload, header)).rejects.toThrow(
      /missing_signature/,
    );
  });

  it('rejects tampered body even with a valid timestamp', async () => {
    const ts = Math.floor(Date.now() / 1000);
    const sig = await signPayload(SECRET, payload, ts);
    const header = `t=${String(ts)},v1=${sig}`;
    const tampered = payload.replace('cs_test_1', 'cs_test_2');
    await expect(verifyWebhookSignature(SECRET, tampered, header)).rejects.toThrow(
      /signature_mismatch/,
    );
  });
});
