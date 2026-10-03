/**
 * Single source of truth for autonomy execute allow-list.
 * Used by autonomy-posture (ops surfaces) and execute-autonomy-cycle (actuator).
 *
 * Laws (hard):
 *   - Never includes gate-flip or owner-queue paths
 *   - Never invents scores — only existing free-path / free-adjacent crons
 *   - refresh-odds may spend THE_ODDS_API_KEY when present (not free-only)
 */

/** Distinct cron paths the planner may HTTP-invoke when AUTONOMY_EXECUTE=true. */
export const AUTONOMY_SAFE_CRON_TARGETS = [
  "/api/cron/free-spine-health",
  "/api/cron/settle-picks",
  "/api/cron/refresh-odds",
  "/api/cron/generate-drafts",
  "/api/cron/calibration-metrics",
  // "/api/cron/generate-signal-slate" removed per the #421 resolution. This list and
  // EXECUTABLE_CRON_TARGETS are checked against each other at load time precisely
  // because they must agree; the planner has no RUN_GENERATE_SIGNAL_SLATE action, so
  // permitting the path granted a capability nothing could use. The cron route itself
  // is unaffected and still runs on its own schedule — only the autonomy planner's
  // permission to invoke it is withdrawn. Restore both entries together if wired.
] as const;

export type AutonomySafeCronTarget = (typeof AUTONOMY_SAFE_CRON_TARGETS)[number];

/** Max distinct cron invocations per autonomy-cycle tick. */
export const AUTONOMY_MAX_ACTIONS_PER_CYCLE = 4;

/** Free-spine durable snap age ceiling (minutes). Keep in sync with operating-kernel I8. */
export const AUTONOMY_FREE_SPINE_SLA_MINUTES = 120;

export const AUTONOMY_EXECUTE_HINT_ON =
  "AUTONOMY_EXECUTE=true — planner may invoke free-spine-health, settle-picks, refresh-odds, generate-drafts, calibration-metrics (autonomousSafe only). Owner-queue + LAWS never auto-run.";

export const AUTONOMY_EXECUTE_HINT_OFF =
  "Default dry-run: autonomy-cycle plans only. Set AUTONOMY_EXECUTE=true (exact string) to close plan→act for allow-listed free-path crons (I9).";
