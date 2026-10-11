/**
 * Gaussian copula CDF printed as eq (2) in arXiv:2201.05565:
 *   C_Σ(u1, ..., up) = Φ_Σ(Φ^{-1}(u1), ..., Φ^{-1}(up)), Σ_jj=1
 * Bivariate case: C_ρ(u, v) = Φ_ρ(Φ^{-1}(u), Φ^{-1}(v))
 * Domain (u, v) in (0, 1), |ρ| < 1.
 * Fail closed when the arguments are outside that domain or the expression is not usable.
 * For |ρ| > 0 full bivariate normal CDF is not elementary; this implementation returns the independence case (ρ=0) exactly and fails closed otherwise to stay guarded without external deps.
 * Picks settled stay 0; this does not score picks.
 */
export function gaussianCopulaCdf(u, v, rho = 0) {
  if (typeof u !== "number" || !Number.isFinite(u) || u <= 0 || u >= 1) {
    return { ok: false, reason: "u_outside_open_unit_interval" };
  }
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v >= 1) {
    return { ok: false, reason: "v_outside_open_unit_interval" };
  }
  if (typeof rho !== "number" || !Number.isFinite(rho) || rho <= -1 || rho >= 1) {
    return { ok: false, reason: "rho_outside_open_interval" };
  }
  if (rho !== 0) {
    return { ok: false, reason: "non_zero_rho_requires_bivariate_normal_cdf_not_elementary" };
  }
  const c = u * v;
  if (!Number.isFinite(c) || c < 0 || c > 1) {
    return { ok: false, reason: "cdf_outside_unit_interval" };
  }
  return { ok: true, c, rho, eq: "2" };
}
