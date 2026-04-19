# 0003 — Email provider: Resend alone for Phase 1

- **Status:** Accepted
- **Date:** 2026-04-19
- **Deciders:** Kim

## Context

vite.in sends transactional email: magic-link auth, RSVP confirmations, RSVP notifications to event creators, and scheduled reminders. Email is load-bearing — if delivery fails, RSVPs do not reach creators and the product breaks.

v1 already uses Resend on the `vite.in` domain with DKIM/SPF/DMARC configured and good deliverability into EU inboxes. PROJECT_PLAN §0.4 asked whether we should keep Resend or introduce a second provider (typical patterns: Postmark for transactional + Resend for marketing, or an ESP per region).

## Decision

Stay on **Resend alone for all transactional email in Phase 1**.

- Reuse the verified v1 `vite.in` domain and DKIM keys.
- Track bounce / complaint rates in PostHog via Resend webhooks.
- Keep templates in `packages/i18n-messages` so provider swap later is mechanical.

## Alternatives considered

- **Resend + Postmark (hot-standby).** Higher deliverability ceiling but doubles ops surface, two dashboards, two sets of DKIM keys. Not justified while we have no measured deliverability problems in our target markets.
- **Self-hosted via SMTP relay (Mailgun, SES).** Cheaper per-volume at scale, but deliverability tuning is work we do not want to do in Phase 1.
- **Region-split (Resend EU + separate US provider).** Over-engineered for launch traffic; Resend already routes via their own infra.

## Consequences

- **Good:** One API key, one dashboard, one set of domain records. Fast integration (reuse v1 setup). Email templates stay provider-agnostic via the i18n package.
- **Bad:** Single point of failure. Acceptable given the product is not life-safety-critical and Resend has been reliable for v1. Mitigation: circuit-breaker pattern around the email client, with failures queued to Cloudflare Queues for retry.
- **Revisit trigger:** P0 deliverability issue, or sustained >1% bounce rate in any launch market, or >10k emails/day (volume-pricing threshold). Revisit in Phase 2 anyway.

## References

- PROJECT_PLAN §0.4
- v1 Resend configuration on `vite.in`
