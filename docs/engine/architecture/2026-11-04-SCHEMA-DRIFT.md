# Schema drift: 13 production columns flagged, 11 truly missing from `schema.prisma`

**Date:** 2026-11-04
**Status:** UNAPPLIED repair proposal — read-only analysis only. Do NOT apply without the verification steps in §7.
**Production:** Neon project `summer-brook-99380762` (PG17), queried read-only via `neon psql main --project-id summer-brook-99380762 --role-name hermes_ro`.
**Detector:** `scripts/ops/migration_observability.py` (`schema_unknown_columns` check) — re-run 2026-11-04 and re-verified column-by-column against `information_schema` before writing this document.

---

## 1. Headline: why this matters

`picks.closingPrice` is `double precision`, `NULL`-able, and populated on **0 of 5,150 rows** in production — **0 of 4,435 rows with `settledAt IS NOT NULL`** and **0 of 3,833 rows with `result IN (WIN, LOSS, PUSH)`** (re-measured 2026-11-04; see §6 for the discrepancy note on the 3,143 figure).

> **The column cannot be written through Prisma because it is absent from `schema.prisma`.** Application code using the Prisma client has no field to assign to, so settlement/CLV writers either skip the column or fail. This is the direct explanation for `closingPrice` being empty across the settled population — it is not a data-quality mystery, it is a schema-visibility bug.

The same mechanism affects all 11 truly-missing columns below (§3): they exist in the database, the Prisma client does not know them, and a single `prisma db push` against production would generate `DROP COLUMN` for them (the danger flagged by `migration_observability.py`).

## 2. Summary of the 13 flagged columns

Counts per the classification rule in the task brief — *SAFE-TO-DECLARE if nullable OR has a default; NEEDS-CAREFUL-HANDLING if NOT NULL without a default* — are **11 SAFE vs 2 CAREFUL** on a literal reading of `information_schema`. After the `@map` audit in §5, the effective action count is **11 SAFE-TO-DECLARE, 0 CAREFUL, 2 already declared (no change needed)**. Both views are given in the table so the literal and the correct engineering answer are never conflated.

| # | Table | Column | DB type (`data_type` / `udt_name`) | Nullable | Default | Prisma model (via `@@map`) | Proposed Prisma field | Literal classification |
|---|-------|--------|------------------------------------|----------|---------|----------------------------|-----------------------|----------------------|
| 1 | `ingestion_runs` | `remainingRequests` | `integer` / `int4` | YES | — | `IngestionRun` (`@@map("ingestion_runs")`) | `remainingRequests Int?` | SAFE-TO-DECLARE |
| 2 | `ingestion_runs` | `usedRequests` | `integer` / `int4` | YES | — | `IngestionRun` | `usedRequests Int?` | SAFE-TO-DECLARE |
| 3 | `picks` | `closingLine` | `double precision` / `float8` | YES | — | `Pick` (`@@map("picks")`) | `closingLine Float?` | SAFE-TO-DECLARE |
| 4 | `picks` | `closingPrice` | `double precision` / `float8` | YES | — | `Pick` | `closingPrice Float?` | SAFE-TO-DECLARE |
| 5 | `picks` | `clvCents` | `double precision` / `float8` | YES | — | `Pick` | `clvCents Float?` | SAFE-TO-DECLARE |
| 6 | `picks` | `clvComputedAt` | `timestamp without time zone` / `timestamp` | YES | — | `Pick` | `clvComputedAt DateTime?` | SAFE-TO-DECLARE |
| 7 | `picks` | `clvPoints` | `double precision` / `float8` | YES | — | `Pick` | `clvPoints Float?` | SAFE-TO-DECLARE |
| 8 | `picks` | `clvPositive` | `boolean` / `bool` | YES | — | `Pick` | `clvPositive Boolean?` | SAFE-TO-DECLARE |
| 9 | `pick_signal_snapshots` | `hadNgsSignal` | `boolean` / `bool` | NO | `false` | `PickSignalSnapshot` (`@@map("pick_signal_snapshots")`) | `hadNgsSignal Boolean @default(false)` | SAFE-TO-DECLARE (has default) |
| 10 | `pick_signal_snapshots` | `lineAtPrediction` | `double precision` / `float8` | YES | — | `PickSignalSnapshot` | `lineAtPrediction Float?` | SAFE-TO-DECLARE |
| 11 | `pick_signal_snapshots` | `selectionAtPrediction` | `text` / `text` | YES | — | `PickSignalSnapshot` | `selectionAtPrediction String?` | SAFE-TO-DECLARE |
| 12 | `rate_limit_counters` | `updated_at` | `timestamp without time zone` / `timestamp` | NO | — | `RateLimitCounter` (`@@map("rate_limit_counters")`) | **None — already declared** (see §5) | NEEDS-CAREFUL-HANDLING *literally* (NOT NULL, no default) — **no action in practice** |
| 13 | `rate_limit_counters` | `window_start` | `timestamp without time zone` / `timestamp` | NO | — | `RateLimitCounter` | **None — already declared** (see §5) | NEEDS-CAREFUL-HANDLING *literally* — **no action in practice** |

Notes on the queries:

- `character_maximum_length` is NULL for all 13 columns (no length limit to carry into Prisma; no `@db.VarChar(n)` needed).
- `numeric_precision`/`numeric_scale` for the `integer` columns is `32`/`0`, for `double precision` `53` — both plain `Int`/`Float` in Prisma, no `Decimal` involved in this set.
- All timestamp columns are `timestamp without time zone` in production. Prisma `DateTime` maps onto that column type; existing `DateTime` fields in these models (e.g. `Pick.settledAt`, `PickSignalSnapshot.capturedAt`) already follow the same pattern.

**Literal classification totals: 11 SAFE-TO-DECLARE, 2 NEEDS-CAREFUL-HANDLING.**
**Effective totals after the `@map` audit (§5): 11 SAFE-TO-DECLARE, 0 CAREFUL, 2 already-declared / false positive.**

## 3. Proposed Prisma additions (unapplied)

Add the following lines inside the stated models in `packages/db/prisma/schema.prisma`. Column name = field name, so no `@map` is needed for these 11 (production column names are camelCase and already match Prisma naming, exactly like the neighbouring fields).

### 3.1 `IngestionRun` (`@@map("ingestion_runs")`)

```prisma
model IngestionRun {
  // ... existing fields ...
  remainingRequests Int?
  usedRequests      Int?
  // ... existing relations / indexes / @@map("ingestion_runs") ...
}
```

- DB: `remainingRequests integer NULL`, `usedRequests integer NULL` (both with no default; `numeric_precision=32`).
- Type mapping: `integer → Int`, nullability preserved with `?`.
- Population check: 49 of 59,642 `ingestion_runs` rows have both columns non-NULL — the columns are live, just not Prisma-visible.

### 3.2 `Pick` (`@@map("picks")`)

```prisma
model Pick {
  // ... existing CLV lock fields (clvLockLine, clvCloseLine, ...) ...
  closingLine    Float?
  closingPrice   Float?
  clvPoints      Float?
  clvCents       Float?
  clvPositive    Boolean?
  clvComputedAt  DateTime?
  // ... existing bookDisagreementAtLock, isBootstrap, relations ...
}
```

- DB: `closingLine`/`closingPrice`/`clvPoints`/`clvCents` are `double precision NULL` → `Float?`; `clvPositive boolean NULL` → `Boolean?`; `clvComputedAt timestamp NULL` → `DateTime?`.
- These sit naturally beside the already-declared CLV family (`clvLockLine`, `clvCloseLine`, `clvValue`, `clvVerdict`, `clvCapturedAt`, `clvGradedAt`) and are the settlement-side counterparts the Prisma client currently cannot write.

### 3.3 `PickSignalSnapshot` (`@@map("pick_signal_snapshots")`)

```prisma
model PickSignalSnapshot {
  // ... existing had*Signal flags ...
  hadNgsSignal             Boolean @default(false)
  // ... existing quantitative fields ...
  lineAtPrediction         Float?
  selectionAtPrediction    String?
  // ... existing provenance/outcome fields, relations, indexes ...
}
```

- `hadNgsSignal boolean NOT NULL DEFAULT false` → `Boolean @default(false)` (required, with default — mirrors every neighbouring `had*Signal` flag, e.g. `hadOddsSignal Boolean @default(false)`). Counted SAFE-TO-DECLARE because it has a default.
- `lineAtPrediction double precision NULL` → `Float?`; `selectionAtPrediction text NULL` → `String?`.
- Population check: 5,087 snapshots exist; 15 rows have `hadNgsSignal = true`, 61 have `lineAtPrediction`/`selectionAtPrediction` non-NULL — small but real production usage, and `hadNgsSignal` is the column created by the drifted migration `20260924190000_pick_signal_snapshot_ngs` (see §6).

## 4. Indexes and foreign keys for the 13 columns

Queried from `pg_indexes` (22 indexes over the four tables) and `pg_constraint` (contype `f`):

- **None of the 11 truly-missing columns is referenced by any index or foreign key.** No `@@index`/`@@unique` additions are needed for them, and declaring them in Prisma introduces no index drift. (Existing indexes on these tables — e.g. `picks_clvVerdict_idx`, `ingestion_runs_status_completedAt_idx`, `pick_signal_snapshots_pickId_key` — reference only already-declared columns.)
- **Foreign keys:** the only three FKs touching these tables are `pick_signal_snapshots_gameId_fkey → games(id)`, `pick_signal_snapshots_pickId_fkey → picks(id)`, and `picks_gameId_fkey → games(id)`. None involves any of the 13 columns.
- **`window_start` (row 13)** is the exception: it is part of the primary key `rate_limit_counters_pkey (scope, key, window_start)` and of `rate_limit_counters_window_start_idx`. Both already match the Prisma declaration `@@id([scope, key, windowStart])` + `@@index([windowStart])` — further evidence it is already declared, not missing (§5).
- **`updated_at` (row 12)** is in no index and no constraint; it matches the already-declared `updatedAt` field.

## 5. The two `rate_limit_counters` columns: already declared, detector false positive

`schema.prisma` already declares both columns via per-field `@map`:

```prisma
model RateLimitCounter {
  scope       String
  key         String
  windowStart DateTime @map("window_start")
  count       Int
  updatedAt   DateTime @map("updated_at")

  @@id([scope, key, windowStart])
  @@index([windowStart])
  @@map("rate_limit_counters")
}
```

`scripts/ops/migration_observability.py::parse_prisma_schema` only honours `@@map("table")` (table-level) and records declared columns by Prisma *field* name (`windowStart`, `updatedAt`). It does not parse per-field `@map("window_start")`, so it reports the snake_case database names as "unknown". The Prisma client, however, knows these columns perfectly well through the `@map`.

Therefore:

- **Do NOT add `window_start`/`updated_at` fields.** Duplicating them under their snake_case names would create a second, wrong mapping for the same database columns.
- **Literal classification (for the record):** both are `timestamp NOT NULL` with no default, so under the task's rule they read as NEEDS-CAREFUL-HANDLING. In practice they need no handling at all — the existing required `DateTime` fields already match the database nullability exactly.
- **Correct repair:** fix the detector, not the schema — teach `parse_prisma_schema` to resolve `@map("...")` per field before comparing against `information_schema`. This also removes a standing false CRIT from `schema_unknown_columns` (13 reported → 11 real).
- Both `window_start`/`updated_at` are already covered by the existing primary key and `window_start` index, consistent with §4.

## 6. Re-verification notes (do not repeat unverified numbers)

Re-run against production on 2026-11-04 (`information_schema`, `pg_indexes`, `pg_constraint`, and `count(*)` reads — never `pg_stat` estimates):

- **Detector output reproduced verbatim:** `schema_unknown_columns` reports `ingestion_runs: [remainingRequests, usedRequests]`, `picks: [closingLine, closingPrice, clvCents, clvComputedAt, clvPoints, clvPositive]`, `pick_signal_snapshots: [hadNgsSignal, lineAtPrediction, selectionAtPrediction]`, `rate_limit_counters: [updated_at, window_start]` — "13 column(s) across 4 table(s)". The `rate_limit_counters` pair is the false positive analysed in §5; the other 11 also confirmed absent by direct `grep` of `schema.prisma` (0 matches for each of the 11 field names).
- **`picks` settled count — 3,143 NOT reproduced.** Measured today: `picks` total **5,150**; `settledAt IS NOT NULL` **4,435**; `result IN (WIN, LOSS, PUSH)` **3,833** (WIN 2,065 + LOSS 1,736 + PUSH 32); `result IN (WIN, LOSS)` 3,801. No settlement definition tried yields 3,143, so this document does **not** repeat "0 of 3,143" as fact. The verifiable claim is stronger and cleaner: **`picks.closingPrice` (and `closingLine`, `clvPoints`, `clvCents`) is populated on 0 of 5,150 rows — 0 of 4,435 settled (`settledAt` non-NULL) rows** — exactly what "cannot be written through Prisma" predicts.
- **Drifted migrations (context):** `migration_drift` check still reports 2 applied-in-production migrations absent from disk (`20260924190000_pick_signal_snapshot_ngs`, `20260924191000_research_artifact_source_kind`). `hadNgsSignal` is the artefact of the first — which is why it is `NOT NULL DEFAULT false` on every pre-existing snapshot row. Declaring it in Prisma (§3.3) alone does not reconcile the missing migration files; that reconciliation is a separate, larger task (baseline/merge decision) and is out of scope here.
- **`rate_limit_counters` is currently empty** (0 rows) — the false positive has no live rows behind it either way.
- **`pick_signal_snapshots`**: 5,087 rows; `hadNgsSignal=true` on 15.

## 7. Safety: what adding these fields does and does not do

- Adding the 11 fields in §3 to `schema.prisma` **does not change the database at all**. The columns already exist in production with exactly the nullability/types declared. Prisma schema edits are declarative; the database only changes when a migration is generated and applied, or when `db push` runs.
- The risk runs the other way: **while these columns are undeclared, `prisma db push` against production would generate `DROP COLUMN`** for them. Declaring them is what removes that footgun.
- The 11 additions are SAFE-TO-DECLARE because each is either nullable or carries a default matching the database (`hadNgsSignal @default(false)`). No backfill, no data rewrite, no downtime is implied.
- **Verification before/after applying (for the person who applies this — not run here, per instructions):**

  ```bash
  # 1. Apply the §3 field additions to packages/db/prisma/schema.prisma (11 fields only; §5 needs no edit).
  # 2. Regenerate and validate the client:
  npx prisma validate
  npx prisma generate
  # 3. Confirm the schema now matches production with ZERO drift:
  npx prisma migrate diff \
    --from-url "$DATABASE_URL" \
    --to-schema-datamodel packages/db/prisma/schema.prisma \
    --script
  # Expected: empty output (or only unrelated pre-existing diffs). Any ADD/DROP COLUMN
  # line for the 11 fields means a type or nullability was mistyped — stop and fix.
  # 4. Re-run the detector and expect schema_unknown_columns to drop to 0
  #    (after the §5 @map parser fix; until then it will still list the 2 rate_limit_counters names).
  python scripts/ops/migration_observability.py --json
  # 5. Do NOT run `prisma db push` or `prisma migrate deploy` for this change — no migration is needed.
  ```

- This document intentionally does **not** run `prisma migrate diff`, `db push`, or any migration, and does **not** edit `schema.prisma`. It is an unapplied proposal only.

## 8. Appendix: evidence commands used

```sql
-- Column inventory (data_type, is_nullable, column_default, character_maximum_length)
SELECT table_name, column_name, data_type, is_nullable, column_default,
       character_maximum_length
FROM information_schema.columns
WHERE (table_name='ingestion_runs' AND column_name IN ('remainingRequests','usedRequests'))
   OR (table_name='picks' AND column_name IN ('closingLine','closingPrice','clvCents','clvComputedAt','clvPoints','clvPositive'))
   OR (table_name='pick_signal_snapshots' AND column_name IN ('hadNgsSignal','lineAtPrediction','selectionAtPrediction'))
   OR (table_name='rate_limit_counters' AND column_name IN ('updated_at','window_start'));

-- Indexes referencing the 13 columns (pg_indexes), FKs (pg_constraint contype='f'),
-- and population counts (count(*) FILTER ...) for picks / pick_signal_snapshots / ingestion_runs.
```

Schema-side evidence: `grep` of `packages/db/prisma/schema.prisma` for each of the 13 names (0 hits for the 11; hits only via `RateLimitCounter`'s `@map`), plus `@@map` lookup — `IngestionRun → ingestion_runs`, `Pick → picks`, `PickSignalSnapshot → pick_signal_snapshots`, `RateLimitCounter → rate_limit_counters` (the model name is never the table name, hence the `@@map` step).
