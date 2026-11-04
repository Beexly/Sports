-- ============================================================================
-- gse-postgres remediation plan — 2026-11-04
--
-- STATUS: REVIEWED, NOT EXECUTED. Every statement below was derived from
-- measurements in DB-ARCHITECTURE-ASSESSMENT-2026-11-04.md.
--
-- HOW TO RUN THIS. Do not pipe it wholesale. Execute P0 first, observe for a
-- few days, then P1. Each block is independent and safe to run alone.
--
--   neon psql <branch> --project-id summer-brook-99380762 --role-name neondb_owner
--
-- `hermes_ro` is read-only BY CONVENTION ONLY (it is a member of
-- neon_superuser), so nothing below should be run with it regardless.
--
-- Test on a DEV BRANCH first. Neon branches are copy-on-write and cheap; there
-- is no reason to trial this against main.
-- ============================================================================


-- ============================================================================
-- P0 — statistics and maintenance. No schema change. No downtime.
-- ============================================================================

-- ANALYZE cannot run concurrently and does not block reads/writes for long on
-- 9.1M rows, but run it off-peak anyway.
ANALYZE public.odds;
ANALYZE public.ingestion_runs;

-- The default autovacuum thresholds are wrong for a 9.1M-row table:
--   analyze fires at 50 + 0.1 * 7,746,213 = ~774,671 row changes
--   vacuum  fires at 50 + 0.2 * 7,746,213 = ~1,549,293 row changes
-- With autoanalyze_count = 0 on the hottest table, the histograms behind every
-- join and index decision are from an unknown older snapshot.
-- Dropping to 2% / 5% moves the analyze trigger to ~155K changes.
ALTER TABLE public.odds SET (
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_scale_factor  = 0.05,
  autovacuum_analyze_threshold    = 1000,
  autovacuum_vacuum_threshold     = 1000
);

-- ingestion_runs carries 9.2% dead tuples (6,012 of 65,639) with
-- last_autovacuum NULL and autovacuum_count = 0.
ALTER TABLE public.ingestion_runs SET (
  autovacuum_analyze_scale_factor = 0.05,
  autovacuum_vacuum_scale_factor  = 0.10
);
VACUUM (ANALYZE) public.ingestion_runs;

-- There are currently ZERO pg_cron jobs. Nothing maintains this database
-- except autovacuum defaults that are not firing on the largest table.
-- Uncomment after confirming the pg_cron schema is writable by the role.
--
-- SELECT cron.schedule('gse-analyze-hot', '17 3 * * *', $$
--   ANALYZE public.odds;
--   ANALYZE public.ingestion_runs;
--   ANALYZE public.odds_line_snapshots;
-- $$);
--
-- SELECT cron.schedule('gse-vacuum-sweep', '43 3 * * *', $$
--   VACUUM (ANALYZE) public.signals;
--   VACUUM (ANALYZE) public.ingestion_runs;
-- $$);


-- ============================================================================
-- P1 — provable index redundancy.
--
-- Each drop below is a strict leading-column prefix of a longer index on the
-- same table, so the composite already serves every query the shorter one
-- could. This is provable from the definitions and does not depend on the
-- reset pg_stat counters, unlike the 320 zero-scan indexes (which are NOT
-- safe to mass-drop on that evidence).
--
-- Payoff is write amplification more than bytes:
--   signals           26.9M updates x 1 fewer index maintained
--   player_game_stats  2.31M updates
--   odds               every insert into a 9.1M-row table
--
-- DROP INDEX CONCURRENTLY cannot run inside a transaction block. Run each
-- statement on its own, not in a BEGIN/COMMIT.
-- ============================================================================

-- 67 MB; 10,115 scans vs 19.5M on the composite.
DROP INDEX CONCURRENTLY IF EXISTS public.odds_gameId_idx;

-- ~2 MB
DROP INDEX CONCURRENTLY IF EXISTS public.jarvis_memory_events_scope_idx;

-- 1.6 MB; on a table taking 26.9M updates this is the highest-value drop.
DROP INDEX CONCURRENTLY IF EXISTS public.signals_entityType_entityId_idx;

-- 744 kB
DROP INDEX CONCURRENTLY IF EXISTS public.ingestion_runs_status_idx;

-- 464 kB
DROP INDEX CONCURRENTLY IF EXISTS public.player_game_stats_playerId_idx;

-- 392 kB
DROP INDEX CONCURRENTLY IF EXISTS public.source_snapshots_provider_sourceKind_idx;


-- ============================================================================
-- P1b — indexes with ZERO scans in the window. Higher risk.
--
-- OBSERVE FIRST. The pg_stat counters were reset mid-life (proven by odds
-- reporting 141,433 live rows against 9,123,098 actual), so a zero count means
-- "unused since the reset", not "unused". Do not run this block until either
--   (a) pg_stat_statements is installed and shows no matching query, or
--   (b) a full business cycle has elapsed with fresh counters.
-- ============================================================================

-- 71 MB, 0 scans. The only column is ingestionRunId, which is ingest-time
-- provenance — verify no diagnostic query filters on it.
-- DROP INDEX CONCURRENTLY IF EXISTS public.odds_ingestionRunId_idx;

-- `picks` carries 10 indexes on 5,130 rows and takes 42,780 updates. These four
-- are boolean / low-cardinality enum indexes that a 5K-row seq scan beats.
-- KEEP picks_gameId_pickType_key (20.3M scans), picks_pkey, picks_result_idx,
-- picks_settledAt_idx, picks_isPublished_isBootstrap_generatedAt_idx.
-- DROP INDEX CONCURRENTLY IF EXISTS public.picks_tier_idx;        -- 0 scans
-- DROP INDEX CONCURRENTLY IF EXISTS public.picks_pickGrade_idx;   -- 14 scans
-- DROP INDEX CONCURRENTLY IF EXISTS public.picks_isFeatured_idx;  -- 460 scans, boolean
-- DROP INDEX CONCURRENTLY IF EXISTS public.picks_clvVerdict_idx;  -- 3,212 scans


-- ============================================================================
-- P1c — duplicate pairs: a plain index shadowing a unique constraint on the
-- same column. Always redundant, always safe. Small tables, but they cost
-- writes on every INSERT/UPDATE.
-- ============================================================================

-- DROP INDEX CONCURRENTLY IF EXISTS public.users_email_idx;                          -- shadowed by users_email_key
-- DROP INDEX CONCURRENTLY IF EXISTS public.subscriptions_stripeCustomerId_idx;       -- shadowed by ..._key
-- DROP INDEX CONCURRENTLY IF EXISTS public.subscriptions_stripeSubscriptionId_idx;   -- shadowed by ..._key
-- DROP INDEX CONCURRENTLY IF EXISTS public.webhook_events_stripeEventId_idx;         -- shadowed by ..._key


-- ============================================================================
-- EXPLICITLY NOT DOING (see §9 of the assessment)
--
--   * Dropping odds_pkey (433 MB). It is a UNIQUE constraint. Nothing reads it
--     as a lookup path, but uniqueness enforcement is worth the cost. The
--     natural-key alternative costs roughly the same per entry.
--   * Partitioning odds_line_snapshots. 5.0M rows / 1.25 GB does not justify
--     the planning overhead. Revisit at ~20 GB.
--   * text -> uuid id migration. Saves ~4% of a 4.3 GB database and touches id
--     generation across the app. Not worth it.
--   * Mass-dropping all 320 zero-scan indexes. The counters were reset; that
--     evidence is directional only.
--   * Adding a shared_buffers or application cache tier. 98.7M index scans
--     against a 4.3 GB DB that fits in effective_cache_size = 3.2 GB is a
--     round-trip problem (an app-side N+1), not a memory problem.
-- ============================================================================


-- ============================================================================
-- VERIFICATION — run after each phase.
-- ============================================================================

-- Index inventory on the largest table; expect 5 -> 3 after P1.
-- SELECT indexrelname, pg_size_pretty(pg_relation_size(indexrelid)) AS size
-- FROM pg_stat_user_indexes WHERE relname = 'odds' ORDER BY pg_relation_size(indexrelid) DESC;

-- Autovacuum actually firing; autoanalyze_count must start climbing.
-- SELECT relname, n_live_tup, n_dead_tup, autovacuum_count, autoanalyze_count,
--        last_autovacuum, last_autoanalyze
-- FROM pg_stat_user_tables
-- WHERE relname IN ('odds','ingestion_runs','signals');

-- Planner estimate vs reality. The 15% gap should tighten after ANALYZE.
-- SELECT reltuples::bigint AS planner_est, (SELECT count(*) FROM odds) AS actual
-- FROM pg_class WHERE relname = 'odds';

-- Confirm the prefix drops actually removed the redundant duplicates.
-- SELECT tablename, indexname FROM pg_indexes
-- WHERE schemaname='public' AND indexname IN (
--   'odds_gameId_idx','signals_entityType_entityId_idx','ingestion_runs_status_idx',
--   'player_game_stats_playerId_idx','source_snapshots_provider_sourceKind_idx',
--   'jarvis_memory_events_scope_idx');
-- Expect: 0 rows.
