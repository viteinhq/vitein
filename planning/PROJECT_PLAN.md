# vite.in v2 — Project Plan (Phase 0 & 1)

This is the concrete, sequenced, ready-to-execute plan for Phase 0 (Foundation) and Phase 1 (Public Launch). Phase 2 and Phase 3 get their own project plans once Phase 1 is closing.

**How to use this doc:** Each workstream is a checklist of tasks with explicit dependencies and artifacts. Claude Code (or you) can pick the top unfinished task and start.

---

## Phase 0 — Foundation

Target: 3–5 weeks, depending on deep-focus hours available.

### Week 1 — Accounts, scaffolding, core decisions

**0.1 Account setup (half-day)**

- [ ] Cloudflare account (or upgrade existing to Workers Paid plan if anticipating > free tier)
- [ ] Neon account, create project `vite-in-v2` with 3 branches: `main` (prod), `staging`, `dev`
- [ ] Sentry account (free tier), create projects: `api`, `web`, `mcp`, `ios`, `android`
- [ ] PostHog Cloud EU account
- [ ] Stripe account: stay on current (individual), plan entity migration to Estonia OÜ once registered — use Stripe "change legal entity" flow, not a new account
- [ ] Resend: keep v1's (already verified on `vite.in`)
- [ ] Apple Developer account (if not already; required for iOS push + Sign in with Apple)
- [ ] Google Firebase console for FCM
- [ ] Domain DNS: leave `vite.in` pointing to v1; configure `next.vite.in` and `api-staging.vite.in` for v2 dev

**0.2 Repository + licensing setup (half-day)**

- [ ] Create `github.com/vitein/vitein` (public)
- [ ] Create `github.com/vitein/vitein-premium` (private)
- [ ] Create `github.com/vitein/vite-in-ios` and `-android` (can stay private until launch-adjacent)
- [ ] Add `LICENSE` (AGPLv3) to public repos
- [ ] Add `LICENSE` to `apps/mcp/` subdirectory with MIT license for broader ecosystem adoption
- [ ] Set up EasyCLA (or CLA Assistant) for the public repo
- [ ] Write initial `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`
- [ ] Add issue + PR templates in `.github/`
- [ ] Enable GitHub Discussions on public repo (don't announce publicly yet)

**0.3 Monorepo bootstrap (1 day)**

- [ ] `pnpm init` at root, configure workspaces
- [ ] Install Turborepo, configure `turbo.json`
- [ ] Shared configs package: `packages/config` with eslint, prettier, tsconfig-base
- [ ] Commit root `CLAUDE.md` (from the `claude-md/` templates in this plan)
- [ ] Set up GitHub Actions: lint + typecheck + build on PRs
- [ ] Branch protection rules on `main`
- [ ] Dependabot / Renovate for dependency updates

**0.4 Core decisions (resolve during week 1)**

- [ ] **Decision: SDK generator tooling.** Recommended: `openapi-typescript-codegen` for TS SDK; `openapi-generator-cli` for Swift and Kotlin. Test both on a toy spec before committing.
- [ ] **Decision: Email provider strategy.** Recommended: Resend alone for Phase 1 (it works, it's cheap, deliverability is good for transactional). Revisit if deliverability issues arise in specific markets.
- [ ] **Decision: CLA tool.** Recommended: EasyCLA (industry-standard, integrates with GitHub PR flow).
- [ ] **Decision: Premium integration mechanism.** Recommended: sidecar HTTP service (cleaner isolation, allows the public repo to run standalone); decide after a week-2 spike prototype.

### Week 2 — API skeleton

**0.5 Core API app bootstrap (1–2 days)**

- [ ] Create `apps/api` with Wrangler + Hono scaffold
- [ ] Configure `wrangler.toml` with dev, staging, prod environments
- [ ] Set up secrets via `wrangler secret put` (DATABASE_URL, STRIPE keys, RESEND_API_KEY, etc.)
- [ ] Implement `GET /v1/health` returning `{ status: 'ok', ts: <iso> }`
- [ ] Add Sentry error capture via `@sentry/cloudflare`
- [ ] Deploy to `api-staging.vite.in` via `wrangler deploy`

**0.6 Database scaffolding (1–2 days)**

- [ ] Create `packages/db-schema` with Drizzle
- [ ] Configure `drizzle.config.ts` for three environments
- [ ] Write schema for **`users`, `events`, `event_tokens`, `guests`, `rsvps`** (the MVP entities)
- [ ] Generate and run first migration on `dev` branch
- [ ] Wire `@neondatabase/serverless` HTTP driver into the API
- [ ] Update `/v1/health` to return `{ status: 'ok', db: 'connected' }`

**0.7 OpenAPI spec + SDK generation (1 day)**

- [ ] Create `packages/openapi-spec` with `vitein.yaml`
- [ ] Define `/v1/health` and its schema in the spec
- [ ] Set up `packages/ts-sdk` that gets regenerated from the spec (build script)
- [ ] CI check: spec change must accompany generated SDK update (diff check)
- [ ] Documentation: Redoc or Scalar docs deployed to `docs.vite.in`

### Week 3 — Web skeleton + auth foundation

**0.8 SvelteKit app bootstrap (1 day)**

- [ ] Create `apps/web` as SvelteKit project, targeting Cloudflare Pages adapter
- [ ] Install Paraglide, Sentry, PostHog
- [ ] Import and use `@vitein/ts-sdk` against the staging API
- [ ] Deploy `next.vite.in` as the web staging URL
- [ ] Create a placeholder homepage that says "vite.in v2 — coming soon" and hits `/v1/health` to prove end-to-end

**0.9 Auth foundation (2–3 days)**

- [ ] Install Better-Auth in `apps/api`
- [ ] Configure auth routes: `/v1/auth/sign-up`, `/v1/auth/sign-in`, `/v1/auth/magic-link`, etc.
- [ ] Implement Event Creator Token model (separate from user auth — pure JWT or argon2'd opaque token, stored in `event_tokens`)
- [ ] Middleware: extract auth context (creator token XOR user session XOR OAuth — later)
- [ ] Unit tests for auth middleware (happy path + all failure modes)

### Week 4 — Observability, CI/CD polish, close-out

**0.10 Observability polish (1 day)**

- [ ] Structured logging (JSON) in Workers
- [ ] Cloudflare Logpush → R2 bucket (`vitein-logs`)
- [ ] PostHog event wrapper utility (so all clients emit events consistently)
- [ ] Tracing: `traceparent` propagation from web → API

**0.11 CI/CD full pipeline (1–2 days)**

- [ ] GitHub Actions matrix: lint, typecheck, unit test, build for each app
- [ ] Preview deployments for web PRs (Cloudflare Pages does this automatically)
- [ ] Staging API auto-deploys from `main`; prod from tagged releases
- [ ] Secrets management documented in `docs/ops/secrets.md`

**0.12 Documentation & handoff (1 day)**

- [ ] `ARCHITECTURE.md`, `ROADMAP.md`, `PROJECT_PLAN.md` copied into `docs/` of the new repo
- [ ] Each `apps/*/CLAUDE.md` reviewed and adjusted to reality
- [ ] `README.md` at root: one-page "what is this, how to run it"
- [ ] First ADR (Architecture Decision Record) in `docs/decisions/0001-stack-choice.md`

### Phase 0 exit criteria checklist

- [ ] `curl https://api-staging.vite.in/v1/health` returns 200 with db connected
- [ ] `next.vite.in` loads, hits the API, renders success
- [ ] `pnpm dev` starts web + API locally, talks to a local Neon dev branch
- [ ] CI green on `main`
- [ ] Sentry receives a test error from each app
- [ ] All CLAUDE.md files populated
- [ ] One working deployment pipeline per app

---

## Phase 1 — Public Launch

Target: 8–12 weeks after Phase 0 exit. Work proceeds in parallel streams.

### Stream A — Core API features (foundation for everything else)

**A.1 Event lifecycle (1 week)**

- [ ] `POST /v1/events` — create event (anonymous, returns event + creator token via email)
- [ ] `GET /v1/events/:id` — get event (public fields if link_only visibility)
- [ ] `GET /v1/events/:id/manage` — get event (all fields, requires creator token)
- [ ] `PATCH /v1/events/:id` — update event (creator token required)
- [ ] `DELETE /v1/events/:id` — soft delete (creator token required)
- [ ] Magic-link email template (i18n-aware)
- [ ] Integration tests for each endpoint (happy path + authz failures)

**A.2 Guests & RSVPs (1 week)**

- [ ] `POST /v1/events/:id/rsvps` — public RSVP submission
- [ ] `GET /v1/events/:id/rsvps` — list (creator token required)
- [ ] `POST /v1/events/:id/guests` — add to invite list (creator token)
- [ ] `GET /v1/events/:id/guests` — list invited (creator token)
- [ ] RSVP confirmation email (to the RSVP submitter if email provided)
- [ ] RSVP notification email (to the creator)

**A.3 Stripe premium (1 week)**

- [ ] Create Stripe `Product` "vite.in Premium Event"
- [ ] Create `Price` objects per launch currency (EUR 5.00, USD 5.00, CHF 5.00, GBP 5.00), all linked to the product
- [ ] Enable Stripe Tax for all relevant jurisdictions
- [ ] Locale-based currency selection logic (auto-detect from user's locale; show currency picker as override)
- [ ] `POST /v1/events/:id/checkout` — create Stripe checkout session with the correct price ID
- [ ] `POST /v1/webhooks/stripe` — handle `checkout.session.completed` with signature verification and idempotency
- [ ] On successful payment, set `is_paid=true` and unlock requested `paid_features`
- [ ] Custom slug validation + uniqueness check
- [ ] Integration test with Stripe test mode for each launch currency

**A.4 Media upload (3–4 days)**

- [ ] `POST /v1/events/:id/media/presign` — generate R2 presigned upload URL
- [ ] Server-side validation: MIME sniff, size, dimensions
- [ ] Cloudflare Images integration for resize + optimize
- [ ] `DELETE /v1/events/:id/media/:mediaId`

**A.5 Reminders (1 week)**

- [ ] Scheduled Worker cron: every hour, check events with upcoming reminder timestamps
- [ ] Reminder email template
- [ ] Track sent reminders in `audit_log` to avoid double-sends
- [ ] `POST /v1/events/:id/reminders/send` for manual trigger (creator token)

**A.6 User accounts (1 week)**

- [ ] Better-Auth routes wired and tested
- [ ] `POST /v1/auth/claim` — claim anonymous events for the authenticated user based on email
- [ ] `GET /v1/users/me` — profile
- [ ] `GET /v1/users/me/events` — dashboard listing
- [ ] `DELETE /v1/users/me` — account deletion with 30-day grace
- [ ] `GET /v1/users/me/export` — GDPR data export

**A.7 Polish (1 week)**

- [ ] All error responses localized per `Accept-Language`
- [ ] Rate limiting via Durable Objects enforced
- [ ] OpenAPI spec 100% matches implementation (drift check in CI)
- [ ] Load test: 100 RPS sustained, p95 < 150ms on reads, < 400ms on writes
- [ ] Penetration test checklist run manually

### Stream B — Web client

**B.1 Design system (ongoing, parallel)**

- [ ] Pick fonts + color palette (carry from v1 as baseline)
- [ ] Set up Tailwind or UnoCSS config with logical properties
- [ ] Component library: Button, Input, Select, Card, Modal, Banner
- [ ] Storybook for isolated component dev

**B.2 Landing + marketing pages (1 week)**

- [ ] Homepage (hero, features, social proof, CTA)
- [ ] Per-language homepages (SEO)
- [ ] About, pricing, legal (Impressum, AGB, DSGVO)
- [ ] Blog scaffold (for SEO content later)

**B.3 Create-event flow (1 week)**

- [ ] Form with live preview
- [ ] Timezone auto-detection (Intl.DateTimeFormat().resolvedOptions().timeZone) with user override
- [ ] Optional fields (location, description, cover image)
- [ ] Submit → show success page with magic link note ("check your email")

**B.4 Event view page (1 week)**

- [ ] Render event based on slug
- [ ] RSVP form (yes/maybe/no, name, email optional, message optional, plus-ones)
- [ ] Add-to-calendar (ICS download, also Google Calendar link)
- [ ] WhatsApp / copy-link sharing
- [ ] Password prompt if event is protected

**B.5 Event management page (1 week)**

- [ ] Accessed via magic-link token
- [ ] Show RSVP list, counts, export CSV
- [ ] Edit event details
- [ ] Trigger reminder send
- [ ] Upgrade to premium flow (Stripe checkout redirect)

**B.6 Account dashboard (1 week, parallel to A.6)**

- [ ] Sign in / sign up with magic link
- [ ] Dashboard: list of events, sort by upcoming / past
- [ ] Settings: locale, timezone, notifications
- [ ] Danger zone: export data, delete account

### Stream C — iOS app

**C.1 Bootstrap (2–3 days)**

- [ ] New Xcode project, `VitenIn`, SwiftUI, iOS 16 minimum
- [ ] `SwiftPackageManager` dependencies: generated SDK, Sentry, PostHog
- [ ] `.gitignore`, `fastlane` config, App Store Connect app record
- [ ] Configure Sign in with Apple capability
- [ ] Push notifications capability, APNs auth key in Apple Developer portal

**C.2 Core infrastructure (1 week)**

- [ ] Generated Swift SDK integration
- [ ] `AuthStore` (Keychain-backed)
- [ ] `APIClient` wrapper with retry, error mapping
- [ ] Navigation: SwiftUI NavigationStack
- [ ] Design system: Color / Typography / Spacing tokens matching web

**C.3 Features (2–3 weeks)**

- [ ] Event view (can open from URL share / universal link)
- [ ] RSVP flow
- [ ] Sign in (Apple + magic link fallback)
- [ ] Create event flow (requires account on mobile)
- [ ] Dashboard
- [ ] Settings + account deletion

**C.4 Push + polish (1 week)**

- [ ] APNs device token registration with backend
- [ ] Push notification handling (foreground + background + tap)
- [ ] Deep linking via universal links (`vite.in/e/:slug`)
- [ ] Share sheet integration (share event invite via system share)
- [ ] App Store listing: screenshots, description, keywords
- [ ] TestFlight beta with internal testers
- [ ] App Store submission

### Stream D — Android app

Mirrors Stream C with Kotlin/Compose equivalents.

**D.1 Bootstrap (2–3 days)**

- [ ] New Android Studio project, Kotlin, Compose, minSdk 29
- [ ] Gradle Kotlin DSL configured
- [ ] Hilt or Koin for DI
- [ ] Firebase Console: FCM server key, google-services.json

**D.2 Core infrastructure (1 week)**

- [ ] Generated Kotlin SDK (via openapi-generator)
- [ ] `AuthStore` (EncryptedSharedPreferences + Keystore)
- [ ] `ApiClient` wrapper (Ktor-based)
- [ ] Navigation: Compose Navigation
- [ ] Design system matching iOS / web

**D.3 Features (2–3 weeks)**

- [ ] Event view + deep link handling (App Links)
- [ ] RSVP flow
- [ ] Sign in (Google + magic link)
- [ ] Create event flow
- [ ] Dashboard
- [ ] Settings + account deletion

**D.4 Push + polish (1 week)**

- [ ] FCM token registration
- [ ] Notification channels configured
- [ ] Share intent integration
- [ ] Play Store listing
- [ ] Internal testing track
- [ ] Play Store submission

### Stream E — Cutover & launch ops

**E.1 Cutover plan (1 week, final weeks)**

- [ ] Feature flag in DNS / web: route X% of new event creations to v2
- [ ] Monitoring dashboard to compare v1 vs v2 metrics
- [ ] v1 read-only mode preparation (existing events keep working; no new events on v1)
- [ ] Data archive: v1 Supabase export to R2 (retention: 1 year)

**E.2 Launch readiness review (2–3 days)**

- [ ] Security audit checklist
- [ ] Accessibility audit (axe-core on web, manual on mobile)
- [ ] Performance budget check
- [ ] Legal pages reviewed by someone qualified
- [ ] On-call runbook for Kim ("what to do if X breaks")
- [ ] Status page live

**E.3 Soft launch (1–2 weeks)**

- [ ] Route 10% of new traffic to v2 for 3 days; monitor error rates
- [ ] Ramp to 50% for 3 days
- [ ] Ramp to 100% for 7 days on v2 exclusively
- [ ] v1 marked read-only
- [ ] Announcement blog post + mailing list

**E.4 Post-launch (ongoing)**

- [ ] Weekly retrospective for first 8 weeks
- [ ] Sentry error triage daily for first 30 days
- [ ] Quick-win backlog built from user feedback

### Phase 1 exit criteria checklist

- [ ] 100% of new event creation traffic on v2 for 14+ consecutive days
- [ ] 99.9% uptime for 30 days
- [ ] iOS and Android apps live in respective stores
- [ ] First 50 paying events on v2
- [ ] No P0/P1 bugs outstanding
- [ ] All exit criteria in Roadmap Phase 1 section checked

---

## Dependencies map

```
Phase 0.4 (API skeleton) ─┬─> Phase 0.5 (DB) ─> Phase 0.6 (OpenAPI) ─> Phase 0.7 (Web skeleton)
                          └─> Phase 0.8 (Auth)

Phase 1 Stream A ─┬─> Stream B (needs SDK, auth)
                  ├─> Stream C (needs SDK, auth)
                  └─> Stream D (needs SDK, auth)

Streams B/C/D can run in parallel once A.1–A.3 is done.

Stream E depends on all others being past 90% complete.
```

---

## Recurring cadences (once Phase 0 starts)

- **Weekly:** review progress against this plan, update checkboxes, move next week's tasks to "in progress"
- **Bi-weekly:** retrospective (what's working, what isn't, adjust)
- **Monthly:** cost review (Cloudflare, Neon, Sentry, PostHog bills)
- **Per-PR:** CI green, CLAUDE.md still accurate, OpenAPI spec still matches code

---

## What to do if you get stuck

1. If the task is blocked by a decision: move it to the "Open architectural questions" section of `ARCHITECTURE.md` and pick a different task.
2. If the task is blocked by external (Apple review, Stripe account issue, etc.): park it, log it in risk register, move on.
3. If the task is just hard: ask Claude Code to break it into 3 smaller tasks and do the first.
4. If you're losing motivation: ship something user-facing (even a small thing) to see the product progress.
