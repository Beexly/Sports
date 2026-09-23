/**
 * arXiv 2209.01697: Regime-Dependent Factor Graphical LASSO for Forecast Combination (Lee & Seregina, 2023)
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Build the regime-dependent factor Graphical LASSO combiner for GSE's correlated model zoo: panel of weekly forecast errors from K~10-30 models over 3+ seasons; strip common errors via PCA, fit Graphical LASSO to the residual precision, compute Bates-Granger weights; run Bai-Perron break tests on the loadings and residual-precision sequence around known regime events (mid-season QB changes, COVID seasons) to drive regime-specific combination weights (discrete-kernel regime-dependent loadings + time-varying GL) instead of constant weights.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build the regime-dependent factor Graphical LASSO combiner for GSE's correlated model zoo: panel of weekly forecast errors from K~10-30 models over 3+ seasons; strip common errors via PCA, fit Graphical LASSO to the residual precision, compute Bates-Granger weights; run Bai-Perron break tests on the loadings and residual-precision sequence around known regime events (mid-season QB changes, COVID seasons) to drive regime-specific combination weights (discrete-kernel regime-dependent loadings + time-varying GL) instead of constant weights.
 *
 * ACCEPTANCE GATE (verbatim):
 * Gate is the break-alignment/post-break MSFE test: detected Bai-Perron break dates must align with the known regime events, and post-break combined MSFE/log-score must beat both equal weights and sample-precision weights (the paper's RD-FGL beat EW by 30-70% MSFE where structure/breaks exist is the reference magnitude) — with a stable-period negative control (no spurious breaks; FGL no worse than EW in stable periods).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: ensembles | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Projected-gradient NNLS stacking: min ||Fw - y||^2 s.t. w >= 0. */
export function stackNNLS(F: number[][], y: number[], iters = 500, lr = 0.05): number[] {
  const K = F[0]!.length;
  let w = new Array<number>(K).fill(1 / K);
  for (let it = 0; it < iters; it++) {
    const r = F.map((row, i) => row.reduce((s, f, k) => s + f * w[k]!, 0) - y[i]!);
    const grad = new Array<number>(K).fill(0);
    for (let i = 0; i < F.length; i++)
      for (let k = 0; k < K; k++) grad[k]! += (2 * F[i]![k]! * r[i]!) / F.length;
    w = w.map((wk, k) => Math.max(0, wk - lr * grad[k]!));
  }
  const s = w.reduce((a, b) => a + b, 0);
  return s > 0 ? w.map((x) => x / s) : new Array<number>(K).fill(1 / K);
}

/** Log-score stacking via coordinate ascent on the simplex. */
export function logScoreStacking(
  P: number[][],
  y: number[],
  iters = 300,
): number[] {
  const K = P[0]!.length;
  let w = new Array<number>(K).fill(1 / K);
  const score = (ww: number[]): number => {
    let s = 0;
    for (let i = 0; i < P.length; i++) {
      let p = 0;
      for (let k = 0; k < K; k++) p += ww[k]! * P[i]![k]!;
      const pc = Math.min(1 - 1e-12, Math.max(1e-12, p));
      s += y[i]! === 1 ? Math.log(pc) : Math.log(1 - pc);
    }
    return s / P.length;
  };
  for (let it = 0; it < iters; it++) {
    for (let k = 0; k < K; k++) {
      const step = 0.02;
      const wUp = w.map((x, j) => (j === k ? x + step : x));
      const wDn = w.map((x, j) => (j === k ? Math.max(0, x - step) : x));
      const nUp = (a: number[]): number[] => {
        const s = a.reduce((x, z) => x + z, 0);
        return a.map((x) => x / s);
      };
      const sUp = score(nUp(wUp));
      const sDn = score(nUp(wDn));
      const s0 = score(w);
      if (sUp > s0 && sUp >= sDn) w = nUp(wUp);
      else if (sDn > s0) w = nUp(wDn);
    }
  }
  return w;
}

/** Regime-dependent stacking: softmax weights linear in regime features. */
export function regimeStackWeights(regime: number[], coef: number[][]): number[] {
  const K = coef.length;
  const logits = coef.map((c) => c.reduce((s, cj, j) => s + cj * (j === 0 ? 1 : regime[j - 1] ?? 0), 0));
  const mx = Math.max(...logits);
  const e = logits.map((l) => Math.exp(l - mx));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}

/** Soft thresholding operator. */
export function softThreshold(x: number, lam: number): number {
  if (x > lam) return x - lam;
  if (x < -lam) return x + lam;
  return 0;
}

/** Iterative soft-thresholding (ISTA) for Lasso: min ||y - Xb||^2/2n + lam||b||_1. */
export function istaLasso(
  X: number[][],
  y: number[],
  lam: number,
  iters: number,
): number[] {
  const n = X.length;
  const p = X[0]!.length;
  let b = new Array<number>(p).fill(0);
  // Lipschitz constant via power iteration
  let v = Array.from({ length: p }, () => 1 / Math.sqrt(p));
  let L = 1;
  for (let it = 0; it < 30; it++) {
    const Xv = X.map((row) => row.reduce((s, x, j) => s + x * v[j]!, 0));
    const XtXv = new Array<number>(p).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) XtXv[j]! += X[i]![j]! * Xv[i]!;
    L = Math.sqrt(XtXv.reduce((s, x) => s + x * x, 0)) / n;
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    v = XtXv.map((x) => x / Math.max(1e-12, norm));
  }
  const step = 1 / Math.max(1e-9, L);
  for (let it = 0; it < iters; it++) {
    const r = X.map((row, i) => row.reduce((s, x, j) => s + x * b[j]!, 0) - y[i]!);
    const grad = new Array<number>(p).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) grad[j]! += X[i]![j]! * r[i]!;
    b = b.map((bj, j) => softThreshold(bj - (step / n) * grad[j]!, step * lam));
  }
  return b;
}

/** TV-denoising (taut string / fused lasso path via pool adjacent violators, L1 trend). */
export function tvDenoise1d(y: number[], lam: number): number[] {
  // proximal point via subgradient descent (simple, robust)
  let x = y.slice();
  const step = 0.05;
  for (let it = 0; it < 2000; it++) {
    const g = x.map((xi, i) => {
      let gg = 2 * (xi - y[i]!);
      if (i > 0) gg += lam * Math.sign(xi - x[i - 1]!);
      if (i < x.length - 1) gg += lam * Math.sign(xi - x[i + 1]!);
      return gg;
    });
    x = x.map((xi, i) => xi - step * g[i]!);
  }
  return x;
}
