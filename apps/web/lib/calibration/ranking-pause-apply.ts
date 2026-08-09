/**
 * Ranking pause-list apply gate.
 *
 * RPCP / proven-path may *recommend* pauseGroups (sport|market dead groups).
 * Applying them to public filter / generation is founder-opt-in:
 *
 *   RANKING_PAUSE_APPLY=true  → plan.pauseGroups take effect
 *   default / unset / false   → plan pause is advisory only (ops + operatorHint)
 *
 * Explicit SELECTIVE_PAUSE_GROUPS env always applies (founder typed the list).
 * Maps stay OFF. This is ranking quality control, not calibration maps.
 * Does not open PROVEN or flip eligibility.
 */

import type { ProvenPathPlan } from "@/lib/calibration/proven-path-engine";

export type EnvMap = Record<string, string | undefined>;

/** Default OFF — plan pause is residual evidence until founder enables. */
export function isRankingPauseApplyEnabled(env: EnvMap = process.env): boolean {
  const v = env["RANKING_PAUSE_APPLY"]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * Resolve paused group keys for selective / generation filters.
 * - SELECTIVE_PAUSE_GROUPS (comma list) always wins when non-empty
 * - else plan.pauseGroups only when RANKING_PAUSE_APPLY is on
 * - else empty (advisory only)
 */
export function resolvePausedGroups(
  env: EnvMap = process.env,
  plan: Pick<ProvenPathPlan, "pauseGroups"> | null = null,
): {
  readonly pausedGroups: readonly string[];
  readonly source: "env" | "plan" | "none";
  readonly applyEnabled: boolean;
  readonly planPauseCount: number;
  readonly operatorHint: string;
} {
  const applyEnabled = isRankingPauseApplyEnabled(env);
  const planPause = plan?.pauseGroups ?? [];
  const planPauseCount = planPause.length;

  const pauseRaw = env["SELECTIVE_PAUSE_GROUPS"]?.trim() ?? "";
  const envPause = pauseRaw
    ? pauseRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  if (envPause.length > 0) {
    return {
      pausedGroups: envPause,
      source: "env",
      applyEnabled,
      planPauseCount,
      operatorHint: `Pause list from SELECTIVE_PAUSE_GROUPS (${envPause.length} groups). Plan recommended ${planPauseCount}.`,
    };
  }

  if (applyEnabled && planPauseCount > 0) {
    return {
      pausedGroups: planPause,
      source: "plan",
      applyEnabled: true,
      planPauseCount,
      operatorHint: `RANKING_PAUSE_APPLY on — applying ${planPauseCount} plan pause group(s). Re-measure RES after settle.`,
    };
  }

  return {
    pausedGroups: [],
    source: "none",
    applyEnabled,
    planPauseCount,
    operatorHint:
      planPauseCount > 0
        ? `Plan recommends pause on ${planPauseCount} sport|market group(s) but RANKING_PAUSE_APPLY is OFF (default). Ops-only until founder enables.`
        : "No pause groups recommended. Independent coverage / ranking features first.",
  };
}

export function rankingPauseApplyPosture(
  env: EnvMap = process.env,
  plan: Pick<ProvenPathPlan, "pauseGroups"> | null = null,
): {
  readonly applyEnabled: boolean;
  readonly source: "env" | "plan" | "none";
  readonly pausedGroupCount: number;
  readonly planPauseCount: number;
  readonly operatorHint: string;
} {
  const r = resolvePausedGroups(env, plan);
  return {
    applyEnabled: r.applyEnabled,
    source: r.source,
    pausedGroupCount: r.pausedGroups.length,
    planPauseCount: r.planPauseCount,
    operatorHint: r.operatorHint,
  };
}
