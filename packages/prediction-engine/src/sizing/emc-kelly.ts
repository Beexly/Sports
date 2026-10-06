/**
 * Uncertainty-aware (Emc) Kelly staking.
 *
 * Replaces the plug-in Kelly fraction: for each bet, draw M samples of the
 * true probability from the calibrated uncertainty distribution around the
 * model price (σ from the grouping-loss / temperature-scaling calibration
 * residuals), maximize mean log-wealth over the samples, and add the chance
 * constraint P(true expected log return > 0) ≥ 1 − α (α = 0.4 tuned on
 * backtest). Evaluated first in the paper-trading harness.
 *
 * @see arXiv:1701.02814v2 — "Kelly Criterion Under Probability Uncertainty"
 *
 * ACCEPTANCE GATE: ADOPT uncertainty-aware Kelly iff, on the chronological
 * 3,411-pick backtest, Emc sizing achieves terminal log-wealth ≥ plug-in
 * Kelly's AND max drawdown no worse than plug-in's. The gate is a backtest
 * concern; this module is the pure staking kernel, not wired live.
 */

/**
 * Deterministic LCG (reproducible Monte Carlo for tests/audits).
 */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function normal01(rng: () => number): number {
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Sample M plausible true probabilities: model price p̂ plus calibrated
 * Gaussian noise on the logit scale, clipped to (0,1).
 */
export function sampleTrueProbs(
  modelProb: number,
  sigma: number,
  m: number,
  rng: () => number,
): number[] {
  if (!(modelProb > 0 && modelProb < 1)) throw new Error("sampleTrueProbs: p̂ ∈ (0,1)");
  if (!(sigma >= 0)) throw new Error("sampleTrueProbs: σ ≥ 0");
  if (!(m >= 1)) throw new Error("sampleTrueProbs: m ≥ 1");
  const logit = Math.log(modelProb / (1 - modelProb));
  const out: number[] = [];
  for (let i = 0; i < m; i++) {
    const l = logit + sigma * normal01(rng);
    out.push(1 / (1 + Math.exp(-l)));
  }
  return out;
}

/**
 * Emc stake: maximize mean log-wealth over the sampled true probabilities,
 * subject to the chance constraint P(E[log(1+fX)] > 0 over samples) ≥ 1 − α.
 * Solved by grid search on f ∈ [0, cap] (paper-trading scale; the objective
 * is unimodal in f for fixed samples).
 */
export function emcKellyStake(
  modelProb: number,
  odds: number,
  sigma: number,
  alpha = 0.4,
  m = 2000,
  cap = 0.25,
  seed = 11,
): number {
  const rng = makeRng(seed);
  const probs = sampleTrueProbs(modelProb, sigma, m, rng);
  const b = odds - 1;
  const meanLogWealth = (f: number): number => {
    let s = 0;
    for (const p of probs) {
      s += p * Math.log(1 + f * b) + (1 - p) * Math.log(Math.max(1e-12, 1 - f));
    }
    return s / probs.length;
  };
  const chanceOk = (f: number): boolean => {
    if (f <= 0) return true;
    let good = 0;
    for (const p of probs) {
      const elr = p * Math.log(1 + f * b) + (1 - p) * Math.log(Math.max(1e-12, 1 - f));
      if (elr > 0) good++;
    }
    return good / probs.length >= 1 - alpha;
  };
  let best = 0;
  let bestObj = meanLogWealth(0);
  const steps = 200;
  for (let i = 1; i <= steps; i++) {
    const f = (cap * i) / steps;
    if (!chanceOk(f)) continue;
    const obj = meanLogWealth(f);
    if (obj > bestObj) {
      bestObj = obj;
      best = f;
    }
  }
  return best;
}

/** Plug-in Kelly fraction (the gate's baseline). */
export function pluginKelly(p: number, odds: number): number {
  const b = odds - 1;
  return Math.max(0, Math.min(1, (b * p - (1 - p)) / b));
}
