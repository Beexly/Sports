/**
 * Runtime selective publish + pause-list for public board rows.
 * PROVEN path: default ON (opt-out with SELECTIVE_PUBLISH_ENABLED=false).
 *
 * Pause groups:
 * - SELECTIVE_PAUSE_GROUPS env always applies
 * - plan.pauseGroups when RANKING_PAUSE_APPLY=true
 * - durable founder-yes snap (multi-isolate)
 * See ranking-pause-apply.ts.
 */

import {
  passesSelectiveThresholds,
  type SelectiveThresholds,
} from "@/lib/calibration/selective-publish";
import type { ProvenPathPlan } from "@/lib/calibration/proven-path-engine";
import {
  resolvePausedGroups,
  rankingPauseApplyPosture,
} from "@/lib/calibration/ranking-pause-apply";
import type { RankingPauseDurableSnap } from "@/lib/ops/ranking-pause-durable";

export type PublicPickLike = {
  readonly confidence?: number | null;
  readonly rankingScore?: number | null;
  readonly edgeScore?: number | null;
  readonly pickType?: string | null;
  readonly sportKey?: string | null;
  readonly marketImpliedProb?: number | null;
  readonly rankingP?: number | null;
};

const DEFAULT_DELTA = 0.1;

export function isSelectivePublishRuntimeEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const v = env["SELECTIVE_PUBLISH_ENABLED"]?.trim();
  if (v === "false") return false;
  if (v === "true") return true;
  return true;
}

export function loadSelectiveRuntimeConfig(
  env: Record<string, string | undefined> = process.env,
  plan: ProvenPathPlan | null = null,
  durablePause: RankingPauseDurableSnap | null = null,
): {
  readonly enabled: boolean;
  readonly thresholds: SelectiveThresholds;
  readonly pausedGroups: readonly string[];
  readonly pauseSource: "env" | "plan" | "durable" | "none";
  readonly pauseApplyEnabled: boolean;
  readonly pauseOperatorHint: string;
} {
  const enabled = isSelectivePublishRuntimeEnabled(env);
  const deltaRaw = env["SELECTIVE_PUBLISH_DELTA"]?.trim();
  const deltaFromEnv = deltaRaw ? Number(deltaRaw) : NaN;
  const delta = Number.isFinite(deltaFromEnv)
    ? deltaFromEnv
    : plan?.selectiveRecommended?.delta ?? plan?.defaultDelta ?? DEFAULT_DELTA;

  const pause = resolvePausedGroups(env, plan, durablePause);

  return {
    enabled,
    thresholds: {
      delta,
      edge: plan?.selectiveRecommended?.edge ?? null,
      minGroupRes: null,
    },
    pausedGroups: pause.pausedGroups,
    pauseSource: pause.source,
    pauseApplyEnabled: pause.applyEnabled && pause.pausedGroups.length > 0,
    pauseOperatorHint: pause.operatorHint,
  };
}

/**
 * Cache the in-flight PROMISE, not the resolved value (single-flight).
 *
 * These two loaders are called once PER PICK from the public picks route:
 * `/api/picks` maps every fetched row through `passesPublicSelectiveFilterAsync`
 * inside a `Promise.all`. `Promise.all` invokes all N map callbacks
 * synchronously up to their first `await`, so a value-only cache
 * (`if (cached !== undefined) return cached`) is passed by EVERY caller before
 * the first assignment ever lands: nothing is memoised until after the whole
 * fan-out has already been issued.
 *
 * Measured blast radius on a cold lambda: a PRO/ELITE viewer (dailyPickLimit
 * null → `take: 200`) issued 200 plan reads + 200 pause reads = 400 concurrent
 * durable queries for ONE request; a FREE/Fantasy viewer (`take: 48`) issued 96.
 * Warm instances were 0, so the stampede fires exactly during a cold-start
 * traffic spike — on the money page. Holding the promise makes N callers share
 * one flight: 400 → 2.
 *
 * Rejection handling: a rejected promise left in the slot would poison the
 * cache for the life of the isolate, so the slot is dropped when the load
 * fails and the batch degrades to `null` (the same value the pre-fix
 * try/catch produced). The next request retries instead of being pinned to a
 * transient failure forever — still single-flight, so a persistently failing
 * loader costs one query per batch, never N.
 */
let cachedPlan: Promise<ProvenPathPlan | null> | undefined;
let cachedPause: Promise<RankingPauseDurableSnap | null> | undefined;

export function getCachedProvenPathPlan(): Promise<ProvenPathPlan | null> {
  if (cachedPlan !== undefined) return cachedPlan;
  const flight: Promise<ProvenPathPlan | null> = (async () => {
    const { loadProvenPathPlan } = await import("@/lib/ops/proven-path-durable");
    return await loadProvenPathPlan();
  })().catch(() => {
    if (cachedPlan === flight) cachedPlan = undefined; // never cache a failure
    return null;
  });
  cachedPlan = flight;
  return flight;
}

export function getCachedRankingPauseDurable(): Promise<RankingPauseDurableSnap | null> {
  if (cachedPause !== undefined) return cachedPause;
  const flight: Promise<RankingPauseDurableSnap | null> = (async () => {
    const { loadRankingPauseApply } = await import("@/lib/ops/ranking-pause-durable");
    return await loadRankingPauseApply();
  })().catch(() => {
    if (cachedPause === flight) cachedPause = undefined; // never cache a failure
    return null;
  });
  cachedPause = flight;
  return flight;
}

/** Test / post-write: drop in-memory caches. */
export function clearSelectiveRuntimeCaches(): void {
  cachedPlan = undefined;
  cachedPause = undefined;
}

export function passesPublicSelectiveFilter(
  pick: PublicPickLike,
  env: Record<string, string | undefined> = process.env,
  plan: ProvenPathPlan | null = null,
  durablePause: RankingPauseDurableSnap | null = null,
): boolean {
  const cfg = loadSelectiveRuntimeConfig(env, plan, durablePause);
  if (!cfg.enabled) return true;
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

export async function passesPublicSelectiveFilterAsync(
  pick: PublicPickLike,
  env: Record<string, string | undefined> = process.env,
): Promise<boolean> {
  // Both flights in parallel: on a cold isolate this is the difference between
  // two serial durable reads and one round of two.
  const [plan, durable] = await Promise.all([
    getCachedProvenPathPlan(),
    getCachedRankingPauseDurable(),
  ]);
  return passesPublicSelectiveFilter(pick, env, plan, durable);
}

export function selectiveRuntimePosture(
  env: Record<string, string | undefined> = process.env,
  plan: ProvenPathPlan | null = null,
  durablePause: RankingPauseDurableSnap | null = null,
) {
  const cfg = loadSelectiveRuntimeConfig(env, plan, durablePause);
  const pause = rankingPauseApplyPosture(env, plan, durablePause);
  return {
    selectiveEnabled: cfg.enabled,
    delta: cfg.thresholds.delta,
    pause,
    operatorHint: cfg.enabled
      ? `Selective δ=${cfg.thresholds.delta}. ${pause.operatorHint}`
      : `Selective publish OFF. ${pause.operatorHint}`,
  };
}

/** Async posture with durable plan + pause snap loaded. */
export async function selectiveRuntimePostureAsync(
  env: Record<string, string | undefined> = process.env,
) {
  const [plan, durable] = await Promise.all([
    getCachedProvenPathPlan(),
    getCachedRankingPauseDurable(),
  ]);
  return selectiveRuntimePosture(env, plan, durable);
}
