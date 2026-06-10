-- R-13 — odds-quota burn-down visibility. Persist The Odds API request-quota
-- headers (x-requests-remaining / x-requests-used) on each IngestionRun so the
-- cockpit can show quota burn-down instead of relying on console logs.
--
-- Fully additive and idempotent: two NULLABLE integer columns, no defaults
-- backfilled, no index changes, no destructive change. A re-run (e.g. an
-- interrupted in-build migrate) is a no-op via ADD COLUMN IF NOT EXISTS.
-- Pre-existing rows simply stay NULL — the cockpit treats NULL as "no quota
-- data yet" and never fabricates a number.

ALTER TABLE "ingestion_runs" ADD COLUMN IF NOT EXISTS "remainingRequests" INTEGER;
ALTER TABLE "ingestion_runs" ADD COLUMN IF NOT EXISTS "usedRequests"      INTEGER;
