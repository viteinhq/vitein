# vite-in-ios — vite.in iOS app

> This is the root CLAUDE.md for the iOS app's separate repository (`vite-in-ios`). The Core API and shared design decisions are documented in the main monorepo — reference those when relevant.

## What this is

The native iOS client for vite.in. Swift 5.9+, SwiftUI, iOS 16+ minimum. Consumes the Core API through a generated Swift SDK. Published in the App Store as "vite.in".

## Stack

- **Language:** Swift 5.9+, with `async/await` throughout
- **UI:** SwiftUI; minimal UIKit only where SwiftUI gaps exist (share sheet, some transitions)
- **Navigation:** `NavigationStack` (iOS 16+)
- **Networking:** `URLSession` + generated Swift SDK (from `vitein.yaml` via openapi-generator)
- **Dependencies (SPM):**
  - Generated SDK (git submodule OR published as tagged Swift package — decide in Phase 0)
  - `sentry-cocoa`
  - `PostHog`
- **Auth storage:** Keychain via `KeychainAccess` or the platform APIs directly
- **Push:** APNs via device tokens registered with Core API

## Minimum target and feature baseline

- iOS 16+ because `NavigationStack` and modern SwiftUI forms are essential.
- Localizations: match Core API launch languages (EN, DE, FR, ES, IT, PT, NL, PL for Phase 1).
- Dark mode supported from day 1 — it's free in SwiftUI if tokens are used properly.
- Dynamic Type supported — accessibility is a Phase 1 gate.

## File layout

```
VitenIn/                          (Xcode project)
  App/
    VitenInApp.swift              @main
    AppDelegate.swift             push notification handling
  Core/
    Networking/                   wraps SDK with auth, retry, Sentry
    Auth/                         AuthStore, Keychain wrappers, Sign in with Apple
    Models/                       domain models if different from SDK types
    Formatting/                   dates, relative times, currency
  Features/
    EventView/
    RSVP/
    Create/
    Dashboard/
    Settings/
    SignIn/
  DesignSystem/
    Tokens.swift                  colors, spacing, typography (match web + android)
    Components/                   Button, Card, Input
  Resources/
    Assets.xcassets
    Localizable.xcstrings         (Xcode 15+ string catalog)
VitenInTests/
VitenInUITests/
fastlane/                         deploy + screenshot automation
```

## Conventions

- **SwiftUI first.** UIKit only when SwiftUI can't do it cleanly.
- **Async/await everywhere.** No completion handlers in new code. No Combine unless specifically needed.
- **State via `@Observable` (iOS 17+) where possible, `ObservableObject` otherwise.** Avoid `@StateObject` / `@EnvironmentObject` anti-patterns.
- **Dependencies injected into views via environment or explicit init** — no singletons other than the `AuthStore` and `APIClient`.
- **Views are small.** 100 lines max per `View` struct. Extract subviews aggressively.
- **No business logic in views.** Use view-models (lightweight — often a struct with functions).
- **Strings via string catalog** (`Localizable.xcstrings`). Never hard-coded user-visible text.
- **Dates formatted with `Date.FormatStyle`**, not `DateFormatter` unless needed for compat.

## Auth model

- App requires an account (unlike web, which supports anonymous creation). Rationale: push notifications, multi-device sync, and native OS auth make anonymous flow awkward on mobile.
- **Primary sign-in:** Sign in with Apple (native, required by Apple guidelines if any social auth is offered).
- **Secondary:** Magic link via email (opens email, tap link, back to app via universal link).
- **Biometric lock (Face ID / Touch ID)** is a Phase 2 polish — wraps the AuthStore unlock.

## Networking layer

```swift
final class APIClient {
    private let baseURL: URL
    private let auth: AuthStore

    func listEvents() async throws -> [Event] { ... }
    func createEvent(_ input: CreateEventInput) async throws -> Event { ... }
    // ... calls into generated SDK, injecting Authorization header
}
```

- Every request carries a request ID and sets `traceparent` for tracing.
- Errors are mapped to a localized `APIError` enum — never raw `URLError` bubbled to UI.
- Retry policy: idempotent GETs retry 3× with exponential backoff; writes retry only on network errors, never on 4xx.

## Universal links

- `vite.in/e/:slug` and `vite.in/manage/:token` open the app when installed.
- Server-side `apple-app-site-association` JSON hosted at `vite.in/.well-known/apple-app-site-association`.
- When the app is not installed, the website handles the route normally.

## Push notifications

- Token registered with Core API on app launch + whenever it rotates.
- Categories defined in `AppDelegate`: `RSVP_RECEIVED`, `REMINDER_SENT`, `EVENT_UPCOMING`.
- Tap on notification routes via the existing navigation model (not a separate deep-link handler).
- Silent pushes used for background RSVP list refresh (rate-limited server-side).

## Commands

```bash
# from repo root
xcodebuild -scheme VitenIn -destination 'platform=iOS Simulator,name=iPhone 15'
fastlane ios beta            # TestFlight
fastlane ios release         # App Store
fastlane screenshots         # generate localized screenshots
```

SDK regeneration:
```bash
# assumes the monorepo is cloned alongside; adapt paths
openapi-generator generate \
  -i ../vite-in/packages/openapi-spec/vitein.yaml \
  -g swift6 \
  -o VitenIn/Generated \
  --additional-properties=projectName=VitenInSDK
```

## Things to avoid

- Don't use Combine for new code. Async/await is cleaner.
- Don't hand-roll URLRequest building — go through the generated SDK.
- Don't cache auth tokens in UserDefaults. Keychain only.
- Don't use `.onAppear` for data loading in SwiftUI — use `.task { }` (cancellation-aware).
- Don't ship without updating the string catalog for new strings. Xcode 15's string catalog surfaces missing translations in the build log.
- Don't use `print()` for logs that should ship to Sentry — use the proper logger.

## Design system coordination

Tokens in `DesignSystem/Tokens.swift` MUST match the values in the web app's `src/lib/design/tokens.ts` and Android's `designsystem/Tokens.kt`. When changing a token, update all three. A lightweight check script in the monorepo validates parity.

## Where to look for context

- Core API shape: main monorepo's `packages/openapi-spec/vitein.yaml`
- Auth model: main monorepo's `docs/ARCHITECTURE.md` §5
- Business decisions: main monorepo's `docs/ARCHITECTURE.md`
