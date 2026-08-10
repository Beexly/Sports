/**
 * Auto-build proven path plan + projected metrics + Ranking Power Control Plane.
 * No founder cron click required.
 *
 * Ranking p law: load confidence + independent trueProb only
 * (via toProvenPathPickRows — never conf-echo rankingP as independent).
 * edgeScore is never converted to a probability for bake-off.
 */

import { db, isStubMode } from "@sports/db";
import { buildProvenPathPlan } from "@/lib/calibration/proven-path-engine";
import { projectProvenPathMetrics } from "@/lib/calibration/projected-proven-metrics";
import { toProvenPathPickRows } from "@/lib/calibration/proven-path-rows";
import {
  buildRankingPowerControl,
  rankingPowerPosture,
  type RankingPowerControl,
} from "@/lib/calibration/ranking-power-control";
import {
  buildRpcpConformalBridge,
  rpcpConformalBridgePosture,
  type RpcpConformalBridge,
} from "@/lib/calibration/rpcp-conformal-bridge";
import {
  persistProvenPathPlan,
} from "@/lib/ops/proven-path-durable";
import type { ProvenPathPlan } from "@/lib/calibration/proven-path-engine";
import type { ProjectedProvenMetrics } from "@/lib/calibration/projected-proven-metrics";
import { CANONICAL_LEARNING_PICK_WHERE } from "@/lib/ops/compute-live-calibration-metrics";
import { loadRankingPauseApply } from "@/lib/ops/ranking-pause-durable";

export type ProvenPathSurface = {
  readonly plan: ProvenPathPlan;
  readonly projection: ProjectedProvenMetrics;
  readonly rankingPower: RankingPowerControl | null;
  readonly rankingPowerPosture: ReturnType<typeof rankingPowerPosture>;
  /** Offline conformal bridge (default not computed). Founder-ops diagnostic only. */
  readonly conformalBridge: RpcpConformalBridge;
  readonly conformalBridgeEnv: ReturnType<typeof rpcpConformalBridgePosture>;
};

async function loadRows() {
  const picks = await db.pick.findMany({
    where: CANONICAL_LEARNING_PICK_WHERE,
    select: {
      confidence: true,
      result: true,
      pickType: true,
      factorBreakdown: true,
      game: { select: { sport: { select: { key: true, name: true } } } },
    },
    orderBy: { settledAt: "desc" },
    take: 2000,
  });
  return toProvenPathPickRows(picks);
}

export async function loadOrSeedProvenPathPlan(): Promise<ProvenPathPlan | null> {
  const surface = await loadProvenPathSurface();
  return surface?.plan ?? null;
}

export async function loadProvenPathSurface(): Promise<ProvenPathSurface | null> {
  if (isStubMode()) return null;
  try {
    const rows = await loadRows();
    if (rows.length < 50) return null;
    // Always rebuild so polarity law applies (edge-as-p plans are invalid).
    const plan = buildProvenPathPlan(rows);
    await persistProvenPathPlan(plan);
    const projection = projectProvenPathMetrics(rows);

    let appliedPauseGroups: readonly string[] = [];
    try {
      const durablePause = await loadRankingPauseApply();
      if (durablePause?.enabled && Array.isArray(durablePause.groups)) {
        appliedPauseGroups = durablePause.groups;
      }
    } catch {
      appliedPauseGroups = [];
    }

    let rankingPower: RankingPowerControl | null = null;
    try {
      rankingPower = buildRankingPowerControl(rows, {
        appliedPauseGroups,
      });
    } catch {
      rankingPower = null;
    }

    const conformalBridgeEnv = rpcpConformalBridgePosture(process.env);
    const conformalBridge = rankingPower
      ? buildRpcpConformalBridge({
          rows,
          control: rankingPower,
          compute: conformalBridgeEnv.computeEnabled,
        })
      : buildRpcpConformalBridge({
          rows: [],
          control: buildRankingPowerControl([]),
          compute: false,
        });

    return {
      plan,
      projection,
      rankingPower,
      rankingPowerPosture: rankingPowerPosture(rankingPower),
      conformalBridge,
      conformalBridgeEnv,
    };
  } catch {
    return null;
  }
}
