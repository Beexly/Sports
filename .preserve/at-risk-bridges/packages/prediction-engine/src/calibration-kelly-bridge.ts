/**
 * CIR → Kelly bridge (Session 2 extract).
 *
 * Research law: calibrate first on a **time hold-out**, then size with
 * fractional/portfolio Kelly on the calibrated probabilities. CIR preserves
 * ranking resolution that PAVA plateaus destroy — without that resolution,
 * every pick in a plateau gets the same stake and Kelly is useless.
 *
 * Pure. R&D only — live product must still pass CALIBRATION_ADJUSTMENTS_ENABLED
 * + MODEL_VERSION gate before any calibrated p hits a user-facing stake.
 *
 * Laws encoded here:
 *  1. Fit calibrator on train only (caller supplies split via timeHoldoutSplit).
 *  2. Prefer CIR for ranking/Kelly; PAVA optional for bin-ECE comparison.
 *  3. Fractional Kelly only (λ default 0.3); full Kelly never applied.
 *  4. Portfolio path uses James–Stein + correlation haircut + CLV deflator.
 *  5. CLV is pick-quality, not a stake-performance claim.
 */

import {
  centeredIsotonicCalibration,
  countDistinctPredictions,
  expectedCalibrationError,
  selectedSliceEce,
  type CalibrationSample,
  type IsotonicModel,
} from "./probability-calibration.js";
import {
  clvDeflator,
  fractionalKellyStake,
  portfolioKellyStakes,
  type PortfolioKellyResult,
} from "./edge-lab/kelly.js";

export interface TimedCalibrationSample extends CalibrationSample {
  /** Optional epoch ms for audit trails; bridge does not re-split. */
  readonly t?: number;
  /** Decimal odds for Kelly (required for sizing). */
  readonly decimalOdds?: number;
  /** Measured edge (p - breakeven). Defaults to p - 1/decimalOdds. */
  readonly edge?: number;
  /** SE of edge for James–Stein. Defaults to 0.05. */
  readonly se?: number;
  /** Whether this row is +EV selected for paradox diagnostic. */
  readonly selected?: boolean;
}

export interface SizeAfterCalibrationArgs {
  /** Train samples used ONLY to fit CIR (time hold-out train). */
  readonly train: readonly CalibrationSample[];
  /**
   * Rows to size. Probabilities are re-mapped through CIR.predict.
   * Must include decimalOdds for each row you want a stake on.
   */
  readonly sizeRows: readonly TimedCalibrationSample[];
  /** Kelly fraction λ — Session 2 band κ≈0.25–0.30; default 0.3. */
  readonly lambda?: number;
  /** Realized CLV correlation (null until measured). */
  readonly rhoClv?: number | null;
  /** Settled CLV sample count for deflator floor (~50). */
  readonly settledCount?: number;
  /**
   * Use portfolio path (James–Stein + deflator) when sizeRows.length >= 3
   * and every row has odds; otherwise single-play fractional Kelly × deflator.
   */
  readonly preferPortfolio?: boolean;
}

export interface SizeAfterCalibrationResult {
  readonly model: IsotonicModel;
  readonly distinctCir: number;
  readonly eceTrain: number;
  readonly eceSized: number;
  readonly selectedEce: number | null;
  readonly deflator: number;
  /** Calibrated probabilities aligned with sizeRows. */
  readonly calibratedProbs: number[];
  /** Stake fractions of bankroll aligned with sizeRows (0 when disarmed). */
  readonly stakes: number[];
  readonly portfolio: PortfolioKellyResult | null;
  readonly mode: "portfolio" | "fractional" | "disarmed";
}

/** Map raw probs through a fitted calibrator. */
export function applyCalibrator(
  model: IsotonicModel,
  probs: readonly number[],
): number[] {
  return probs.map((p) => model.predict(p));
}

/**
 * Fit CIR on train, calibrate sizeRows, then size with portfolio or fractional
 * Kelly under the CLV deflator. Returns zero stakes when deflator is 0.
 */
export function sizeAfterCalibration(
  args: SizeAfterCalibrationArgs,
): SizeAfterCalibrationResult {
  const lambda = args.lambda ?? 0.3;
  const rhoClv = args.rhoClv ?? null;
  const settledCount = args.settledCount ?? 0;
  const preferPortfolio = args.preferPortfolio !== false;

  const model = centeredIsotonicCalibration(args.train);
  const distinctCir = countDistinctPredictions(model);

  const trainCal = args.train.map((s) => ({ p: model.predict(s.p), y: s.y }));
  const eceTrain = expectedCalibrationError(trainCal);

  const calibratedProbs = args.sizeRows.map((r) => model.predict(r.p));
  const sizedCal: CalibrationSample[] = args.sizeRows.map((r, i) => ({
    p: calibratedProbs[i]!,
    y: r.y,
  }));
  const eceSized = expectedCalibrationError(sizedCal);

  const sizedCalSamples: CalibrationSample[] = args.sizeRows.map((r, i) => ({
    p: calibratedProbs[i]!,
    y: r.y,
  }));
  const selectedFlags = args.sizeRows.map((r, i) =>
    r.selected ?? (r.edge !== undefined ? r.edge > 0 : calibratedProbs[i]! > 0.52),
  );
  const slice = selectedSliceEce({ samples: sizedCalSamples, selected: selectedFlags });
  const selectedEce = slice.selectedEce;

  const deflator = clvDeflator(rhoClv, settledCount);

  const canPortfolio =
    preferPortfolio &&
    args.sizeRows.length >= 3 &&
    args.sizeRows.every((r) => typeof r.decimalOdds === "number" && r.decimalOdds! > 1);

  if (deflator === 0) {
    return {
      model,
      distinctCir,
      eceTrain,
      eceSized,
      selectedEce,
      deflator,
      calibratedProbs,
      stakes: args.sizeRows.map(() => 0),
      portfolio: null,
      mode: "disarmed",
    };
  }

  if (canPortfolio) {
    const edges = args.sizeRows.map((r, i) => {
      if (typeof r.edge === "number") return r.edge;
      const d = r.decimalOdds!;
      const breakeven = 1 / d;
      return calibratedProbs[i]! - breakeven;
    });
    const se = args.sizeRows.map((r) => (typeof r.se === "number" ? r.se : 0.05));
    const decimalOdds = args.sizeRows.map((r) => r.decimalOdds!);
    const portfolio = portfolioKellyStakes({
      edges,
      se,
      decimalOdds,
      probs: calibratedProbs,
      lambda,
      rhoClv,
      settledCount,
    });
    return {
      model,
      distinctCir,
      eceTrain,
      eceSized,
      selectedEce,
      deflator: portfolio.diagnostics.deflator,
      calibratedProbs,
      stakes: portfolio.stakes,
      portfolio,
      mode: "portfolio",
    };
  }

  // Single-play fractional path
  const stakes = args.sizeRows.map((r, i) => {
    const d = r.decimalOdds;
    if (typeof d !== "number" || !(d > 1)) return 0;
    const p = calibratedProbs[i]!;
    if (!(p > 0 && p < 1)) return 0;
    return fractionalKellyStake(p, d, lambda) * deflator;
  });

  return {
    model,
    distinctCir,
    eceTrain,
    eceSized,
    selectedEce,
    deflator,
    calibratedProbs,
    stakes,
    portfolio: null,
    mode: "fractional",
  };
}
