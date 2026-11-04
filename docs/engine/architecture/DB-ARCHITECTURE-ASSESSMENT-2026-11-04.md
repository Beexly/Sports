# Database Architecture Assessment — gse-postgres, 2026-11-04

**Scope.** `gse-postgres` (`summer-brook-99380762`, main branch, PG 17, Neon
aws-us-east-1). 120 tables in `public`, plus `lit` (10) and `watch` (6).
All figures below were measured against production with `hermes_ro`, not taken
from documentation or an earlier report.

**Verdict up front: this is not a scale problem. It is a hygiene problem.**
4,279 MB total, largest table 9.1M rows. A single Postgres instance handles that
trivially. The defects are maintenance and index design, and they are cheap to
fix. Do not shard, do not introduce a broker, do not partition anything yet.

---

## 1. What the system is

An OLTP workload with a read-heavy skew and a small footprint:

- **Writes:** `odds_line_snapshots` 5,035,283 rows / 1.25 GB (1,540 games,
  1,959 distinct markets — this is the player-prop history table, not a small
  enum column); `odds` 9,123,098 rows / 1.50 GB heap. Together 64% of the
  database.
- **Reads:** 98.7M index scans accumulated in the current stats window.
- **Hot-row churn:** `signals` 26.9M updates over 128K rows (208 per row),
  `games` 2.27M over 5,254 (431 per row), `players` 531K over 1,454 (365/row).
  These are "current state" tables updated in place, which is a legitimate
  design choice but shifts the burden onto autovacuum.
- **Extensions:** `pg_cron` installed with **zero scheduled jobs**, `vector`
  (pgvector) for the `lit`/`premise_vector` retrieval path, `pg_session_jwt`.

## 2. Defect 1 — `odds` carries 56% index overhead

> **Measurement instability, observed live.** The DB-wide zero-scan set read
> **320 indexes / 562 MB** at 11:5x and **318 indexes / 59 MB** minutes later —
> a 503 MB swing with no schema change. The two that left the set were
> `odds_pkey` (433 MB) and `odds_ingestionRunId_idx` (71 MB). Nothing was
> dropped; the counters simply moved.
>
> This is not a footnote, it is the finding. It proves the zero-scan signal is
> unstable across a window this short, and therefore **must not drive DDL.**
> The real droppable set is the provable one in §5 (~72 MB of prefix
> redundancy), not the 562 MB the first reading suggested.

| index | size | scans |
|---|---|---|
| `odds_pkey` UNIQUE(id) | **433 MB** | **1** |
| `odds_gameId_fetchedAt_idx` | 195 MB | 19,514,975 |
| `odds_ingestionRunId_idx` | **71 MB** | **0** |
| `odds_fetchedAt_idx` | 69 MB | 16,354,080 |
| `odds_gameId_idx` | **67 MB** | 10,115 |

834 MB of indexes on a 1,499 MB heap. One of the five is **provably** dead
weight and one is probably dead weight:

- `odds_gameId_idx` — 67 MB, and a **strict prefix** of
  `odds_gameId_fetchedAt_idx`, so the composite already serves every query the
  narrower index could serve. 10,115 scans against 19.5M on the composite
  confirms traffic goes to the composite. **Provable — drop it.**
- `odds_ingestionRunId_idx` — 71 MB. Zero scans in the first reading, then it
  picked one up minutes later. See the instability note above: **verify, don't
  assume.**

**67 MB provably droppable; 138 MB if the ingestionRunId index is confirmed.**

`odds_pkey` is the interesting one: 433 MB — 10% of the entire database — for an
index that registered a single scan in the first reading (and a handful since). It is a UNIQUE index on a 25-character text id.
It must be kept as long as surrogate-id uniqueness is enforced at the database
rather than the application. But it costs ~47 bytes per row on every one of 9.1M
rows and every insert. If the app enforces id uniqueness upstream, replacing it
with a natural unique key on `(gameId, bookmaker, market, fetchedAt)` would cost
roughly the same per entry — so **I am not recommending dropping it.** Flagging
it because 433 MB is a large number for an index nothing reads.

### The counter-reset trap — read this before dropping anything

`pg_stat_user_tables` reports `odds` at **141,433 live rows**. The exact count is
**9,123,098**. The stats counters were reset after the bulk load: `n_tup_ins`
equals `n_live_tup` exactly, and `n_tup_del` is 0.

Consequences for the "320 unused indexes" headline:

- The absolute number of scans is **windowed**, not lifetime. A count of 0 means
  "not used since the reset," not "never used."
- **Relative comparisons within the window are valid** — all indexes share it.
  That is why `odds_pkey` at 1 scan vs `odds_gameId_fetchedAt_idx` at 19.5M is a
  real signal, while "320 indexes have zero scans" is only directional.
- `pg_stat_statements` is **not installed**, so there is no query-level evidence
  to attribute scans to statements. This is the single biggest evidence gap in
  this document.

**Therefore: do not schedule 320 DROPs on this evidence.** A naive mass-drop is
how you cause an outage. Use the provable subset in §5, and gate the rest behind
a full business cycle of fresh counters or an installed `pg_stat_statements`.

## 3. Defect 2 — default autovacuum thresholds never fire on the largest table

| table | rows | autoanalyze_count | autovacuum_count | last_autoanalyze |
|---|---|---|---|---|
| `odds` | 9,123,098 | **0** | **0** | **NULL** |
| `ingestion_runs` | 59,627 | 2 | **0** | 2026-10-28 |
| `odds_line_snapshots` | 4,963,442 | 2 | 1 | 2026-10-19 |
| `signals` | 128,818 | 1,600 | 8 | 2026-11-04 |

Autovacuum is `on` with **default** thresholds: analyze at
`50 + 0.1 × n`, vacuum at `50 + 0.2 × n`. For a 9.1M-row table that means
~775K row changes before autoanalyze triggers and ~1.55M before autovacuum does.

The planner's row estimate for `odds` is 7,746,213 against 9,123,098 actual — a
15% under-count. That is tolerable. **The real risk is column-level statistics.**
With `autoanalyze_count = 0`, the histograms for `gameId`, `bookmaker`, `market`
and `fetchedAt` are from an unknown older snapshot. If bookmaker mix or game
distribution shifted since, selectivity estimates on the hottest table are wrong,
and wrong selectivity means wrong join order and wrong index choice — with no
error and no symptom until a query gets slow.

`ingestion_runs` is the other gap: 9.2% dead tuples (6,012 of 65,639),
`last_autovacuum` NULL, zero autovacuum runs. That is bloat that nothing is
reclaiming.

**This is the highest-value, lowest-risk item in the document.** Per-table
autovacuum settings on `odds` cost nothing and remove a silent failure mode.

## 4. Defect 3 — read amplification: 98.7M index scans against 4.3 GB

Three indexes absorb the majority of the scans:

| index | scans | table rows |
|---|---|---|
| `signals_entityType_entityId_key_season_week_key` | 26,981,460 | 128,818 |
| `picks_gameId_pickType_key` | 20,323,931 | 5,130 |
| `odds_gameId_fetchedAt_idx` | 19,514,975 | 9,123,098 |

20.3M scans on a unique index over a **5,130-row** table is the anomaly. The
whole table is ~400 kB; it is already in cache. Those scans are not I/O — they
are query round-trips. That is the signature of an application loop doing a
point lookup per pick (an N+1), not a database design problem. 27M scans on
`signals` against 128K rows says the same thing.

`effective_cache_size` is 3.2 GB against a 4.3 GB database, and `shared_buffers`
is 128 MB (Neon proxies the rest). The cache layer is already sized correctly.
**The right fix is application-side: batch the per-pick lookups or put a
read-through cache in front of the picks-by-game endpoint.** Adding a database
cache tier would be treating a symptom.

## 5. Provable index redundancy — the safe drop list

Six indexes are a strict leading-column prefix of a longer index on the same
table. Unlike the zero-scan list, this is provable from the definitions:

| table | drop | already served by | size |
|---|---|---|---|
| `odds` | `odds_gameId_idx` | `odds_gameId_fetchedAt_idx` | 67 MB |
| `jarvis_memory_events` | `jarvis_memory_events_scope_idx` | `..._scope_type_created_idx` | ~2 MB |
| `signals` | `signals_entityType_entityId_idx` | `..._key_season_week_key` | 1.6 MB |
| `ingestion_runs` | `ingestion_runs_status_idx` | `..._status_completedAt_idx` | 744 kB |
| `player_game_stats` | `player_game_stats_playerId_idx` | `..._playerId_season_week_seasonType_key` | 464 kB |
| `source_snapshots` | `source_snapshots_provider_sourceKind_idx` | `..._provider_sourceKind_externalId_key` | 392 kB |

Total ~72 MB — small in bytes. **The payoff is write amplification, not storage.**
`signals` takes 26.9M updates and each one maintains five indexes; removing one
removes 26.9M index-update operations. `player_game_stats` takes 2.31M updates.
That is the argument, and it is stronger than the byte count suggests.

**Honest caveat:** a prefix index is not always free to drop. The narrower index
is smaller and cheaper to scan for queries that filter only on the leading
column. Drop the prefix where the narrower query is not latency-critical; keep it
where it is. `odds_gameId_idx` at 10,115 scans is clearly not carrying traffic.

Also eight identical index pairs exist on small tables (`users_email_idx` +
`users_email_key`, `subscriptions_stripeCustomerId_idx` + `_key`, etc.) — a plain
index shadowing a unique constraint on the same column. Always waste; safe to drop.

## 6. Defect 4 — `picks` is over-indexed 10x for its size

10 indexes on 5,130 rows, taking 42,780 updates. Every update maintains all ten.

| index | scans | size |
|---|---|---|
| `picks_gameId_pickType_key` | 20,323,931 | 392 kB |
| `picks_pkey` | 348,362 | 344 kB |
| `picks_result_idx` | 127,189 | 88 kB |
| `picks_isPublished_isBootstrap_generatedAt_idx` | 47,419 | 232 kB |
| `picks_generatedAt_idx` | 21,366 | 152 kB |
| `picks_clvVerdict_idx` | 3,212 | 72 kB |
| `picks_settledAt_idx` | 2,594 | 184 kB |
| `picks_isFeatured_idx` | 460 | 88 kB |
| `picks_pickGrade_idx` | 14 | 112 kB |
| `picks_tier_idx` | **0** | 104 kB |

`picks_isFeatured_idx` indexes a **boolean**. A boolean index on a 5K-row table
is nearly always a seq-scan win; the planner will skip it and still pay its
maintenance cost. `picks_tier_idx`, `picks_pickGrade_idx` and `picks_clvVerdict_idx`
are low-cardinality enum indexes in the same category. Candidates to drop, in
that order, after checking `picks_result_idx` and `picks_settledAt_idx` against
the settlement queries.

## 7. Schema gaps

**`closingPrice` is 0% populated.** 0 of 3,143 settled published picks. CLV is
not merely missing from a snapshot — it is **structurally uncomputable** from
`picks`. `clvLockPrice` is 8.2% populated. Any CLV figure the product quotes
cannot be derived from this table. This is a data-contract defect, not an index
problem, and it needs a capture path before a schema change can help. Detail in
`CALIBRATION-DB-VERIFICATION-2026-11-04.md`.

**Text-typed surrogate ids.** `odds.id` and `odds.gameId` average 25 characters
(cuid-style), stored as `text`. Converting to native `uuid` would save roughly
9–10 bytes per row: ~91 MB in heap and ~90 MB in the PK index on `odds`, about
4% of the database.

**I am not recommending that migration.** It touches id generation in the
application, every foreign key referencing those columns, and the ingestion
pipeline, for a 4% storage win on a database with 2.5 GB of headroom. The cost
is real and the benefit does not pay for itself. Revisit only if the dataset
grows past ~50 GB or index maintenance becomes a measured bottleneck.

## 8. Phased plan

**P0 — no schema change, no downtime, do this week**
1. `ANALYZE public.odds;` — refresh the column histograms on the hottest table.
2. Set per-table autovacuum on `odds`:
   `autovacuum_analyze_scale_factor = 0.02`, `autovacuum_vacuum_scale_factor = 0.05`.
   At 9.1M rows that drops the analyze trigger from ~775K changes to ~155K.
3. Vacuum `ingestion_runs` to clear the 9.2% dead tuples.
4. Schedule a `pg_cron` job for periodic ANALYZE on the hot tables and a daily
   dead-tuple check. There are currently **zero** cron jobs; nothing maintains
   this database but autovacuum's defaults, and those are not firing.

**P1 — provable index drops, low risk**
5. Drop the six prefix-redundant indexes in §5 and the eight duplicate pairs.
6. Drop `odds_ingestionRunId_idx` (71 MB, 0 scans) after confirming with
   `pg_stat_statements` or a full business cycle that no query filters on it.

**P2 — application-level read amplification**
7. Find the code path behind 20.3M lookups on a 5K-row table. Batch or cache.
   This is where the real query cost lives.

**P3 — deferred**
8. `odds_pkey` 433 MB: keep. Revisit only if insert latency is measured as a
   problem.
9. Partitioning `odds_line_snapshots`: **not now.** 5M rows / 1.25 GB does not
   justify it. Revisit at ~20 GB or when time-range queries degrade.
10. text → uuid ids: **not now**, per §7.

## 9. What I am deliberately not recommending

- **Sharding / Citus / a second node.** 4.3 GB does not need it. The problems are
  local.
- **Time-series partitioning right now.** 5M rows is well inside a single table's
  comfortable range; partitioning adds planning overhead and migration risk for
  no measured benefit.
- **A Redis / caching tier.** The database already fits in cache. The 98.7M scans
  are round-trips from application loops — fix the loop.
- **A wholesale text→uuid migration.** Measured benefit ~4% of storage.
- **Dropping the zero-scan indexes in bulk.** The counters were reset, and the
  set then shrank by 503 MB on its own within minutes of being measured. A
  562 MB reading and a 59 MB reading of the same question an hour apart cannot
  both justify DDL. Use §5's provable redundancy instead.

## 10. Evidence limits

- `pg_stat_statements` is not installed. Index scan counts cannot be attributed
  to statements. **This is the main gap**; installing it is itself a P0 item if
  index tuning is to continue.
- Stats counters were reset mid-life (proven by `odds`: 141,433 reported vs
  9,123,098 actual, `n_tup_ins` = `n_live_tup`). Absolute counts are windowed;
  only within-window comparisons are trustworthy.
- No read replica, so read/write split cannot be measured. Everything here is a
  single-node observation.
- `n_live_tup` on `odds` is wrong by 98.4%. Any prior report that quoted row
  counts from `pg_stat_user_tables` for this table inherited that error — mine
  did, and it was caught only by running `count(*)`.
- `odds` and `odds_line_snapshots` were both re-counted exactly after the
  discrepancy above: 9,123,098 and 5,035,283. `signals` (128,818) and `picks`
  (5,150) matched their reported figures exactly, so the counter reset did not
  distort every table — but it did distort the one that matters most.

## 11. Migration mechanics, and a bug in the first draft

The remediation SQL lives at `db/ops/2026-11-04_odds_index_cleanup.sql`. It
replaces an earlier draft in `docs/engine/architecture/` which was **wrong**, and
the way it was wrong is worth recording.

### It cannot be a Prisma migration

`packages/db` runs `prisma migrate deploy`, which wraps each migration in a
transaction. Two statements here are forbidden inside one. Both were verified
against a throwaway Neon branch, not assumed:

    BEGIN; VACUUM (ANALYZE) public.ingestion_runs; COMMIT;
      ERROR:  VACUUM cannot run inside a transaction block

    BEGIN; DROP INDEX CONCURRENTLY IF EXISTS public."odds_gameId_idx"; COMMIT;
      ERROR:  DROP INDEX CONCURRENTLY cannot run inside a transaction block

So this belongs on an operational path that runs in autocommit, one statement at
a time. That split is also correct on its own terms: `migration-additivity.ts`
exists to guarantee that a rolled-back app still meets a schema it can read.
Dropping an index or tuning autovacuum does not touch the column contract, so it
is outside that invariant — and `findAdditivityViolations` confirms it, since its
`drop_object` pattern covers `DROP TABLE/TYPE/VIEW/SCHEMA/DATABASE` and not
indexes.

### 11 of 16 drop statements were silent no-ops

This schema uses camelCase names. Unquoted, Postgres folds `odds_gameId_idx` to
`oddsgameid_idx`, which does not exist — and `IF EXISTS` turns that into a silent
no-op that **still prints the `DROP INDEX` command tag**.

Measured on the branch:

    DROP INDEX IF EXISTS public.odds_gameId_idx;
      -> DROP INDEX                                     (looks like success)
      -> count(*) FROM pg_class ... -> 1                (nothing dropped)

    DROP INDEX CONCURRENTLY IF EXISTS public."odds_gameId_idx";
      -> DROP INDEX
      -> count(*) -> 0                                  (actually dropped)

Six of the eight P1 names contain an uppercase letter; with the P1b/P1c blocks,
eleven of sixteen statements in the first draft would have done nothing while
reporting success. I initially read the command tag as confirmation and wrote
"applies cleanly" — that claim was wrong and is retracted here.

The lesson generalises past this file: **the command tag is not a post-condition.**
Every block in the new file ends with a verification query, and
`scripts/guardrails/sql-identifier-case.mjs` now fails the build on any unquoted
camelCase identifier in a DDL object position, so the mistake cannot return
silently.

### What the branch test established

On a Neon branch (`hermes-migration-test`, deleted after use):

- All six P1 drops applied; post-condition count of remaining indexes: **0**.
- `odds` went from 5 indexes to 4.
- Rollback (`CREATE INDEX CONCURRENTLY` on the original definition) succeeded and
  was asserted: **26.9 seconds** to rebuild 67 MB over 9.1M rows.

That 27-second rebuild is the real cost of reversing a drop, and it is why the
rollback is documented per-index in the SQL file rather than assumed.
