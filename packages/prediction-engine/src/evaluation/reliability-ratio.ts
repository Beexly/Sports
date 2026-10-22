/**
 * Classical errors-in-variables correction.
 *
 * Prior art, not copied code: gkbarbosa/bayesian_nb_model has no licence.
 * The script puts a latent true x under a noisy observation and regresses
 * on the latent x. The classical reliability correction is
 * slope_true = slope_ols / (var_true / (var_true + var_error)).
 */

export function reliabilityCorrectedSlope(
  olsSlope: number,
  varianceTrue: number,
  varianceError: number,
): number {
  if (!Number.isFinite(olsSlope)) throw new Error("slope must be finite");
  if (!Number.isFinite(varianceTrue) || varianceTrue <= 0) {
    throw new Error("true variance must be finite and positive");
  }
  if (!Number.isFinite(varianceError) || varianceError < 0) {
    throw new Error("error variance must be finite and non-negative");
  }
  const reliability = varianceTrue / (varianceTrue + varianceError);
  return olsSlope / reliability;
}
