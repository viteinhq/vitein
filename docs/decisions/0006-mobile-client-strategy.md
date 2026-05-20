# 0006 — Mobile client strategy

- **Status:** Accepted
- **Date:** 2026-05-20
- **Deciders:** Kim

## Context

ARCHITECTURE §3 commits flatly to native mobile clients — Swift/SwiftUI for iOS, Kotlin/Compose for Android — and ROADMAP §1.3/§1.4 lists both as Phase 1 workstreams, with "iOS and Android apps approved in respective stores" as a Phase 1 **exit criterion**.

That framing was set in the April draft. Two facts make a flat "build both, now" approach the riskiest path:

- **Solo capacity.** vite.in is a one-person project. The risk register itself flags "Native mobile dev overwhelms solo capacity" as a High-impact risk. Two hand-written native codebases mean two languages, two toolchains (Xcode + Gradle), two CI setups, two store-review processes — in parallel.
- **Skill asymmetry.** Kim has prior iOS development experience but no Kotlin/Android experience. Treating the two platforms as one undifferentiated workstream ignores that the Android ramp is materially longer.

Meanwhile the web app is already a fast, mobile-first, reskinned, 20-language product in production. The genuinely mobile-shaped value it lacks is home-screen presence and push notifications — both reachable as an installable PWA without a native codebase.

## Decision

Mobile ships in **three sequential stages, not one parallel workstream**:

1. **PWA** — make the existing SvelteKit web app installable (manifest, service worker, install UX) and add Web Push (VAPID). One codebase, already live, ships in weeks. Also instruments install/push adoption via PostHog — real data on whether native is worth the months.
2. **Native iOS** — Swift/SwiftUI, built by Kim himself (he has the experience). Repo `vite-in-ios`.
3. **Native Android** — Kotlin/Compose, repo `vite-in-android`. Last, so the finished iOS app serves as a reference port; the "learn Kotlin vs. contract it out" question is deferred to that point.

Native is retained for iOS and Android (not replaced by cross-platform) **because** Kim's iOS experience removes the main argument against it. The PWA is the bridge that keeps every mobile user covered while native is built, with no coverage gap.

## Alternatives considered

- **Two native codebases in parallel (ARCHITECTURE §3 as written).** Best end-state UX, but the highest-risk path for a solo founder — exactly the risk the register flags. Rejected as a _starting_ posture; retained as the _end_ state, staged.
- **Cross-platform single codebase (Flutter / React Native / Kotlin Multiplatform).** Roughly halves native effort. Rejected because it still introduces a new language/runtime, still needs Xcode for iOS signing, and — given Kim already does iOS natively — it would trade his existing strength for a new dependency. Would also require its own ADR (new runtime).
- **PWA only, indefinitely.** Cheapest, but no App Store / Play Store presence and iOS PWA platform gaps cap the ceiling. Rejected as an end state; adopted as Stage 1.

## Consequences

- **Amends ARCHITECTURE §3** — mobile is staged, not a flat native commitment. §3 should be updated to point here.
- **Amends the Phase 1 exit criterion.** "iOS and Android apps approved in respective stores" no longer gates Phase 1. Proposed replacement: Phase 1 = "mobile experience shipped (installable PWA with push)"; native iOS and Android move to a later slot (Phase 1.6 / Phase 2), gated on PWA adoption data. ROADMAP edit to follow.
- **Stage 1 is not a pure `apps/web` change.** Web Push needs a backend: a new spec endpoint to register push subscriptions, a `push_subscriptions` table, and the first real consumer of the `QUEUE_PUSH` binding. The push backend is greenfield.
- **Design the notification layer once.** The `push_subscriptions` table carries a `transport` discriminator (`webpush` | `apns` | `fcm`) so Stages 2 and 3 add transport adapters rather than reworking the schema. Subscriptions bind to `user_id` _or_ `event_id`, preserving no-account-first (anonymous creators can still get RSVP push).
- **Resolves the Swift half of ADR 0004 / ARCHITECTURE §15.5** in direction: the iOS SDK will be generated with `swift-openapi-generator` (Apple-official, SPM build plugin, async/await + URLSession — matches §3). Kotlin SDK choice stays deferred to Stage 3. To be confirmed in its own note when Stage 2 begins.
- The mobile repos `vite-in-ios` and `vite-in-android` already exist (private, empty).

## References

- ARCHITECTURE.md §3 (stack), §11 (non-goals — offline-first explicitly excluded)
- ROADMAP.md §1.3, §1.4, Phase 1 exit criteria, risk register
- ADR 0004 — SDK generator tooling (Swift/Kotlin deferral)
- ADR 0001 — Stack choice
