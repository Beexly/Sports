/**
 * arXiv:2411.15075v1 — The Effects of Major League Baseball's Ban on Infield Shifts: A Quasi-Experimental Analysis
 *
 * Synthetic-control 'Chiefs without Mahomes' estimator: donor pool of comparable team-games, simplex
 * weights fit on pre-treatment outcomes, placebo permutations for inference, RMSPE-ratio gate.
 *
 * Improvement: Adopt the DID+SCM protocol as GSE's standard quasi-experimental toolkit and upgrade it to staggered/event-study DID (align each treated unit on its own event week, never-treated and not-yet-treated controls, full event-time path with uniform confidence bands) so it handles the staggered NFL interventions — injuries, mid-season firings — that the paper's clean 2×2 cannot.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the DID+SCM protocol as GSE's standard quasi-experimental toolkit if the kickoff replication (§12) passes its placebo gates; REJECT any substantive conclusion about the shift ban itself as a GSE input.
 */

/** Solve a square linear system via Gauss-Jordan with partial pivoting. */
export function solveLinear(A: number[][], b: number[]): number[] {
  const n = A.length;
  if (n === 0) throw new Error("solveLinear: empty system");
  const M = A.map((row, i) => [...row, b[i] ?? 0]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(M[r]?.[c] ?? 0) > Math.abs(M[piv]?.[c] ?? 0)) piv = r;
    }
    const tmp = M[c]!;
    M[c] = M[piv]!;
    M[piv] = tmp;
    const d = M[c]?.[c] ?? 0;
    if (Math.abs(d) < 1e-12) continue;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = (M[r]?.[c] ?? 0) / d;
      for (let k = c; k <= n; k++) {
        M[r]![k] = (M[r]?.[k] ?? 0) - f * (M[c]?.[k] ?? 0);
      }
    }
  }
  return M.map((row, i) => {
    const d = row[i] ?? 0;
    return (row[n] ?? 0) / (Math.abs(d) < 1e-12 ? 1 : d);
  });
}

/** Ridge regression: (X'X + lI)^-1 X'y. X rows = observations. */
export function ridgeFit(X: number[][], y: number[], lambda: number): number[] {
  const p = X[0]?.length ?? 0;
  if (p === 0) throw new Error("ridgeFit: no features");
  const XtX: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const Xty = new Array<number>(p).fill(0);
  for (let i = 0; i < X.length; i++) {
    for (let a = 0; a < p; a++) {
      Xty[a] = (Xty[a] ?? 0) + (X[i]?.[a] ?? 0) * (y[i] ?? 0);
      for (let b2 = 0; b2 < p; b2++) {
        XtX[a]![b2] = (XtX[a]?.[b2] ?? 0) + (X[i]?.[a] ?? 0) * (X[i]?.[b2] ?? 0);
      }
    }
  }
  for (let a = 0; a < p; a++) XtX[a]![a] = (XtX[a]?.[a] ?? 0) + lambda;
  return solveLinear(XtX, Xty);
}

/**
 * Fit donor simplex weights minimizing pre-treatment RMSPE:
 * min ||Y_pre - D_pre w||^2 s.t. w >= 0, sum w = 1.
 * Solved via projected gradient descent.
 */
export function synthWeights(
  yPre: readonly number[],
  DPre: number[][],
  iters = 500,
  lr = 0.05,
): number[] {
  const K = DPre[0]?.length ?? 0;
  if (K === 0 || yPre.length === 0) throw new Error("synthWeights: empty input");
  let w = new Array<number>(K).fill(1 / K);
  const proj = (v: number[]): number[] => {
    // Project onto the simplex
    const u = [...v].sort((a, b) => b - a);
    let rho = 0;
    let csum = 0;
    for (let i = 0; i < u.length; i++) {
      csum += u[i]!;
      if (u[i]! + (1 - csum) / (i + 1) > 0) rho = i + 1;
      else break;
    }
    const theta = (u.slice(0, rho).reduce((s, x) => s + x, 0) - 1) / rho;
    return v.map((x) => Math.max(0, x - theta));
  };
  for (let it = 0; it < iters; it++) {
    const r = yPre.map((y, t) => y - (DPre[t] ?? []).reduce((s, d, k) => s + d * (w[k] ?? 0), 0));
    const grad = new Array<number>(K).fill(0);
    for (let k = 0; k < K; k++) {
      let g = 0;
      for (let t = 0; t < yPre.length; t++) g += -2 * r[t]! * ((DPre[t]?.[k]) ?? 0);
      grad[k] = g / yPre.length;
    }
    w = proj(w.map((wk, k) => wk - lr * (grad[k] ?? 0)));
  }
  return w;
}

/** Synthetic counterfactual: D_post * w. */
export function synthCounterfactual(DPost: number[][], w: readonly number[]): number[] {
  return DPost.map((row) => row.reduce((s, d, k) => s + d * (w[k] ?? 0), 0));
}

/** RMSPE ratio: post-treatment RMSPE / pre-treatment RMSPE (placebo gate). */
export function rmspeRatio(
  actual: readonly number[],
  synth: readonly number[],
  preT: number,
): number {
  if (actual.length !== synth.length || preT <= 0 || preT >= actual.length) {
    throw new Error("rmspeRatio: bad input");
  }
  const rms = (a: readonly number[], b: readonly number[]) =>
    Math.sqrt(a.reduce((s, v, i) => s + ((b[i] ?? 0) - v) ** 2, 0) / a.length);
  const pre = rms(actual.slice(0, preT), synth.slice(0, preT));
  const post = rms(actual.slice(preT), synth.slice(preT));
  return pre < 1e-12 ? Infinity : post / pre;
}
