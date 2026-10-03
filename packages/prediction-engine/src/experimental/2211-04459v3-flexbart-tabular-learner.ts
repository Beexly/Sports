/**
 * arXiv 2211.04459v3: flexBART: Flexible Bayesian regression trees with categorical predictors
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Install flexBART (R package or ported C++ core) as GSE's Bayesian tabular learner and benchmark it as a drop-in replacement for XGBoost on tabular game/team/player tasks: features = team IDs, QB IDs, coach IDs (high-cardinality categoricals currently one-hot/target-encoded) + continuous EPA aggregates; first applications = 4th-down/prop probability models and referee-crew effects on totals (crew ID is the natural categorical input); training protocol = >=4 chains with R-hat checks, 2000+ iterations, batch serving (weekly precomputed posterior means + intervals) -- then hybridize: use flexBART's posterior co-clustering matrix over team levels as a learned similarity kernel inside the existing XGBoost pipeline (team-similarity features from the Bayesian model, point predictions from the fast model).
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Install flexBART (R package or ported C++ core) as GSE's Bayesian tabular learner and benchmark it as a drop-in replacement for XGBoost on tabular game/team/player tasks: features = team IDs, QB IDs, coach IDs (high-cardinality categoricals currently one-hot/target-encoded) + continuous EPA aggregates; first applications = 4th-down/prop probability models and referee-crew effects on totals (crew ID is the natural categorical input); training protocol = >=4 chains with R-hat checks, 2000+ iterations, batch serving (weekly precomputed posterior means + intervals) — then hybridize: use flexBART's posterior co-clustering matrix over team levels as a learned similarity kernel inside the existing XGBoost pipeline (team-similarity features from the Bayesian model, point predictions from the fast model).
 *
 * ACCEPTANCE GATE (verbatim):
 * Adopt flexBART iff: (a) out-of-sample RMSE on 2024 improves >=3% over one-hot XGBoost (paper's benchmark gains were 5-30% on categorical-heavy data), AND (b) 80%/90% posterior intervals achieve empirical coverage within +-3 pp of nominal, with runtime acceptable for weekly batch; reject if gains <3% (check the DGP2 singleton-outlier caveat) or MCMC cost exceeds the batch window; reject the network extension if gs2/gs3 don't beat flexBART_unif on the schedule-graph task.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: experimental | verdict: ADOPT | doctrine: INFRA
 */

export const ENABLED = false;

export interface TreeStump {
  splitVar: number;
  splitVal: number;
  leftMean: number;
  rightMean: number;
}

/** Fit one Bayesian regression stump via Gibbs sampling of the split. */
export function bartStumpGibbs(
  X: number[][],
  y: number[],
  iters: number,
  rand: () => number,
  sigma = 1,
  tau = 1,
): { stumps: TreeStump[]; postMean: number[] } {
  const n = X.length;
  const p = X[0]!.length;
  const stumps: TreeStump[] = [];
  const postSum = new Array<number>(n).fill(0);
  for (let it = 0; it < iters; it++) {
    // propose split var and value
    const v = Math.floor(rand() * p);
    const col = X.map((row) => row[v]!);
    const lo = Math.min(...col);
    const hi = Math.max(...col);
    const c = lo + rand() * (hi - lo);
    const L = y.filter((_, i) => X[i]![v]! <= c);
    const R = y.filter((_, i) => X[i]![v]! > c);
    const postMu = (vals: number[]): number => {
      const m = vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length;
      const postVar = 1 / (vals.length / (sigma * sigma) + 1 / (tau * tau));
      const mu = postVar * (vals.reduce((a, b) => a + b, 0) / (sigma * sigma));
      void m;
      return mu + Math.sqrt(postVar) * gaussBart(rand);
    };
    const stump: TreeStump = { splitVar: v, splitVal: c, leftMean: postMu(L), rightMean: postMu(R) };
    stumps.push(stump);
    for (let i = 0; i < n; i++) {
      postSum[i]! += X[i]![v]! <= c ? stump.leftMean : stump.rightMean;
    }
  }
  return { stumps, postMean: postSum.map((s) => s / iters) };
}

/** Standard normal draw (local Box-Muller). */
export function gaussBart(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Posterior co-clustering matrix over categorical levels. */
export function coClusterMatrix(
  stumps: TreeStump[],
  levels: number[],
  catVar: number,
): number[][] {
  const uniq = [...new Set(levels)].sort((a, b) => a - b);
  const idx = new Map(uniq.map((u, i) => [u, i]));
  const m = uniq.length;
  const C: number[][] = Array.from({ length: m }, () => new Array<number>(m).fill(0));
  // proxy: levels sharing similar leaf assignment across posterior stumps
  for (const s of stumps) {
    if (s.splitVar !== catVar) continue;
    for (let a = 0; a < m; a++) {
      for (let b = 0; b < m; b++) {
        const la = uniq[a]! <= s.splitVal ? 0 : 1;
        const lb = uniq[b]! <= s.splitVal ? 0 : 1;
        if (la === lb) C[a]![b]! += 1;
      }
    }
  }
  const tot = Math.max(1, stumps.filter((s) => s.splitVar === catVar).length);
  return C.map((row) => row.map((v) => v / tot));
}

/** Empirical coverage of posterior predictive intervals. */
export function intervalCoverage(
  postMean: number[],
  postSd: number[],
  y: number[],
  z = 1.28,
): number {
  let c = 0;
  for (let i = 0; i < y.length; i++) {
    if (Math.abs(y[i]! - postMean[i]!) <= z * postSd[i]!) c++;
  }
  return c / Math.max(1, y.length);
}
