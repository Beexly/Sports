/**
 * Public-safe autonomy executor posture (no secrets, no network).
 *
 * Answers: "will the planner actually ACT, or only dry-run?"
 * Default is dry-run — AUTONOMY_EXECUTE must be true to invoke allow-listed crons.
 * Free-path ABSENT-only: never flips LAWS; never claims execution without env.
 *
 * Allow-list SoT: lib/autonomy/safe-cron-targets.ts (must match executor).
 */

import {
  AUTONOMY_EXECUTE_HINT_OFF,
  AUTONOMY_EXECUTE_HINT_ON,
  AUTONOMY_FREE_SPINE_SLA_MINUTES,
  AUTONOMY_SAFE_CRON_TARGETS,
} from "@/lib/autonomy/safe-cron-targets";

export {
  AUTONOMY_FREE_SPINE_SLA_MINUTES,
  AUTONOMY_SAFE_CRON_TARGETS,
} from "@/lib/autonomy/safe-cron-targets";

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

function envFlag(env: Env, name: string): boolean {
  return env[name]?.trim().toLowerCase() === "true";
}

export function loadAutonomyPosture(env: Env = process.env): AutonomyPosture {
  const executeEnabled = envFlag(env, "AUTONOMY_EXECUTE");
  const defaultDryRun = !executeEnabled;

  return {
    executeEnabled,
    defaultDryRun,
    freeSpineSlaMinutes: AUTONOMY_FREE_SPINE_SLA_MINUTES,
    safeCronTargets: AUTONOMY_SAFE_CRON_TARGETS,
    operatorHint: executeEnabled ? AUTONOMY_EXECUTE_HINT_ON : AUTONOMY_EXECUTE_HINT_OFF,
  };
}
