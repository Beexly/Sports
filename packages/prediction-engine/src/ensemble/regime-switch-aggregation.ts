/**
 * Aggregation-regime switch via the R statistic (arXiv 2006.12471).
 *
 * Per game and market, collect the M model probabilities, fit Normal and
 * LogNormal distributions by MLE, and compute
 *   R = L_lognormal / (L_lognormal + L_normal),
 * the likelihood weight on the heavy-tailed (concentrated-belief)
 * description. Both densities are fit on raw probabilities so the
 * likelihoods are commensurable (inputs are clipped to (0,1)); the
 * log-normal's right skew detects pools where one model is sharply more
 * confident than the rest.
 *   R < 0.5  -> equal-weighted mean aggregation (diffuse beliefs)
 *   R >= 0.5 -> concentrated aggregation: softmax weights on trailing model
 *               skill, or top-3 skill-weighted mean.
 *
 * ACCEPTANCE GATE: ADOPT the regime switch if 2025-season mean Brier beats
 * the better fixed regime by >= 2% on at least 2 of 3 markets
 * (spread/ML/total) AND the R >= 0.5 fraction of games is between 10% and
 * 60% (the rule must discriminate).
 *
 * Research-only module. Not wired into any live aggregation path.
 */

export interface RegimeResult {
  /** Likelihood weight on the log-normal (concentrated) description. */
  R: number;
  /** Selected regime. */
  regime: "diffuse" | "concentrated";
  /** Aggregated probability. */
  agg: number;
  /** Weights used. */
  weights: number[];
}

/** Normal log-likelihood at the MLE (mu = mean, sigma = sd). */
function normalLogLik(xs: readonly number[]): number {
  const n = xs.length;
  const mean = xs.reduce((a, x) => a + x, 0) / n;
  const sd = Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / n);
  if (sd < 1e-12) return Infinity; // degenerate: perfect concentration
  let s = 0;
  for (const x of xs) {
    const z = (x - mean) / sd;
    s += -0.5 * z * z - Math.log(sd) - 0.5 * Math.log(2 * Math.PI);
  }
  return s;
}

/** LogNormal log-likelihood at the MLE on positive values. */
function lognormalLogLik(xs: readonly number[]): number {
  const n = xs.length;
  const logs = xs.map((x) => Math.log(Math.max(1e-12, x)));
  const mean = logs.reduce((a, x) => a + x, 0) / n;
  const sd = Math.sqrt(logs.reduce((a, x) => a + (x - mean) ** 2, 0) / n);
  if (sd < 1e-12) return Infinity; // degenerate: perfect concentration
  let s = 0;
  for (let i = 0; i < n; i++) {
    const x = Math.max(1e-12, xs[i] as number);
    const z = ((logs[i] as number) - mean) / sd;
    s += -0.5 * z * z - Math.log(sd) - 0.5 * Math.log(2 * Math.PI) - Math.log(x);
  }
  return s;
}

/**
 * Compute the R statistic for one game's model-probability vector.
 * Returns 1 when the probabilities are numerically identical (maximally
 * concentrated), 0.5 on ties at the likelihood level.
 */
export function concentrationR(probs: readonly number[]): number {
  if (probs.length < 2) throw new Error("concentrationR: need >= 2 models");
  if (probs.some((p) => p <= 0 || p >= 1)) {
    throw new Error("concentrationR: probabilities must be in (0,1)");
  }
  const llNorm = normalLogLik(probs);
  const llLogn = lognormalLogLik(probs);
  if (!Number.isFinite(llNorm) || !Number.isFinite(llLogn)) {
    // Degenerate (identical probabilities): maximally concentrated.
    return 1;
  }
  // Likelihood weight with log-sum-exp stabilization.
  const m = Math.max(llNorm, llLogn);
  const wNorm = Math.exp(llNorm - m);
  const wLogn = Math.exp(llLogn - m);
  return wLogn / (wNorm + wLogn);
}

/** Softmax weights from trailing skill scores (higher skill -> more weight). */
export function softmaxWeights(skill: readonly number[], temp = 1): number[] {
  if (skill.length === 0) throw new Error("softmaxWeights: no skills");
  const t = temp > 0 ? temp : 1;
  const m = Math.max(...skill);
  const exps = skill.map((s) => Math.exp((s - m) / t));
  const sum = exps.reduce((a, e) => a + e, 0);
  return exps.map((e) => e / sum);
}

/**
 * Regime-switch aggregation for one game/market.
 * skill: trailing skill per model (e.g. negative Brier over trailing weeks).
 */
export function regimeAggregate(
  probs: readonly number[],
  skill: readonly number[],
  opts: { temp?: number; topK?: number } = {},
): RegimeResult {
  if (probs.length !== skill.length) throw new Error("regimeAggregate: length mismatch");
  const R = concentrationR(probs);
  if (R < 0.5) {
    const w = probs.map(() => 1 / probs.length);
    const agg = probs.reduce((a, p) => a + p, 0) / probs.length;
    return { R, regime: "diffuse", agg, weights: w };
  }
  const k = Math.min(opts.topK ?? 3, probs.length);
  const order = skill.map((s, i) => i).sort((a, b) => (skill[b] as number) - (skill[a] as number));
  const top = order.slice(0, k);
  const wFull = softmaxWeights(top.map((i) => skill[i] as number), opts.temp);
  const weights = new Array<number>(probs.length).fill(0);
  let agg = 0;
  top.forEach((idx, j) => {
    weights[idx] = wFull[j] as number;
    agg += (wFull[j] as number) * (probs[idx] as number);
  });
  return { R, regime: "concentrated", agg, weights };
}
