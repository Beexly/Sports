/**
 * Experience-dependent K for Elo from Maitra et al. (arXiv:2512.18013v1).
 * Printed page https://arxiv.org/html/2512.18013v1 eq (1):
 *   K_i = K_a if n_i <= n_c1
 *         K_b if n_c1 < n_i <= n_c2
 *         K_c if n_i > n_c2
 *   with K_a >= K_b >= K_c > 0
 * Fail closed: invalid inputs or non-monotonic K return no value.
 * Picks settled stay 0; this does not score picks.
 */
export function eloExperienceK(nGames, thresholds, ks) {
  if (typeof nGames !== "number" || !Number.isInteger(nGames) || nGames < 0) {
    return { ok: false, reason: "non_negative_integer_games_required" };
  }
  if (!Array.isArray(thresholds) || thresholds.length !== 2) {
    return { ok: false, reason: "two_thresholds_required" };
  }
  if (!Array.isArray(ks) || ks.length !== 3) {
    return { ok: false, reason: "three_ks_required" };
  }
  const [nc1, nc2] = thresholds;
  const [ka, kb, kc] = ks;
  if (![nc1, nc2, ka, kb, kc].every(x => typeof x === "number" && Number.isFinite(x))) {
    return { ok: false, reason: "non_finite_param" };
  }
  if (nc1 < 0 || nc2 < nc1) {
    return { ok: false, reason: "thresholds_non_increasing" };
  }
  if (!(ka >= kb && kb >= kc && kc > 0)) {
    return { ok: false, reason: "ks_not_nonincreasing_positive" };
  }
  let k;
  if (nGames <= nc1) {
    k = ka;
  } else if (nGames <= nc2) {
    k = kb;
  } else {
    k = kc;
  }
  return { ok: true, k, nGames, nc1, nc2 };
}
