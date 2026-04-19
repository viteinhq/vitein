# Architecture Decision Records

Each ADR is a short, dated, immutable record of an architectural decision. Format: lightweight [MADR](https://adr.github.io/madr/).

| #    | Title                 | Status   | Date       |
| ---- | --------------------- | -------- | ---------- |
| 0001 | Stack choice          | Accepted | 2026-04-19 |
| 0002 | CLA tooling           | Accepted | 2026-04-19 |
| 0003 | Email provider        | Accepted | 2026-04-19 |
| 0004 | SDK generator tooling | Accepted | 2026-04-19 |

## How to write a new ADR

1. Copy `0000-template.md` to `NNNN-short-slug.md` (next free number, kebab-case slug).
2. Fill it in. Keep it to one page.
3. Commit on a feature branch and open a PR. Once merged, the ADR is **immutable** — supersede it with a new ADR rather than editing.
4. Update the table above and the `Status` field in the new ADR.

Statuses: `Proposed` → `Accepted` / `Rejected` / `Superseded by NNNN`.
