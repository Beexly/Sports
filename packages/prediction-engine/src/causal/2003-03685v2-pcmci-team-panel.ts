/**
 * arXiv 2003.03685v2: Discovering contemporaneous and lagged causal relations in autocorrelated nonlinear time series
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * PCMCI+ per team-season on the nflverse team-week panel (N~30 indicators, T~18 weeks, taumax=4, ParCorr first with GPDC confirmation on the top-50 stable edges); edge frequencies aggregated across ~380 team-seasons (retain >= 0.4); quarterly graph artifact feeding the Markov-blanket feature-pruning pipeline.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Run PCMCI+ per team-season on the nflverse team-week panel (N~30 indicators, T~18 weeks, taumax=4, ParCorr first with GPDC confirmation on the top-50 stable edges), aggregate edge frequencies across ~380 team-seasons (retain edges with cross-team-season frequency >= 0.4), and serve a quarterly graph artifact feeding the Markov-blanket feature-pruning pipeline.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the PCMCI+-pruned feature set if: (a) held-out 2024-2025 Brier within 0.002 of the all-lags baseline (or better) while using <=60% of features; (b) median cross-team-season edge Jaccard >= 0.5; (c) contemporaneous orientation precision on domain-known directions (pressure->sacks, turnovers->EPA) >= 0.75.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: causal_discovery | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Pearson correlation. */
export function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    dx += (xs[i]! - mx) ** 2;
    dy += (ys[i]! - my) ** 2;
  }
  return dx <= 0 || dy <= 0 ? 0 : num / Math.sqrt(dx * dy);
}

/** Residualize v on columns Z via ridge. */
function residualize(v: number[], Z: number[][], lambda = 1e-6): number[] {
  if (Z.length === 0 || Z[0]!.length === 0) return v.slice();
  const p = Z[0]!.length;
  const XtX: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const Xtv = new Array<number>(p).fill(0);
  for (let i = 0; i < v.length; i++) {
    for (let j = 0; j < p; j++) {
      Xtv[j]! += Z[i]![j]! * v[i]!;
      for (let k = 0; k < p; k++) XtX[j]![k]! += Z[i]![j]! * Z[i]![k]!;
    }
  }
  for (let j = 0; j < p; j++) XtX[j]![j]! += lambda;
  const beta = solvePcor(XtX, Xtv);
  return v.map((vi, i) => vi - Z[i]!.reduce((s, z, j) => s + z * beta[j]!, 0));
}

function solvePcor(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i] ?? 0]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(M[r]![c] ?? 0) > Math.abs(M[piv]![c] ?? 0)) piv = r;
    }
    const tmp = M[c]!;
    M[c] = M[piv]!;
    M[piv] = tmp;
    const d = M[c]![c] ?? 0;
    if (Math.abs(d) < 1e-12) continue;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = (M[r]![c] ?? 0) / d;
      for (let k = c; k <= n; k++) M[r]![k] = (M[r]![k] ?? 0) - f * (M[c]![k] ?? 0);
    }
  }
  return M.map((row, i) => {
    const d = row[i] ?? 0;
    return (row[n] ?? 0) / (Math.abs(d) < 1e-12 ? 1 : d);
  });
}

/** Partial correlation of columns i, j given conditioning set. X rows = obs. */
export function partialCorr(X: number[][], i: number, j: number, cond: number[]): number {
  const n = X.length;
  const vi = X.map((row) => row[i]!);
  const vj = X.map((row) => row[j]!);
  const Z = X.map((row) => cond.map((c) => row[c]!));
  void n;
  return pearson(residualize(vi, Z), residualize(vj, Z));
}

/** Fisher z-test p-value for a (partial) correlation with n observations. */
export function pcorPvalue(r: number, n: number, condSize: number): number {
  const rc = Math.min(0.999999, Math.max(-0.999999, r));
  const z = 0.5 * Math.log((1 + rc) / (1 - rc));
  const dof = n - condSize - 3;
  if (dof <= 0) return 1;
  const stat = Math.abs(z) * Math.sqrt(dof);
  return 2 * (1 - normalCdfPcor(stat));
}

function normalCdfPcor(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

/**
 * PCMCI+-style skeleton (order-0 then order-1 conditioning) over lagged panel.
 * X rows = time, cols = variables. Returns adjacency (i -> j at lag).
 */
export function pcmciSkeletonS1(
  X: number[][],
  maxLag: number,
  alpha: number,
): { from: number; to: number; lag: number; pcor: number }[] {
  const T = X.length;
  const V = X[0]!.length;
  const edges: { from: number; to: number; lag: number; pcor: number }[] = [];
  for (let j = 0; j < V; j++) {
    for (let i = 0; i < V; i++) {
      for (let lag = 1; lag <= maxLag; lag++) {
        const xs: number[] = [];
        const ys: number[] = [];
        for (let t = lag; t < T; t++) {
          xs.push(X[t - lag]![i]!);
          ys.push(X[t]![j]!);
        }
        const r0 = pearson(xs, ys);
        if (pcorPvalue(r0, xs.length, 0) > alpha) continue;
        // order-1: condition on the strongest other lagged parent candidate
        let bestCond = -1;
        let bestAbs = 0;
        for (let k = 0; k < V; k++) {
          if (k === i) continue;
          const zs: number[] = [];
          for (let t = lag; t < T; t++) zs.push(X[t - lag]![k]!);
          const rk = Math.abs(pearson(zs, ys));
          if (rk > bestAbs) { bestAbs = rk; bestCond = k; }
        }
        let keep = true;
        let r1 = r0;
        if (bestCond >= 0) {
          const Z: number[][] = [];
          const A: number[][] = [];
          for (let t = lag; t < T; t++) {
            Z.push([X[t - lag]![bestCond]!]);
            A.push([X[t - lag]![i]!, X[t]![j]!]);
          }
          void A;
          const flat = (c: number): number[] => Z.map((row) => row[c]!);
          void flat;
          r1 = partialCorr(
            Array.from({ length: xs.length }, (_, t) => [xs[t]!, ys[t]!, Z[t]![0]!]),
            0, 1, [2],
          );
          if (pcorPvalue(r1, xs.length, 1) > alpha) keep = false;
        }
        if (keep) edges.push({ from: i, to: j, lag, pcor: r1 });
      }
    }
  }
  return edges;
}
