# 0002 — CLA tooling: CLA Assistant Lite (not EasyCLA)

- **Status:** Accepted
- **Date:** 2026-04-19
- **Deciders:** Kim

## Context

PROJECT_PLAN §0.4 originally recommended **EasyCLA** as the industry-standard CLA workflow for the `viteinhq/vitein` public repo. Before wiring it up we re-evaluated against the current reality:

- Solo maintainer pre-launch; no external contributors yet.
- EasyCLA requires an LFX account, Linux Foundation onboarding, and project-level configuration that is heavier than our current needs.
- We need a working CLA gate on PRs _today_ so that when contributions arrive we do not block them, but we do not want to commit to LF tooling before we have a reason to.

## Decision

Use **`contributor-assistant/github-action` (CLA Assistant Lite) v2** as the interim CLA workflow.

- CLA text lives in `CLA.md` at repo root (AGPLv3 + MIT carveout for `apps/mcp/`).
- Workflow: `.github/workflows/cla.yml`, triggered on `pull_request_target` and on `issue_comment` matching the sign phrase.
- Signatures stored in `signatures/v1/cla.json` on a dedicated `cla-signatures` branch in the same repo.
- Allowlist: `leuk80, dependabot[bot], renovate[bot]` so automation bots do not block themselves.

## Alternatives considered

- **EasyCLA (CNCF/LF standard).** Best choice once the project has real contributors and we want enterprise-grade accountability. Overkill while solo. Can migrate later without rewriting `CLA.md`.
- **DCO (Developer Certificate of Origin) via `signed-off-by`.** Simpler still, but does not actually grant licence rights — only certifies origin. Insufficient for a project that may later dual-licence premium contributions.
- **No CLA, rely on AGPLv3 inbound = outbound.** Works legally but makes future relicensing or commercial carve-outs (e.g. granting MIT on `apps/mcp/` contributions) harder.

## Consequences

- **Good:** Zero external dependency. Self-contained in the repo. Migration path to EasyCLA remains open — the `CLA.md` text is tool-agnostic.
- **Bad:** CLA Assistant Lite is a GitHub Action, which means it can be disabled or tampered with by a repo admin; for compliance-critical projects that matters. For now it does not.
- **Follow-ups:** Revisit in Phase 2 if contributor volume or commercial partnerships make EasyCLA worthwhile. Update this ADR with a supersedes entry if we migrate.

## References

- `CLA.md`
- `.github/workflows/cla.yml`
- https://github.com/contributor-assistant/github-action
- PROJECT_PLAN §0.4
