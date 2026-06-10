# Migration baseline — fresh-DB bootstrap (R-02)

**Status:** fixed. **Migration added:** `packages/db/prisma/migrations/20260522000000_baseline`.

## The problem (LAUNCH_READINESS R-02)

`prisma migrate deploy` against an **empty** database failed at the very first
dated migration, `20260522141600_add_loss_autopsy`, with:

```
ERROR: relation "picks" does not exist   (SQLSTATE 42P01)
```

That migration (and the whole chain after it) assumes a pre-existing schema —
`users`, `games`, `picks`, `opening_lines`, `pick_signal_snapshots`, the
`OddsMarket` enum, and the rest of the core data model. Production was
**baselined manually** (the schema was applied directly, never captured as a
migration), so the chain never had to create those tables. A fresh environment
had nothing to build on and the chain broke immediately.

## The fix

A new **pre-chain baseline** migration:

```
packages/db/prisma/migrations/20260522000000_baseline/migration.sql
```

- Dated `20260522000000`, which sorts **before** `20260522141600`, so on an
  empty DB it runs **first** and the existing chain applies cleanly on top.
- Contains exactly the schema state the chain assumes, **derived precisely from
  the repo's own history** — `prisma migrate diff --from-empty
  --to-schema-datamodel` against the schema as of the commit immediately before
  the first migration (`git c7a0c30^:packages/db/prisma/schema.prisma`).
  Verified to be purely additive vs. the current schema: every later migration
  only *adds* to this baseline.
- **Idempotent.** Every statement is guarded so a replay is a harmless no-op:
  - `CREATE TABLE IF NOT EXISTS`, `CREATE [UNIQUE] INDEX IF NOT EXISTS`
  - `CREATE TYPE` wrapped in `DO $$ … IF NOT EXISTS (SELECT 1 FROM pg_type …)`
  - `ADD CONSTRAINT … FOREIGN KEY` wrapped in `DO $$ … IF NOT EXISTS (SELECT 1
    FROM pg_constraint …)`

The content of the **existing** (already-applied) migration directories was not
touched. The chain is treated as sacred.

## REQUIRED one-time step for any EXISTING / already-baselined database

Production (and any environment that already has the manually-applied schema)
**must not run** the baseline migration — its tables already exist. Mark it as
already-applied so `migrate deploy` records it and skips execution:

```bash
# Run ONCE, against each pre-existing database, BEFORE the next migrate deploy.
# DATABASE_URL / DIRECT_URL must point at that database.
npx prisma migrate resolve --applied 20260522000000_baseline
```

After that, normal `prisma migrate deploy` continues to work unchanged on those
environments.

> Safety net: even if `--applied` is forgotten and the baseline somehow runs
> against an already-baselined DB, the `IF NOT EXISTS` guards make it a no-op
> (verified — see below). The `migrate resolve` step is still the correct,
> intended path because it avoids an unnecessary execution and keeps the
> `_prisma_migrations` ledger honest.

## Fresh environments — nothing extra to do

On a brand-new empty database, just run:

```bash
npx prisma migrate deploy
```

The baseline runs first, then the rest of the chain. No manual step.

## Verification performed (2026-06-10)

Run against a private, throwaway PostgreSQL 18 cluster (initdb + trust auth, own
port — no shared credentials), because the project's local dev Postgres
(`localhost:5433`, Docker) was down per LAUNCH_READINESS R-07.

| Check | Result |
|---|---|
| `prisma validate` | schema valid |
| `migrate diff --from-migrations ./prisma/migrations --to-schema-datamodel ./prisma/schema.prisma` (real shadow DB) | **No difference detected** — full chain reproduces the current schema |
| `migrate deploy` on a truly **empty** DB | all 11 migrations applied, exit 0 (original 42P01 gone) |
| `migrate diff` deployed DB → schema | **No difference detected** (no drift) |
| Replay baseline `migration.sql` on the populated DB with `ON_ERROR_STOP=1` | exit 0 — every guard short-circuited (idempotent) |
| Drift after the idempotent replay | still **No difference detected** |
| Control: first migration alone on an empty DB (no baseline) | fails with `relation "picks" does not exist` (42P01) — confirms the baseline was required |

What was **not** exercised: the live production database itself (unprovisioned)
and the project's own Docker Postgres (daemon down). The shadow-cluster replay
is functionally equivalent for proving the SQL chain, but the production
`migrate resolve --applied` step above remains to be run by a human against the
real database when it is provisioned.
