-- pg_cron PREP — NOT APPLIED. Do not run until the founder provides a Neon API key.
--
-- Why this file exists (Neon round-2 leverage, 2026-09-28): pg_cron IS
-- available on Neon. Pure-SQL maintenance jobs can move off Vercel crons
-- entirely — transactional, zero-hop, no Vercel timeout, no function
-- invocation. Marginal duty-cycle cost is ~$0 because the 23 Vercel crons
-- already pin the prod compute awake (scale-to-zero needs 5 idle minutes).
--
-- Enablement (needs the Neon API key — founder tap):
--   1. API: set `cron.database_name` on the prod compute endpoint to the
--      database that holds these tables (setting is per endpoint/branch).
--   2. Restart the compute endpoint (drops connections — do it on a branch
--      first, then prod in a maintenance window).
--   3. SQL: CREATE EXTENSION pg_cron;
--   4. SQL: the schedule() call below. All schedules are UTC.
--   5. Monitor: SELECT * FROM cron.job_run_details ORDER BY start_time DESC;
--
-- SCOPE WARNING — read before widening this file:
-- pg_cron can only run SQL. The Vercel cron /api/cron/prune-rate-limits wraps
-- its DELETE in a governance layer (SYSTEM principal "system:rate-limit-
-- retention", immutable ActorReceipt audit row). That wrapper CANNOT move to
-- pg_cron — there is no HTTP, no auth context, no audit write from inside
-- the job. The correct migration is: pg_cron owns the pure-SQL DELETE below;
-- the Vercel route keeps the governance wrapper and becomes a no-op receipt
-- check, OR the whole job moves to a Neon Function later. Do NOT schedule
-- jobs that need JS, HTTP, or audit-trail writes here.
-- calibration-metrics is NOT a candidate (brier/ECE/bakeoffs are heavy JS
-- plus on-disk ops artifacts). reconcile-entitlements needs a line-by-line
-- audit before it qualifies.

-- Pure-SQL core of /api/cron/prune-rate-limits (daily 06:30 UTC, vercel.json).
-- Retention bound: 48h (RATE_COUNTER_MAX_RETENTION_MS in
-- apps/web/lib/community/durable-rate-limiter.ts). The coding agent MUST bind
-- the exact table/column names from that module before applying — the names
-- below are the documented contract, verify against the module.
SELECT cron.schedule(
  'prune-rate-limit-counters',
  '30 6 * * *',
  $$DELETE FROM rate_limit_counters WHERE expires_at < now() - interval '48 hours'$$
);

-- Rollback:
-- SELECT cron.unschedule('prune-rate-limit-counters');
