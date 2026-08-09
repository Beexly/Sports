/**
 * Project metrics under PROVEN-path filters on historical canonical sample.
 * Does NOT replace live eligibility (still full published sample until policy).
 * Shows whether selective+pause can move Res without inventing outcomes.
 */

import {
  brierDecomposition,
  expectedCalibrationError,
  type CalibrationSample,
} from "@sports/prediction-engine";
import {
  buildProvenPathPlan,
  type ProvenPathPickRow,
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

export function projectProvenPathMetrics(
  rows: readonly ProvenPathPickRow[],
): ProjectedProvenMetrics {
  const plan = buildProvenPathPlan(rows, { minN: 50 });
  // Build samples under best score
  const fullSamples: CalibrationSample[] = [];
  const selectiveRows = [];
  for (const r of rows) {
    let p = r.pConfidence;
    if (plan.bestScore === "edgeScore" && r.pEdge != null) p = r.pEdge;
    if (plan.bestScore === "blend_conf_edge" && r.pEdge != null) {
      p = 0.5 * r.pConfidence + 0.5 * r.pEdge;
    }
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

  const pathViable = deltaRes > 0.005 || wouldPassFloors;
  let message: string;
  if (wouldPassFloors) {
    message =
      "Selective historical projection MEETS floors — keep filter on; accumulate GREEN streak on live filtered publishes.";
  } else if (deltaRes > 0.005) {
    message = `Filter lifts Res by ${deltaRes.toFixed(4)} but floors not yet met — keep selective ON and improve ranking features.`;
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
  };
}
