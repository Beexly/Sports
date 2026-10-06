/**
 * arXiv 2003.06505v1: AutoGluon-Tabular: Robust and Accurate AutoML for Structured Data
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * AutoGluon-Tabular wrapper for offseason/monthly search over win-probability/spread/total tabular models: custom time-aware bagging (rolling-origin folds), GSE's hand-tuned LightGBM/XGBoost configs as extra base models, isotonic layer on stacker outputs; full search once per offseason, lightweight 30-minute weekly refit in-season.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Wrap autogluon.tabular.TabularPredictor for offseason/monthly search over the win-probability/spread/total tabular models: custom time-aware bagging (rolling-origin folds), GSE's hand-tuned LightGBM/XGBoost configs as extra base models, isotonic layer on stacker outputs; full search once per offseason, lightweight 30-min weekly refit in-season.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT if: the AutoGluon-based stack beats the hand-tuned baseline by >=0.003 log-loss on the 2023-2025 held-out seasons AND the search costs <=100 GPU/CPU-hours total. REJECT if: improvement <0.003 log-loss, or any season shows the wrapper leaking future information (positive control: shuffling season labels must destroy the edge), or inference latency >1s/game.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: nas_automl | verdict: ADOPT | doctrine: INFRA
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
