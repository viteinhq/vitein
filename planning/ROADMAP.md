# vite.in v2 — Roadmap

**Philosophy:** Exit-criteria-driven, not date-driven. Each phase ships when its exit criteria are met. No phase is skipped, but scope within a phase can shift.

---

## Phase 0 — Foundation (≈ 3–5 weeks)

**Goal:** The skeleton stands. Nothing user-facing yet, but every architectural decision is committed to code and the team can build on it.

### Deliverables

- Monorepo initialized with pnpm + Turborepo.
- Two repositories set up: `vitein` (public) and `vitein-premium` (private). Both with proper `LICENSE` files.
- CLA tooling (EasyCLA or equivalent) wired up on the public repo.
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue + PR templates in the public repo.
- Cloudflare account configured (Workers, Pages, R2, KV, Queues, D1 not used).
- Neon Postgres: production, staging, and dev branches.
- Better-Auth library wired into the API skeleton.
- OpenAPI spec scaffolded with health check and one placeholder endpoint.
- SDK generation pipeline (OpenAPI → TS SDK) working.
- Sentry + PostHog accounts with SDKs installed everywhere.
- GitHub Actions running lint + typecheck + build on every PR.
- Wrangler deploys API to a `api-staging.vite.in` subdomain.
- SvelteKit app deploys to `next.vite.in` (placeholder page).
- Drizzle schema + migration tooling working against all three Neon branches.
- Decision documented: SDK generator tool choice (resolves Architecture §15.5).
- Decision documented: email provider strategy (resolves §15.1).
- Decision documented: premium integration mechanism (resolves §15.6).
- Stripe configured with `Product` + `Price` objects for launch currencies (EUR, USD, CHF, GBP).
- Stripe Tax enabled.

### Exit criteria

- A `POST /v1/health` request from the staging web app reaches the API, touches the DB, and returns. End-to-end green.
- CI fails on typecheck errors (proves the SDK import chain works).
- An engineer (you) can run `pnpm dev` and have web + API running locally, hitting a local Neon branch.
- `CLAUDE.md` files are in place in each app directory.

### Why this phase matters

This is the phase that pays the interest on all architectural promises. Cutting corners here means paying triple later. Resist the urge to build features.

---

## Phase 1 — Public Launch (≈ 8–12 weeks after Phase 0)

**Goal:** v2 is live on `vite.in`, v1 is redirected, real users create and pay for events. Feature parity with v1 plus mobile apps.

### Workstreams (parallel)

#### 1.1 Core API
- Event CRUD (create/read/update/soft-delete)
- Creator token generation, magic-link delivery via queued email
- Guest list management
- RSVP submission + listing
- Stripe integration (checkout sessions, webhook, idempotency)
- Premium features (no_branding, custom_slug, reminders, media_upload, password_protected)
- Media upload to R2 with server-side re-encode (Cloudflare Images)
- Email sending pipeline (queue + template engine)
- Reminder scheduler (cron worker)
- i18n: error messages and email templates in launch languages
- Rate limiting via Durable Objects
- Account creation + sign-in (Better-Auth)
- GDPR endpoints: data export, account deletion
- Observability: structured logs, traces, Sentry integration

#### 1.2 Web client
- Landing page (SEO-optimized, multi-language)
- Create-event flow (anonymous, no signup)
- Event view page (for guests) with RSVP
- Event management page (authenticated via creator token from magic link)
- Stripe checkout integration
- Premium feature unlocks (conditional rendering)
- Multi-language switcher with proper URL structure (`/de/`, `/en/`, etc.)
- Dashboard (for users with accounts): list of events, claim events
- Account settings
- Cookie consent (regional rules)

#### 1.3 iOS app
- Core networking layer with generated Swift SDK
- Keychain-backed auth storage
- Event view screen (from deep link or URL share)
- RSVP flow
- Create-event flow (account required on mobile for simplicity)
- Push notifications (APNs) — for RSVP received, reminder sent, event approaching
- Sign in with Apple
- Share sheet integration (for sending invite links via native OS)
- Basic templates (reuse web's design tokens)

#### 1.4 Android app
- Core networking layer with generated Kotlin SDK
- EncryptedSharedPreferences / Keystore auth storage
- Event view screen (from deep link or URL share)
- RSVP flow
- Create-event flow (account required on mobile)
- Push notifications (FCM)
- Sign in with Google
- Share intent integration
- Basic templates

#### 1.5 Cutover & ops
- v1 data archive (read-only export, kept for 1 year)
- DNS cutover plan: feature-flag-gated so individual % of traffic can move to v2
- Monitoring dashboards
- On-call runbook (even if on-call is just Kim)
- Status page (e.g. BetterStack or self-hosted)

### Exit criteria

- A user on any of the launch languages can create an event, share it, receive RSVPs, and upgrade to premium — entirely on v2.
- iOS and Android apps approved in respective stores.
- 100% of new event creation traffic goes to v2 for 2 consecutive weeks without regression.
- Uptime ≥ 99.9% for 30 days.
- First 50 paying events on v2.

### Explicitly NOT in Phase 1

- MCP server / agent integration (Phase 2).
- B2B / team accounts (Phase 2).
- Regional payment providers beyond Stripe (Phase 2+).
- Cultural template variants (Phase 3).
- Multi-language invitation content (the UI is multi-lang; a single invitation is single-lang in v1).
- Video media.
- Advanced analytics dashboard (basic RSVP counts only).

---

## Phase 2 — Agents & B2B foundation (≈ 8–16 weeks after Phase 1)

**Goal:** The platform opens its APIs. LLM users can delegate invitation tasks to Claude/ChatGPT. B2B use cases become possible (even if not heavily marketed yet).

### Workstreams

#### 2.1 MCP server
- Register the MCP server as a first-party OAuth client.
- Implement MCP protocol over HTTP + SSE (per MCP spec).
- Tools exposed:
  - `list_events` — see my events
  - `create_event` — create new invitation
  - `update_event` — edit title, date, location, etc.
  - `add_guests` — bulk add (accepts JSON list)
  - `list_rsvps` — see who's coming
  - `send_reminders` — trigger reminder emails
  - `get_event_url` — get the share link for a created event
- Prompt templates for common flows ("plan a birthday party", "send RSVPs follow-up")
- OAuth authorization pages with scope display
- Rate limiting specific to agent tokens
- Usage analytics per connected app

#### 2.2 Core API additions
- OAuth 2.1 + PKCE issuance endpoints (`/oauth/authorize`, `/oauth/token`, etc.)
- Scope enforcement middleware
- Webhook delivery service (for creators who want programmatic notifications)
- Multi-event bulk operations (create N events, bulk guest import)
- Account-level settings (notifications, default locale, timezone, default theme)
- Basic team invite model (added to schema, surfaced minimally)

#### 2.3 Web
- OAuth consent screens
- "Connect to AI Assistants" settings page (with per-app revocation)
- Basic analytics (RSVP rates, event views) per event
- Image-rich templates (3–5 designs to choose from on premium)
- Password-protected events (wired to schema that's already there)

#### 2.4 Mobile
- Match web's new features (analytics, template selection)
- Widget / home screen complication showing next event countdown
- Apple Watch companion (Phase 2 stretch)

#### 2.5 Regional payments prep
- Payment provider abstraction refactored (even though only Stripe is active)
- Stripe Tax integration for global VAT/GST handling

### Exit criteria

- A user can connect Claude to their vite.in account and create an event via conversation.
- At least 3 public MCP clients verified to work (Claude Desktop, OpenAI, Gemini if available).
- 100 OAuth-authorized users.
- Webhook reliability > 99.5% delivery.
- Estonia OÜ fully operational: Stripe migrated, provider contracts transferred, VAT-OSS registered.
- Open-source presence active: `docs.vite.in` with self-hosting guide, first external contribution merged, GitHub Discussions populated.

---

## Phase 3 — Scale & ecosystem (ongoing)

**Goal:** The platform is now a real platform. Third-party developers build on it. Regional markets are served with tailored experiences. B2B becomes a meaningful revenue line.

### Major streams (prioritized as evidence demands)

- **Third-party OAuth apps:** developer portal, app registration, review process, per-app analytics.
- **B2B workspace tier:** teams, shared templates, admin controls, SSO (SAML/OIDC), invoicing, seat pricing.
- **Regional payment providers:** Razorpay/UPI (India), iDEAL (NL), SEPA direct debit, Klarna/Sofort, Apple Pay / Google Pay everywhere.
- **Cultural template variants:** Indian weddings (multi-day function), Japanese formal invitations, etc.
- **RTL launch:** Arabic, Hebrew, Persian.
- **Asian languages:** Hindi, Mandarin, Japanese, Korean.
- **API pricing tier:** power-user keys, usage-based billing for high-volume API consumers.
- **Templates marketplace:** designers can submit templates, revenue-share on premium usage.
- **Advanced analytics:** funnel analysis, cohort reports, A/B testing on invitation designs.
- **AI-generated designs:** optional premium feature — describe your event, get a tailored template.

### Success signals

- MRR from B2B > MRR from B2C single-events.
- Non-English/German usage > German-origin usage.
- Active API developer ecosystem (> 20 registered apps).
- Recognized as the default "invitation platform" recommendation in at least one major market.

---

## Cross-cutting workstreams (every phase)

- **Security & compliance reviews.** Every phase gate includes a threat model review.
- **Documentation.** User-facing and developer-facing. Docs are a first-class deliverable, not an afterthought.
- **Accessibility.** WCAG 2.2 AA target across web and mobile. Every phase includes an accessibility audit.
- **Performance.** Core Web Vitals green across all pages; API p95 < 150ms.
- **Cost.** Review Cloudflare + Neon + Stripe bills monthly. Set up billing alerts at 50%, 80%, 100% of budget caps.

---

## Risk register

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Native mobile dev overwhelms solo capacity | High | Medium | Hire contract iOS/Android help for Phase 1 if timeline slips materially |
| Cloudflare Workers has unforeseen limits at scale | Medium | Low | Workers limits are well-documented; fall-back path is porting to Node runtime (Fly.io / Railway) if ever needed |
| Neon provider change / acquisition | Medium | Low | Postgres is portable; Drizzle migration files work against any Postgres |
| OAuth / MCP complexity delays Phase 2 | Medium | Medium | Start spec work in Phase 1 closing weeks; don't gate on other work |
| v1 users churn during cutover | Low | Low | v1 stays live until v2 exit criteria met; no forced migration |
| AI agent abuse (spam events via LLM) | Medium | Medium | Strong rate limits from day 1 of Phase 2; review per-user abuse daily in first month |
| Payment disputes / chargebacks at global scale | Medium | Medium | Stripe's built-in fraud signals; clear refund policy published |

---

## How to know if we're on track

At any point, ask:

1. Does the latest exit criterion for the current phase have a green checkbox?
2. Is CI green on main?
3. Are Sentry error rates stable or falling?
4. Is there a next concrete task, assigned, in the current sprint?
5. When you open a stack's CLAUDE.md, does it still describe reality?

If all five are yes, you're on track. If any is no, that's the next thing to fix.
