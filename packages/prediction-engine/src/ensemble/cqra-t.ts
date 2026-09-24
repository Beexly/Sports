/**
 * CQRA-T: pinball-loss quantile forecast combination with cross-quantile
 * smoothing.
 *
 * GSE's quantile-native combination layer for quantile outputs (prop
 * distributions, margin quantiles). Per market (spread, total), per quantile
 * q: fit combination weights ω_q by pinball-loss minimization over the
 * simplex on a rolling prior-season window (the paper's Eq. 17 RLP, solved
 * here by projected subgradient — no LP solver dependency); naive
 * rearrangement across quantiles; publish combined quantiles plus the
 * retained-model set per quantile (automatic pruning = interpretability:
 * which sub-models survive per quantile). Improvement beyond the paper:
 * cross-quantile smoothed CQRA — a fused-lasso total-variation penalty
 * Σ_q‖ω_q − ω_{q−1}‖_1 (still convex) so weights vary smoothly across
 * quantiles: less quantile crossing at the source, better tail-quantile
 * stability where data is thin.
 *
 * @see arXiv:1803.06730 — "Combining Probabilistic Load Forecasts"
 *
 * ACCEPTANCE GATE: ADOPT only iff CQRA-T cuts mean pinball ≥ 3% vs the best
 * individual sub-model's quantiles on the 2024 holdout AND beats simple
 * averaging by ≥ 1%. REJECT if the LP prunes to a single model (degenerate
 * — just model selection) or if unconstrained QRA-T matches it (then
 * constraints add nothing and the simpler method wins). The gate is a
 * backtest concern; this module is the pure combination kernel, not wired
 * into any live path.
 */

/** Pinball loss at quantile level q. */
export function pinballLoss(y: number, q: number, level: number): number {
  if (!(level > 0 && level < 1)) throw new Error("pinballLoss: level ∈ (0,1)");
  const e = y - q;
  return e >= 0 ? level * e : (level - 1) * e;
}

/** Project onto the probability simplex (Duchi et al.). */
export function projectSimplex(v: readonly number[]): number[] {
  const u = [...v].sort((a, b) => b - a);
  let css = 0;
  let rho = 0;
  for (let j = 0; j < u.length; j++) {
    css += u[j] ?? 0;
    if ((u[j] ?? 0) + (1 - css) / (j + 1) > 0) rho = j + 1;
  }
  let s = 0;
  for (let j = 0; j < rho; j++) s += u[j] ?? 0;
  const t = (s - 1) / Math.max(1, rho);
  return v.map((x) => Math.max(0, x - t));
}

/**
 * Fit per-quantile combination weights by projected subgradient descent on
 * mean pinball loss + fused-lasso TV penalty λ_tv·Σ_q‖ω_q − ω_{q−1}‖_1.
 *
 * @param forecasts[q][i][k] = model k's quantile-q forecast for obs i
 * @param actuals[i] realized values
 * @param levels[q] quantile levels
 */
export function fitCqraWeights(
  forecasts: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>,
  actuals: readonly number[],
  levels: readonly number[],
  tvPenalty = 0.1,
  iters = 800,
  step = 0.5,
): number[][] {
  const Q = levels.length;
  const K = forecasts[0]?.[0]?.length ?? 0;
  if (Q === 0 || K === 0) throw new Error("fitCqraWeights: empty input");
  let W = Array.from({ length: Q }, () => new Array<number>(K).fill(1 / K));
  const n = actuals.length;
  for (let it = 0; it < iters; it++) {
    const grad = W.map(() => new Array<number>(K).fill(0));
    for (let q = 0; q < Q; q++) {
      const lvl = levels[q] ?? 0.5;
      for (let i = 0; i < n; i++) {
        const row = forecasts[q]?.[i] ?? [];
        let combined = 0;
        for (let k = 0; k < K; k++) combined += (W[q]?.[k] ?? 0) * (row[k] ?? 0);
        const e = (actuals[i] ?? 0) - combined;
        const dPin = e >= 0 ? -lvl : 1 - lvl; // d(pinball)/d(combined)
        for (let k = 0; k < K; k++) grad[q]![k]! += (dPin * (row[k] ?? 0)) / n;
      }
      // fused-lasso TV subgradient: λ·Σ sign(ω_q − ω_{q−1}) − sign(ω_{q+1} − ω_q)
      for (let k = 0; k < K; k++) {
        let tv = 0;
        if (q > 0) tv += Math.sign((W[q]?.[k] ?? 0) - (W[q - 1]?.[k] ?? 0));
        if (q < Q - 1) tv -= Math.sign((W[q + 1]?.[k] ?? 0) - (W[q]?.[k] ?? 0));
        grad[q]![k]! += tvPenalty * tv;
      }
    }
    W = W.map((w, q) =>
      projectSimplex(w.map((x, k) => x - step * ((grad[q]?.[k] ?? 0) + 0.01 * x))),
    );
    step *= 0.999;
  }
  return W;
}

/**
 * Combine quantiles with fitted weights, then apply naive rearrangement
 * (sort ascending) to kill quantile crossing.
 */
export function combineQuantiles(
  modelQuantiles: ReadonlyArray<readonly number[]>, // [q][k]
  weights: ReadonlyArray<readonly number[]>, // [q][k]
): number[] {
  const combined = modelQuantiles.map((row, q) =>
    row.reduce((s, f, k) => s + f * ((weights[q]?.[k] ?? 0)), 0),
  );
  return [...combined].sort((a, b) => a - b);
}

/** Mean pinball loss of a quantile forecast set. */
export function meanPinball(
  actuals: readonly number[],
  quantiles: ReadonlyArray<readonly number[]>, // [i][q]
  levels: readonly number[],
): number {
  if (actuals.length !== quantiles.length) throw new Error("meanPinball: length mismatch");
  if (quantiles.some((row) => row.length !== levels.length)) {
    throw new Error("meanPinball: quantile/level count mismatch");
  }
  let s = 0;
  let c = 0;
  for (let i = 0; i < actuals.length; i++) {
    for (let q = 0; q < levels.length; q++) {
      s += pinballLoss(actuals[i] ?? 0, quantiles[i]?.[q] ?? 0, levels[q] ?? 0.5);
      c++;
    }
  }
  return s / Math.max(1, c);
}

/** Retained-model set per quantile (weights above `tol` survive). */
export function retainedModels(weights: ReadonlyArray<readonly number[]>, tol = 1e-3): number[][] {
  return weights.map((w) => w.map((x, k) => (x > tol ? k : -1)).filter((k) => k >= 0));
}
