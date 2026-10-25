/**
 * Selective auditing additive threshold update from Gibbs et al. (arXiv:2610.31662).
 * Printed page https://arxiv.org/html/2610.31662v1 eq (1):
 *   τ_{t+1} = τ_t + η Δ_t , Δ_t = (1 - π_t - α) e_t H_t / π_t
 * Fail closed: no update invented when inputs are unusable.
 * Picks settled stay 0; this does not score picks.
 */
export function selectiveAuditingAdditiveThreshold(tau, eta, pi, alpha, e, H) {
  if (typeof tau !== "number" || !Number.isFinite(tau)) {
    return { ok: false, reason: "tau_not_finite" };
  }
  if (typeof eta !== "number" || !Number.isFinite(eta) || eta < 0) {
    return { ok: false, reason: "eta_not_nonnegative_finite" };
  }
  if (typeof pi !== "number" || !(pi > 0) || !(pi <= 1)) {
    return { ok: false, reason: "pi_not_in_open_closed_unit_interval" };
  }
  if (typeof alpha !== "number" || !(alpha > 0) || !(alpha < 1)) {
    return { ok: false, reason: "alpha_not_in_open_unit_interval" };
  }
  if (e !== 0 && e !== 1) {
    return { ok: false, reason: "e_not_binary" };
  }
  if (H !== 0 && H !== 1) {
    return { ok: false, reason: "H_not_binary" };
  }
  if (H === 1 && pi === 0) {
    return { ok: false, reason: "division_by_zero_pi" };
  }
  const delta = (1 - pi - alpha) * e * H / pi;
  if (!Number.isFinite(delta)) {
    return { ok: false, reason: "non_finite_delta" };
  }
  const next = tau + eta * delta;
  if (!Number.isFinite(next)) {
    return { ok: false, reason: "non_finite_next_tau" };
  }
  return { ok: true, tau: next, delta, eta, pi, alpha, e, H };
}
