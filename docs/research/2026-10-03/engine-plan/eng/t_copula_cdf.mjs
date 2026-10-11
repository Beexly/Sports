/**
 * Student's t-copula CDF printed as eq (6) in arXiv:2107.00007v1
 * page https://arxiv.org/html/2107.00007v1 (A2):
 *   C_{\rho,\nu}^t(u1, u2) = T_{\rho,\nu}(T_\nu^{-1}(u1), T_\nu^{-1}(u2))
 * Domain (u, v) in (0, 1), |\rho| < 1, \nu > 0.
 * Fail closed: the bivariate Student-t CDF is not elementary; implementation stays guarded without external deps.
 * Independence is not the product for finite \nu. Picks settled stay 0; this does not score picks.
 */
export function tCopulaCdf(u, v, rho, nu) {
  if (typeof u !== "number" || !Number.isFinite(u) || u <= 0 || u >= 1) {
    return { ok: false, reason: "u_outside_open_unit_interval" };
  }
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || v >= 1) {
    return { ok: false, reason: "v_outside_open_unit_interval" };
  }
  if (typeof rho !== "number" || !Number.isFinite(rho) || rho <= -1 || rho >= 1) {
    return { ok: false, reason: "rho_outside_open_interval" };
  }
  if (typeof nu !== "number" || !Number.isFinite(nu) || nu <= 0) {
    return { ok: false, reason: "nu_not_positive" };
  }
  return { ok: false, reason: "bivariate_t_cdf_not_elementary" };
}
