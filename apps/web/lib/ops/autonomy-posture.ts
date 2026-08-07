/**
 * Public-safe autonomy executor posture (no secrets, no network).
 *
 * Answers: "will the planner actually ACT, or only dry-run?"
 * Default is dry-run — AUTONOMY_EXECUTE must be true to invoke free crons.
 * Free-path ABSENT-only: never flips LAWS; never claims execution without env.
 */

export type Env = Record<string, string | undefined>;

export interface AutonomyPosture {
  /** AUTONOMY_EXECUTE=true enables real cron invocations for autonomousSafe acts. */
  readonly executeEnabled: boolean;
  /** Always true when executeEnabled is false — the safe default. */
  readonly defaultDryRun: boolean;
  /** Free-spine SLA used by the planner (minutes). */
  readonly freeSpineSlaMinutes: number;
  /** Public paths the executor may hit when executeEnabled. */
  readonly safeCronTargets: readonly string[];
  readonly operatorHint: string;
}

const SAFE_CRON_TARGETS = [
  "/api/cron/free-spine-health",
  "/api/cron/settle-picks",
] as const;

export const AUTONOMY_FREE_SPINE_SLA_MINUTES = 120;

function envFlag(env: Env, name: string): boolean {
  return env[name]?.trim().toLowerCase() === "true";
}

export function loadAutonomyPosture(env: Env = process.env): AutonomyPosture {
  const executeEnabled = envFlag(env, "AUTONOMY_EXECUTE");
  const defaultDryRun = !executeEnabled;

  let operatorHint: string;
  if (executeEnabled) {
    operatorHint =
      "AUTONOMY_EXECUTE=true — planner may invoke free-spine-health + settle-picks (autonomousSafe only). Owner-queue still never auto-runs.";
  } else {
    operatorHint =
      "Default dry-run: autonomy-cycle plans only. Set AUTONOMY_EXECUTE=true to close plan→act for free-spine + settle (I9).";
  }

  return {
    executeEnabled,
    defaultDryRun,
    freeSpineSlaMinutes: AUTONOMY_FREE_SPINE_SLA_MINUTES,
    safeCronTargets: SAFE_CRON_TARGETS,
    operatorHint,
  };
}
