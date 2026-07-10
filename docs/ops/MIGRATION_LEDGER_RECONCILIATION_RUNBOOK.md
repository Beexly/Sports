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

## Fix 2 — reconcile the ledger (run locally with production env)

Run from the repo root with production `DATABASE_URL` + repaired `DIRECT_URL`
exported. Every step is read-only until step 3.

### Step 1 — verify each "unapplied" migration's objects already exist

```bash
psql "$DIRECT_URL" <<'SQL'
-- 20260622120000_add_fantasy_subscription_tier
select 'FANTASY tier'   , count(*) from pg_enum e join pg_type t on t.oid=e.enumtypid
                                    where t.typname ilike '%tier%' and e.enumlabel='FANTASY';
-- 20260622173000_add_pick_proof_receipt
select 'pick_proof_receipts', count(*) from information_schema.tables where table_name='pick_proof_receipts';
-- 20260622180000_add_slate_commitment
select 'slate_commitments',   count(*) from information_schema.tables where table_name='slate_commitments';
-- 20260708000000_add_hot_path_indexes (check each index name in that migration file)
select indexname from pg_indexes where indexname in (
  select unnest(string_to_array('<paste index names from the migration SQL>', ','))
);
SQL
```

- Object **exists** → that migration gets `migrate resolve --applied` (step 3).
- Object **missing** (plausible for the hot-path indexes) → apply that one
  migration's SQL manually via psql first, then still `resolve --applied`.
  Do NOT let `migrate deploy` apply a mixed batch where some objects exist —
  `CREATE TABLE` on an existing table fails the whole migration.

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
redeploy. The build proceeds with a loud warning and NO schema-parity
guarantee — acceptable only for deploys you know carry no migration.
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
