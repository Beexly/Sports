/**
 * Sequential multistep conformal interval threshold from Wang & Girolimetto (arXiv:2610.21648v1).
 * Printed page https://arxiv.org/html/2610.21648v1 lines ~213-221:
 *   s_{t+h|t} = |e_{t+h|t}|  (symmetric)
 *   Ĉ^α_{t+h|t} = [ŷ_{t+h|t} - q_{t,h}, ŷ_{t+h|t} + q_{t,h}]
 * where q is the (1-α) empirical quantile of the absolute calibration scores.
 * Fail closed: no finite threshold invented when calibration empty, non-finite, or alpha invalid.
 * Picks settled stay 0; this does not score picks. Does not write mind.jsonl.
 */
export function sequentialConformalThreshold(absErrors, alpha) {
  if (!Array.isArray(absErrors) || absErrors.length === 0) {
    return { ok: false, reason: "empty_calibration" };
  }
  if (typeof alpha !== "number" || !(alpha > 0) || !(alpha < 1)) {
    return { ok: false, reason: "alpha_out_of_unit_interval" };
  }
  const n = absErrors.length;
  for (let i = 0; i < n; i++) {
    if (typeof absErrors[i] !== "number" || !Number.isFinite(absErrors[i]) || absErrors[i] < 0) {
      return { ok: false, reason: "non_finite_or_negative_score" };
    }
  }
  const k = Math.ceil(n * (1 - alpha));
  if (!Number.isInteger(k) || k < 1 || k > n) {
    return { ok: false, reason: "quantile_index_out_of_range", n, k };
  }
  const ordered = absErrors.slice().sort((a, b) => a - b);
  return { ok: true, threshold: ordered[k - 1], n, k, level: k / n };
}
