/**
 * Sequence power score printed as W in Yang et al., arXiv:2610.25092v1
 * page https://arxiv.org/html/2610.25092v1 (eq. 2):
 *   W_i(θ) = R_i(θ)^{1/L_i} where R_i = exp(S_i), S_i = log(π_θ / π_old)
 * Fail closed when length or log-ratio is not usable.
 * Picks settled stay 0; this does not score picks.
 */
export function cspoSequencePower(logRatio, length) {
  if (typeof length !== "number" || !Number.isInteger(length) || length <= 0) {
    return { ok: false, reason: "invalid_length" };
  }
  if (typeof logRatio !== "number" || !Number.isFinite(logRatio)) {
    return { ok: false, reason: "non_finite_log_ratio" };
  }
  const power = Math.exp(logRatio / length);
  if (!Number.isFinite(power)) {
    return { ok: false, reason: "non_finite_power" };
  }
  return { ok: true, sequencePower: power, length, logRatio };
}
