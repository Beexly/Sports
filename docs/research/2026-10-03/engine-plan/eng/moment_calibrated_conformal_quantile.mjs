/**
 * Moment-calibrated conformal quantile from Wang, Peng, Liu, Zou (arXiv:2610.15268v1).
 * Printed page https://arxiv.org/html/2610.15268v1 , weighted empirical quantile:
 *   q_hat_alpha = inf { q : F_w(q) >= (n+1)*(1-alpha)/n }
 * Fail closed: no threshold invented on empty, non-finite, bad weights, or level exceeding total weight.
 * Picks settled stay 0; this does not score picks.
 */
export function momentCalibratedConformalQuantile(scores, alpha, weights = null) {
  if (!Array.isArray(scores) || scores.length === 0) {
    return { ok: false, reason: "empty_calibration" };
  }
  if (typeof alpha !== "number" || !(alpha > 0) || !(alpha < 1)) {
    return { ok: false, reason: "alpha_out_of_unit_interval" };
  }
  const n = scores.length;
  for (let i = 0; i < n; i++) {
    if (typeof scores[i] !== "number" || !Number.isFinite(scores[i])) {
      return { ok: false, reason: "non_finite_score" };
    }
  }
  let w = weights;
  if (w === null) {
    w = Array(n).fill(1 / n);
  } else {
    if (!Array.isArray(w) || w.length !== n) {
      return { ok: false, reason: "weights_length_mismatch" };
    }
    let sum = 0;
    for (let i = 0; i < n; i++) {
      if (typeof w[i] !== "number" || !Number.isFinite(w[i]) || w[i] <= 0) {
        return { ok: false, reason: "invalid_weight" };
      }
      sum += w[i];
    }
    if (Math.abs(sum - 1) > 1e-8) {
      return { ok: false, reason: "weights_not_normalized" };
    }
  }
  const pairs = scores.map((s, i) => ({ s, w: w[i] }));
  pairs.sort((a, b) => a.s - b.s);
  const target = ((n + 1) * (1 - alpha)) / n;
  let cum = 0;
  for (const p of pairs) {
    cum += p.w;
    if (cum >= target) {
      return { ok: true, threshold: p.s, n, target, level: cum };
    }
  }
  return { ok: false, reason: "weighted_quantile_exceeds_mass", n, target };
}
