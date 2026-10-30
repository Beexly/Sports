/**
 * Stable measurement mechanism density equality from Choi (arXiv:2610.34204v1).
 * Printed page https://arxiv.org/html/2610.34204v1 :
 *   p(z | y, c) = q(z | y, c)
 * Fail closed: non-finite or mismatched densities return not-ok. Picks settled stay 0.
 */
export function stableMeasurementDensityEq(pz, qz) {
  if (typeof pz !== "number" || typeof qz !== "number" || !Number.isFinite(pz) || !Number.isFinite(qz)) {
    return { ok: false, reason: "non_finite_density" };
  }
  if (pz < 0 || qz < 0) {
    return { ok: false, reason: "negative_density" };
  }
  const equal = Math.abs(pz - qz) < 1e-12;
  return { ok: true, equal };
}
