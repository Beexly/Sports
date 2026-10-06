/**
 * arXiv:2508.07136v2 — Ledger 0795 — Bayesian Forecast Combination with Predictive Priors via Particle Filtering (DTVW)
 *
 * DTVW: diversity-driven Bayesian time-varying ensemble weights. Sources that disagree productively get
 * upweighted when the world changes; correlated redundant signals are penalized — the Bayesian answer to
 * ledger 0790's correlation-robustness problem.
 *
 * Improvement: GSE replaces static ensemble weights with DTVW diversity-driven Bayesian time-varying weights: sources that disagree productively get upweighted automatically when the world changes, and correlated redundant signals are penalized — GSE's ensemble layer for combining engine, market, and consensus signals.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT if DTVW implements the self-tuning diversity mechanism with burn-in-tuned initialization and clears a >=2% CRPS gate on the density forecasts; it answers ledger 0790's correlation-robustness problem from the Bayesian side.
 */

/** One source's forecast and realized outcome. */
export interface SourceForecast {
  source: string;
  p: number; // forecast prob
}

/**
 * Diversity bonus: 1 - mean positive pairwise correlation of this source's
 * recent errors with others' errors. Negative correlation (productive
 * disagreement) is not penalized; redundant clones are.
 */
export function diversityBonus(
  errors: readonly number[][],
  sourceIdx: number,
): number {
  const mine = errors[sourceIdx] ?? [];
  if (mine.length < 2) return 0.5;
  let sumPos = 0;
  let n = 0;
  for (let j = 0; j < errors.length; j++) {
    if (j === sourceIdx) continue;
    const other = errors[j] ?? [];
    const m1 = mine.reduce((a, b) => a + b, 0) / mine.length;
    const m2 = other.reduce((a, b) => a + b, 0) / other.length;
    let cov = 0;
    let v1 = 0;
    let v2 = 0;
    for (let t = 0; t < mine.length; t++) {
      cov += (mine[t]! - m1) * ((other[t] ?? 0) - m2);
      v1 += (mine[t]! - m1) ** 2;
      v2 += ((other[t] ?? 0) - m2) ** 2;
    }
    const corr = v1 > 1e-12 && v2 > 1e-12 ? cov / Math.sqrt(v1 * v2) : 0;
    sumPos += Math.max(0, corr);
    n++;
  }
  const meanPos = n > 0 ? sumPos / n : 0;
  return Math.max(0, Math.min(1, 1 - meanPos));
}

/**
 * DTVW weight update: w_i <- w_i * exp(-eta * loss_i) * (1 + divGain * div_i),
 * then renormalize. burnIn weights seed the recursion.
 */
export function dtvwUpdate(
  weights: readonly number[],
  losses: readonly number[],
  diversities: readonly number[],
  eta: number,
  divGain: number,
): number[] {
  if (weights.length !== losses.length || weights.length !== diversities.length) {
    throw new Error("dtvwUpdate: length mismatch");
  }
  if (eta < 0 || divGain < 0) throw new Error("dtvwUpdate: eta, divGain >= 0");
  const raw = weights.map((w, i) =>
    Math.max(1e-12, w) * Math.exp(-eta * (losses[i] ?? 0)) * (1 + divGain * (diversities[i] ?? 0)),
  );
  const z = raw.reduce((a, b) => a + b, 0);
  return raw.map((r) => r / z);
}
