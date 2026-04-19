# vite-in-android — vite.in Android app

> This is the root CLAUDE.md for the Android app's separate repository (`vite-in-android`). The Core API and shared design decisions are documented in the main monorepo — reference those when relevant.

## What this is

The native Android client for vite.in. Kotlin, Jetpack Compose, minSdk 29 (Android 10). Consumes the Core API through a generated Kotlin SDK. Published in the Play Store as "vite.in".

## Stack

- **Language:** Kotlin, with Coroutines + Flow throughout
- **UI:** Jetpack Compose; Material 3 components where they fit the design system
- **Navigation:** Compose Navigation
- **Networking:** Ktor client + generated Kotlin SDK (from `vitein.yaml` via openapi-generator)
- **DI:** Hilt (or Koin — decide in Phase 0)
- **Storage:**
  - Auth tokens: `EncryptedSharedPreferences` backed by Keystore
  - App data: Room for any cached event data
  - Preferences: DataStore
- **Push:** FCM HTTP v1
- **Observability:** `sentry-android`, PostHog Android SDK

## Minimum target

- `minSdk = 29` (Android 10) — Compose performance, modern security APIs
- `compileSdk` and `targetSdk` at latest stable
- `kotlin = "2.0.x"` or newer, with K2 compiler

## Module structure

Single-module to start, split when justified. Within the `app` module:

```
app/src/main/kotlin/in/vite/app/
  App.kt                        Application class
  MainActivity.kt               single activity, hosts Compose
  core/
    network/                    ApiClient, interceptors
    auth/                       AuthStore, OAuth flows (Google Sign-In, magic link)
    di/                         Hilt modules
    model/                      domain models
    formatting/                 dates, currencies
  feature/
    event/
      EventViewScreen.kt
      EventViewModel.kt
    rsvp/
    create/
    dashboard/
    settings/
    signin/
  designsystem/
    Tokens.kt                   match iOS + web
    components/
  ui/
    theme/                      Compose theme derived from tokens
res/                            strings localized per language
build.gradle.kts
```

## Conventions

- **Compose UI only.** No View / XML layouts in new code.
- **ViewModels with `StateFlow`.** UI observes via `collectAsStateWithLifecycle()`.
- **Unidirectional data flow.** Events in, state out. Side effects through a separate `Channel<UiEffect>`.
- **Strings in `res/values-<locale>/strings.xml`.** Never hard-coded.
- **Dates via `java.time` (`LocalDateTime`, `ZonedDateTime`).** Never `Date` or `Calendar`.
- **Coroutines scoped correctly:** `viewModelScope` for view-model work; structured concurrency for parallel requests.
- **`@Preview` functions for every public Composable.** Lightweight cost, big win for dev speed.

## Auth model

- Account required (same as iOS). Rationale: FCM, multi-device sync, consistency with iOS.
- **Primary sign-in:** Sign in with Google (Credential Manager API).
- **Secondary:** Magic link via email (handled via App Links returning to MainActivity).

## Networking layer

- Generated Kotlin SDK wraps HTTP calls in `suspend` functions returning `Result<T>`.
- `AuthInterceptor` injects Authorization header; `TraceInterceptor` injects `traceparent`.
- Errors mapped to sealed class `ApiError` — UI branches on it, never on HTTP codes.

## App Links (deep linking)

- `vite.in/e/:slug` and `vite.in/manage/:token` open the app when installed.
- Server-side verification via `assetlinks.json` hosted at `https://vite.in/.well-known/assetlinks.json`.
- Handled in MainActivity's `onNewIntent` → forwarded to nav graph.

## Push notifications

- Token registered with Core API on app launch + whenever FCM rotates.
- `NotificationChannel` per category: `rsvp_received`, `reminders`, `event_upcoming`.
- Tap → existing nav model, not a separate handler.

## Commands

```bash
./gradlew app:installDebug          # debug install to connected device
./gradlew app:assembleRelease       # release APK/AAB
./gradlew test                      # unit tests
./gradlew connectedAndroidTest      # instrumentation
./gradlew lintRelease
```

SDK regeneration:

```bash
# assumes the monorepo is cloned alongside
openapi-generator generate \
  -i ../vite-in/packages/openapi-spec/vitein.yaml \
  -g kotlin \
  -o generated-sdk \
  --additional-properties=library=multiplatform,serializationLibrary=kotlinx_serialization,packageName=in.vite.sdk
```

## Things to avoid

- Don't use LiveData or RxJava in new code. StateFlow + Coroutines.
- Don't use `runBlocking` anywhere that reaches the main thread.
- Don't store auth tokens in plain SharedPreferences. `EncryptedSharedPreferences` always.
- Don't use `lifecycleScope` for long-running work that should survive config changes. Use `viewModelScope`.
- Don't ship without updating strings in all locale resource dirs (CI enforces this).
- Don't add AndroidX libraries without checking size impact.

## Design system coordination

Tokens in `designsystem/Tokens.kt` MUST match iOS's `DesignSystem/Tokens.swift` and web's `src/lib/design/tokens.ts`. Changes to tokens require coordinated updates across all three. See the monorepo's design-system docs.

## Release channels

- **Internal:** continuous deployment of any `main` build via Play Console internal track
- **Alpha / Beta:** curated release via Play Console
- **Production:** tagged release via Play Console production track
- Fastlane (or Gradle Play Publisher plugin) automates uploads from GitHub Actions on tagged commits.

## Where to look for context

- Core API shape: main monorepo's `packages/openapi-spec/vitein.yaml`
- Auth model: main monorepo's `docs/ARCHITECTURE.md` §5
- Business decisions: main monorepo's `docs/ARCHITECTURE.md`
