# Prisma Migration Reconciliation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the two production-applied Prisma migrations that are missing from disk, byte-for-byte from git history, so a fresh database can be rebuilt and prod drift is closed.

**Architecture:** Keep production untouched; recover the two `migration.sql` files verbatim from the branch that authored them (`hermes/gse-signal-wiring-20260924`, commit `1f0356787`), sync `schema.prisma` to the schema diff from that same commit, then prove `prisma migrate status` is clean and a disposable fresh DB built from current HEAD migrations contains the same column, enum value, and unique index as production.

**Tech Stack:** Prisma 5.22 (`packages/db`, `prisma migrate deploy` / `prisma migrate status`), PostgreSQL 17 on Neon project `summer-brook-99380762`, Git (read-only recovery via `git show <ref>:<path>`).

**Spec:** This document *is* the spec — the parent task brief dated 2026-11-04 (verify each established fact with a query or file read before asserting; read-only; sole deliverable is this file at `docs/engine/architecture/2026-11-04-MIGRATION-RECONCILIATION.md`). No other spec or design doc drives this work.

## Global Constraints

- Read-only investigation only: do not run any git command that writes (no `checkout`, `commit`, `merge`, `branch`, `reset`), do not modify `schema.prisma`, do not run any `prisma` command, do not write to the production database. The only file this plan creates now is this document. The implementation tasks in Tasks 1–3 below are for a *later* executor, after human review of this plan.
- Production queries are read-only only, via: `cd /c/c/wt-week8-forensic && neon psql main --project-id summer-brook-99380762 --role-name hermes_ro -- -c "SELECT ..."` (Neon project `summer-brook-99380762`, PG17, role `hermes_ro`).
- Never run `db:push` against production (see **DANGER** below) — before or after this reconciliation it can drop live objects until `schema.prisma` declares them.
- Chronology is by `_prisma_migrations.applied_at` / `started_at`, never by directory-name sort order (the baseline `20260101000000` sorts lowest but was applied 2026-09-03, after the 2026-05..08 migrations it squashed).
- Preserve identifiers, migration names, and SQL verbatim — never "repair" or normalize a token that fails a format check.

## Review Focus

1. Executor runs `prisma db push` against production after restoring migration files but *before* syncing `schema.prisma` — expected: still drops `hadNgsSignal`, `RESEARCH_ARTIFACT`, and the unique index; pinned by Task 2 Step 1 (no `db:push` step exists anywhere in this plan) and Task 3 Step 3 (drift check gates sign-off).
2. Executor regenerates the SQL from production introspection instead of restoring verbatim and silently drops the explanatory comments and the `IF NOT EXISTS` idempotency guards — expected: recovered files match the git blobs in Task 1 Step 3; pinned by the SHA-256 check there.
3. Executor runs `prisma migrate resolve --applied` (option c) and leaves the repo unable to rebuild a fresh database — expected: no `resolve` command appears in this plan; pinned by Task 3 Step 2 (fresh-DB rebuild must succeed from HEAD migrations alone).
4. Executor orders by directory name and assumes the baseline ran first — expected: only the two restored directories sort between `20260902231000_week1_hot_path_indexes` and `20261006120000_add_ledger_chain_entries`, matching `applied_at` order; pinned by Task 1 Step 4.
5. Executor edits the squashed baseline to fold the two changes in — expected: baseline blob `058c70a461d4ccdb2b1ea01d15644d70aa65c5c9` is byte-identical on HEAD and the signal branch and must stay untouched; pinned by Task 3 Step 1.

---

## 1. Verified facts (all re-derived, not trusted)

### 1.1 Ledger vs disk

- Production `_prisma_migrations` has **59 applied rows** (verified: `SELECT migration_name, started_at, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at;` → 59 rows, no rolled-back rows).
- Only **4 migration directories** exist on disk (`ls packages/db/prisma/migrations/` on branch `hermes/overnight-2026-11-03-corpus`, HEAD `f251d230c`):
  - `20260101000000_baseline/`
  - `20260902230000_game_merge_alias/`
  - `20260902231000_week1_hot_path_indexes/`
  - `20261006120000_add_ledger_chain_entries/`
- The **53 oldest rows** in the ledger (2026-05-30 … 2026-08-19) are the pre-squash history absorbed by the baseline; they are intentionally not on disk. Do **not** try to recreate them — the baseline replaced them.
- `20260101000000_baseline` was applied **2026-09-03 20:00:17 UTC**, immediately before `20260902230000_game_merge_alias` and `20260902231000_week1_hot_path_indexes` (same second) — so its low-sorting name is misleading; `applied_at` is the chronological cutoff.
- The two missing applied migrations:
  - `20260924190000_pick_signal_snapshot_ngs` — applied **2026-09-24 23:29:17.11 UTC**, finished 23:29:17.42.
  - `20260924191000_research_artifact_source_kind` — applied **2026-09-24 23:29:17.54 UTC**, finished 23:29:17.95.
  - Both sit after the baseline/week1 pair and before `20261006120000_add_ledger_chain_entries` (applied 2026-10-08 22:03:10 UTC). That is the order any fresh rebuild must reproduce.

### 1.2 Git recovery — the files are NOT lost

- `git log --all --diff-filter=A --oneline -- '*pick_signal_snapshot_ngs*'` → exactly one commit: `1f0356787 feat(signals): wire NGS context and research artifacts [hermes-gse-signal-wiring-20260924]` (full SHA `1f0356787e4c0ffab9b757fbb7e2912135af34d4`, author date 2026-09-24 19:13:23 −0500). Same result for `*research_artifact_source_kind*` — both files were added in that one commit.
- `git branch -a --contains 1f0356787` → only `hermes/gse-signal-wiring-20260924` and `remotes/origin/hermes/gse-signal-wiring-20260924`. `git merge-base --is-ancestor 1f0356787 HEAD` → **NOT IN HEAD**; also NOT in `main`. The branch tip `eb737da9ac5863f53dac08433654ceec56bf50df` is identical locally and on origin (`git ls-remote origin refs/heads/hermes/gse-signal-wiring-20260924` → `eb737da9a…`). The three commits after `1f0356787` on that branch (`f353e77d7`, `024f7a90f`, `eb737da9a`) do not touch `packages/db/prisma/migrations/` (`git diff 1f0356787 hermes/gse-signal-wiring-20260924 -- packages/db/prisma/migrations/` → empty).
- **Dead end, do not use:** `origin/backup/pre-push-20260924/gse-signal-wiring` (`771d0367e8d64845cea1bb1033eeca9005126fb4`) predates the migration — its migration tree has only the baseline + two 2026-09-02 directories. It is *not* a source for these files.
- The baseline is identical on both sides: blob `058c70a461d4ccdb2b1ea01d15644d70aa65c5c9` on HEAD and on the signal branch, and it contains neither `hadNgsSignal` nor `RESEARCH_ARTIFACT` nor the unique index (only the pre-existing `source_snapshots_provider_sourceKind_idx`). Folding the two changes into the baseline would rewrite its checksum and invalidate the squash — never do it.

### 1.3 Actual production DDL (verified read-only)

| Object | Production state (verified) | Source |
|---|---|---|
| `pick_signal_snapshots."hadNgsSignal"` | `boolean`, `is_nullable = NO`, `column_default = false`. Data: 5,087 rows, 15 with `hadNgsSignal = true` | `information_schema.columns … WHERE table_name='pick_signal_snapshots' AND column_name='hadNgsSignal'`; `SELECT count(*) FILTER (WHERE "hadNgsSignal") FROM pick_signal_snapshots` |
| `SourceSnapshotKind` enum | 11 values in sort order: `ODDS_EVENTS, ODDS_SCORES, CONTEXT_FIXTURES, CONTEXT_TEAM_STATS, CONTEXT_PLAYER_AVAILABILITY, CONTEXT_OFFICIALS, CONTEXT_VENUE, CONTEXT_WEATHER, CONTEXT_STANDINGS, CONTEXT_MILESTONES, RESEARCH_ARTIFACT` (last). Row counts: only `ODDS_EVENTS` (45,804) — `RESEARCH_ARTIFACT` exists but has no rows yet | `pg_enum`/`pg_type` join on `typname='SourceSnapshotKind'`; `SELECT "sourceKind", count(*) FROM source_snapshots GROUP BY 1` |
| Unique index | `source_snapshots_provider_sourceKind_externalId_key` → `CREATE UNIQUE INDEX … ON public.source_snapshots USING btree (provider, "sourceKind", "externalId")`. It is an **index, not a constraint**: `pg_constraint` on `source_snapshots` shows only `source_snapshots_pkey` (p) and `source_snapshots_ingestionRunId_fkey` (f). That matches Prisma's `@@unique` on Postgres. Supporting columns: `provider text NOT NULL`, `"sourceKind" USER-DEFINED NOT NULL`, `externalId text NULL` (NULL rows are not deduplicated by a unique index — intended) | `pg_indexes WHERE tablename='source_snapshots'`; `pg_constraint WHERE conrelid='source_snapshots'::regclass`; `information_schema.columns` |

### 1.4 The faithful reconstructed SQL (identical to the git files)

These are the two `migration.sql` files as recovered from `hermes/gse-signal-wiring-20260924` (git blobs `b4d1e4880abcfa9615c7bfb4e728f59db629bf03` and `ee98ecb52e97d5daf6d6631a01dd276bcbdc2cfe`; SHA-256 of file contents: `0064a06d3946512dfb8007d53423dc0ec244fde26dff98a147592b43963a3e7c` and `44210ed11f29b7370bdb30cce75202752442abc39543a03a3ba4965f628f0043`). They match production DDL in §1.3 exactly. They are shown here for review only — Task 1 restores them via `git show`, never by retyping or regenerating.

`20260924190000_pick_signal_snapshot_ngs/migration.sql`:

```sql
-- Persist whether the immutable pick-signal snapshot had a usable NGS context.
--
-- v5.3.0 prices persisted nflverse NGS team context into SPREAD and H2H
-- confidence. Outcome learning must be able to separate NGS-active picks from
-- their otherwise identical no-NGS predecessors; this flag is intentionally a
-- boolean presence fact, not a post-hoc recomputation of the current signal row.
--
-- Additive and idempotent. Prisma migrations run in a transaction; no
-- CONCURRENTLY. Historical snapshots remain false when no NGS was supplied at
-- pick creation time.
ALTER TABLE "pick_signal_snapshots"
  ADD COLUMN IF NOT EXISTS "hadNgsSignal" BOOLEAN NOT NULL DEFAULT false;
```

`20260924191000_research_artifact_source_kind/migration.sql`:

```sql
-- Add a distinct forensic kind for repository research documents and enforce
-- idempotency for source snapshots that carry a stable external identity.
-- Existing rows retain their current kinds; nullable externalId rows remain
-- unrestricted by PostgreSQL's NULL-in-unique-index semantics.
ALTER TYPE "SourceSnapshotKind" ADD VALUE IF NOT EXISTS 'RESEARCH_ARTIFACT';

CREATE UNIQUE INDEX IF NOT EXISTS "source_snapshots_provider_sourceKind_externalId_key"
  ON "source_snapshots" ("provider", "sourceKind", "externalId");
```

Note the `IF NOT EXISTS` guards: both migrations are written to be re-appliable against a database that already has the objects (e.g. a database built from the signal branch). On production they will *not* re-run — the ledger rows already exist, so `prisma migrate deploy` skips these directories.

### 1.5 What the authoring commit did to `schema.prisma`

`git show 1f0356787 -- packages/db/prisma/schema.prisma` (same commit, same branch) made exactly three schema changes — these are the missing declarations in current HEAD `schema.prisma` (verified: `grep -n "hadNgsSignal\|RESEARCH_ARTIFACT" packages/db/prisma/schema.prisma` at HEAD → no matches):

1. `model SourceSnapshot`: added `@@unique([provider, sourceKind, externalId])`.
2. `model PickSignalSnapshot`: added `hadNgsSignal Boolean @default(false) // both-side persisted NGS team context was available and usable`.
3. `enum SourceSnapshotKind`: added `RESEARCH_ARTIFACT` as the final value.

Current HEAD differs from the signal branch in other unrelated ways as well (e.g. HEAD has `model LedgerChainEntry`, which the signal branch lacks; the `Signal.weight` comment differs). Task 2 applies **only** these three declarations — it does not merge the signal branch.

### 1.6 DANGER — `db:push`

Root `package.json` exposes `"db:push": "npm run db:push --workspace=packages/db"`, and `packages/db/package.json` defines `"db:push": "prisma db push"`.

> **Since current `schema.prisma` does not declare `hadNgsSignal`, `RESEARCH_ARTIFACT`, or the `@@unique([provider, sourceKind, externalId])` on `SourceSnapshot`, running `db:push` against production would emit `ALTER TABLE "pick_signal_snapshots" DROP COLUMN "hadNgsSignal"`, an enum-value removal (which on Postgres requires a type rebuild — `ALTER TYPE … DROP VALUE` does not exist), and `DROP INDEX "source_snapshots_provider_sourceKind_externalId_key"`. That is live data loss (the 15 `hadNgsSignal = true` snapshot flags and the enum value) and a hard-to-reverse type rebuild, in exchange for zero benefit.**
>
> Restoring the two migration directories **alone does not fix this**. `migrate deploy` only compares migration names vs the ledger; `db push` compares `schema.prisma` vs the live database. The danger ends only when Task 2 lands the three schema declarations. Until then, nobody runs `db:push` anywhere near production — not even with `--accept-data-loss` absent, because the plan/apply split means the destructive SQL is generated from the drift either way.

---

## 2. Recommendation — option (a): restore the two directories verbatim from git history

**Recommendation: (a) restore `20260924190000_pick_signal_snapshot_ngs/` and `20260924191000_research_artifact_source_kind/` verbatim from branch `hermes/gse-signal-wiring-20260924` (commit `1f0356787`), plus the three `schema.prisma` declarations from that same commit as a separate, clearly-labeled follow-up change (Task 2).**

Why (a) wins:

- The bytes exist and are verified: the branch exists locally and on origin at the same tip, the creating commit is identified (`1f0356787`), the files are unmodified by later commits on that branch, and the recovered SQL matches production DDL exactly (§1.3 vs §1.4, including `NOT NULL DEFAULT false`, enum sort position, and index-not-constraint shape). You are not reconstructing anything — you are checking out known-good text.
- Provenance is preserved: the headers explain *why* (`v5.3.0` NGS context separation; forensic research-artifact kind + idempotency), and the `IF NOT EXISTS` guards encode the re-appliable intent. A hand-written reconstruction (option b) drops all of that and risks subtle divergence — e.g. forgetting `NOT NULL`, putting `RESEARCH_ARTIFACT` mid-enum, or creating a real `UNIQUE` constraint where production has a unique index.
- Ordering falls out naturally: restored names sort between `20260902231000_week1_hot_path_indexes` and `20261006120000_add_ledger_chain_entries`, which matches the `applied_at` order in the ledger. A fresh DB built from HEAD migrations will then replay: baseline (2026-09-03) → game_merge_alias → week1 indexes → the two restored migrations (2026-09-24) → ledger_chain_entries (2026-10-08).
- Prod needs **no** `resolve`, no backfill, no DDL: the ledger rows already exist under exactly these names. `migrate deploy` skips both directories on prod; nothing changes at runtime.

Why not (b) recreate from production DDL: §1.4 shows the SQL would be byte-identical anyway — so (b) adds risk (comments, guards, enum position, index-vs-constraint) for zero gain, and destroys the audit trail back to `1f0356787`. Keep (b) only as the fallback if the branch were deleted — it is not.

Why not (c) `prisma migrate resolve --applied` without files: it makes `migrate status` green on prod by fiat, but the repo still cannot rebuild a fresh database — a new environment would land without the column, the enum value, and the unique index, while the code (when the signal feature is merged) expects them. Drift-by-marker. Also note option (c) is impossible to undo cleanly once new migrations stack on top. **(c) leaves the repo unable to rebuild a fresh database — do not choose it.**

---

## 3. Implementation plan (for a later executor)

### File structure

| Path | Role |
|---|---|
| `packages/db/prisma/migrations/20260924190000_pick_signal_snapshot_ngs/migration.sql` | **Create** — restored verbatim from `hermes/gse-signal-wiring-20260924` (Task 1) |
| `packages/db/prisma/migrations/20260924191000_research_artifact_source_kind/migration.sql` | **Create** — restored verbatim, same source (Task 1) |
| `packages/db/prisma/schema.prisma` | **Modify** — add exactly the 3 declarations from `1f0356787` (Task 2); no other changes |
| `packages/db/prisma/migrations/20260101000000_baseline/migration.sql` | **Untouched** — blob `058c70a…` must remain (Task 3 Step 1) |
| `packages/db/prisma/migrations/20261006120000_add_ledger_chain_entries/migration.sql` | **Untouched** — current HEAD-only migration, already applied in prod |
| `migration_lock.toml` | **Untouched** — provider is `postgresql`, unchanged |

### Task 1: Restore the two migration files verbatim

**Files:**
- Create: `packages/db/prisma/migrations/20260924190000_pick_signal_snapshot_ngs/migration.sql`
- Create: `packages/db/prisma/migrations/20260924191000_research_artifact_source_kind/migration.sql`

**Interfaces:**
- Consumes: `hermes/gse-signal-wiring-20260924` (local ref; origin ref `remotes/origin/hermes/gse-signal-wiring-20260924` at tip `eb737da9ac5863f53dac08433654ceec56bf50df` is an equivalent source).
- Produces: two `migration.sql` files whose SHA-256 contents are `0064a06d3946512dfb8007d53423dc0ec244fde26dff98a147592b43963a3e7c` and `44210ed11f29b7370bdb30cce75202752442abc39543a03a3ba4965f628f0043`, for Tasks 2–3.

- [ ] **Step 1: Confirm the source branch still exists and holds both files**

  Run: `git branch -a --list "*gse-signal-wiring-20260924*" && git ls-tree hermes/gse-signal-wiring-20260924 packages/db/prisma/migrations/`
  Expected: local `hermes/gse-signal-wiring-20260924` plus origin ref; the tree lists `20260924190000_pick_signal_snapshot_ngs` and `20260924191000_research_artifact_source_kind` alongside the baseline and the two 2026-09-02 directories, and does **not** list `20261006120000_add_ledger_chain_entries` (HEAD-only, added later).

- [ ] **Step 2: Restore both files with `git show` (no retyping)**

  Run (from repo root `C:\c\wt-week8-forensic`):
  ```bash
  mkdir -p packages/db/prisma/migrations/20260924190000_pick_signal_snapshot_ngs \
           packages/db/prisma/migrations/20260924191000_research_artifact_source_kind
  git show hermes/gse-signal-wiring-20260924:packages/db/prisma/migrations/20260924190000_pick_signal_snapshot_ngs/migration.sql \
    > packages/db/prisma/migrations/20260924190000_pick_signal_snapshot_ngs/migration.sql
  git show hermes/gse-signal-wiring-20260924:packages/db/prisma/migrations/20260924191000_research_artifact_source_kind/migration.sql \
    > packages/db/prisma/migrations/20260924191000_research_artifact_source_kind/migration.sql
  ```
  Expected: no git output (exit 0). Do **not** use `git checkout <branch> -- <path>` — the `git show` redirect keeps the working tree on the current branch and writes only these two new files. Do **not** copy the SQL from §1.4 by hand: the redirect guarantees byte-identity with history.

- [ ] **Step 3: Verify byte-identity (checksum + diff against the branch)**

  Run:
  ```bash
  sha256sum packages/db/prisma/migrations/20260924190000_pick_signal_snapshot_ngs/migration.sql \
            packages/db/prisma/migrations/20260924191000_research_artifact_source_kind/migration.sql
  git diff --stat HEAD -- packages/db/prisma/migrations/
  ```
  Expected: SHA-256 values `0064a06d3946512dfb8007d53423dc0ec244fde26dff98a147592b43963a3e7c` and `44210ed11f29b7370bdb30cce75202752442abc39543a03a3ba4965f628f0043`; `git diff --stat` shows exactly 2 files created (20 insertions total: 12 + 8 lines), nothing else under `packages/db/prisma/migrations/`.

- [ ] **Step 4: Confirm ordering against the ledger, not the directory listing**

  Run: `ls packages/db/prisma/migrations/` and `git log -1 --format="%H %ad" --date=iso 1f0356787`
  Expected: six migration directories now sort as `20260101000000_baseline < 20260902230000_game_merge_alias < 20260902231000_week1_hot_path_indexes < 20260924190000_pick_signal_snapshot_ngs < 20260924191000_research_artifact_source_kind < 20261006120000_add_ledger_chain_entries`, matching the `applied_at` sequence from the ledger (baseline 2026-09-03 → the pair 2026-09-24 → ledger_chain 2026-10-08). The baseline's low-sorting name is a known red herring — do not "fix" it.

### Task 2: Sync `schema.prisma` to the authoring commit (still no prod writes)

**Files:**
- Modify: `packages/db/prisma/schema.prisma` (3 insertions, nothing else)

**Interfaces:**
- Consumes: `git show 1f0356787 -- packages/db/prisma/schema.prisma` (the 3-line diff quoted in §1.5); the files produced by Task 1.
- Produces: a `schema.prisma` that declares everything the 6 on-disk migrations build, so a future `migrate dev` / `db push` sees zero drift. This is what retires the **DANGER** in §1.6. Do not merge any other hunks from the signal branch.

- [ ] **Step 1: Confirm no DDL is run in this task**

  There is deliberately no `prisma db push`, `prisma migrate dev`, or `neon psql` write anywhere in Tasks 1–3. This task produces a *source-file* change only; production is not touched until a human separately approves a deploy. If you are tempted to "check" with `db push --dry-run` against prod, stop — the correct check is Task 3 Step 3 on a disposable database.

- [ ] **Step 2: Apply the three declarations exactly as in `1f0356787`**

  In `packages/db/prisma/schema.prisma`, make precisely these edits (locations relative to current HEAD; verify each anchor with `grep` first):
  1. In `model SourceSnapshot`, immediately before the existing `@@index([provider, sourceKind])` line, add: `@@unique([provider, sourceKind, externalId])`.
  2. In `model PickSignalSnapshot`, after the `hadMilestoneSignal` line and before the `// Key quantitative values at prediction time` comment, add: `hadNgsSignal              Boolean @default(false) // both-side persisted NGS team context was available and usable` (match the field alignment to neighbouring declarations).
  3. In `enum SourceSnapshotKind`, after `CONTEXT_MILESTONES` and before the closing brace, add `RESEARCH_ARTIFACT` as the final value.
  Expected diff: `git diff packages/db/prisma/schema.prisma` shows exactly 3 added lines, 0 deletions. If your diff shows anything else (e.g. `LedgerChainEntry` removal, `Signal.weight` comment changes), that means you diffed against the wrong branch — revert and redo from the explicit three lines above.

- [ ] **Step 3: Validate the schema parses (no database contact)**

  Run: `npx prisma validate` (from `packages/db/`, or `npm run db:generate --workspace=packages/db` if `validate` is unavailable in the installed Prisma 5.22).
  Expected: "valid" / successful client generation. A parse error means an edit drifted — fix the file, do not re-run against prod.

### Task 3: Verify — ledger, drift, and a fresh-database rebuild

**Files:** none created or modified. Read-only verification + one disposable Postgres.

**Interfaces:**
- Consumes: outputs of Tasks 1–2; the repo's existing `db:disposable` script (`"db:disposable": "bash scripts/dev/disposable-postgres.sh"` in root `package.json`).
- Produces: the three proofs a reviewer needs — baseline untouched, `migrate status` clean, fresh DB contains the same objects as prod.

- [ ] **Step 1: Prove the baseline was not touched**

  Run: `git hash-object packages/db/prisma/migrations/20260101000000_baseline/migration.sql`
  Expected: `058c70a461d4ccdb2b1ea01d15644d70aa65c5c9`. Any other value → stop; the squash checksum is sacred.

- [ ] **Step 2: Fresh-database rebuild from HEAD migrations alone**

  Spin up the repo's disposable Postgres and apply only the on-disk migrations, e.g. `npm run db:disposable` (inspect `scripts/dev/disposable-postgres.sh` first for its exact env/URL conventions), then from `packages/db/` with `DATABASE_URL` pointed at the disposable instance run `npx prisma migrate deploy`.
  Expected: all 6 least-recent migrations apply in order — baseline, `game_merge_alias`, `week1_hot_path_indexes`, `20260924190000_pick_signal_snapshot_ngs`, `20260924191000_research_artifact_source_kind`, `add_ledger_chain_entries` — with no "migration not found in ledger / drift" errors. This is the proof that rules out option (c): after this plan, `migrate deploy` on a blank database converges to the same schema as production.

- [ ] **Step 3: Confirm the fresh DB matches production DDL (same three probes as §1.3)**

  Run against the disposable instance (psql or the `neon psql` equivalent):
  ```sql
  SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name='pick_signal_snapshots' AND column_name='hadNgsSignal';
  SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='SourceSnapshotKind' ORDER BY enumsortorder;
  SELECT indexname, indexdef FROM pg_indexes WHERE tablename='source_snapshots' ORDER BY indexname;
  ```
  Expected: `hadNgsSignal | boolean | NO | false`; enum's 11th/last value `RESEARCH_ARTIFACT`; index `source_snapshots_provider_sourceKind_externalId_key` present as a unique btree on `(provider, "sourceKind", "externalId")`. Any mismatch vs §1.3 → the restore did not land; go back to Task 1 Step 2.

- [ ] **Step 4: Confirm production `migrate status` is clean (read-only, no deploy to prod)**

  Run from `packages/db/` with the **production** `DATABASE_URL` (read-only role if your shell has one configured): `npx prisma migrate status`.
  Expected: all 6 on-disk migrations reported applied; no "not applied" / "drift detected" / "database schema drift" output; the two restored names resolve against their existing ledger rows. If instead it reports drift, do not run `migrate deploy` to "fix" it — read the diff first (the most likely cause is an un-committed Task 2 schema change, which `migrate status` does not care about, versus a checksum mismatch, which it does — a checksum mismatch means the restored file is not byte-identical; return to Task 1 Step 3). **Do not run `migrate deploy` against production as part of this reconciliation** — its ledger rows are already present, so it should be a no-op, but that is a deploy decision for a human, not a verification step.

- [ ] **Step 5: Final repo state check**

  Run: `git status --short packages/db/prisma/` (plus `git diff --stat`)
  Expected: exactly two new files under `packages/db/prisma/migrations/` (12 + 8 lines) and three added lines in `schema.prisma`. No changes under `migration_lock.toml`, no edits to the other three migration files. Tear down the disposable Postgres.

---

## 4. Out of scope / follow-ups (not in this plan)

- **Merged-branch feature code:** the signal branch's ~41-file feature (`ingestion-pipeline`, `prediction-engine`, `packages/types`, tests) is *not* part of this reconciliation. Only its migrations + 3 schema lines are restored. When that feature is eventually merged, its `schema.prisma` hunks must be re-checked against the then-current HEAD (it lacks `LedgerChainEntry`; HEAD lacks the signal fields) — a normal merge-conflict exercise, not a drift risk once Task 2 lands.
- **The 53 pre-squash ledger rows:** intentionally left alone. They are history the baseline absorbed; removing them from the ledger would require baselining surgery with no payoff. Fresh environments never see them because they build from the 6 on-disk migrations.
- **Data backfill:** none needed and none safe. `hadNgsSignal` correctly defaults to `false` for pre-2026-09-24 snapshots (15 rows are `true`), and `RESEARCH_ARTIFACT` has zero rows — there is nothing to backfill without fabricating facts.
- **CI gate:** consider adding to `apps/web/__tests__/forward-migrations-agree-with-schema.test.ts` (already touched by `1f0356787`) an assertion that every ledger-named migration the repo claims has a directory on disk — that is what would have caught this drift at squash time. Separate issue; not required for this reconciliation.
