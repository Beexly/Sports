/**
 * PROVEN path engine — raise Murphy resolution without lowering floors.
 *
 * Law: maps (Platt/Temp/Isotonic) fix REL, not RES. This module:
 *  1) Ranks sport|market groups; builds pause list (Res≈0)
 *  2) Sweeps selective thresholds; picks max Res with n ≥ minN
 *  3) Compares ranking scores (confidence vs edgeScore vs blend)
 *  4) Emits durable plan for ops truth + runtime pause/filter
 *
 * Does NOT set publishedEffective, AUTO_PUBLISH, or lower floors.
 */

import type { CalibrationSample } from "@sports/prediction-engine";
import {
  brierDecomposition,
  expectedCalibrationError,
} from "@sports/prediction-engine";
import {
  selectivePublishSweep,
  filterSelective,
  type SelectiveRow,
  type SelectiveMetrics,
} from "@/lib/calibration/selective-publish";
import { buildHoldoutRankingReport } from "@/lib/calibration/holdout-ranking-report";

export type RankingScoreKind =
  | "confidence"
  | "edgeScore"
  | "blend_conf_edge"
  | "independent_trueProb"
  | "blend_indep_conf";

export type ProvenPathPickRow = {
  readonly pConfidence: number; // confidence/100
  readonly pEdge: number | null; // edgeScore/100 if finite
  /** Independent trueProb or priced rankingP when present (0–1). */
  readonly pIndependent: number | null;
  readonly y: 0 | 1;
  readonly groupKey: string;
  readonly marketP?: number | null;
};

export type ScoreBakeoffRow = {
  readonly score: RankingScoreKind;
  readonly n: number;
  readonly brier: number;
  readonly ece: number;
  readonly murphyResolution: number;
  readonly murphyReliability: number;
  readonly separation: number; // mean p|win - mean p|loss
};

export type ProvenPathPlan = {
  readonly generatedAt: string;
  readonly baseline: ScoreBakeoffRow;
  readonly scoreBakeoff: readonly ScoreBakeoffRow[];
  readonly bestScore: RankingScoreKind;
  readonly selectiveRecommended: SelectiveMetrics | null;
  readonly selectiveGainRes: number | null;
  readonly pauseGroups: readonly string[];
  readonly keepGroups: readonly string[];
  readonly defaultDelta: number;
  readonly pathSteps: readonly string[];
  readonly honesty: string;
  readonly floorsUnchanged: true;
};

function scoreMetrics(
  score: RankingScoreKind,
  samples: readonly CalibrationSample[],
): ScoreBakeoffRow {
  if (samples.length === 0) {
    return {
      score,
      n: 0,
      brier: NaN,
      ece: NaN,
      murphyResolution: NaN,
      murphyReliability: NaN,
      separation: NaN,
    };
  }
  const d = brierDecomposition(samples);
  const wins = samples.filter((s) => s.y === 1);
  const losses = samples.filter((s) => s.y === 0);
  const meanPWin =
    wins.length === 0 ? NaN : wins.reduce((a, s) => a + s.p, 0) / wins.length;
  const meanPLoss =
    losses.length === 0
      ? NaN
      : losses.reduce((a, s) => a + s.p, 0) / losses.length;
  return {
    score,
    n: samples.length,
    brier: d.brier,
    ece: expectedCalibrationError(samples),
    murphyResolution: d.resolution,
    murphyReliability: d.reliability,
    separation: meanPWin - meanPLoss,
  };
}

function toSamples(
  rows: readonly ProvenPathPickRow[],
  kind: RankingScoreKind,
): CalibrationSample[] {
  const out: CalibrationSample[] = [];
  for (const r of rows) {
    let p: number | null = null;
    if (kind === "confidence") p = r.pConfidence;
    else if (kind === "edgeScore") {
      if (r.pEdge == null || !Number.isFinite(r.pEdge)) continue;
      p = r.pEdge;
    } else if (kind === "blend_conf_edge") {
      p =
        r.pEdge != null && Number.isFinite(r.pEdge)
          ? 0.5 * r.pConfidence + 0.5 * r.pEdge
          : r.pConfidence;
    } else if (kind === "independent_trueProb") {
      if (r.pIndependent == null || !Number.isFinite(r.pIndependent)) continue;
      p = r.pIndependent;
    } else if (kind === "blend_indep_conf") {
      if (r.pIndependent == null || !Number.isFinite(r.pIndependent)) continue;
      p = 0.5 * r.pConfidence + 0.5 * r.pIndependent;
    }
    if (p == null || !Number.isFinite(p)) continue;
    p = Math.min(1 - 1e-6, Math.max(1e-6, p));
    out.push({ p, y: r.y });
  }
  return out;
}

function toSelectiveRows(
  rows: readonly ProvenPathPickRow[],
  kind: RankingScoreKind,
): SelectiveRow[] {
  const samples = toSamples(rows, kind);
  // Rebuild with group keys — map by iterating rows with same kind filter
  const out: SelectiveRow[] = [];
  for (const r of rows) {
    let p: number | null = null;
    if (kind === "confidence") p = r.pConfidence;
    else if (kind === "edgeScore") {
      if (r.pEdge == null || !Number.isFinite(r.pEdge)) continue;
      p = r.pEdge;
    } else if (kind === "blend_conf_edge") {
      p =
        r.pEdge != null && Number.isFinite(r.pEdge)
          ? 0.5 * r.pConfidence + 0.5 * r.pEdge
          : r.pConfidence;
    } else if (kind === "independent_trueProb") {
      if (r.pIndependent == null || !Number.isFinite(r.pIndependent)) continue;
      p = r.pIndependent;
    } else if (kind === "blend_indep_conf") {
      if (r.pIndependent == null || !Number.isFinite(r.pIndependent)) continue;
      p = 0.5 * r.pConfidence + 0.5 * r.pIndependent;
    }
    if (p == null || !Number.isFinite(p)) continue;
    out.push({
      p: Math.min(1 - 1e-6, Math.max(1e-6, p)),
      y: r.y,
      groupKey: r.groupKey,
      marketP: r.marketP ?? null,
    });
  }
  void samples;
  return out;
}

/**
 * Build the full PROVEN path plan from settled rows.
 * minN: minimum after selective for recommendation (default 100 = learning floor).
 */
export function buildProvenPathPlan(
  rows: readonly ProvenPathPickRow[],
  options?: { readonly minN?: number; readonly defaultDelta?: number },
): ProvenPathPlan {
  const minN = options?.minN ?? 100;
  const defaultDelta = options?.defaultDelta ?? 0.1;
  const generatedAt = new Date().toISOString();

  const kinds: RankingScoreKind[] = [
    "confidence",
    "edgeScore",
    "blend_conf_edge",
    "independent_trueProb",
    "blend_indep_conf",
  ];
  const scoreBakeoff = kinds.map((k) => scoreMetrics(k, toSamples(rows, k)));
  // Prefer higher resolution; tie-break higher separation then lower brier
  let bestScore: RankingScoreKind = "confidence";
  let best = scoreBakeoff[0]!;
  for (const row of scoreBakeoff) {
    if (!Number.isFinite(row.murphyResolution) || row.n < 50) continue;
    if (
      !Number.isFinite(best.murphyResolution) ||
      row.murphyResolution > best.murphyResolution + 1e-9 ||
      (Math.abs(row.murphyResolution - best.murphyResolution) < 1e-9 &&
        row.separation > best.separation)
    ) {
      best = row;
      bestScore = row.score;
    }
  }

  const selectiveRows = toSelectiveRows(rows, bestScore);
  const holdout = buildHoldoutRankingReport(selectiveRows, { minGroupN: 20 });
  const groupResMap: Record<string, number> = {};
  for (const g of holdout.groups) groupResMap[g.groupKey] = g.murphyResolution;

  const sweep = selectivePublishSweep(selectiveRows, {
    deltas: [0, 0.08, 0.1, 0.12, 0.15, 0.18],
    edges: [null, 0.03, 0.05],
    minGroupResList: [null, 0.005, 0.01],
    groupResMap,
    minN,
  });

  const pauseGroups = holdout.pauseCandidates;
  const keepGroups = holdout.groups
    .filter((g) => !pauseGroups.includes(g.groupKey))
    .map((g) => g.groupKey);

  const selectiveGainRes =
    sweep.recommended && Number.isFinite(sweep.baseline.murphyResolution)
      ? sweep.recommended.murphyResolution - sweep.baseline.murphyResolution
      : null;

  return {
    generatedAt,
    baseline: best,
    scoreBakeoff,
    bestScore,
    selectiveRecommended: sweep.recommended,
    selectiveGainRes,
    pauseGroups,
    keepGroups,
    defaultDelta:
      sweep.recommended?.delta != null && Number.isFinite(sweep.recommended.delta)
        ? sweep.recommended.delta
        : defaultDelta,
    pathSteps: [
      `1. Use ranking score = ${bestScore} (highest holdout Murphy RES among confidence/edge/blend/independent)`,
      "2. Pause sport|market groups with Res≈0 (pauseGroups)",
      "3. Selective publish |p−0.5|≥δ (and edge when marketP exists) per selectiveRecommended",
      "4. Re-run calibration-metrics on published canonical WIN/LOSS only",
      "5. When Brier≤0.22, ECE≤0.05, Murphy R≤0.05, Res meaningful, n≥100 → streak GREEN×K",
      "6. Only then CALIBRATION_AUTO_PUBLISH (still never lower floors)",
      "7. Maps (Platt/Temp/Isotonic) only after RES moves — apply still OFF until holdout floors",
    ],
    honesty:
      "If selectiveGainRes≈0 and independent/blend scores still have Res≈0, recalibration cannot unlock PROVEN — need sport-specific models / new features, not maps. Maps will not unlock PROVEN.",
    floorsUnchanged: true,
  };
}

/** Runtime pause set for public filter (from plan or empty). */
export function shouldPublishGroup(
  groupKey: string,
  pauseGroups: readonly string[],
): boolean {
  return !pauseGroups.includes(groupKey);
}

/** Apply plan thresholds to a row (for public filter). */
export function passesProvenPathFilter(
  row: SelectiveRow,
  plan: Pick<ProvenPathPlan, "defaultDelta" | "pauseGroups" | "selectiveRecommended">,
): boolean {
  if (plan.pauseGroups.includes(row.groupKey)) return false;
  const delta = plan.selectiveRecommended?.delta ?? plan.defaultDelta;
  const edge = plan.selectiveRecommended?.edge ?? null;
  const minGroupRes = plan.selectiveRecommended?.minGroupRes ?? null;
  return filterSelective([row], {
    delta,
    edge,
    minGroupRes,
    groupResMap: undefined,
  }).length === 1;
}
