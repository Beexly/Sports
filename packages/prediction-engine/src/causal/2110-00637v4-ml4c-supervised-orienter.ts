/**
 * arXiv 2110.00637v4: ML4C: Seeing Causality Through Latent Vicinity
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Add a supervised UT-orienter over the consensus skeleton from ledgers 1962-1966: discretize the ~35 team-season indicators into tertiles, synthesize 5000 football-plausible discrete DAGs (layered: game-context -> efficiency -> scoring -> outcome, 20-35 nodes, sparse) with varied edge densities and noise levels to blunt sample-bias, train the ML4C-Learner on UT labels, run the trained orienter on the consensus skeleton's UTs, apply Meek rules -> oriented CPDAG (edges left undirected stay undirected, the honest identifiability ceiling) -- then build continuous ML4C: vicinity features from continuous CI-test statistics (partial correlation profiles, GPDC residuals) trained on continuous synthetic SEMs, to orient the PCMCI+ skeleton natively without the lossy discretization step.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Add a supervised UT-orienter over the consensus skeleton from ledgers 1962-1966: discretize the ~35 team-season indicators into tertiles, synthesize 5000 football-plausible discrete DAGs (layered: game-context -> efficiency -> scoring -> outcome, 20-35 nodes, sparse) with varied edge densities and noise levels to blunt sample-bias, train the ML4C-Learner on UT labels, run the trained orienter on the consensus skeleton's UTs, apply Meek rules -> oriented CPDAG (edges left undirected stay undirected, the honest identifiability ceiling) — then build continuous ML4C: vicinity features from continuous CI-test statistics (partial correlation profiles, GPDC residuals) trained on continuous synthetic SEMs, to orient the PCMCI+ skeleton natively without the lossy discretization step.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the supervised orienter if: (a) held-out synthetic UT-F1 >= 0.8; (b) real-data orientation agreement across season splits >= 0.7; (c) >=80% of hand-labeled known colliders recovered (e.g., offensive EPA -> win <- defensive EPA); (d) adding orientations strictly improves the ledger-1967 quantitative-probing hit rate vs the unoriented skeleton.
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

export interface ParetoPoint {
  error: number;
  complexity: number;
  id: string;
}

/** Pareto frontier (minimize error and complexity). */
export function paretoFrontier(points: ParetoPoint[]): ParetoPoint[] {
  return points.filter((p) =>
    !points.some((q) => q !== p && q.error <= p.error && q.complexity <= p.complexity &&
      (q.error < p.error || q.complexity < p.complexity)),
  );
}

/** Jaccard similarity of two skeleton sets (equation families). */
export function skeletonJaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 1 : inter / union;
}

/** Paired t-test p-value (normal approx) for hypothesis-testing candidate rejection. */
export function pairedPvalue(a: number[], b: number[]): number {
  const n = a.length;
  const diffs = a.map((v, i) => v - b[i]!);
  const m = diffs.reduce((x, y) => x + y, 0) / n;
  const v = diffs.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, n - 1);
  const t = v <= 0 ? (m < 0 ? -Infinity : m > 0 ? Infinity : 0) : m / Math.sqrt(v / n);
  const p = 2 * (1 - normalCdfF(Math.abs(t)));
  return p;
}

function normalCdfF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

/** Hypothesis-testing rejection: reject candidate if not significantly better. */
export function hypothesisReject(candidateErr: number[], baselineErr: number[], alpha = 0.05): boolean {
  return pairedPvalue(candidateErr, baselineErr) >= alpha;
}

/** Vertical staging: filter hall-of-fame to expressions using only subset features. */
export function verticalFilter(
  hof: { expr: string; features: string[]; error: number }[],
  allowed: Set<string>,
): { expr: string; features: string[]; error: number }[] {
  return hof.filter((e) => e.features.every((f) => allowed.has(f)));
}
