/**
 * Out-of-sample (OOS) split harness — the governance framework for safe model promotion.
 *
 * Divides settled picks into:
 *   - IN-SAMPLE: the training cohort (older picks) that informed model calibration
 *   - OUT-OF-SAMPLE: the test cohort (recent picks) that the model has never seen
 *
 * OOS is the ground truth: a model that looks good on in-sample data but bad on
 * OOS is overfit and untrustworthy. This harness computes OOS metrics independently
 * so the promoter can make safe progression decisions.
 *
 * Key invariants:
 *   - Cohort boundary is IMMUTABLE once picked (time-based, not sample-based)
 *   - In-sample never changes after chosen (protects model integrity)
 *   - OOS accumulates naturally over time as new picks settle
 *   - Metrics are pure (no I/O); caller persists results
 */

import type { ScoredOutcome, WindowCalibration } from "./calibration-drift.js";
import { computeWindowCalibration } from "./calibration-drift.js";

export interface SettledPickRecord {
  /** Unique pick ID. */
  readonly id: string;
  /** Model's predicted win probability (0–1) at prediction time. */
  readonly modelProb: number;
  /** Whether the pick won (1) or lost (0). */
  readonly won: boolean;
  /** When the pick was created (prediction time). */
  readonly createdAt: Date;
  /** When the pick was settled (outcome known). */
  readonly settledAt: Date;
  /** Market line at prediction time (for grouping). */
  readonly line: number | null;
  /** Pick type: SPREAD, MONEYLINE, TOTAL. */
  readonly pickType: string;
}

export interface OosSplitConfig {
  /** Boundary date: picks BEFORE this are in-sample, AFTER are out-of-sample. */
  readonly boundaryDate: Date;
  /** Minimum settled picks required per cohort. Default 20. */
  readonly minSamplePerCohort?: number;
}

export interface OosSplitResult {
  readonly inSample: WindowCalibration;
  readonly outOfSample: WindowCalibration;
  /** true if both cohorts meet minSamplePerCohort. */
  readonly isValid: boolean;
  /** In-sample is the "known" baseline; OOS is what predicts future performance. */
  readonly oosIsHealthy: boolean; // OOS Brier ≤ inSample Brier + tolerance
  readonly brierDelta: number; // OOS Brier − inSample Brier
  /** "OOS is X% worse than in-sample" — plain-language health readout. */
  readonly healthSummary: string;
}

/**
 * Split settled picks by cohort boundary into in-sample (training) and
 * out-of-sample (test). Returns calibration metrics for each cohort.
 *
 * @param picks - Settled pick records (must include modelProb, won, createdAt)
 * @param config - OOS split configuration (boundary date, min sample)
 * @returns Cohort-split calibration results and health assessment
 */
export function computeOosSplit(
  picks: readonly SettledPickRecord[],
  config: OosSplitConfig,
): OosSplitResult {
  const minSample = config.minSamplePerCohort ?? 20;
  const boundary = config.boundaryDate.getTime();

  const inSamplePicks = picks.filter((p) => p.createdAt.getTime() < boundary);
  const outOfSamplePicks = picks.filter((p) => p.createdAt.getTime() >= boundary);

  const inSampleOutcomes: ScoredOutcome[] = inSamplePicks.map((p) => ({
    prob: Math.max(0, Math.min(1, p.modelProb)),
    won: p.won,
  }));

  const outOfSampleOutcomes: ScoredOutcome[] = outOfSamplePicks.map((p) => ({
    prob: Math.max(0, Math.min(1, p.modelProb)),
    won: p.won,
  }));

  const inSample = computeWindowCalibration(inSampleOutcomes);
  const outOfSample = computeWindowCalibration(outOfSampleOutcomes);
  const brierDelta = outOfSample.brier - inSample.brier;

  const isValid =
    inSample.n >= minSample && outOfSample.n >= minSample;

  // OOS is healthy if it's NOT significantly worse than in-sample.
  // Allow +0.03 tolerance (3% Brier worsening) for random drift; above that is overfit.
  // If isValid is false, oosIsHealthy is also false (insufficient data means no health signal).
  const oosIsHealthy = isValid && brierDelta <= 0.03;

  // Plain-language health readout
  let healthSummary: string;
  if (!isValid) {
    healthSummary = `Insufficient samples (in=${inSample.n}, oos=${outOfSample.n}; need ${minSample} each)`;
  } else if (oosIsHealthy) {
    const deltaStr = (brierDelta * 100).toFixed(1);
    healthSummary = `OOS is ${Math.abs(brierDelta * 100).toFixed(1) === "0.0" ? "even" : deltaStr + "% " + (brierDelta > 0 ? "worse" : "better")} than in-sample`;
  } else {
    const deltaStr = (brierDelta * 100).toFixed(1);
    healthSummary = `OOS is ${deltaStr}% WORSE than in-sample (overfit risk)`;
  }

  return {
    inSample,
    outOfSample,
    isValid,
    oosIsHealthy,
    brierDelta,
    healthSummary,
  };
}

/**
 * Segment OOS picks by pick type, line, or confidence band for granular
 * health tracking. Prevents averaging across dissimilar markets.
 */
export interface OosSegment {
  readonly label: string;
  readonly calibration: WindowCalibration;
  readonly oosIsHealthy: boolean;
}

export interface SegmentedOosSplit extends OosSplitResult {
  readonly segments: readonly OosSegment[];
}

export function segmentOosSplit(
  picks: readonly SettledPickRecord[],
  config: OosSplitConfig,
): SegmentedOosSplit {
  const base = computeOosSplit(picks, config);
  const boundary = config.boundaryDate.getTime();
  const outOfSamplePicks = picks.filter((p) => p.createdAt.getTime() >= boundary);

  // Segment by pick type
  const typeMap = new Map<string, SettledPickRecord[]>();
  for (const p of outOfSamplePicks) {
    if (!typeMap.has(p.pickType)) typeMap.set(p.pickType, []);
    typeMap.get(p.pickType)!.push(p);
  }

  const segments: OosSegment[] = [];
  for (const [pickType, typePicks] of typeMap.entries()) {
    const outcomes = typePicks.map((p) => ({
      prob: Math.max(0, Math.min(1, p.modelProb)),
      won: p.won,
    }));
    const calibration = computeWindowCalibration(outcomes);
    const oosIsHealthy = calibration.brier - base.inSample.brier <= 0.03;
    segments.push({
      label: `${pickType} (n=${calibration.n})`,
      calibration,
      oosIsHealthy,
    });
  }

  return {
    ...base,
    segments,
  };
}
