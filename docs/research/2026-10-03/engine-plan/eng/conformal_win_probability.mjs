/**
 * Conformal win probability from Johnstone & Nettleton (arXiv:2208.08598).
 * Printed page https://ar5iv.labs.arxiv.org/html/2208.08598 eq (18):
 *   π_w(y_c, τ) = 1/(n_w+1) * sum [I{R_uvw(y_c) < R_new(y_c)} + τ I{equal}]
 * Fail closed: no probability when inputs invalid or empty.
 * Picks settled stay 0; this does not score picks.
 */
export function conformalWinProbability(residuals, newResidual, tau = 0.5) {
  if (!Array.isArray(residuals) || residuals.length === 0) {
    return { ok: false, reason: "empty_residuals" };
  }
  if (typeof newResidual !== "number" || !Number.isFinite(newResidual)) {
    return { ok: false, reason: "non_finite_new_residual" };
  }
  if (typeof tau !== "number" || !(tau >= 0) || !(tau <= 1)) {
    return { ok: false, reason: "tau_out_of_unit_interval" };
  }
  const n = residuals.length;
  for (let i = 0; i < n; i++) {
    if (typeof residuals[i] !== "number" || !Number.isFinite(residuals[i])) {
      return { ok: false, reason: "non_finite_residual" };
    }
  }
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (residuals[i] < newResidual) {
      count += 1;
    } else if (residuals[i] === newResidual) {
      count += tau;
    }
  }
  const pi = count / (n + 1);
  return { ok: true, pi, n, tau, level: pi };
}
