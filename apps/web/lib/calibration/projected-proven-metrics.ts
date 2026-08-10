/**
 * Project metrics under PROVEN-path filters on historical canonical sample.
 * Does NOT replace live eligibility (still full published sample until policy).
 * Shows whether selective+pause can move Res without inventing outcomes.
 *
 * Ranking p law: only win probabilities (confidence / trueProb / blend / market).
 * Never edge-as-p.
 *
 * Pause list comes from buildProvenPathPlan (Res≈0 ∪ significance-dead).
 */

import {
  brierDecomposition,
  expectedCalibrationError,
  type CalibrationSample,
} from "@sports/prediction-engine";
import {
  buildProvenPathPlan,
  scoreProbability,
  type ProvenPathPickRow,
  type RankingScoreKind,
} from "@/lib/calibration/proven-path-engine";
import { filterSelective } from "@/lib/calibration/selective-publish";

export type ProjectedProvenMetrics = {
  readonly nFull: number;
  readonly nFiltered: number;
  readonly full: {
    readonly brier: number;
    readonly ece: number;
    readonly murphyResolution: number;
    readonly murphyReliability: number;
  };
  readonly filtered: {
    readonly brier: number;
    readonly ece: number;
    readonly murphyResolution: number;
    readonly murphyReliability: number;
  };
  readonly deltaRes: number;
  readonly deltaBrier: number;
  readonly wouldPassFloors: boolean;
  readonly pathViable: boolean;
  readonly message: string;
  readonly bestScore: string;
  readonly pauseGroups: readonly string[];
  readonly delta: number;
  /** Separation of the bestScore full-sample projection (must be >0 for healthy ranking). */
  readonly bestSeparation: number;
  /** How far filtered Brier sits above 0.22 (0 if at/under). Advisory only. */
  readonly brierGapToFloor: number;
};

function pack(samples: CalibrationSample[]) {
  if (samples.length === 0) {
    return {
      brier: NaN,
      ece: NaN,
      murphyResolution: NaN,
      murphyReliability: NaN,
    };
  }
  const d = brierDecomposition(samples);
  return {
    brier: d.brier,
    ece: expectedCalibrationError(samples),
    murphyResolution: d.resolution,
    murphyReliability: d.reliability,
  };
}

function separationOf(samples: CalibrationSample[]): number {
  if (samples.length === 0) return NaN;
  const wins = samples.filter((s) => s.y === 1);
  const losses = samples.filter((s) => s.y === 0);
  if (wins.length === 0 || losses.length === 0) return NaN;
  const meanPWin = wins.reduce((a, s) => a + s.p, 0) / wins.length;
  const meanPLoss = losses.reduce((a, s) => a + s.p, 0) / losses.length;
  return meanPWin - meanPLoss;
}

export function projectProvenPathMetrics(
  rows: readonly ProvenPathPickRow[],
): ProjectedProvenMetrics {
  const plan = buildProvenPathPlan(rows, { minN: 50 });
  const kind = plan.bestScore as RankingScoreKind;

  const fullSamples: CalibrationSample[] = [];
  const selectiveRows = [];
  for (const r of rows) {
    let p = scoreProbability(r, kind);
    // Fallback: never drop a row from the full projection set — use confidence.
    if (p == null || !Number.isFinite(p)) p = r.pConfidence;
    p = Math.min(1 - 1e-6, Math.max(1e-6, p));
    fullSamples.push({ p, y: r.y });
    selectiveRows.push({
      p,
      y: r.y,
      groupKey: r.groupKey,
      marketP: r.marketP ?? null,
    });
  }

  const delta = plan.selectiveRecommended?.delta ?? plan.defaultDelta;
  const edge = plan.selectiveRecommended?.edge ?? null;
  const filteredRows = filterSelective(selectiveRows, {
    delta,
    edge,
    minGroupRes: null,
  }).filter((r) => !plan.pauseGroups.includes(r.groupKey));

  const filteredSamples = filteredRows.map((r) => ({ p: r.p, y: r.y }));
  const full = pack(fullSamples);
  const filtered = pack(filteredSamples);
  const deltaRes = filtered.murphyResolution - full.murphyResolution;
  const deltaBrier = filtered.brier - full.brier;
  const wouldPassFloors =
    filteredSamples.length >= 100 &&
    filtered.brier <= 0.22 &&
    filtered.ece <= 0.05 &&
    filtered.murphyReliability <= 0.05;

  const bestSeparation = separationOf(fullSamples);
  // Path viable only if filter lifts RES meaningfully OR floors pass,
  // AND ranking polarity is not inverted on the chosen score.
  const polarityOk = bestSeparation > 0;
  const pathViable =
    polarityOk && (deltaRes > 0.005 || wouldPassFloors);

  const brierGapToFloor = Number.isFinite(filtered.brier)
    ? Math.max(0, filtered.brier - 0.22)
    : NaN;

  let message: string;
  if (!polarityOk) {
    message =
      "Ranking polarity inverted or noise (separation≤0 on bestScore) — fix independents / trueProb, never promote edge-as-p.";
  } else if (wouldPassFloors) {
    message =
      "Selective historical projection MEETS floors — keep filter on; accumulate GREEN streak on live filtered publishes.";
  } else if (deltaRes > 0.005) {
    message = `Filter lifts Res by ${deltaRes.toFixed(4)} but floors not yet met (Brier gap ${Number.isFinite(brierGapToFloor) ? brierGapToFloor.toFixed(4) : "n/a"}) — keep selective ON; pause ${plan.pauseGroups.length} dead groups when RANKING_PAUSE_APPLY ready.`;
  } else {
    message =
      "Selective alone barely moves Res — need independent modelProb / sport models (not more maps).";
  }

  return {
    nFull: fullSamples.length,
    nFiltered: filteredSamples.length,
    full,
    filtered,
    deltaRes,
    deltaBrier,
    wouldPassFloors,
    pathViable,
    message,
    bestScore: plan.bestScore,
    pauseGroups: plan.pauseGroups,
    delta,
    bestSeparation,
    brierGapToFloor: Number.isFinite(brierGapToFloor) ? brierGapToFloor : 0,
  };
}
