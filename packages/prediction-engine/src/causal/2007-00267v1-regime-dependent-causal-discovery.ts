/**
 * arXiv 2007.00267v1: Reconstructing regime-dependent causal relationships from observational time series
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Regime-dependent causal discovery on the nflverse team-week panel: pooled across teams (shared regimes per season, team-specific graphs, or league-week aggregates), nodes = ~15 core indicators with ParCorr CI test, N_K in {2,3} by AICc; the live model uses the current-regime graph's Markov blanket, regime identity estimated from the trailing 6-week window; served offline quarterly.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Run regime-dependent causal discovery on the nflverse team-week panel: pool across teams (shared regimes per season, team-specific graphs, or league-week aggregates), nodes = ~15 core indicators (EPA components, pressure, turnovers, injury counts, pace) with ParCorr CI test, N_K in {2,3} by AICc; the live model uses the current-regime graph's Markov blanket, regime identity estimated from the trailing 6-week window; serving offline quarterly.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT if (a) regime model beats baseline by >=0.003 Brier on 2024-2025 held-out; (b) AICc selects N_K >= 2 in >=60% of seasons; (c) the 'disrupted' regime classifier recovers >=70% of documented QB-injury-spell weeks; (d) per-regime link TPR >= 0.85 on synthetic sports-like data. Reject if (a) fails or AICc persistently selects N_K=1.
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

/**
 * Two-sided Page's CUSUM changepoint detector; returns alarm indices.
 * The in-control mean is estimated from an initial Phase-I window
 * (first 50 points or first quarter of the series, whichever is smaller);
 * the series is assumed to start in control. A global mean must NOT be
 * used as the reference: after a level shift it sits between the regimes
 * and guarantees false alarms on both sides.
 */
export function cusumDetect(xs: number[], k: number, h: number): number[] {
  const alarms: number[] = [];
  const w = Math.max(5, Math.min(50, Math.floor(xs.length / 4)));
  const m = xs.slice(0, w).reduce((a, b) => a + b, 0) / w;
  let gPos = 0;
  let gNeg = 0;
  for (let i = 0; i < xs.length; i++) {
    gPos = Math.max(0, gPos + xs[i]! - m - k);
    gNeg = Math.max(0, gNeg + m - k - xs[i]!);
    if (gPos > h || gNeg > h) {
      alarms.push(i);
      gPos = 0;
      gNeg = 0;
    }
  }
  return alarms;
}

/**
 * Bayesian Online Changepoint Detection (Adams-MacKay) for 1D Gaussian data
 * with Normal-Gamma prior (mu0, kappa0, alpha0, beta0). Returns per-time-step
 * changepoint probability P(r_t = 0 | x_1..t).
 */
export function bocpdLite(
  xs: number[],
  hazard: number,
  mu0: number,
  kappa0: number,
  alpha0: number,
  beta0: number,
): number[] {
  // run-length distribution R[t][r]
  let R = new Map<number, number>([[0, 1]]);
  let muT: number[] = [mu0];
  let kaT: number[] = [kappa0];
  let alT: number[] = [alpha0];
  let beT: number[] = [beta0];
  const cpProb: number[] = [];
  for (const x of xs) {
    const Rnext = new Map<number, number>();
    let total = 0;
    // growth
    for (const [r, pr] of R) {
      const mu = muT[r]!;
      const ka = kaT[r]!;
      const al = alT[r]!;
      const be = beT[r]!;
      const pred = studentTPdf(x, mu, (be * (ka + 1)) / (al * ka), 2 * al);
      const w = pr * (1 - hazard) * pred;
      Rnext.set(r + 1, (Rnext.get(r + 1) ?? 0) + w);
      total += w;
    }
    // changepoint: a fresh run starts from the prior, so the changepoint
    // branch uses the PRIOR predictive density for all runs
    const priorPred = studentTPdf(x, mu0, (beta0 * (kappa0 + 1)) / (alpha0 * kappa0), 2 * alpha0);
    let cpMass = 0;
    for (const [, pr] of R) cpMass += pr;
    const cpW = cpMass * hazard * priorPred;
    Rnext.set(0, cpW);
    total += cpW;
    const norm = Math.max(1e-300, total);
    for (const [r, w] of Rnext) Rnext.set(r, w / norm);
    cpProb.push((Rnext.get(0) ?? 0));
    // update sufficient statistics per run length
    const maxR = Math.max(...Rnext.keys());
    const nmu: number[] = new Array<number>(maxR + 1).fill(mu0);
    const nka: number[] = new Array<number>(maxR + 1).fill(kappa0);
    const nal: number[] = new Array<number>(maxR + 1).fill(alpha0);
    const nbe: number[] = new Array<number>(maxR + 1).fill(beta0);
    for (const [r] of Rnext) {
      if (r === 0) continue;
      const pr = r - 1;
      const mu = pr < muT.length ? muT[pr]! : mu0;
      const ka = pr < kaT.length ? kaT[pr]! : kappa0;
      const al = pr < alT.length ? alT[pr]! : alpha0;
      const be = pr < beT.length ? beT[pr]! : beta0;
      nmu[r] = (ka * mu + x) / (ka + 1);
      nka[r] = ka + 1;
      nal[r] = al + 0.5;
      nbe[r] = be + (ka * (x - mu) * (x - mu)) / (2 * (ka + 1));
    }
    muT = nmu; kaT = nka; alT = nal; beT = nbe;
    R = Rnext;
  }
  return cpProb;
}

function studentTPdf(x: number, mu: number, sig2: number, nu: number): number {
  const z = (x - mu) / Math.sqrt(Math.max(1e-12, sig2));
  // normal approximation to t for stability
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI * Math.max(1e-12, sig2));
}
