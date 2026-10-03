
export function quantileLoss(y: number, q: number, alpha: number): number {
  const e = y - q;
  return e >= 0 ? alpha * e : (alpha - 1) * e;
}

function projectSimplex(w: number[]): number[] {
  const n = w.length;
  const sorted = [...w].sort((a, b) => b - a);
  let css = 0;
  let rho = 0;
  for (let i = 0; i < n; i++) {
    css += sorted[i] ?? 0;
    const t = (css - 1) / (i + 1);
    if ((sorted[i] ?? 0) - t > 0) rho = i + 1;
    else break;
  }
  const cssRho = sorted.slice(0, rho).reduce((s, v) => s + v, 0);
  const theta = (cssRho - 1) / Math.max(rho, 1);
  return w.map((v) => Math.max(v - theta, 0));
}

export interface QslOptions {
  readonly iters?: number;
  readonly lr?: number;
  readonly init?: readonly number[];
}

/**
 * Continuous Quantile Super Learner: convex (simplex) weights over K candidate
 * quantile curves minimizing mean pinball loss, via projected subgradient descent.
 * candidates[k][i][a], y[i], alphas[a].
 */
export function quantileSuperLearner(
  candidates: ReadonlyArray<ReadonlyArray<readonly number[]>>,
  y: readonly number[],
  alphas: readonly number[],
  opts: QslOptions = {},
): number[] {
  const K = candidates.length;
  if (K === 0) throw new Error("quantile-super-learner: need >= 1 candidate");
  const iters = opts.iters ?? 500;
  const lr = opts.lr ?? 0.1;
  let w = opts.init ? [...opts.init] : new Array<number>(K).fill(1 / K);
  w = projectSimplex(w);
  const n = y.length;
  for (let it = 0; it < iters; it++) {
    const grad = new Array<number>(K).fill(0);
    for (let i = 0; i < n; i++) {
      const yi = y[i] ?? 0;
      for (let a = 0; a < alphas.length; a++) {
        const alpha = alphas[a] ?? 0.5;
        let q = 0;
        for (let k = 0; k < K; k++) q += (w[k] ?? 0) * ((candidates[k]?.[i]?.[a]) ?? 0);
        const dLoss = yi - q >= 0 ? -alpha : 1 - alpha;
        for (let k = 0; k < K; k++) grad[k] = (grad[k] ?? 0) + dLoss * ((candidates[k]?.[i]?.[a]) ?? 0);
      }
    }
    const scale = 1 / Math.max(n * alphas.length, 1);
    w = projectSimplex(w.map((wk, k) => wk - lr * (grad[k] ?? 0) * scale));
  }
  return w;
}

/** Mean quantile loss of the simplex-weighted combination (for walk-forward scoring). */
export function qslMeanLoss(
  candidates: ReadonlyArray<ReadonlyArray<readonly number[]>>,
  y: readonly number[],
  alphas: readonly number[],
  weights: readonly number[],
): number {
  let total = 0;
  let count = 0;
  for (let i = 0; i < y.length; i++) {
    for (let a = 0; a < alphas.length; a++) {
      let q = 0;
      for (let k = 0; k < candidates.length; k++) q += (weights[k] ?? 0) * ((candidates[k]?.[i]?.[a]) ?? 0);
      total += quantileLoss(y[i] ?? 0, q, alphas[a] ?? 0.5);
      count++;
    }
  }
  return count === 0 ? 0 : total / count;
}
