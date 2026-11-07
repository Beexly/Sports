/**
 * Averaged Conformal Risk Calibration (ACRC) w_+ from Qiao et al. (arXiv:2611.01053v1).
 * Printed page https://arxiv.org/html/2611.01053v1 equations (5)-(6):
 *   a(l) = A * int_0^1 prod_{i=1}^n (1 - t * l_i) dt
 *   w_+(l) = min{1, a(l)}
 *   A = alpha * (n + 1)
 * Fail closed: losses in [0,1], finite alpha in (0,1), n>=1; numerical integral with fixed points, returns no w if invalid.
 * Picks settled stay 0; this does not score picks.
 */
export function acrcWPlus(losses, alpha, quadPoints = 1001) {
  if (!Array.isArray(losses) || losses.length < 1) {
    return { ok: false, reason: "bad_losses" };
  }
  const n = losses.length;
  if (typeof alpha !== "number" || !Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    return { ok: false, reason: "bad_alpha" };
  }
  for (let i = 0; i < n; i++) {
    const li = losses[i];
    if (typeof li !== "number" || !Number.isFinite(li) || li < 0 || li > 1) {
      return { ok: false, reason: "bad_loss_value" };
    }
  }
  const A = alpha * (n + 1);
  // Numerical integral via trapezoidal rule
  const m = Math.max(2, Math.floor(quadPoints));
  const dt = 1 / (m - 1);
  let integral = 0;
  for (let k = 0; k < m; k++) {
    const t = k * dt;
    let prod = 1;
    for (let i = 0; i < n; i++) {
      prod *= (1 - t * losses[i]);
    }
    const weight = (k === 0 || k === m - 1) ? 0.5 : 1;
    integral += weight * prod;
  }
  integral *= dt;
  const a = A * integral;
  const w = Math.min(1, a);
  return { ok: true, wPlus: w, a: a, A: A, n: n };
}
