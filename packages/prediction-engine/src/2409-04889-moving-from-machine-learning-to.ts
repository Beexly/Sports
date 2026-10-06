/**
 * arXiv:2409.04889 — Moving from Machine Learning to Statistics: Expected Points in American Football
 *
 * Expected-points rebuild: opponent-quality-adjusted logistic EP with 1/N_i drive-length weighting, a
 * catalytic prior shrinking toward market-implied scoring expectations by game-state, and a game-cluster
 * bootstrap for honest intervals.
 *
 * Improvement: Rebuild GSE's EPA model with the full package (opponent-quality adjustment, 1/N_i drive-length weighting, game-cluster bootstrap) and add a catalytic prior that shrinks toward market-implied scoring expectations by game-state instead of plain logistic regression, producing a smoothed, market-consistent EPA that tightens spread/total residuals.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt the full package (quality adjustment + 1/N_i weighting + cluster bootstrap) if the weighted model beats unweighted on 2023–2024 log-loss and bootstrap CIs achieve ≥93% coverage; adopt the catalytic prior only if it removes monotonicity artifacts at <0.5% log-loss cost.
 */

/** Numerically stable logistic. */
export function logistic(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

/** Weighted logistic EP fit via Newton-Raphson (weights = 1/N_i). */
export function weightedLogisticFit(
  X: number[][],
  y: readonly (0 | 1)[],
  w: readonly number[],
  iters = 50,
): number[] {
  const n = y.length;
  if (n === 0 || X.length !== n || w.length !== n) throw new Error("weightedLogisticFit: length mismatch");
  const p = X[0]?.length ?? 0;
  let beta = new Array<number>(p).fill(0);
  for (let it = 0; it < iters; it++) {
    const grad = new Array<number>(p).fill(0);
    const H: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
    for (let i = 0; i < n; i++) {
      const eta = (X[i] ?? []).reduce((s, x, j) => s + x * (beta[j] ?? 0), 0);
      const ph = logistic(eta);
      const r = ((y[i] ?? 0) - ph) * (w[i] ?? 0);
      const vw = ph * (1 - ph) * (w[i] ?? 0);
      for (let a = 0; a < p; a++) {
        grad[a] = (grad[a] ?? 0) + r * ((X[i]?.[a]) ?? 0);
        for (let b = 0; b < p; b++) H[a]![b] = (H[a]?.[b] ?? 0) + vw * ((X[i]?.[a]) ?? 0) * ((X[i]?.[b]) ?? 0);
      }
    }
    // Solve H delta = grad
    const M = H.map((row, i) => [...row, grad[i] ?? 0]);
    for (let c = 0; c < p; c++) {
      let piv = c;
      for (let r = c + 1; r < p; r++) if (Math.abs(M[r]?.[c] ?? 0) > Math.abs(M[piv]?.[c] ?? 0)) piv = r;
      const tmp = M[c]!; M[c] = M[piv]!; M[piv] = tmp;
      const d = M[c]?.[c] ?? 0;
      if (Math.abs(d) < 1e-12) continue;
      for (let r = 0; r < p; r++) {
        if (r === c) continue;
        const f = (M[r]?.[c] ?? 0) / d;
        for (let k = c; k <= p; k++) M[r]![k] = (M[r]?.[k] ?? 0) - f * (M[c]?.[k] ?? 0);
      }
    }
    let mx = 0;
    for (let a = 0; a < p; a++) {
      const d = M[a]?.[a] ?? 0;
      const delta = (M[a]?.[p] ?? 0) / (Math.abs(d) < 1e-12 ? 1 : d);
      beta[a] = (beta[a] ?? 0) + delta;
      mx = Math.max(mx, Math.abs(delta));
    }
    if (mx < 1e-10) break;
  }
  return beta;
}

/**
 * Catalytic prior shrinkage: beta_shrunk = (1 - lambda) * beta + lambda * beta_market,
 * where beta_market encodes market-implied scoring by game-state.
 */
export function catalyticShrink(
  beta: readonly number[],
  betaMarket: readonly number[],
  lambda: number,
): number[] {
  if (beta.length !== betaMarket.length) throw new Error("catalyticShrink: dim mismatch");
  if (lambda < 0 || lambda > 1) throw new Error("catalyticShrink: lambda in [0,1]");
  return beta.map((b, i) => (1 - lambda) * b + lambda * (betaMarket[i] ?? 0));
}

/**
 * Game-cluster bootstrap: resample whole games (clusters) with replacement,
 * refit, and collect the coefficient replicates for CIs.
 */
export function clusterBootstrapReplicates(
  X: number[][],
  y: (0 | 1)[],
  w: number[],
  clusters: readonly (string | number)[],
  B: number,
  rng: () => number,
): number[][] {
  const uniq = [...new Set(clusters)];
  if (uniq.length === 0) throw new Error("clusterBootstrapReplicates: no clusters");
  const reps: number[][] = [];
  for (let b = 0; b < B; b++) {
    const chosen = Array.from({ length: uniq.length }, () => uniq[Math.floor(rng() * uniq.length)]!);
    const idx: number[] = [];
    chosen.forEach((c) => clusters.forEach((cc, i) => { if (cc === c) idx.push(i); }));
    reps.push(weightedLogisticFit(idx.map((i) => X[i]!), idx.map((i) => y[i]!), idx.map((i) => w[i]!), 25));
  }
  return reps;
}

/** Percentile CI from bootstrap replicates for one coefficient. */
export function bootstrapCI(reps: readonly number[][], coefIdx: number, alpha = 0.05): [number, number] {
  const vals = reps.map((r) => r[coefIdx] ?? 0).sort((a, b) => a - b);
  if (vals.length === 0) throw new Error("bootstrapCI: no replicates");
  const lo = vals[Math.floor((alpha / 2) * vals.length)] ?? 0;
  const hi = vals[Math.min(vals.length - 1, Math.ceil((1 - alpha / 2) * vals.length) - 1)] ?? 0;
  return [lo, hi];
}
