# vite.in v2 — Planning Package

**Author:** Kim (with Claude) · **Date:** April 2026 · **Status:** Planning

This folder contains the complete planning package for rebuilding vite.in as a global invitation platform with Web, native iOS, native Android, and LLM-agent clients.

## Read in this order

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** — The _what_ and _why_. Stack choices, data model, auth model, i18n strategy, security, and the high-level system diagram. Start here.

2. **[ROADMAP.md](./ROADMAP.md)** — The _when_. Three phases (Foundation → Public Launch → Agent & Scale), each with milestones and exit criteria.

3. **[PROJECT_PLAN.md](./PROJECT_PLAN.md)** — The _how_ for Phase 1. Concrete workstreams, ordered tasks, dependencies, and decision gates.

4. **[claude-md/](./claude-md/)** — Five `CLAUDE.md` templates to drop into each repo/stack so Claude Code has the right context from day one:
   - `root.CLAUDE.md` — monorepo root (API, Web, MCP)
   - `api.CLAUDE.md` — Cloudflare Workers API
   - `web.CLAUDE.md` — SvelteKit app
   - `mcp.CLAUDE.md` — MCP server for LLM agents
   - `ios.CLAUDE.md` — Swift/SwiftUI app (separate repo)
   - `android.CLAUDE.md` — Kotlin/Compose app (separate repo)

## The locked-in decisions

These came out of the planning conversation and are the foundation everything else rests on:

### Technical

| Decision           | Choice                                                | Reason                                            |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------- |
| **v1 → v2**        | Rebuild, v1 stays live during transition              | Clean slate, no migration drag, continued revenue |
| **Mobile**         | Native Swift (iOS) + Kotlin (Android)                 | Highest quality; accepted 3× effort               |
| **Backend**        | Cloudflare Workers + Hono + Neon Postgres             | Global edge, serverless, scale-to-zero            |
| **Global scope**   | Architecturally from day 1, rolled out in phases      | No surprises later, no tech debt                  |
| **Core principle** | No-account-required for event creation                | Viral mechanic; accounts are an upgrade path      |
| **Agent strategy** | Scenario 1 first (OAuth, user-delegated), 2 & 3 later | Simplest, highest-value use case first            |

### Business & strategy

| Decision         | Choice                                                                    | Reason                                                                      |
| ---------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Target**       | B2C first (pay-per-event), B2B in Phase 2                                 | Revenue today, enterprise surface later                                     |
| **Timeline**     | No hard deadline; ship when good                                          | Quality over speed                                                          |
| **Domain**       | Stay mono-domain on `vite.in`                                             | Name plays on _InVite_, keep the brand equity                               |
| **Pricing**      | `5` in local currency (EUR / USD / CHF / GBP at launch), not FX-converted | Simple anchor, follows Apple/Netflix price-localization pattern             |
| **Legal entity** | Solo now; migrating to Estonia OÜ once registration completes             | EU VAT-OSS, 0% corporate tax on retained earnings, e-Residency-native       |
| **Licensing**    | Open-core: AGPLv3 for core, proprietary premium layer                     | Community contributions + template ecosystem; competitive moat stays closed |

## What's intentionally deferred

- **B2B features** (teams, shared workspaces, SSO) — Phase 2+
- **Regional payment providers** (UPI, iDEAL, etc.) — Phase 2+, architecture prepared
- **Third-party OAuth app ecosystem** — Phase 3
- **Advanced analytics dashboard** — Phase 2
- **AI-generated designs/copy** — not in scope for v1, but the platform supports it as a future client

## Open questions (real ones, still to resolve during Phase 0)

- **License details.** AGPLv3 confirmed as direction. Need to decide: CLA (Contributor License Agreement) requirement for external contributors? Yes — so we can dual-license premium. Template to pick in Phase 0.
- **Premium code repository split.** Separate private repo (`vitein-premium`) or gitignored subdirectory? See ARCHITECTURE.md §13. Recommended: separate private repo with a published interface.
- **Stripe account structure.** One Stripe account for solo + Estonia OÜ transition later (Stripe has a "change legal entity" flow) OR two accounts? Speak to Stripe support in Phase 0 to pick the cleanest path.
- **Estonia OÜ timing.** When is the registration complete? The entity transition impacts Stripe, VAT registrations, and contract signing with providers (Neon, Cloudflare enterprise if ever).

Everything else is settled. If something was unclear or feels wrong as you read the docs, raise it and we'll adjust.
