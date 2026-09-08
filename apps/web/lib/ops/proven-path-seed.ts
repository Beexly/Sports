/**
 * Auto-build proven path plan + projected metrics + Ranking Power Control Plane.
 * No founder cron click required.
 *
 * Ranking p law: load confidence + independent trueProb only
 * (via toProvenPathPickRows — never conf-echo rankingP as independent).
 * edgeScore is never converted to a probability for bake-off.
 */

import { db, isStubMode } from "@sports/db";
import { captureError } from "@/lib/observability/sentry";
import { buildProvenPathPlan } from "@/lib/calibration/proven-path-engine";
import { projectProvenPathMetrics } from "@/lib/calibration/projected-proven-metrics";
import {
  toProvenPathPickRowsReport,
  type CalibrationExclusionCounts,
} from "@/lib/calibration/proven-path-rows";
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
import { loadPublishTimeMarketPResolver } from "@/lib/calibration/publish-time-market-p-loader";
import {
  selectIdenticalRows,
  type IdenticalRowSelection,
} from "@/lib/calibration/identical-row-bakeoff";

export type ProvenPathSurface = {
  readonly plan: ProvenPathPlan;
  readonly projection: ProjectedProvenMetrics;
  readonly rankingPower: RankingPowerControl | null;
  readonly rankingPowerPosture: ReturnType<typeof rankingPowerPosture>;
  /** Offline conformal bridge (default not computed). Founder-ops diagnostic only. */
  readonly conformalBridge: RpcpConformalBridge;
  readonly conformalBridgeEnv: ReturnType<typeof rpcpConformalBridgePosture>;
  /** Settled WIN/LOSS picks dropped before the bake-off, by reason (three_way_market here). */
  readonly exclusions: CalibrationExclusionCounts;
};

async function loadRows() {
  const picks = await db.pick.findMany({
    where: CANONICAL_LEARNING_PICK_WHERE,
    select: {
      confidence: true,
      result: true,
      pickType: true,
      factorBreakdown: true,
      modelVersion: true,
      settledAt: true,
      // Lock-time market fair backs up a factor breakdown that lost it (proven-path-rows.ts).
      proofReceipt: { select: { marketFairProb: true } },
      // C-261 identity fields: the odds-table resolver (WP-28 / C-110) needs
      // the pick's side and publish time to recompute a market probability
      // for the identical-row bake-off, exactly as the calibration loader does.
      id: true,
      gameId: true,
      generatedAt: true,
      selection: true,
      game: {
        select: {
          homeTeamName: true,
          awayTeamName: true,
          sport: { select: { key: true, name: true } },
        },
      },
    },
    orderBy: { settledAt: "desc" },
    take: 2000,
  });
  // Three-way moneyline sports are excluded here (shared row builder) and counted.
  const report = toProvenPathPickRowsReport(picks);

  // C-261: one identical row set for every score. Market probability follows
  // the calibration loader's resolver order (receipt, factor breakdown, then
  // the read-only odds-table recompute at generatedAt). Best-effort: a failed
  // odds read leaves the bake-off rows untouched and the table absent.
  let identicalRows: IdenticalRowSelection | null = null;
  try {
    const forLiveCal = picks.map((pick) => ({
      id: pick.id,
      gameId: pick.gameId,
      generatedAt: pick.generatedAt,
      selection: pick.selection,
      homeTeamName: pick.game?.homeTeamName ?? null,
      awayTeamName: pick.game?.awayTeamName ?? null,
      confidence: pick.confidence,
      result: pick.result ?? "",
      pickType: pick.pickType,
      factorBreakdown: pick.factorBreakdown,
      proofReceipt: pick.proofReceipt,
      modelVersion: pick.modelVersion,
      settledAt: pick.settledAt,
      sportKey: pick.game?.sport?.key ?? null,
    }));
    const oddsTable = await loadPublishTimeMarketPResolver(db, forLiveCal);
    identicalRows = selectIdenticalRows(forLiveCal, oddsTable.resolveMarketP);
  } catch (err) {
    captureError(err, { path: "proven-path-seed", stage: "selectIdenticalRows" });
    identicalRows = null;
  }
  return { ...report, identicalRows };
}

export async function loadOrSeedProvenPathPlan(): Promise<ProvenPathPlan | null> {
  const surface = await loadProvenPathSurface();
  return surface?.plan ?? null;
}

export async function loadProvenPathSurface(): Promise<ProvenPathSurface | null> {
  if (isStubMode()) return null;
  try {
    const { rows, excluded, identicalRows } = await loadRows();
    if (rows.length < 50) return null;
    // Always rebuild so polarity law applies (edge-as-p plans are invalid).
    const plan = buildProvenPathPlan(rows, identicalRows ? { identicalRows } : undefined);
    const planWrite = await persistProvenPathPlan(plan);
    if (planWrite === "error") {
      // The plan was BUILT but not STORED. Returning a surface here would hand
      // callers a plan that exists only in this isolate — selective publish and
      // the PROVEN gate would act on something no other isolate can see, and
      // `loadProvenPathPlan` would report it as the durable plan. `null` is the
      // honest answer and the one every caller already degrades on; the failure
      // itself was logged with its reason by persistProvenPathPlan.
      return null;
    }
    const projection = projectProvenPathMetrics(rows);

    let appliedPauseGroups: readonly string[] = [];
    try {
      const durablePause = await loadRankingPauseApply();
      if (durablePause?.enabled && Array.isArray(durablePause.groups)) {
        appliedPauseGroups = durablePause.groups;
      }
    } catch (err) {
      captureError(err, { path: "proven-path-seed", stage: "loadRankingPauseApply" });
      appliedPauseGroups = [];
    }

    let rankingPower: RankingPowerControl | null = null;
    try {
      rankingPower = buildRankingPowerControl(rows, {
        appliedPauseGroups,
      });
    } catch (err) {
      captureError(err, { path: "proven-path-seed", stage: "buildRankingPowerControl" });
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
      exclusions: excluded,
    };
  } catch (err) {
    captureError(err, { path: "proven-path-seed", stage: "loadProvenPathSurface" });
    return null;
  }
}
