/**
 * Auto-build proven path plan + projected metrics when durable missing.
 * No founder cron click required.
 *
 * Ranking p law: load confidence + independent trueProb only.
 * edgeScore is never converted to a probability for bake-off.
 */

import { db, isStubMode } from "@sports/db";
import { buildProvenPathPlan } from "@/lib/calibration/proven-path-engine";
import { projectProvenPathMetrics } from "@/lib/calibration/projected-proven-metrics";
import {
  loadProvenPathPlan,
  persistProvenPathPlan,
} from "@/lib/ops/proven-path-durable";
import type { ProvenPathPlan } from "@/lib/calibration/proven-path-engine";
import type { ProjectedProvenMetrics } from "@/lib/calibration/projected-proven-metrics";
import { CANONICAL_LEARNING_PICK_WHERE } from "@/lib/ops/compute-live-calibration-metrics";

export type ProvenPathSurface = {
  readonly plan: ProvenPathPlan;
  readonly projection: ProjectedProvenMetrics;
};

async function loadRows() {
  const picks = await db.pick.findMany({
    where: CANONICAL_LEARNING_PICK_WHERE,
    select: {
      confidence: true,
      edgeScore: true,
      result: true,
      pickType: true,
      factorBreakdown: true,
      game: { select: { sport: { select: { key: true, name: true } } } },
    },
    orderBy: { settledAt: "desc" },
    take: 2000,
  });
  const rows: import("@/lib/calibration/proven-path-engine").ProvenPathPickRow[] = [];
  for (const pick of picks) {
    if (pick.result !== "WIN" && pick.result !== "LOSS") continue;
    if (typeof pick.confidence !== "number" || !Number.isFinite(pick.confidence)) continue;
    const pConfidence = Math.min(1, Math.max(0, pick.confidence / 100));

    // Prefer priced independent rankingP / trueProb from factorBreakdown.
    // NEVER use edgeScore as a probability (rawEdge = trueProb − marketFair).
    let pIndependent: number | null = null;
    let marketP: number | null = null;
    const fb = pick.factorBreakdown as {
      fairProbability?: number | null;
      marketFairProb?: number | null;
      rankingP?: number | null;
      independentEdge?: {
        trueProb?: number | null;
        priced?: boolean;
        marketFairProb?: number | null;
      } | null;
    } | null;

    if (
      fb?.rankingP != null &&
      Number.isFinite(fb.rankingP) &&
      fb.rankingP > 0 &&
      fb.rankingP < 1
    ) {
      // rankingP already is win probability when priced from trueProb path.
      pIndependent = Math.min(1, Math.max(0, fb.rankingP));
    } else if (
      fb?.independentEdge?.trueProb != null &&
      Number.isFinite(fb.independentEdge.trueProb)
    ) {
      pIndependent = Math.min(1, Math.max(0, fb.independentEdge.trueProb));
    } else if (
      fb?.fairProbability != null &&
      Number.isFinite(fb.fairProbability) &&
      // Only treat fairProbability as independent if independentEdge was priced.
      fb?.independentEdge?.priced === true
    ) {
      pIndependent = Math.min(1, Math.max(0, fb.fairProbability));
    }

    if (
      fb?.independentEdge?.marketFairProb != null &&
      Number.isFinite(fb.independentEdge.marketFairProb)
    ) {
      marketP = Math.min(1, Math.max(0, fb.independentEdge.marketFairProb));
    } else if (fb?.marketFairProb != null && Number.isFinite(fb.marketFairProb)) {
      marketP = Math.min(1, Math.max(0, fb.marketFairProb));
    }

    const sport = pick.game?.sport?.key ?? pick.game?.sport?.name ?? "unknown";
    const market = pick.pickType ?? "unknown";
    rows.push({
      pConfidence,
      // Diagnostic only — not used as ranking p
      pEdge: null,
      pIndependent,
      y: (pick.result === "WIN" ? 1 : 0) as 0 | 1,
      groupKey: `${sport}|${market}`,
      marketP,
    });
  }
  return rows;
}

export async function loadOrSeedProvenPathPlan(): Promise<ProvenPathPlan | null> {
  const surface = await loadProvenPathSurface();
  return surface?.plan ?? null;
}

export async function loadProvenPathSurface(): Promise<ProvenPathSurface | null> {
  if (isStubMode()) return null;
  try {
    let plan = await loadProvenPathPlan();
    const rows = await loadRows();
    if (rows.length < 50) return null;
    // Always rebuild so polarity law applies (edge-as-p plans are invalid).
    plan = buildProvenPathPlan(rows);
    await persistProvenPathPlan(plan);
    const projection = projectProvenPathMetrics(rows);
    return { plan, projection };
  } catch {
    return null;
  }
}
