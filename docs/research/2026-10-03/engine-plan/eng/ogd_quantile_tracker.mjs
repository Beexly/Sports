/**
 * Online gradient descent quantile tracker from Chrétien, Hoseini-Behbahani, Metzler (arXiv:2610.27740).
 * Printed page https://arxiv.org/html/2610.27740 equation (4):
 *   θ_{t+1} = max(0, θ_t + η * { (1-α) if R_t > θ_t, -α if R_t ≤ θ_t })
 * Fail closed: requires finite non-negative residual, α in (0,1), η > 0, θ finite.
 * Picks settled stay 0; this does not score picks.
 */
export function ogdQuantileUpdate(theta, residual, alpha, eta) {
  if (typeof theta !== "number" || !Number.isFinite(theta)) {
    return { ok: false, reason: "bad_theta" };
  }
  if (typeof residual !== "number" || !Number.isFinite(residual) || residual < 0) {
    return { ok: false, reason: "bad_residual" };
  }
  if (typeof alpha !== "number" || !Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    return { ok: false, reason: "bad_alpha" };
  }
  if (typeof eta !== "number" || !Number.isFinite(eta) || eta <= 0) {
    return { ok: false, reason: "bad_eta" };
  }
  const step = residual > theta ? (1 - alpha) : -alpha;
  const next = Math.max(0, theta + eta * step);
  return { ok: true, nextTheta: next, step, residual, alpha, eta };
}
