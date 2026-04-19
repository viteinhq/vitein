# apps/web — vite.in v2 Web Client

> Stack-specific CLAUDE.md for the SvelteKit web app. The monorepo-root CLAUDE.md also applies.

## What this is

The user-facing web app at `vite.in` (prod) and `next.vite.in` (staging). Built with SvelteKit, deployed to Cloudflare Pages. Talks to the Core API through the generated SDK (`@vitein/ts-sdk`).

## Stack

- **Framework:** SvelteKit (Svelte 5, runes mode)
- **Adapter:** `@sveltejs/adapter-cloudflare`
- **Styling:** Tailwind CSS with logical properties (`ms-4`, not `ml-4`) for RTL readiness
- **i18n:** Paraglide (`@inlang/paraglide-sveltekit`) — already set up in v1, carried over
- **Observability:** `@sentry/sveltekit`, PostHog browser SDK
- **Analytics:** PostHog events on all key user actions

## File layout (inside `apps/web`)

```
src/
  lib/
    api.ts              wraps @vitein/ts-sdk with auth context
    stores/             Svelte stores (session, locale)
    i18n/               Paraglide integration
    design/             design tokens, shared components
  routes/
    +layout.svelte      i18n wrapper, Sentry init
    +layout.server.ts   detect locale, pass to client
    +page.svelte        landing
    create/             create event flow
    e/[slug]/           public event view + RSVP
    manage/[token]/     magic-link-authenticated management
    account/            requires user session
      +layout.ts        auth guard
      dashboard/
      settings/
    api/                server-only endpoints that proxy to the Core API when we need secrets
messages/               Paraglide source files (.json per locale)
static/
```

## Conventions

- **Svelte 5 runes.** Use `$state`, `$derived`, `$effect`. No `$: reactive` legacy syntax in new code.
- **No inline API calls in components.** Always go through `$lib/api.ts`.
- **Form actions for mutations** where possible (progressive enhancement, works without JS). Fall back to fetch for non-form interactions.
- **No text in components — only keys.** Every user-visible string goes through Paraglide (`m.createEventButton()`).
- **Tailwind with logical properties.** `ps-4 pe-2`, not `pl-4 pr-2`. Testing in RTL mode is a Phase 2 gate; the CSS is already ready.
- **Image sizes specified** on every `<img>` or `<enhanced:img>` to avoid CLS.
- **No third-party scripts in the critical path.** PostHog and Sentry are deferred/async.

## Routes that matter

| Route                | Purpose                                                 | Auth                   |
| -------------------- | ------------------------------------------------------- | ---------------------- |
| `/`                  | Landing page (per-locale via URL: `/de/`, `/en/`, etc.) | none                   |
| `/create`            | Create event form                                       | none (anonymous OK)    |
| `/e/[slug]`          | Public event view + RSVP                                | none                   |
| `/manage/[token]`    | Creator dashboard for a single event                    | creator token from URL |
| `/account/dashboard` | Multi-event dashboard                                   | user session           |
| `/account/settings`  | Profile, notifications, delete account                  | user session           |
| `/signin`, `/signup` | Auth flows (magic link + social)                        | none → session         |
| `/legal/*`           | Impressum, privacy, terms                               | none                   |

## Auth in the web app

- **Anonymous creators** get a creator token via email. The token is used in the URL path (`/manage/[token]`) — server-side rendered page, token not exposed to JS unless needed.
- **User sessions** use Better-Auth's cookie-based session (httpOnly, SameSite=Lax, Secure). Pulled into `locals.session` in hooks.
- **OAuth for agents (Phase 2)** — the web app will host the consent screens (`/oauth/authorize`) but those are in `apps/web` for UX continuity (easier i18n, design).

## Commands

```bash
pnpm -F @vitein/web dev            # local dev at http://localhost:5173
pnpm -F @vitein/web build
pnpm -F @vitein/web preview
pnpm -F @vitein/web test            # Playwright e2e
pnpm -F @vitein/web test:unit       # Vitest unit tests
```

## i18n guidance

- Message keys in `messages/{locale}.json` stay stable; text values change.
- When adding a new string:
  1. Add to `messages/en.json` first.
  2. Run `pnpm -F @vitein/web paraglide:compile`.
  3. Use as `m.your_key()` in Svelte.
  4. Add to other locales during the translation sweep (weekly, not per-PR).
- Never concatenate strings. Use ICU MessageFormat placeholders: `m.greeting_hello({ name })`.
- Date/time/number formatting via `Intl` APIs, not string manipulation.

## Design system

- Tokens in `src/lib/design/tokens.ts` mirror what iOS/Android use. Changes need cross-platform coordination.
- Components in `src/lib/design/components/`. Storybook (or equivalent) for isolated dev.
- Colors specified with OKLCH for better perceptual consistency across themes (light/dark — dark mode is Phase 2+).

## Things to avoid

- Don't fetch user data in `+page.svelte` — do it in `+page.server.ts` or `+page.ts` (SSR benefits).
- Don't use `window` / `document` without a `browser` check or in an `onMount`.
- Don't hard-code URLs to the API. Use `PUBLIC_API_BASE_URL` from env.
- Don't import from `packages/ts-sdk` raw — go through `$lib/api.ts` which wraps it with auth context.
- Don't skip the CSP. A tight Content-Security-Policy is configured in `hooks.server.ts`; new external script sources must be added explicitly.
- Don't add heavy client-side libraries for small tasks. SvelteKit is small for a reason.

## Performance budgets

- Homepage LCP < 2.0s on mid-tier mobile (4G throttled)
- Main JS bundle < 100 KB gzipped for the homepage
- Event view page works with JS disabled (RSVP form posts via form action)

## Where to look for context

- Design decisions: @planning/ARCHITECTURE.md §3 (stack), §8 (i18n)
- API shape: @packages/openapi-spec/vitein.yaml
- Available SDK methods: @packages/ts-sdk/index.ts (generated, read-only)
