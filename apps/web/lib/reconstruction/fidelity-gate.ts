import type { CovariateModel } from "./covariate-model";

/**
 * The trust gate: "calibrated iff n > threshold AND fidelity high enough."
 *
 * A fitted covariate model is not automatically trustworthy — a handful of
 * calibration rows, or a fit that explains almost none of the variance, must
 * NOT be allowed to emit a confident per-play number. When the gate fails, the
 * reconstructor falls back to the honest de-noised tendency and says so.
 *
 * NOTE on thresholds: a synthesis proposed fidelity > 0.95. That is an
 * aspirational NGS-data-fidelity figure, not a realistic R² for reconstructing
 * per-play separation departures from aggregates — real sports covariate fits
 * land far lower. So the honest default asks only that the model clear a
 * modest bar (enough rows, some genuine explanatory power); raise minFidelity
 * as the calibration truth set grows and the fit earns it.
 */
export interface FidelityGateOptions {
  readonly minRows?: number; // calibration sample size floor
  readonly minFidelity?: number; // R² floor (0..1)
}

export function reconstructionTrustworthy(
  model: CovariateModel,
  opts: FidelityGateOptions = {},
): boolean {
  const minRows = opts.minRows ?? 50;
  const minFidelity = opts.minFidelity ?? 0.1;
  return (
    model.fittedRows >= minRows &&
    Number.isFinite(model.residualSd) &&
    model.fidelity >= minFidelity
  );
}
