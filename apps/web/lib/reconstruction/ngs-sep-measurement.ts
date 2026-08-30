/**
 * Wire NGS avg_separation as reconstruction ground truth (measurement only).
 *
 * July queue item 1: pair reconstructSeparation output with
 * ngsReceivingToSeparationTruth on gsisId, then run calibrationReport +
 * skillScore + graduationVerdict. Does not change scoring or MODEL_VERSION.
 */
import {
  calibrationReport,
  graduationVerdict,
  skillScore,
  type CalibrationReport,
  type GraduationVerdict,
  type TruthPair,
} from "./calibration-eval";
import type { ReconstructedFeature } from "./provenance";

export type SepPred = {
  readonly gsisId: string;
  readonly feature: ReconstructedFeature;
};

export type SepActual = {
  readonly gsisId: string;
  readonly actualSeparation: number;
};

export type SepEval = {
  readonly n: number;
  readonly report: CalibrationReport;
  readonly skillVsClimatology: number;
  readonly graduation: GraduationVerdict;
};

function joinPairs(predicted: readonly SepPred[], truth: readonly SepActual[]): TruthPair[] {
  const actualById = new Map<string, number>();
  for (const t of truth) {
    if (t.gsisId && Number.isFinite(t.actualSeparation) && t.actualSeparation >= 0) {
      actualById.set(t.gsisId, t.actualSeparation);
    }
  }
  const pairs: TruthPair[] = [];
  for (const p of predicted) {
    const actual = actualById.get(p.gsisId);
    if (actual === undefined) continue;
    pairs.push({ predicted: p.feature, actual });
  }
  return pairs;
}

/**
 * Inner-join reconstruction vs NGS SEP. Climatology baseline = mean of NGS
 * actuals on the join (does the estimate beat "everyone is average"?).
 */
export function measureReconstructionVsNgs(
  predicted: readonly SepPred[],
  truth: readonly SepActual[],
): SepEval {
  const pairs = joinPairs(predicted, truth);
  const clim = pairs.length === 0 ? 0 : pairs.reduce((s, p) => s + p.actual, 0) / pairs.length;
  const baseline = pairs.map(() => clim);
  const report = calibrationReport(pairs);
  const skill = skillScore(pairs, baseline);
  return {
    n: pairs.length,
    report,
    skillVsClimatology: skill,
    graduation: graduationVerdict(report, skill),
  };
}
