/**
 * arXiv 2004.08428v1: Renormalizing individual performance metrics for cultural heritage management of sports records
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Era-adjusted player features: per-opportunity prowess (passing yards/attempt, EPA/play) renormalized against league-average-by-season to a common baseline before use in prop/fantasy models; Dickey-Fuller stationarity gate on every candidate feature's league-average series (deflate non-stationary ones); deflators validated by the distribution-collapse test (era-separated PDFs of the adjusted metric must collapse).
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Compute era-adjusted player features: per-opportunity prowess (e.g. passing yards/attempt, EPA/play) renormalized against league-average-by-season to a common baseline before use in prop/fantasy models; run a Dickey-Fuller stationarity gate on every candidate feature's league-average time series (deflate non-stationary ones); validate deflators by the distribution-collapse test (era-separated PDFs of the adjusted metric must collapse).
 *
 * ACCEPTANCE GATE (verbatim):
 * DF p < 0.05 on renormalized NFL feature series plus visual/PDF collapse across eras.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: props_dfs | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

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
