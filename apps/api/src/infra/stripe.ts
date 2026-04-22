import type { Env } from '../types/env.js';

/**
 * Thin Stripe REST wrapper. We deliberately avoid the `stripe` npm package
 * (Node-specific streams, big bundle, unnecessary on Workers). Two entry
 * points: create a Checkout Session, and verify a webhook signature.
 *
 * Auth: `Authorization: Basic base64("<secret>:")` — secret-key as username,
 * empty password. All request bodies are form-encoded per Stripe's HTTP API.
 */

const STRIPE_BASE = 'https://api.stripe.com/v1';

export interface CheckoutSessionInput {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  /** Stored on the Session so we can correlate the webhook back to the event. */
  clientReferenceId: string;
  /** Small key/value bag surfaced on session + payment_intent. */
  metadata?: Record<string, string>;
  customerEmail?: string;
  /** Defaults to true — enabling Stripe Tax is mandatory per ARCHITECTURE §12.3. */
  enableTax?: boolean;
}

export interface CheckoutSession {
  id: string;
  url: string;
}

export class StripeNotConfiguredError extends Error {
  constructor() {
    super('Stripe secret key is not configured for this environment');
    this.name = 'StripeNotConfiguredError';
  }
}

export class StripeApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Stripe API returned ${String(status)}`);
    this.name = 'StripeApiError';
  }
}

export async function createCheckoutSession(
  env: Env,
  input: CheckoutSessionInput,
): Promise<CheckoutSession> {
  if (!env.STRIPE_SECRET_KEY) throw new StripeNotConfiguredError();

  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('line_items[0][price]', input.priceId);
  params.set('line_items[0][quantity]', '1');
  params.set('success_url', input.successUrl);
  params.set('cancel_url', input.cancelUrl);
  params.set('client_reference_id', input.clientReferenceId);
  if (input.customerEmail) params.set('customer_email', input.customerEmail);
  if (input.enableTax !== false) params.set('automatic_tax[enabled]', 'true');
  for (const [k, v] of Object.entries(input.metadata ?? {})) {
    params.set(`metadata[${k}]`, v);
  }

  const res = await fetch(`${STRIPE_BASE}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${env.STRIPE_SECRET_KEY}:`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new StripeApiError(res.status, await res.text().catch(() => ''));
  }

  const data = (await res.json()) as { id: string; url: string };
  return { id: data.id, url: data.url };
}

export interface VerifiedWebhookEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
  created: number;
}

/**
 * Verify the `Stripe-Signature` header per Stripe's scheme:
 *
 *   signed_payload = `${timestamp}.${raw_body}`
 *   expected = HMAC-SHA256(webhook_secret, signed_payload)  // hex
 *
 * Header format: `t=<ts>,v1=<sig>[,v1=<sig>…]`. Match any v1 signature in
 * constant time. Reject if the timestamp is older than `toleranceSeconds`.
 */
export async function verifyWebhookSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string,
  toleranceSeconds = 300,
): Promise<VerifiedWebhookEvent> {
  const parts = Object.fromEntries(
    signatureHeader
      .split(',')
      .map((p) => p.split('='))
      .filter(([k, v]) => typeof k === 'string' && typeof v === 'string')
      .map(([k, v]) => [k as string, v as string]),
  );
  const timestamp = parts['t'];
  if (!timestamp) throw new WebhookVerificationError('missing_timestamp');

  const providedSigs = signatureHeader
    .split(',')
    .map((p) => p.split('='))
    .filter(([k]) => k === 'v1')
    .map(([, v]) => v ?? '');
  if (providedSigs.length === 0) throw new WebhookVerificationError('missing_signature');

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) throw new WebhookVerificationError('bad_timestamp');
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > toleranceSeconds) {
    throw new WebhookVerificationError('timestamp_out_of_tolerance');
  }

  const signedPayload = `${timestamp}.${rawBody}`;
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
    new TextEncoder().encode(signedPayload),
  );
  const expected = bufferToHex(sigBuf);

  const ok = providedSigs.some((s) => constantTimeEqual(s, expected));
  if (!ok) throw new WebhookVerificationError('signature_mismatch');

  return JSON.parse(rawBody) as VerifiedWebhookEvent;
}

export class WebhookVerificationError extends Error {
  constructor(public readonly reason: string) {
    super(`Stripe webhook verification failed: ${reason}`);
    this.name = 'WebhookVerificationError';
  }
}

function bufferToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export type Tier = 'basic' | 'plus';
export type Currency = 'EUR' | 'USD' | 'CHF' | 'GBP';

/**
 * Resolve the configured Price ID for a (tier, currency) pair. Returns null
 * when unset so the caller can distinguish "Stripe not configured for this
 * market" from "API error" and surface the right error code.
 */
export function priceIdFor(env: Env, tier: Tier, currency: Currency): string | null {
  if (tier === 'basic') {
    switch (currency) {
      case 'EUR':
        return env.STRIPE_PRICE_BASIC_EUR ?? null;
      case 'USD':
        return env.STRIPE_PRICE_BASIC_USD ?? null;
      case 'CHF':
        return env.STRIPE_PRICE_BASIC_CHF ?? null;
      case 'GBP':
        return env.STRIPE_PRICE_BASIC_GBP ?? null;
    }
  }
  switch (currency) {
    case 'EUR':
      return env.STRIPE_PRICE_PLUS_EUR ?? null;
    case 'USD':
      return env.STRIPE_PRICE_PLUS_USD ?? null;
    case 'CHF':
      return env.STRIPE_PRICE_PLUS_CHF ?? null;
    case 'GBP':
      return env.STRIPE_PRICE_PLUS_GBP ?? null;
  }
}
