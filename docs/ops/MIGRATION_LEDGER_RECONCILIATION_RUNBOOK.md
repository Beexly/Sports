# Migration-Ledger Reconciliation Runbook

**Status: REQUIRED before any production deploy can pass the migration gate.**
**Owner action. ~20 minutes. One-time.**

## What happened (evidence, 2026-07-10)

The fail-closed migration gate (PR #72) ran its first production build and the
pooled-endpoint parity check connected successfully — proving the pooled
`DATABASE_URL` **is** reachable from the Vercel build network — and returned
this (deployment `dpl_BRQLGNqjpCFsxwprUjyaqD3N4hAX`, build log verbatim):

```
26 migrations found in prisma/migrations
Your local migration history and the migrations table from your database are different:
The last common migration is: 20260615152000_add_signal_ledger

The migrations have not yet been applied:
  20260622120000_add_fantasy_subscription_tier
  20260622173000_add_pick_proof_receipt
  20260622180000_add_slate_commitment
  20260708000000_add_hot_path_indexes

The migrations from the database are not found locally in prisma/migrations:
  20260522000000_baseline
  20260610060117_add_closing_line_clv
  20260610200000_add_snapshot_bet_time_line_lock
  20260610230000_add_ingestion_run_quota
```

Meanwhile `prisma migrate deploy` itself fails with **P1001** — the **direct**
endpoint in `DIRECT_URL` is unreachable from the build network (likely a stale
value; the pooled host works fine).

## What it means

1. **`prisma migrate deploy` has not actually applied anything since at least
   2026-06-22.** The old gate's "transient → proceed" policy masked this on
   every deploy. The objects those four "unapplied" migrations describe
   (FANTASY tier, `pick_proof_receipts`, `slate_commitments`) demonstrably
   exist and work in production — so the schema was evolved out-of-band
   (`prisma db push` or equivalent) while the ledger (`_prisma_migrations`)
   was never updated.
2. **The DB ledger also holds four rows for migration files that no longer
   exist in the repo** — remnants of a pre-squash local history.
3. Until the ledger matches the repo, `prisma migrate status` reports
   "pending", so the fail-closed gate (correctly) refuses every production
   build. Production keeps serving the last good deployment (`#71`,
   `dpl_8uhSP2v1…`) and is healthy — but nothing new ships until this runbook
   (or the break-glass override) is executed.

## Fix 1 — repair `DIRECT_URL` (required regardless)

Vercel → project **sports-web** → Settings → Environment Variables →
Production. Replace `DIRECT_URL` with the current Neon **direct** (non
`-pooler`) connection string from the Neon console (Dashboard → Connection
Details → uncheck "Pooled connection"). The existing value predates a password
rotation / compute change and points at a dead endpoint.

Sanity check from any machine with `psql`:

```bash
psql "$DIRECT_URL" -c "select 1;"
```

> **⚠️ Do NOT trigger a production deploy between Fix 1 and Fix 2** (except
> with the break-glass var set). With `DIRECT_URL` repaired but the ledger
> unreconciled, `prisma migrate deploy` will connect and try to apply the four
> "pending" migrations against objects that already exist — the apply fails
> AND records a P3018 *failed migration* row, which makes the ledger surgery
> below harder. Finish Fix 2 before redeploying, or use break-glass.

## Fix 2 — reconcile the ledger (run locally with production env)

Run from the repo root with production `DATABASE_URL` + repaired `DIRECT_URL`
exported. Step 1's diff check is read-only; writes begin only if the diff
finds missing objects (manual apply) or at step 3 (ledger updates).

### Step 1 — prove the LIVE schema fully matches the repo schema

Table-existence spot checks are not enough: these migrations also add columns
(`pick_proof_receipts."slateKey"`), unique constraints (the slate double-commit
backstop), foreign keys, and indexes. Marking a migration applied while any of
those is missing makes `migrate status` go green over a silently broken
invariant. So use Prisma's own schema diff as the authoritative check — it
compares the **actual** database schema against `schema.prisma`, object by
object:

```bash
cd packages/db
npx prisma migrate diff \
  --from-url "$DIRECT_URL" \
  --to-schema-datamodel prisma/schema.prisma
```

- Output is **"No difference detected"** → the live schema is byte-for-byte
  what the repo describes; every object of all four migrations exists. Safe to
  resolve all four as applied (step 3).
- Output lists differences → the live schema is **partially** applied. For
  each missing object, apply it manually first (see below), then re-run the
  diff until it is clean. Do NOT let `migrate deploy` apply a mixed batch —
  `CREATE TABLE` on an existing table fails the whole migration.

**Applying missing objects manually:** copy the relevant statements from the
migration's `migration.sql` — with one change for indexes on hot tables. The
hot-path migration (`20260708000000`) uses plain `CREATE INDEX` on `odds`,
`ingestion_runs`, and `picks`; on production-sized tables that holds a
write-blocking lock for the whole build and can stall ingestion/pick writes.
For the manual path use the online form instead (must run OUTSIDE a
transaction — psql autocommit is fine, don't wrap in BEGIN):

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS "odds_gameId_fetchedAt_idx" ON "odds"("gameId", "fetchedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ingestion_runs_status_completedAt_idx" ON "ingestion_runs"("status", "completedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "picks_settledAt_idx" ON "picks"("settledAt");
```

(If a `CONCURRENTLY` build fails midway it leaves an INVALID index — drop it
and rerun: `DROP INDEX CONCURRENTLY <name>;`.)

### Step 2 — back up the ledger rows you are about to touch

```bash
psql "$DIRECT_URL" -c "select * from _prisma_migrations order by started_at;" > _prisma_migrations.backup.txt
```

### Step 3 — mark the four repo migrations as applied

```bash
cd packages/db
npx prisma migrate resolve --applied 20260622120000_add_fantasy_subscription_tier
npx prisma migrate resolve --applied 20260622173000_add_pick_proof_receipt
npx prisma migrate resolve --applied 20260622180000_add_slate_commitment
npx prisma migrate resolve --applied 20260708000000_add_hot_path_indexes
```

### Step 4 — clear the four orphaned rows (files deleted in the June squash)

```bash
psql "$DIRECT_URL" <<'SQL'
delete from _prisma_migrations where migration_name in (
  '20260522000000_baseline',
  '20260610060117_add_closing_line_clv',
  '20260610200000_add_snapshot_bet_time_line_lock',
  '20260610230000_add_ingestion_run_quota'
);
SQL
```

(Their schema changes live on in the current tables; only the ledger rows are
orphaned. The backup from step 2 preserves them.)

### Step 5 — verify green

```bash
npx prisma migrate status   # must print: "Database schema is up to date!"
```

Then redeploy `main` from the Vercel dashboard (or push any commit). The gate
will pass — either via a now-working `migrate deploy`, or via the pooled
parity check confirming zero pending.

## Break-glass (if you need to ship BEFORE reconciling)

Set `MIGRATE_GATE_ALLOW_UNVERIFIED=true` in the Vercel Production env and
redeploy. The gate then **skips `prisma migrate deploy` entirely** for that
build (checked before the first attempt, so it works in every failure mode —
including the repaired-DIRECT_URL/divergent-ledger state, where an attempted
apply would otherwise record a P3018 failed-migration row). The build ships
with a loud warning and NO schema-parity guarantee — acceptable only for
deploys you know carry no schema change.
**Remove the variable immediately after.** This is an explicit, logged
operator decision; the silent version of it is what caused the 2026-07-10
`/api/picks` outage.

## After reconciliation

- Re-land the reverted CLV/Pedersen columns (`bookDisagreementAtLock`,
  `pedersenAggregate{Hex,Value,BlindingSum}`) from the #69/#70 history — the
  pure helpers (`book-dispersion.ts`, `mintSlatePedersenAggregate`) are already
  merged and tested, waiting on migration capability.
- All future schema changes go through `prisma migrate` only. `db push`
  against production is what created this divergence — treat it as forbidden
  outside local dev.
