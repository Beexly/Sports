/**
 * Elo update printed as eq (13) in Szczecinski, arXiv:2604.03840v1
 * page https://arxiv.org/html/2604.03840v1 (Section 2.1.1):
 *   θ_{t+1,i} = θ_{t,i} + μ [y_t - G(z_t)]
 * where G is the expected score (logistic in binary case).
 * Fail closed when ratings, step, or outcome are not usable.
 * Picks settled stay 0; this does not score picks.
 */
export function eloNoiseAdjustedUpdate(ratingHome, ratingAway, y, mu, scale = 400) {
  if (typeof ratingHome !== "number" || !Number.isFinite(ratingHome)) {
    return { ok: false, reason: "non_finite_rating_home" };
  }
  if (typeof ratingAway !== "number" || !Number.isFinite(ratingAway)) {
    return { ok: false, reason: "non_finite_rating_away" };
  }
  if (typeof mu !== "number" || !Number.isFinite(mu) || mu <= 0) {
    return { ok: false, reason: "non_positive_step" };
  }
  if (y !== 0 && y !== 1) {
    return { ok: false, reason: "outcome_not_binary" };
  }
  const z = (ratingHome - ratingAway) / scale;
  const G = 1 / (1 + 10 ** (-z));
  if (!Number.isFinite(G)) {
    return { ok: false, reason: "non_finite_expected" };
  }
  const nextHome = ratingHome + mu * (y - G);
  const nextAway = ratingAway - mu * (y - G);
  if (!Number.isFinite(nextHome) || !Number.isFinite(nextAway)) {
    return { ok: false, reason: "non_finite_update" };
  }
  return { ok: true, nextHome, nextAway, expected: G, mu, z };
}
