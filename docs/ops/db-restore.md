# Database — Neon point-in-time restore

This is the procedure for recovering Postgres state when something
destructive happens: an unintended `DELETE` / `TRUNCATE`, a bad
migration, or just discovering corrupted data N hours after the fact.

Neon's branching model is the restore mechanism. Every branch carries
its own write-ahead history; you create a fresh branch from a point
in time, point the affected worker at it, and (when satisfied) cut
over.

We don't need scheduled backups — Neon retains history continuously
within the project's retention window (see [Retention](#retention)).
The restore is always "branch from a timestamp", never "load a dump".

---

## When to use this

| Situation                                                | Restore?                                               |
| -------------------------------------------------------- | ------------------------------------------------------ |
| Single row deleted by accident                           | Yes — fastest recovery is a branch + manual re-insert. |
| Bad migration that ran against staging or prod           | Yes — the migration is part of the WAL.                |
| Application bug wrote junk data over N hours             | Yes if the affected range is well-defined.             |
| Neon outage                                              | No — wait for Neon. Don't try to "restore from cache". |
| Wrong `DATABASE_URL` pointing the API at a different env | No — fix the secret. The data is fine.                 |

If you're under doubt: branch first, decide later. Branching is free
and read-only against the parent — it can't make things worse.

---

## Drill (run this before you need it)

Goal: prove the procedure works on staging without touching prod.

1. **Pick a timestamp** in the recent past (e.g. 10 minutes ago):

   ```bash
   date -u -v-10M +%Y-%m-%dT%H:%M:%SZ
   # → 2026-05-19T13:50:00Z
   ```

2. **Create a recovery branch from staging at that point.** In the
   Neon dashboard: project `vite-in-v2` → Branches → `staging` →
   "Create branch from" → set parent to "Point in time", paste the
   timestamp, name it `staging-drill-<date>`.

   Or via the [Neon CLI][1]:

   ```bash
   neonctl branches create \
     --project-id <project-id> \
     --parent staging \
     --parent-timestamp 2026-05-19T13:50:00Z \
     --name staging-drill-2026-05-19
   ```

3. **Grab its connection string** (Neon → Branches → that branch →
   Connection details → pooled, with password).

4. **Connect via `psql`** (or your tool of choice) and confirm the
   data looks like it should have at that timestamp:

   ```bash
   psql "<recovery-branch-url>" -c 'SELECT count(*) FROM events;'
   psql "<recovery-branch-url>" -c "SELECT id, title, created_at FROM events ORDER BY created_at DESC LIMIT 5;"
   ```

   Compare to current staging. If staging has a row created **after**
   your timestamp, the drill branch should not contain it. If the
   drill branch is identical, you didn't branch back far enough.

5. **Tear down**: Neon → Branches → `staging-drill-…` → Delete branch.
   Or: `neonctl branches delete staging-drill-2026-05-19`.

A successful drill means: the timestamp was respected (the missing
row), and the connection string works. You've practiced the recovery
path — now the real one is muscle memory.

Drills should be re-run twice a year. Add to the launch-readiness
checklist before each phase.

---

## Real incident — partial restore

Use this when **specific rows / a single table** went bad but the
rest of the database is fine.

1. Branch from staging or prod (same procedure as the drill) at the
   timestamp **just before** the bad event. Name it
   `restore-<incident-slug>-<date>`.

2. Diff the affected rows between the recovery branch and the live
   parent. Example for an events table:

   ```sql
   -- on the live branch (current prod):
   SELECT id, title, deleted_at FROM events WHERE id = '<known bad id>';

   -- on the recovery branch:
   SELECT id, title, deleted_at FROM events WHERE id = '<known bad id>';
   ```

3. **Don't switch the worker over.** Instead, run the corrective SQL
   on the live branch using the recovered values:

   ```sql
   -- on live:
   UPDATE events
   SET deleted_at = NULL,
       title = '<value-from-recovery>'
   WHERE id = '<known bad id>';
   ```

4. Audit-log the manual fix:

   ```sql
   INSERT INTO audit_log (id, actor_type, actor_id, event_id, action, metadata)
   VALUES (
     gen_random_uuid(),
     'system',
     'manual-restore',
     '<event id>',
     'event.manual_restore',
     '{"incident": "<slug>", "restored_from_timestamp": "<ISO ts>"}'
   );
   ```

5. Delete the recovery branch when done.

---

## Real incident — full restore (worst case)

Use this when **the whole database is unusable** (bad migration ran,
mass deletion, etc.).

1. Branch from the affected env (staging / prod) at the timestamp
   immediately before the bad event. Name it `restore-<slug>-<date>`.

2. Run a couple of sanity queries against the recovery branch — count
   the major tables, eyeball recent rows. Confirm it's actually
   pre-incident state.

3. **Promote the recovery branch to become the new primary.**
   - Update the `DATABASE_URL` secret on the affected worker:
     ```bash
     pnpm -F @vitein/api exec wrangler secret put DATABASE_URL --env <staging|production>
     # paste the recovery branch's connection string
     ```
   - The Worker picks up the new secret on the next request (Workers
     re-read env on each request — no restart needed).

4. Confirm the API is now talking to the restored database:

   ```bash
   curl https://api.vite.in/v1/health
   # → "db": "connected"
   curl -X POST https://api.vite.in/v1/events -d '...' # smoke
   ```

5. Once stable for ~30 minutes, **rename branches** so the new
   primary is the canonical one:
   - Rename the old `main` branch → `main-incident-<date>` (keep for
     forensics; do NOT delete for at least 30 days).
   - Rename `restore-<slug>-<date>` → `main`.

6. **Open an incident write-up** at
   `docs/ops/incidents/<YYYY-MM-DD>-<slug>.md` — root cause, what was
   lost (data between the timestamp and the failure), what we changed
   to prevent recurrence.

---

## Retention

Neon retains WAL history for the project's configured window:

- **Free tier**: 7 days.
- **Pro tier**: configurable, defaults to 14 days.

Check the current value in the Neon dashboard under Project Settings
→ Storage → History retention. For production, **never let this fall
below 14 days** — that's the recovery window for "we noticed
something was wrong a week later". Pre-launch we're on the free tier;
this gets bumped when we move to Pro.

---

## What's NOT covered here

- **R2 / file storage restore**: R2 has its own versioning. Not yet
  wired; covered in a separate runbook when we need it.
- **Stripe data**: lives at Stripe; their support is the restore path.
- **Better-Auth's session / OAuth tables**: live in the same Postgres,
  covered by the procedures above. A restore that rolls back the
  `sessions` table just signs everyone out — not a problem.

[1]: https://neon.tech/docs/reference/neon-cli
