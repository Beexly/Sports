// @ts-nocheck
/**
 * arXiv 1501.01126v1: A Composite Risk Measure Framework for Decision Making under Uncertainty.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Composite risk measure: inner CVaR_0.10 over game outcomes given the engine's outcome distribution, outer CVaR_0.95 over the beta-binomial posterior of the engine's own win probabilities. Sized via sample-average approximation (SAA) over a long-only slate portfolio.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Size the weekly slate with the paper's composite risk measure for decision making under uncertainty: inner CVaR_0.10 over game outcomes given the engine's outcome distribution (penalizes slate-correlation tail risk), outer CVaR_0.95 over the beta-binomial posterior of the engine's own win probabilities (updated on rolling 8 weeks of Brier/residual history) -- solve the CVaR-Expectation LP via SAA (N=5000 draws) over the n~5-15 pick slate, long-only, published with the slate.
 *
 * ACCEPTANCE GATE:
 * ACCEPT if on 4-season rolling backtest: Calmar_CRM >= 1.10 x Calmar_best-baseline AND max-drawdown_CRM <= 0.90 x max-drawdown_best-baseline, with final bankroll >= baseline (no return sacrifice).
 *
 * ENABLED=false: sizing the weekly slate with the CRM changes stake sizes; needs a human call.
 */


/** Deterministic PRNG (mulberry32) so tests and backtests are reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ENABLED = false;

/** Mean of the worst tailFrac fraction of losses (losses are positive = bad). */
export function tailMean(losses: readonly number[], tailFrac: number): number {
  if (losses.length === 0) return 0;
  const sorted = [...losses].sort((a, b) => b - a);
  const k = Math.max(1, Math.ceil(tailFrac * sorted.length));
  const tail = sorted.slice(0, k);
  return tail.reduce((a, b) => a + b, 0) / tail.length;
}

/** Inner risk: CVaR_0.10 over game outcomes given the engine's outcome distribution. */
export function innerCvar(outcomeLosses: readonly number[]): number {
  return tailMean(outcomeLosses, 0.1);
}

/** Outer risk: CVaR_0.95 (worst 5% tail) over the posterior of the engine's win probs. */
export function outerCvar(innerValues: readonly number[]): number {
  return tailMean(innerValues, 0.05);
}

export interface BetaPosterior {
  readonly a: number;
  readonly b: number;
}

/** Beta-binomial posterior of the engine's own win probability, updated on win/loss history. */
export function betaBinomialPosterior(
  wins: number,
  losses: number,
  a0 = 1,
  b0 = 1,
): BetaPosterior {
  return { a: a0 + wins, b: b0 + losses };
}

export function betaMean(p: BetaPosterior): number {
  return p.a / (p.a + p.b);
}

function gammaSample(shape: number, rand: () => number): number {
  // Marsaglia-Tsang for shape >= 1; boost for shape < 1.
  if (shape < 1) {
    return gammaSample(shape + 1, rand) * Math.pow(rand(), 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x = 0;
    let v = 0;
    do {
      x = gaussian(rand);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rand();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  const v = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Draw one sample from Beta(a, b). */
export function betaSample(a: number, b: number, rand: () => number): number {
  const x = gammaSample(a, rand);
  const y = gammaSample(b, rand);
  return x / (x + y);
}

/** Projection of v onto the probability simplex (long-only, sums to 1). */
export function projectSimplex(v: readonly number[]): number[] {
  const n = v.length;
  const sorted = [...v].sort((a, b) => b - a);
  let rho = 0;
  let css = 0;
  for (let i = 0; i < n; i++) {
    css += sorted[i]!;
    const t = (css - 1) / (i + 1);
    if (sorted[i]! - t > 0) rho = i + 1;
  }
  const cssRho = sorted.slice(0, rho).reduce((a, b) => a + b, 0);
  const theta = (cssRho - 1) / Math.max(rho, 1);
  return v.map((x) => Math.max(x - theta, 0));
}

export interface SlatePick {
  readonly id: string;
  readonly posterior: BetaPosterior;
  readonly decimalOdds: number;
}

/**
 * Composite risk measure objective for a weight vector via SAA:
 * outer CVaR_0.95 over posterior draws of inner CVaR_0.10 over outcome draws.
 * Lower is better.
 */
export function crmObjective(
  weights: readonly number[],
  picks: readonly SlatePick[],
  nPosteriorDraws: number,
  nOutcomeDraws: number,
  rand: () => number,
): number {
  const innerVals: number[] = [];
  for (let d = 0; d < nPosteriorDraws; d++) {
    const ps = picks.map((p) => betaSample(p.posterior.a, p.posterior.b, rand));
    const outcomeLosses: number[] = [];
    for (let o = 0; o < nOutcomeDraws; o++) {
      let profit = 0;
  for (let i = 0; i < picks.length; i++) {
    const win = rand() < ps[i]!;
    profit += win ? weights[i]! * (picks[i]!.decimalOdds - 1) : -weights[i]!;
  }
      outcomeLosses.push(-profit);
    }
    innerVals.push(innerCvar(outcomeLosses));
  }
  return outerCvar(innerVals);
}

function dirichletSample(n: number, rand: () => number): number[] {
  const xs = Array.from({ length: n }, () => gammaSample(1, rand));
  const s = xs.reduce((a, b) => a + b, 0);
  return xs.map((x) => x / s);
}

/**
 * SAA solver: random Dirichlet restarts over the simplex + greedy coordinate
 * hill-climbing, keeping the weight vector minimizing the composite risk measure.
 */
export function solveCrmSaa(
  picks: readonly SlatePick[],
  seed = 42,
  nRestarts = 24,
  nPosteriorDraws = 200,
  nOutcomeDraws = 32,
): number[] {
  const rand = mulberry32(seed);
  let bestW: number[] = dirichletSample(picks.length, rand);
  let bestObj = crmObjective(bestW, picks, nPosteriorDraws, nOutcomeDraws, rand);
  for (let r = 0; r < nRestarts; r++) {
    let w = dirichletSample(picks.length, rand);
    for (let step = 0; step < 12; step++) {
      const i = Math.floor(rand() * picks.length);
      const j = Math.floor(rand() * picks.length);
      if (i === j) continue;
      const delta = 0.05 * rand();
      const cand = w.map((x, k) =>
        k === i ? x + delta : k === j ? Math.max(x - delta, 0) : x,
      );
      const proj = projectSimplex(cand);
      const obj = crmObjective(proj, picks, nPosteriorDraws, nOutcomeDraws, rand);
      if (obj < bestObj) {
        bestObj = obj;
        bestW = proj;
      }
      if (obj < crmObjective(w, picks, nPosteriorDraws, nOutcomeDraws, rand)) w = proj;
    }
  }
  return bestW;
}
