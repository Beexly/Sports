/**
 * Expected local radius (ELR) from Qiu et al. (arXiv:2610.31336).
 * Printed page https://arxiv.org/html/2610.31336 eq after distance profile:
 *   R_β(ω) := (1/β) ∫_0^β Q(ω, τ) dτ
 * where Q(ω, τ) = inf{ r >= 0 : F(ω, r) >= τ }
 * Fail closed: no radius invented when beta, distances, or quantile index is unusable.
 * Picks settled stay 0; this does not score picks.
 */
export function celrExpectedLocalRadius(distances, beta) {
  if (!Array.isArray(distances) || distances.length === 0) {
    return { ok: false, reason: "empty_distances" };
  }
  if (typeof beta !== "number" || !(beta > 0) || !(beta <= 1)) {
    return { ok: false, reason: "beta_out_of_unit_interval" };
  }
  const n = distances.length;
  for (let i = 0; i < n; i++) {
    const d = distances[i];
    if (typeof d !== "number" || !Number.isFinite(d) || d < 0) {
      return { ok: false, reason: "non_finite_or_negative_distance" };
    }
  }
  const ordered = distances.slice().sort((a, b) => a - b);
  // Discrete approximation of the integral of the quantile function:
  // sample quantile Q(τ) = ordered[Math.ceil(τ * n) - 1]
  // Integrate by averaging over a fine grid of τ in (0, beta].
  const steps = Math.max(100, n * 4);
  let sum = 0;
  for (let s = 1; s <= steps; s++) {
    const tau = (s / steps) * beta;
    const idx = Math.ceil(tau * n) - 1;
    if (idx < 0 || idx >= n) {
      return { ok: false, reason: "quantile_index_out_of_range", tau, idx, n };
    }
    sum += ordered[idx];
  }
  const radius = sum / steps;
  if (!Number.isFinite(radius)) {
    return { ok: false, reason: "non_finite_radius" };
  }
  return { ok: true, radius, n, beta };
}
