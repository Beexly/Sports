/**
 * arXiv 2106.00175: Duckworth-Lewis-Stern Method Comparison with Machine Learning Approach
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Build the live engine experiment live/classical_vs_ml.py: (a) a simple closed-form football WP baseline (logistic on time x score-diff, or the ledger-1704 monotone table); (b) gradient boosting / NN on nflverse play-by-play state features INCLUDING the baseline WP as a feature (the paper's stacking trick); three-way bake-off: (a) unconstrained ML, (b) monotone-constrained Bayesian (1704 recipe), (c) unconstrained ML with the monotone table's output as a feature; success = (c) matches (a) on accuracy and beats both on ECE in extreme states (WP < 0.1 or > 0.9, last 5 minutes).
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build the live engine experiment live/classical_vs_ml.py: (a) a simple closed-form football WP baseline (logistic on time x score-diff, or the ledger-1704 monotone table); (b) gradient boosting / NN on nflverse play-by-play state features INCLUDING the baseline WP as a feature (the paper's stacking trick); compare accuracy AND log-loss vs the baseline alone at game-progression deciles — and resolve the 1704-vs-1705 tension with a three-way bake-off: (a) unconstrained ML, (b) monotone-constrained Bayesian (1704 recipe), (c) unconstrained ML with the monotone table's output as a feature; success = (c) matches (a) on accuracy and beats both on ECE in extreme states (WP < 0.1 or > 0.9, last 5 minutes).
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the stacked ML live model if it beats the classical baseline by >= 1 pp accuracy AND >= 0.005 log-loss at every game decile on the holdout. REJECT if the ML wins accuracy but loses log-loss — that reproduces the paper's limitation and is unusable for staking.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: weather | verdict: ADAPT | doctrine: SITUATIONAL
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
