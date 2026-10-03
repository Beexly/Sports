/**
 * Ranking pause-list apply gate.
 *
 * RPCP / proven-path may *recommend* pauseGroups (sport|market dead groups).
 * Applying them to public filter / generation is founder-opt-in:
 *
 *   1. SELECTIVE_PAUSE_GROUPS env — always applies when non-empty
 *   2. RANKING_PAUSE_APPLY=true env → plan.pauseGroups
 *   3. Durable founder-yes snap (JarvisMemoryEvent) → plan or snap.groups
 *   default → plan pause is advisory only
 *
 * Maps stay OFF. Does not open PROVEN or flip PERFORMANCE_STATS.
 */

import type { ProvenPathPlan } from "@/lib/calibration/proven-path-engine";
import type { RankingPauseDurableSnap } from "@/lib/ops/ranking-pause-durable";

export type EnvMap = Record<string, string | undefined>;

export type PauseResolveResult = {
  readonly pausedGroups: readonly string[];
  readonly source: "env" | "plan" | "durable" | "none";
  readonly applyEnabled: boolean;
  readonly planPauseCount: number;
  readonly planPauseGroups: readonly string[];
  readonly operatorHint: string;
};

/** Default OFF — plan pause is residual evidence until founder enables. */
export function isRankingPauseApplyEnabled(env: EnvMap = process.env): boolean {
  const v = env["RANKING_PAUSE_APPLY"]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * Resolve paused group keys for selective / generation filters.
 * Optional durableSnap is the multi-isolate founder-yes path.
 */
export function resolvePausedGroups(
  env: EnvMap = process.env,
  plan: Pick<ProvenPathPlan, "pauseGroups"> | null = null,
  durableSnap: RankingPauseDurableSnap | null = null,
): PauseResolveResult {
  const envApply = isRankingPauseApplyEnabled(env);
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
      applyEnabled: true,
      planPauseCount,
      planPauseGroups: planPause,
      operatorHint: `Pause list from SELECTIVE_PAUSE_GROUPS (${envPause.length} groups). Plan recommended ${planPauseCount}.`,
    };
  }

  if (envApply && planPauseCount > 0) {
    return {
      pausedGroups: planPause,
      source: "plan",
      applyEnabled: true,
      planPauseCount,
      planPauseGroups: planPause,
      operatorHint: `RANKING_PAUSE_APPLY env on — applying ${planPauseCount} plan pause group(s): ${planPause.slice(0, 6).join(", ")}${planPauseCount > 6 ? "…" : ""}. Re-measure RES after settle.`,
    };
  }

  // Durable founder-yes (chat/ops) without waiting for Vercel env redeploy
  if (durableSnap?.enabled) {
    const groups =
      durableSnap.groups.length > 0
        ? durableSnap.groups
        : planPause;
    if (groups.length > 0) {
      return {
        pausedGroups: groups,
        source: "durable",
        applyEnabled: true,
        planPauseCount,
        planPauseGroups: planPause,
        operatorHint: `Durable RANKING_PAUSE_APPLY ON (${groups.length} groups) setBy=${durableSnap.setBy} at ${durableSnap.setAt}. ${durableSnap.note}`.slice(
          0,
          400,
        ),
      };
    }
  }

  return {
    pausedGroups: [],
    source: "none",
    applyEnabled: envApply || Boolean(durableSnap?.enabled),
    planPauseCount,
    planPauseGroups: planPause,
    operatorHint:
      planPauseCount > 0
        ? `Plan recommends pause on ${planPauseCount} sport|market group(s) [${planPause.slice(0, 6).join(", ")}${planPauseCount > 6 ? "…" : ""}] but RANKING_PAUSE_APPLY is OFF (default). Ops-only until founder enables — do not invent PROVEN.`
        : "No pause groups recommended. Independent coverage / ranking features first.",
  };
}

export function rankingPauseApplyPosture(
  env: EnvMap = process.env,
  plan: Pick<ProvenPathPlan, "pauseGroups"> | null = null,
  durableSnap: RankingPauseDurableSnap | null = null,
): {
  readonly applyEnabled: boolean;
  readonly source: "env" | "plan" | "durable" | "none";
  readonly pausedGroupCount: number;
  readonly planPauseCount: number;
  readonly planPauseGroups: readonly string[];
  readonly operatorHint: string;
} {
  const r = resolvePausedGroups(env, plan, durableSnap);
  return {
    applyEnabled: r.applyEnabled && r.pausedGroups.length > 0,
    source: r.source,
    pausedGroupCount: r.pausedGroups.length,
    planPauseCount: r.planPauseCount,
    planPauseGroups: r.planPauseGroups,
    operatorHint: r.operatorHint,
  };
}
