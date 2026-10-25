/**
 * Energy score printed as ES in Lakatos, arXiv:2610.24591v1
 * page https://arxiv.org/html/2610.24591v1 (Verification):
 *   ES(F_K, y) = (1/K) sum_k ||f_k - y|| - (1/(2 K^2)) sum_k sum_l ||f_k - f_l||
 * Euclidean norm. Fail closed when ensemble or observation is not usable.
 * Picks settled stay 0; this does not score picks.
 */
export function soccEnergyScore(ensemble, observation) {
  if (!Array.isArray(ensemble) || ensemble.length === 0) {
    return { ok: false, reason: "empty_ensemble" };
  }
  if (!Array.isArray(observation) || observation.length === 0) {
    return { ok: false, reason: "empty_observation" };
  }
  const dim = observation.length;
  for (const member of ensemble) {
    if (!Array.isArray(member) || member.length !== dim) {
      return { ok: false, reason: "dimension_mismatch" };
    }
    for (const v of member) {
      if (typeof v !== "number" || !Number.isFinite(v)) {
        return { ok: false, reason: "non_finite_ensemble" };
      }
    }
  }
  for (const v of observation) {
    if (typeof v !== "number" || !Number.isFinite(v)) {
      return { ok: false, reason: "non_finite_observation" };
    }
  }
  const K = ensemble.length;
  let sumDistToY = 0;
  for (const member of ensemble) {
    let sq = 0;
    for (let i = 0; i < dim; i++) {
      const d = member[i] - observation[i];
      sq += d * d;
    }
    sumDistToY += Math.sqrt(sq);
  }
  let sumPairDist = 0;
  for (let k = 0; k < K; k++) {
    for (let l = 0; l < K; l++) {
      let sq = 0;
      for (let i = 0; i < dim; i++) {
        const d = ensemble[k][i] - ensemble[l][i];
        sq += d * d;
      }
      sumPairDist += Math.sqrt(sq);
    }
  }
  const es = sumDistToY / K - sumPairDist / (2 * K * K);
  if (!Number.isFinite(es)) {
    return { ok: false, reason: "non_finite_score" };
  }
  return { ok: true, energyScore: es, K, dim };
}
