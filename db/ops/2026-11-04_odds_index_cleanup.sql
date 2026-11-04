-- ============================================================================
-- gse-postgres operational remediation — 2026-11-04
--
-- STATUS: REVIEWED AND TESTED ON A BRANCH. Not applied to production.
--
-- THIS IS NOT A PRISMA MIGRATION, AND CANNOT BE ONE.
--
-- `packages/db` runs `prisma migrate deploy`, which wraps each migration file in
-- a transaction. Two statements in this file are forbidden inside a transaction,
-- both verified against a Neon branch on 2026-11-04:
--
--   BEGIN; VACUUM (ANALYZE) public.ingestion_runs; COMMIT;
--     ERROR:  VACUUM cannot run inside a transaction block
--   BEGIN; DROP INDEX CONCURRENTLY IF EXISTS public."odds_gameId_idx"; COMMIT;
--     ERROR:  DROP INDEX CONCURRENTLY cannot run inside a transaction block
--
-- So this belongs to the operational path (autocommit, one statement at a time),
-- not the forward-only additive schema chain that `migration-additivity.ts`
-- guards. That separation is correct on its own terms too: dropping an index or
-- tuning autovacuum does not change the column contract an older app version
-- reads, which is the only thing the Prisma chain exists to protect.
--
-- THE TRAP THIS FILE ALREADY FELL INTO ONCE.
--
-- Every identifier below that contains an uppercase letter MUST be double
-- quoted. Unquoted, PostgreSQL folds `odds_gameId_idx` to `oddsgameid_idx`,
-- which does not exist — and because the statement says IF EXISTS, that is a
-- SILENT NO-OP that still prints the `DROP INDEX` command tag.
--
-- Measured on a branch: the unquoted form reported success and dropped nothing
-- (`SELECT count(*) FROM pg_class WHERE relname='odds_gameId_idx'` returned 1);
-- the quoted form returned 0. Eleven of the sixteen drop statements in the first
-- draft of this file were silent no-ops for exactly this reason.
--
-- Therefore: never trust the command tag. Every block ends with a post-condition
-- query. `scripts/ops/db_architecture_check.py` asserts the same thing
-- independently.
--
-- HOW TO RUN
--   Run ONE statement at a time. Do not wrap in BEGIN/COMMIT.
--   `DROP INDEX CONCURRENTLY` cannot run in a transaction, and combining it
--   with a post-condition SELECT in a single -c is still inside one.
--
--   neon psql main --project-id summer-brook-99380762 --role-name neondb_owner \
--     -- -c 'DROP INDEX CONCURRENTLY IF EXISTS public."odds_gameId_idx";'
--
-- Order: P0 (statistics) first, observe, then P1 (drops).
-- ============================================================================


-- ============================================================================
-- P0 — statistics and maintenance. No schema change, no downtime.
-- ============================================================================

-- Safe inside a transaction; VACUUM is not (see header).
ANALYZE public.odds;
ANALYZE public.ingestion_runs;

-- Default thresholds need ~775K row changes to trigger autoanalyze on a
-- 9.1M-row table (50 + 0.1 * reltuples). autoanalyze_count was 0.
ALTER TABLE public.odds SET (
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_scale_factor  = 0.05,
  autovacuum_analyze_threshold    = 1000,
  autovacuum_vacuum_threshold     = 1000
);

ALTER TABLE public.ingestion_runs SET (
  autovacuum_analyze_scale_factor = 0.05,
  autovacuum_vacuum_scale_factor  = 0.10
);

-- Autocommit statement, not inside a transaction.
VACUUM (ANALYZE) public.ingestion_runs;

-- Post-condition: settings recorded.
--   SELECT relname, reloptions FROM pg_class WHERE relname = 'odds';
--   Expect: {autovacuum_analyze_scale_factor=0.02,...}


-- ============================================================================
-- P1 — provable index redundancy.
--
-- Each is a strict leading-column prefix of a longer index on the same table.
-- Verified NOT flagged by `findAdditivityViolations` (scripts/ops/
-- classify_ops_sql.mts): the classifier's `drop_object` pattern covers
-- DROP TABLE/TYPE/VIEW/SCHEMA/DATABASE, not indexes. Dropping an index does not
-- break a rolled-back app, so it is outside the additivity contract by design.
--
-- Payoff is write amplification more than bytes: signals takes 26.9M updates
-- and maintains five indexes; each drop removes that many index-update ops.
-- ============================================================================

-- 67 MB. Covered by "odds_gameId_fetchedAt_idx" (gameId, fetchedAt).
DROP INDEX CONCURRENTLY IF EXISTS public."odds_gameId_idx";

-- ~2 MB. Covered by "..._scope_type_created_idx" (scope, memory_type, created_at).
DROP INDEX CONCURRENTLY IF EXISTS public.jarvis_memory_events_scope_idx;

-- 1.6 MB. Covered by "..._entityType_entityId_key_season_week_key".
DROP INDEX CONCURRENTLY IF EXISTS public."signals_entityType_entityId_idx";

-- 744 kB. Covered by "..._status_completedAt_idx" (status, completedAt).
DROP INDEX CONCURRENTLY IF EXISTS public.ingestion_runs_status_idx;

-- 464 kB. Covered by "..._playerId_season_week_seasonType_key".
DROP INDEX CONCURRENTLY IF EXISTS public."player_game_stats_playerId_idx";

-- 392 kB. Covered by "..._provider_sourceKind_externalId_key".
DROP INDEX CONCURRENTLY IF EXISTS public."source_snapshots_provider_sourceKind_idx";

-- Post-condition: expect 0 rows.
--   SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN (
--     'odds_gameId_idx','jarvis_memory_events_scope_idx',
--     'signals_entityType_entityId_idx','ingestion_runs_status_idx',
--     'player_game_stats_playerId_idx','source_snapshots_provider_sourceKind_idx');


-- ============================================================================
-- ROLLBACK — recreate each index. Every drop above is reversible.
--
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction either. The
-- definitions are the originals, captured from pg_indexes before the drops.
-- Recreating is not free: on odds (9.1M rows) it takes seconds to minutes, and
-- the index is unavailable to the planner until it finishes.
-- ============================================================================

-- ROLLBACK P1:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "odds_gameId_idx"
--   ON public.odds USING btree ("gameId");
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS jarvis_memory_events_scope_idx
--   ON public.jarvis_memory_events USING btree (scope);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "signals_entityType_entityId_idx"
--   ON public.signals USING btree ("entityType", "entityId");
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS ingestion_runs_status_idx
--   ON public.ingestion_runs USING btree (status);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "player_game_stats_playerId_idx"
--   ON public.player_game_stats USING btree ("playerId");
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "source_snapshots_provider_sourceKind_idx"
--   ON public.source_snapshots USING btree (provider, "sourceKind");

-- ROLLBACK P0:
-- ALTER TABLE public.odds RESET (autovacuum_analyze_scale_factor,
--   autovacuum_vacuum_scale_factor, autovacuum_analyze_threshold,
--   autovacuum_vacuum_threshold);
-- ALTER TABLE public.ingestion_runs RESET (autovacuum_analyze_scale_factor,
--   autovacuum_vacuum_scale_factor);
-- NOTE: ANALYZE has no inverse and needs none — it only refreshes statistics.


-- ============================================================================
-- P1b / P1c — HIGHER RISK, NOT APPROVED. Left commented on purpose.
--
-- The pg_stat counters were reset mid-life (odds reported 141,433 live rows
-- against 9,123,098 actual), and the DB-wide zero-scan set then moved from
-- 320 indexes / 562 MB to 318 / 59 MB within minutes. That evidence cannot
-- justify DDL. Enable only after pg_stat_statements is installed or a full
-- business cycle of fresh counters has elapsed.
--
-- 71 MB, 0 scans — verify no diagnostic query filters on ingestionRunId:
-- DROP INDEX CONCURRENTLY IF EXISTS public."odds_ingestionRunId_idx";
--
-- picks: 10 indexes on 5,130 rows taking 42,780 updates.
-- DROP INDEX CONCURRENTLY IF EXISTS public.picks_tier_idx;
-- DROP INDEX CONCURRENTLY IF EXISTS public."picks_pickGrade_idx";
-- DROP INDEX CONCURRENTLY IF EXISTS public."picks_isFeatured_idx";
-- DROP INDEX CONCURRENTLY IF EXISTS public."picks_clvVerdict_idx";
--
-- duplicates (plain index shadowing a unique constraint on the same column):
-- DROP INDEX CONCURRENTLY IF EXISTS public.users_email_idx;
-- DROP INDEX CONCURRENTLY IF EXISTS public."subscriptions_stripeCustomerId_idx";
-- DROP INDEX CONCURRENTLY IF EXISTS public."subscriptions_stripeSubscriptionId_idx";
-- DROP INDEX CONCURRENTLY IF EXISTS public."webhook_events_stripeEventId_idx";
-- ============================================================================
