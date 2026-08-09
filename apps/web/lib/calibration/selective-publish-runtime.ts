/**
 * Runtime selective publish + pause-list for public board rows.
 * PROVEN path: default ON (opt-out with SELECTIVE_PUBLISH_ENABLED=false).
 * Pause groups load from durable proven-path plan when present.
 */

import {
  passesSelectiveThresholds,
  type SelectiveThresholds,
} from "@/lib/calibration/selective-publish";
import type { ProvenPathPlan } from "@/lib/calibration/proven-path-engine";

export type PublicPickLike = {
  readonly confidence?: number | null;
  /** Prefer rankingScore (0–100) when independents priced the ranking path. */
  readonly rankingScore?: number | null;
  readonly edgeScore?: number | null;
  readonly pickType?: string | null;
  readonly sportKey?: string | null;
  readonly marketImpliedProb?: number | null;
  /** Priced independent rankingP (0–1) when available. */
  readonly rankingP?: number | null;
};

const DEFAULT_DELTA = 0.1;

/** Opt-out: false only when env === "false"; unset/true → ON for PROVEN path. */
export function isSelectivePublishRuntimeEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const v = env["SELECTIVE_PUBLISH_ENABLED"]?.trim();
  if (v === "false") return false;
  if (v === "true") return true;
  // default ON — path to PROVEN requires fewer, better-ranked published picks
  return true;
}

export function loadSelectiveRuntimeConfig(
  env: Record<string, string | undefined> = process.env,
  plan: ProvenPathPlan | null = null,
): {
  readonly enabled: boolean;
  readonly thresholds: SelectiveThresholds;
  readonly pausedGroups: readonly string[];
} {
  const enabled = isSelectivePublishRuntimeEnabled(env);
  const deltaRaw = env["SELECTIVE_PUBLISH_DELTA"]?.trim();
  const deltaFromEnv = deltaRaw ? Number(deltaRaw) : NaN;
  const delta = Number.isFinite(deltaFromEnv)
    ? deltaFromEnv
    : plan?.selectiveRecommended?.delta ?? plan?.defaultDelta ?? DEFAULT_DELTA;

  const pauseRaw = env["SELECTIVE_PAUSE_GROUPS"]?.trim() ?? "";
  const envPause = pauseRaw
    ? pauseRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const pausedGroups =
    envPause.length > 0 ? envPause : plan?.pauseGroups ?? [];

  return {
    enabled,
    thresholds: {
      delta,
      edge: plan?.selectiveRecommended?.edge ?? null,
      minGroupRes: null,
    },
    pausedGroups,
  };
}

let cachedPlan: ProvenPathPlan | null | undefined;

export async function getCachedProvenPathPlan(): Promise<ProvenPathPlan | null> {
  if (cachedPlan !== undefined) return cachedPlan;
  try {
    const { loadProvenPathPlan } = await import("@/lib/ops/proven-path-durable");
    cachedPlan = await loadProvenPathPlan();
  } catch {
    cachedPlan = null;
  }
  return cachedPlan;
}

export function passesPublicSelectiveFilter(
  pick: PublicPickLike,
  env: Record<string, string | undefined> = process.env,
  plan: ProvenPathPlan | null = null,
): boolean {
  const cfg = loadSelectiveRuntimeConfig(env, plan);
  if (!cfg.enabled) return true;
  // Prefer priced independent rankingP, then rankingScore, then confidence.
  let p = 0.5;
  if (typeof pick.rankingP === "number" && Number.isFinite(pick.rankingP)) {
    p = Math.min(1, Math.max(0, pick.rankingP));
  } else if (
    typeof pick.rankingScore === "number" &&
    Number.isFinite(pick.rankingScore)
  ) {
    p = Math.min(1, Math.max(0, pick.rankingScore / 100));
  } else if (
    typeof pick.confidence === "number" &&
    Number.isFinite(pick.confidence)
  ) {
    p = Math.min(1, Math.max(0, pick.confidence / 100));
  }
  const groupKey = `${pick.sportKey ?? "unknown"}|${pick.pickType ?? "unknown"}`;
  if (cfg.pausedGroups.includes(groupKey)) return false;
  return passesSelectiveThresholds(
    {
      p,
      y: 0,
      groupKey,
      marketP: pick.marketImpliedProb ?? null,
    },
    cfg.thresholds,
  );
}

/** Async variant: loads durable pause/δ plan. */
export async function passesPublicSelectiveFilterAsync(
  pick: PublicPickLike,
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  const plan = await getCachedProvenPathPlan();
  return passesPublicSelectiveFilter(pick, env, plan);
}
