# Stripe live-mode setup

What to create in the Stripe dashboard (live mode) before the first
production deploy. The Worker fetches Price IDs at runtime — they
must exist as concrete objects in Stripe, **not** be derived from
amounts in code (see ARCHITECTURE §12.2 — fixed anchors, not FX).

Total: **2 products × 4 currencies = 8 Price objects** for Phase 1
launch. Phase 1.5 adds 2 more for INR. Phase 2 adds the rest of the
PPP markets.

> Switch the Stripe dashboard to **Live mode** before doing any of
> this. Everything created in Test mode is a separate set of IDs and
> won't help. Verify the toggle in the top-right is grey/green, not
> orange.

---

## 1. Activate the account

- [ ] Account → Settings → Activate payments. Submit the required
      KYC info as the active legal entity (individual until the OÜ
      transition completes, then change-legal-entity flow per
      ARCHITECTURE §14.1).
- [ ] Confirm payouts are enabled to your live bank account.
- [ ] Enable **Stripe Tax**: Tax → Settings → start tax registration
      in EU (VAT-OSS or per-country until OSS), US, UK, CH.

## 2. Create the two Products

**Products → + Add product**, live mode.

### Product 1 — Basic

| Field                | Value                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| Name                 | `vite.in Event — Basic`                                                                           |
| Description          | `One-time premium upgrade for a single event: no vite.in branding, custom slug, reminder emails.` |
| Image                | (optional — the Stripe-hosted Checkout shows it)                                                  |
| Statement descriptor | `VITE.IN BASIC` (≤ 22 chars)                                                                      |
| Tax behavior         | Exclusive                                                                                         |

After creating, capture the Product ID — `prod_…` — but you won't
need to pass it to the API. The API only needs Price IDs.

### Product 2 — Plus

| Field                | Value                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Name                 | `vite.in Event — Plus`                                                                                                  |
| Description          | `One-time premium upgrade with the Basic bundle plus named plus-ones, password protection, and the Save-the-Date wave.` |
| Statement descriptor | `VITE.IN PLUS`                                                                                                          |
| Tax behavior         | Exclusive                                                                                                               |

---

## 3. Create 4 Prices per Product

For each Product, click **+ Add price**.

### Basic prices

| Currency | Unit amount | Mode     | Tax category                         |
| -------- | ----------- | -------- | ------------------------------------ |
| EUR      | `5.00`      | One-time | `txcd_10000000` (general — services) |
| USD      | `5.00`      | One-time | same                                 |
| CHF      | `5.00`      | One-time | same                                 |
| GBP      | `4.00`      | One-time | same                                 |

### Plus prices

| Currency | Unit amount | Mode     | Tax category |
| -------- | ----------- | -------- | ------------ |
| EUR      | `9.00`      | One-time |
| USD      | `9.00`      | One-time |
| CHF      | `9.00`      | One-time |
| GBP      | `7.00`      | One-time |

After saving each Price, copy its ID (`price_…`) and stash it in your
password manager. You'll plug each into the corresponding
`STRIPE_PRICE_*` secret in step 4.

Naming convention I'd suggest in the Stripe "lookup key" field so the
list view is greppable: `basic_eur`, `basic_usd`, `basic_chf`,
`basic_gbp`, `plus_eur`, `plus_usd`, `plus_chf`, `plus_gbp`.

---

## 4. Store the Price IDs as wrangler secrets

See [`prod-secrets-setup.md`](prod-secrets-setup.md) §5. One
`wrangler secret put` call per Price ID.

Sanity-check after setting all eight:

```bash
pnpm -F @vitein/api exec wrangler secret list --env production | grep STRIPE_PRICE
```

Must show all 8 names.

---

## 5. Configure the webhook

Stripe → Developers → Webhooks → **+ Add endpoint**.

| Field        | Value                                            |
| ------------ | ------------------------------------------------ |
| Endpoint URL | `https://api.vite.in/v1/webhooks/stripe`         |
| API version  | Latest available                                 |
| Events       | `checkout.session.completed` (at minimum).       |
| Description  | `vite.in Core API — premium upgrade fulfillment` |

After creating, Stripe shows the **signing secret** (`whsec_…`) once.
Capture it immediately into `STRIPE_WEBHOOK_SECRET` per
[`prod-secrets-setup.md`](prod-secrets-setup.md) §5.

Events to consider adding later (not Phase 1):

- `charge.refunded` — once we surface refunds in the dashboard.
- `customer.subscription.*` — only if we ever switch from one-time
  to subscription (Pro tier in Phase 2 might).

---

## 6. Test the webhook before launch

Stripe's webhook test panel lets you replay a synthetic
`checkout.session.completed` against the endpoint:

1. From the webhook endpoint's page → **Send test webhook**.
2. Pick `checkout.session.completed`, click **Send test event**.
3. Watch the response — must be 200. If 400, the signing secret is
   wrong; if 500, the handler logic broke.
4. Confirm one row in `audit_log` with `action = 'payment.complete'`
   and a synthetic event ID (Stripe's test events use IDs prefixed
   `evt_test_…`).

---

## 7. Currency rollout (Phase 1.5 onward)

Adding markets is exactly the same flow: create N new Price objects
on the existing Products, store as `STRIPE_PRICE_<tier>_<currency>`
secrets, then add the currency to the `Currency` type in
`apps/api/src/infra/stripe.ts` and the `priceIdFor()` switch.

| Phase | Currency | Basic       | Plus        |
| ----- | -------- | ----------- | ----------- |
| 1.5   | INR      | `₹149`      | `₹299`      |
| 2     | BRL      | `R$15`      | `R$29`      |
| 2     | MXN      | `MX$49`     | `MX$99`     |
| 2     | JPY      | `¥500`      | `¥980`      |
| 2     | TRY      | `₺49`       | `₺99`       |
| 2     | ARS      | `ARS 2.000` | `ARS 3.900` |
| 2     | AUD      | `A$8`       | `A$14`      |
| 2     | CAD      | `C$7`       | `C$13`      |
| 2     | SGD      | `S$7`       | `S$13`      |

Phase 2 amounts in particular are planning anchors; revisit before
shipping based on actual market data.
