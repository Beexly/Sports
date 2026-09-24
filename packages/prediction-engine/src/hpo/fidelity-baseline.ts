/**
 * One-epoch / minimum-fidelity HPO baseline (arXiv 2307.15422v2).
 *
 * Cheap-first hyperparameter search: screen every config at minimum
 * fidelity (one epoch, or 50 trees / two seasons of data), rank by the
 * low-fidelity proxy, fully train only the top-3, optionally fit a
 * learning-curve slope on the fidelities to extrapolate. The gate:
 * the top-3 must contain a config within 0.002 log-loss of the
 * full-search best while using <= 10% of the full-search fits.
 *
 * Portable core: fidelity scheduling, rank-correlation of the proxy,
 * top-k selection, budget accounting, and the gate check.
 *
 * ACCEPTANCE GATE: ADAPT iff top-3 contains a config within 0.002
 * log-loss of the full-search best using <= 10% of fits; REJECT if
 * proxy rank correlation < 0.5 or the miss exceeds 0.005.
 *
 * Research-only module. Not wired into any live HPO path.
 */

export interface ConfigScore {
  config: string;
  /** Low-fidelity (screening) score, lower = better. */
  proxy: number;
  /** Full-fidelity score, lower = better. */
  full: number;
}

/** Fraction of the full-search fit budget consumed by the screen. */
export function budgetFraction(
  nConfigs: number,
  screenCostPerConfig: number,
  fullCostPerConfig: number,
  topK: number,
): number {
  if (nConfigs <= 0 || fullCostPerConfig <= 0) throw new Error("budgetFraction: invalid inputs");
  const screenCost = nConfigs * screenCostPerConfig;
  const refineCost = topK * fullCostPerConfig;
  return (screenCost + refineCost) / (nConfigs * fullCostPerConfig);
}

/** Spearman rank correlation between proxy and full scores. */
export function rankCorrelation(scores: readonly ConfigScore[]): number {
  if (scores.length < 3) throw new Error("rankCorrelation: need >= 3 configs");
  const ranked = (xs: number[]): number[] => {
    const order = xs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);
    const ranks = new Array(xs.length).fill(0);
    order.forEach((o, r) => {
      ranks[o.i] = r;
    });
    return ranks;
  };
  const rp = ranked(scores.map((s) => s.proxy));
  const rf = ranked(scores.map((s) => s.full));
  const n = scores.length;
  const mp = rp.reduce((s, x) => s + x, 0) / n;
  const mf = rf.reduce((s, x) => s + x, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = (rp[i] as number) - mp;
    const dy = (rf[i] as number) - mf;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return sxy / Math.max(1e-12, Math.sqrt(sxx * syy));
}

/** Top-k configs by proxy score. */
export function topKByProxy(scores: readonly ConfigScore[], k: number): ConfigScore[] {
  if (k <= 0) throw new Error("topKByProxy: k > 0");
  return [...scores].sort((a, b) => a.proxy - b.proxy).slice(0, k);
}

/**
 * Learning-curve slope: fit log-loss vs 1/fidelity on observed
 * (fidelity, loss) points; extrapolate the full-fidelity loss.
 */
export function extrapolateLoss(
  fidelities: readonly number[],
  losses: readonly number[],
): { slope: number; intercept: number; extrapolated: number } {
  if (fidelities.length !== losses.length || fidelities.length < 2) {
    throw new Error("extrapolateLoss: need >= 2 points");
  }
  const xs = fidelities.map((f) => 1 / f);
  const n = xs.length;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = losses.reduce((s, y) => s + y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += ((xs[i] as number) - mx) * ((losses[i] as number) - my);
    sxx += ((xs[i] as number) - mx) ** 2;
  }
  const slope = sxy / Math.max(1e-12, sxx);
  const intercept = my - slope * mx;
  return { slope, intercept, extrapolated: intercept }; // 1/f -> 0
}

export interface GateResult {
  /** Best full-fidelity loss among the top-k. */
  topKBest: number;
  /** Full-search best loss. */
  fullBest: number;
  /** Miss = topKBest - fullBest. */
  miss: number;
  budget: number;
  rho: number;
  pass: boolean;
}

/** Evaluate the acceptance gate. */
export function fidelityGate(
  scores: readonly ConfigScore[],
  k: number,
  screenCostPerConfig: number,
  fullCostPerConfig: number,
): GateResult {
  const topK = topKByProxy(scores, k);
  const topKBest = Math.min(...topK.map((s) => s.full));
  const fullBest = Math.min(...scores.map((s) => s.full));
  const miss = topKBest - fullBest;
  const budget = budgetFraction(scores.length, screenCostPerConfig, fullCostPerConfig, k);
  const rho = rankCorrelation(scores);
  return {
    topKBest,
    fullBest,
    miss,
    budget,
    rho,
    pass: miss <= 0.002 && budget <= 0.1 && rho >= 0.5,
  };
}
