/**
 * Conformal set-size loss from Zhang and Bates (arXiv:2610.08785v1).
 * Printed page https://arxiv.org/html/2610.08785v1 eq (5):
 *   ℓ_λ(Y, Γ) = |Γ| + (1/λ) * 1(Y ∉ Γ)
 * Fail closed: no loss is returned when inputs are unusable.
 * Picks settled stay 0; this does not score picks.
 */
export function conformalSetLoss(setSize, isCovered, lambda) {
  if (typeof setSize !== "number" || !Number.isInteger(setSize) || setSize < 0) {
    return { ok: false, reason: "invalid_set_size" };
  }
  if (typeof isCovered !== "boolean") {
    return { ok: false, reason: "invalid_coverage_flag" };
  }
  if (typeof lambda !== "number" || !(lambda > 0) || !(lambda <= 1) || !Number.isFinite(lambda)) {
    return { ok: false, reason: "lambda_out_of_range" };
  }
  const indicator = isCovered ? 0 : 1;
  const loss = setSize + (1 / lambda) * indicator;
  return { ok: true, loss, setSize, isCovered, lambda };
}
