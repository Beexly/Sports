/**
 * arXiv:2410.09068 — Modeling and Prediction of the UEFA EURO 2024 via Combined Statistical Learning Approaches
 *
 * Bivariate-Poisson combined score model: correlation rho estimated per matchup-total band, extended
 * in-game by re-estimating (lambda1, lambda2) from the pregame ensemble plus live score/clock each minute
 * with a short Monte Carlo for the garbage-time correlation.
 *
 * Improvement: Upgrade the pregame spread/total pipeline to a bivariate-Poisson combined score model (correlation ρ estimated per matchup-total band) and extend it in-game by re-estimating (λ₁,λ₂) from the pregame ensemble plus live score/clock state each minute with a short 10k-sim Monte Carlo, capturing the garbage-time correlation that independence assumptions miss.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt the enhanced-variable + ensemble pipeline if the combined score model beats the engine's current spread/total probability layer on Brier score for game winner AND margin MAE over 2023–2024 by ≥0.003 / ≥0.15 points respectively, with the logability (market-consensus) variable showing positive permutation importance.
 */

/** Bivariate Poisson pmf via the common-shock representation. */
export function bivPoisPmf(x1: number, x2: number, l1: number, l2: number, l3: number): number {
  if (x1 < 0 || x2 < 0 || !Number.isInteger(x1) || !Number.isInteger(x2)) {
    throw new Error("bivPoisPmf: counts >= 0 integers");
  }
  if (l1 < 0 || l2 < 0 || l3 < 0) throw new Error("bivPoisPmf: lambdas >= 0");
  const pois = (k: number, l: number): number => {
    let p = Math.exp(-l);
    for (let i = 1; i <= k; i++) p *= l / i;
    return p;
  };
  let total = 0;
  for (let c = 0; c <= Math.min(x1, x2); c++) {
    total += pois(x1 - c, l1) * pois(x2 - c, l2) * pois(c, l3);
  }
  return total;
}

/**
 * In-game re-estimation: remaining scoring rates scale with time left and
 * the live score differential (garbage-time damping when |diff| is large).
 */
export function ingameLambdas(
  preL1: number,
  preL2: number,
  preL3: number,
  timeLeft: number, // fraction of game remaining in [0,1]
  scoreDiff: number,
  garbageDamping: number,
): [number, number, number] {
  if (timeLeft < 0 || timeLeft > 1) throw new Error("ingameLambdas: timeLeft in [0,1]");
  const damp = Math.exp(-garbageDamping * Math.abs(scoreDiff));
  return [preL1 * timeLeft * damp, preL2 * timeLeft * damp, preL3 * timeLeft * damp];
}

/** Short Monte Carlo: P(home wins) by simulating remaining scores. */
export function mcHomeWinProb(
  l1: number,
  l2: number,
  l3: number,
  homeLead: number,
  sims: number,
  rng: () => number,
): number {
  if (sims <= 0) throw new Error("mcHomeWinProb: sims > 0");
  const rpois = (l: number): number => {
    // Knuth for small l, normal approx for large
    if (l < 30) {
      const L = Math.exp(-l);
      let k = 0;
      let p = 1;
      do { k++; p *= rng(); } while (p > L);
      return k - 1;
    }
    const u1 = Math.max(1e-12, rng());
    const u2 = rng();
    return Math.max(0, Math.round(l + Math.sqrt(l) * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)));
  };
  let wins = 0;
  for (let s = 0; s < sims; s++) {
    const c = rpois(l3);
    const margin = homeLead + (rpois(l1) + c) - (rpois(l2) + c);
    if (margin > 0) wins++;
  }
  return wins / sims;
}
