# 0005 — Better-Auth schema strategy: align our users table

- **Status:** Accepted
- **Date:** 2026-04-19
- **Deciders:** Kim

## Context

PROJECT_PLAN §0.9 calls for Better-Auth as the user-auth foundation. Better-Auth expects a specific user-table shape (`id`, `email`, `emailVerified: boolean`, `name`, `image`, `createdAt`, `updatedAt`) plus three of its own tables: `session`, `account`, `verification`.

Our existing `users` table in `planning/ARCHITECTURE.md §6.1` has different field names (`displayName` vs `name`, `emailVerifiedAt` vs `emailVerified`) and extras (`passwordHash`, `locale`, `timezone`, `deletedAt`). We need to decide how to marry them.

Three strategies were on the table:

- **(a) Align our `users` with Better-Auth.** Rename a few fields, drop `passwordHash` (Better-Auth puts passwords in `account`), keep domain extras (`locale`, `timezone`, `deletedAt`) as Better-Auth "additional fields".
- **(b) Separate `auth_user` table.** Our `users` stays untouched; Better-Auth gets its own user concept; we sync by email.
- **(c) Postgres schema namespace.** Better-Auth tables in `auth.*`, domain tables in `public.*`.

## Decision

Pick **(a) — align `users` with Better-Auth.** Specifically:

- `users.displayName` → `users.name`.
- `users.emailVerifiedAt` → `users.emailVerified: boolean`. We lose the "when verified" timestamp but can reconstruct it from `audit_log` if ever needed.
- Drop `users.passwordHash`. We are magic-link-first in Phase 1; if password auth arrives later, Better-Auth's `account` table owns it.
- Add `users.image: text | null` for Better-Auth compatibility.
- Keep `users.locale`, `users.timezone`, `users.deletedAt` as Better-Auth `additionalFields`.
- Add three new tables exactly as Better-Auth expects: `session`, `account`, `verification`.

Because no production database has run the first migration yet (Task 0.1 Neon is still pending), we regenerate the initial migration rather than stacking a rename migration on top.

`planning/ARCHITECTURE.md §6.1` is now out of sync with the live schema; this ADR supersedes that section for the `users` table. ARCHITECTURE.md will be updated when it moves into `docs/` in Task 0.12.

## Alternatives considered

- **(b) Separate `auth_user`.** Zero schema churn but produces two user concepts and an email-sync dance that has to be right in every claim/delete flow. More code to own forever, in return for avoiding a schema edit that is nearly free right now.
- **(c) `auth.*` namespace.** Clean conceptual separation but requires Drizzle multi-schema plumbing and cross-schema foreign keys, neither of which carries its weight for a solo project at this stage.

## Consequences

- **Good:** One `users` row = one person. Auto-claim (ARCHITECTURE.md §5.2) is a single update on `events.creator_user_id`. Better-Auth's generated TypeScript `Session.user` and our domain `User` type stay compatible.
- **Bad:** We give up the per-moment `emailVerifiedAt` timestamp for the boolean. Acceptable — `audit_log` covers the audit trail.
- **Bad:** `planning/ARCHITECTURE.md` drifts until Task 0.12 moves it into `docs/` and a later edit brings it in line. Mitigated by this ADR being the load-bearing record.
- **Follow-ups:** Wire up Better-Auth's magic-link plugin to the existing `infra/email.ts` Resend wrapper; extend `middleware/auth.ts` to resolve a `user` kind in addition to `creator`; cookie config needs `trustedOrigins` and a domain attribute for cross-subdomain sessions.

## References

- `packages/db-schema/src/schema.ts`
- `apps/api/src/infra/auth.ts` (to be added)
- https://better-auth.com
- PROJECT_PLAN §0.9
- planning/ARCHITECTURE.md §5.2, §6.1
