/**
 * arXiv 2107.06268: Smoothed Bernstein Online Aggregation for Day-Ahead Electricity Demand Forecasting
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Install a shock-handling ensemble: an event-adjustment front-end (regress historical margins on schedule-event dummies -- Thanksgiving/Christmas/short-rest/byes -- with team-strength controls; train combiners on event-adjusted outcomes, add the event effect back at forecast time); window-diverse experts (copies of GSE's core models on 8wk / 1-season / 3-season windows); smoothed Bernstein Online Aggregation over experts; 2-D joint smoothing over the (market x week) weight grid with a tensor-product P-spline penalty (lambda_market: spread/total weights share structure; lambda_time: weights evolve slowly), tuned by discounted validation loss.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Install a shock-handling ensemble: an event-adjustment front-end (regress historical margins on schedule-event dummies — Thanksgiving/Christmas/short-rest/byes — with team-strength controls; train combiners on event-adjusted outcomes, add the event effect back at forecast time); window-diverse experts (copies of GSE's core models on 8wk / 1-season / 3-season windows); smoothed Bernstein Online Aggregation over experts; and 2-D joint smoothing over the (market x week) weight grid with a tensor-product P-spline penalty (lambda_market: spread/total weights share structure; lambda_time: weights evolve slowly, BOA updates as innovations), tuned by discounted validation loss.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT if smoothed BOA beats plain BOA by >=1% on margin MAE OR the event-adjustment front-end improves holiday/short-rest-week MAE by >=5% without hurting normal weeks. REJECT if the smoother's selected lambda collapses to ~=0 AND the front-end shows no holiday-week gain.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: ensembles | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Exponentially weighted average (Hedge) update on the simplex. */
export function ewaUpdate(w: number[], losses: number[], eta: number): number[] {
  const n = w.length;
  const un = w.map((wi, i) => wi * Math.exp(-eta * losses[i]!));
  const s = un.reduce((a, b) => a + b, 0);
  return un.map((u) => u / Math.max(1e-300, s));
}

/**
 * Bernstein Online Aggregation update with second-order correction:
 * eta_t adaptive via cumulative variance V.
 */
export function boaUpdate(
  w: number[],
  losses: number[],
  V: number[],
  eta: number,
): { w: number[]; V: number[] } {
  const n = w.length;
  const m = losses.reduce((a, b) => a + b * w[losses.indexOf(b)]!, 0);
  void m;
  const avg = losses.reduce((a, b, i) => a + b * w[i]!, 0);
  const V2 = V.map((v, i) => v + (losses[i]! - avg) ** 2);
  const etaT = eta / Math.sqrt(Math.max(1e-9, V2.reduce((a, b) => a + b, 0) / n));
  const un = w.map((wi, i) => wi * Math.exp(-etaT * (losses[i]! - avg) - etaT * etaT * (losses[i]! - avg) ** 2));
  const s = un.reduce((a, b) => a + b, 0);
  return { w: un.map((u) => u / Math.max(1e-300, s)), V: V2 };
}

/** Project a vector onto the probability simplex. */
export function simplexProject(v: number[]): number[] {
  const n = v.length;
  const u = [...v].sort((a, b) => b - a);
  let css = 0;
  let rho = 0;
  for (let j = 0; j < n; j++) {
    css += u[j]!;
    const t = (css - 1) / (j + 1);
    if (u[j]! - t > 0) rho = j;
  }
  const theta = (u.slice(0, rho + 1).reduce((a, b) => a + b, 0) - 1) / (rho + 1);
  return v.map((x) => Math.max(0, x - theta));
}

/** Smoothed BOA: exponential smoothing of weights toward neighbors (2-D grid). */
export function smoothWeights(w: number[], lambda: number): number[] {
  const n = w.length;
  const out = w.slice();
  for (let i = 0; i < n; i++) {
    const left = w[Math.max(0, i - 1)]!;
    const right = w[Math.min(n - 1, i + 1)]!;
    out[i] = (w[i]! + lambda * (left + right) / 2) / (1 + lambda);
  }
  const s = out.reduce((a, b) => a + b, 0);
  return out.map((x) => x / Math.max(1e-300, s));
}
