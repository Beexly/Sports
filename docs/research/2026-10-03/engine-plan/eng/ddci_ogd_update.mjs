/**
 * Dynamic dual-feedback base OGD update from Du et al. (arXiv:2610.26987).
 * Printed page https://arxiv.org/html/2610.26987 eq (2):
 *   q_{t+1} := q_t + η_t (err_t - α)
 * Fail closed: no update invented when inputs are unusable.
 * Picks settled stay 0; this does not score picks.
 */
export function ddciOgdUpdate(q, err, alpha, eta) {
  if (typeof q !== "number" || !Number.isFinite(q)) {
    return { ok: false, reason: "q_not_finite" };
  }
  if (err !== 0 && err !== 1) {
    return { ok: false, reason: "err_not_binary" };
  }
  if (typeof alpha !== "number" || !(alpha > 0) || !(alpha < 1)) {
    return { ok: false, reason: "alpha_not_in_open_unit_interval" };
  }
  if (typeof eta !== "number" || !Number.isFinite(eta) || eta < 0) {
    return { ok: false, reason: "eta_not_nonnegative_finite" };
  }
  const next = q + eta * (err - alpha);
  if (!Number.isFinite(next)) {
    return { ok: false, reason: "non_finite_next_q" };
  }
  return { ok: true, q: next, err, alpha, eta };
}
