# Social sign-in — Apple & Google setup

vite.in's Core API uses Better-Auth. Today it offers **magic-link** sign-in
only. ROADMAP §1.2 and ARCHITECTURE §5.2 also list **Sign in with Apple**
and **Sign in with Google** as social providers.

This is **not yet implemented** — it is blocked on external credentials that
only the account owner can create (Apple Developer Program, Google Cloud).
This runbook is the action list to unblock it. Once the credentials exist,
the code step is small (see _Implementation_ below).

> **Why it matters beyond the web app:** the native iOS app (Phase 1.6 — see
> ADR 0006) **must** offer Sign in with Apple if it offers any other social
> login, per App Store Review Guideline 4.8. So this work is a hard
> prerequisite for native iOS. Bundling it with the iOS stage is sensible.

---

## Prerequisites

- **Google:** a Google Cloud project (free).
- **Apple:** membership in the **Apple Developer Program** (USD 99 / year).
  This membership is needed for the native apps regardless, so it is not a
  cost incurred solely for this feature.

---

## 1. Google

1. Google Cloud Console → **APIs & Services → OAuth consent screen**.
   - User type: **External**. App name `vite.in`, support email, logo.
   - Scopes: `openid`, `email`, `profile`.
   - Publish the consent screen (or keep it in testing with allow-listed
     testers until verification completes).
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Authorized redirect URIs (add all that apply):
     - `https://api.vite.in/v1/auth/callback/google` (production)
     - `https://api-staging.vite.in/v1/auth/callback/google` (staging)
     - `http://localhost:8787/v1/auth/callback/google` (local dev)
3. Copy the **Client ID** and **Client secret**.

The callback path is `{basePath}/callback/{provider}` — `basePath` is
`/v1/auth` (see `apps/api/src/infra/auth.ts`).

## 2. Apple

Apple's "Sign in with Apple" for a **web** flow uses a **Services ID** as
the client id and a **signed JWT** as the client secret.

1. [developer.apple.com](https://developer.apple.com) → Certificates,
   Identifiers & Profiles.
2. **Identifiers → App ID** — create or reuse the app's App ID; enable the
   **Sign in with Apple** capability on it.
3. **Identifiers → Services ID** — create one (e.g. `in.vite.web`). This
   string is the **client id**. Configure it:
   - Primary App ID: the App ID above.
   - Domains: `vite.in` (and `api.vite.in`).
   - Return URLs:
     - `https://api.vite.in/v1/auth/callback/apple`
     - `https://api-staging.vite.in/v1/auth/callback/apple`
4. **Keys** — create a key with **Sign in with Apple** enabled. Download the
   `.p8` private key **once** (it cannot be re-downloaded). Note the **Key ID**.
5. Note your **Team ID** (top-right of the developer portal).

The client secret is a short-lived ES256 JWT signed with the `.p8` key,
carrying the Team ID, Key ID and Services ID. Better-Auth's Apple provider
generates it from the key material — supply the `.p8` contents, Key ID and
Team ID as secrets; do not hand-roll the JWT.

---

## 3. Secrets

Set these per environment (`--env staging`, `--env production`; local dev
goes in `apps/api/.dev.vars`, gitignored):

```bash
# Google
wrangler secret put GOOGLE_CLIENT_ID --env production
wrangler secret put GOOGLE_CLIENT_SECRET --env production

# Apple
wrangler secret put APPLE_CLIENT_ID --env production        # the Services ID
wrangler secret put APPLE_TEAM_ID --env production
wrangler secret put APPLE_KEY_ID --env production
wrangler secret put APPLE_PRIVATE_KEY --env production       # the .p8 file contents
```

When a provider's secrets are absent the provider is simply not registered —
the app falls back to magic-link only, so partial setup is safe.

---

## 4. Implementation (code step — after the secrets exist)

Small and best done as one tested unit once the credentials are real:

1. **`apps/api/src/types/env.ts`** — declare the six secrets above as
   optional `string` env fields.
2. **`apps/api/src/infra/auth.ts`** — add a `socialProviders` option to the
   `betterAuth({...})` call, registering `google` / `apple` **only** when
   their env vars are present (an absent provider must not break auth).
3. **`apps/web` `/signin`** — render "Continue with Google / Apple" buttons
   that call the Better-Auth client's social sign-in. The signin page's
   server load should report which providers are enabled so a button is
   shown only when its provider is live.
4. Verify end-to-end on staging with a real Google and Apple account before
   enabling in production.

Deliberately deferred until step 3 can be tested against a real provider —
shipping untestable OAuth UI invites silent breakage.

---

## Native apps (Phase 1.6)

- **iOS:** uses the native Sign in with Apple framework (not this web flow);
  it reuses the same Apple App ID. Google on iOS uses Google's native SDK
  with an iOS OAuth client ID created in the same Google Cloud project.
- **Android:** native Google sign-in with an Android OAuth client ID.
- The Core API treats all of these as the same `users` / `accounts` records —
  the social identity links by email.
