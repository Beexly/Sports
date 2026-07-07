import type { ShrunkEstimate } from "./empirical-bayes";
import { applyCovariateModel, type CovariateModel } from "./covariate-model";
import { reconstructionTrustworthy, type FidelityGateOptions } from "./fidelity-gate";
import {
  makeProvenance,
  reconstructed,
  type ReconstructedFeature,
} from "./provenance";

/**
 * Reconstruct estimated receiver separation for a single play.
 *
 * Two honest regimes:
 *  - UNCALIBRATED (no truth set fitted yet): we do NOT invent a per-play
 *    number. We return the receiver's de-noised *typical* separation with the
 *    tendency's own uncertainty, and say exactly that. A tendency is a real,
 *    defensible claim; a fabricated per-play coordinate is not.
 *  - CALIBRATED (covariate model fitted on real coordinates, e.g. the NGS
 *    Highlights sample): the play-context adjustment is live, the estimate is
 *    genuinely per-play, and the interval widens by the residual variance the
 *    model could not explain — measured honesty, not a guess.
 */
export interface SeparationReconstructInput {
  readonly tendency: ShrunkEstimate; // EB-shrunk receiver separation tendency
  readonly features: readonly number[]; // play covariates, model's feature order
  readonly model: CovariateModel;
  readonly alpha?: number; // interval level; default 0.2 -> 80% interval
  readonly gate?: FidelityGateOptions; // trust thresholds for the covariate layer
}

export function reconstructSeparation(
  input: SeparationReconstructInput,
): ReconstructedFeature {
  const alpha = input.alpha ?? 0.2;
  const z = normalQuantile(1 - alpha / 2);
  // Calibrated only when the model is fitted AND clears the fidelity gate:
  // "n > threshold and fidelity high enough". A fitted-but-weak model is not
  // trusted to emit a per-play number; it falls back to the honest tendency.
  const calibrated = reconstructionTrustworthy(input.model, input.gate);

  if (!calibrated) {
    // Honest fallback: the player's typical separation, not a play claim.
    const value = Math.max(0, input.tendency.shrunk);
    const sd = input.tendency.posteriorSd;
    const low = Math.max(0, value - z * sd);
    const high = value + z * sd;
    return reconstructed(value, [low, high], alpha, makeProvenance(
      "empirical-bayes-shrinkage",
      ["nflverse:ngs"],
      false,
    ));
  }

  const adjustment = applyCovariateModel(input.features, input.model);
  const value = Math.max(0, input.tendency.shrunk + adjustment);
  // Total uncertainty: tendency posterior + unexplained play variance, added
  // in quadrature (independent sources of error).
  const sd = Math.sqrt(
    input.tendency.posteriorSd ** 2 + input.model.residualSd ** 2,
  );
  const low = Math.max(0, value - z * sd);
  const high = value + z * sd;
  return reconstructed(value, [low, high], alpha, makeProvenance(
    "covariate-adjusted",
    ["nflverse:ngs", "calibration:tracking-truth-set"],
    true,
  ));
}

/**
 * Inverse standard-normal CDF (Acklam's rational approximation, |err| < 1.2e-9).
 * Used to turn an interval level into a z-multiplier without a stats dependency.
 */
export function normalQuantile(p: number): number {
  if (p <= 0 || p >= 1) throw new Error("normalQuantile: p must be in (0,1)");
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q /
      (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
    ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
}
