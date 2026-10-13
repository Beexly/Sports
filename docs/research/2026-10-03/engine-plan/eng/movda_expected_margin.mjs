/**
 * Expected MOV printed as eq (4) in Shorewala and Yang, arXiv:2506.00348v1
 * page https://arxiv.org/html/2506.00348 (Section III-A):
 *   E_MOV(ΔR, I_HA) = α · tanh(β · ΔR) + γ + δ · I_HA
 * Parameters are caller-supplied; this does not fit them.
 * Fail closed when ratings, indicator, or coefficients are not usable.
 * Picks settled stay 0; this does not score picks.
 */
export function movdaExpectedMargin(ratingA, ratingB, iHa, alpha, beta, gamma, delta) {
  if (typeof ratingA !== "number" || !Number.isFinite(ratingA)) {
    return { ok: false, reason: "non_finite_rating_a" };
  }
  if (typeof ratingB !== "number" || !Number.isFinite(ratingB)) {
    return { ok: false, reason: "non_finite_rating_b" };
  }
  if (iHa !== 1 && iHa !== -1 && iHa !== 0) {
    return { ok: false, reason: "invalid_home_indicator" };
  }
  const coeffs = [alpha, beta, gamma, delta];
  for (const c of coeffs) {
    if (typeof c !== "number" || !Number.isFinite(c)) {
      return { ok: false, reason: "non_finite_coefficient" };
    }
  }
  const deltaR = ratingA - ratingB;
  const tanhTerm = Math.tanh(beta * deltaR);
  if (!Number.isFinite(tanhTerm)) {
    return { ok: false, reason: "non_finite_tanh" };
  }
  const eMov = alpha * tanhTerm + gamma + delta * iHa;
  if (!Number.isFinite(eMov)) {
    return { ok: false, reason: "non_finite_expected_mov" };
  }
  return { ok: true, eMov, deltaR, tanhTerm };
}
