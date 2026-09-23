/**
 * arXiv:2607.18269v2 — Ledger 0797 — Wisdom of LLM Crowds: Aggregation and Contamination in Language Model Ensembles
 *
 * L2 logistic-regression ensemble over source probabilities, weighting by error decorrelation
 * (negatively-weighted sources kept as contrastive bias corrections) plus pairwise disagreement features.
 * LR sufficiency is the paper's result — no nonlinear aggregator.
 *
 * Improvement: Replace GSE's ensemble combiner with an L2 logistic regression over source probabilities that weights by error decorrelation (keeping negatively-weighted sources as contrastive bias corrections) plus pairwise disagreement features, with strict training-cutoff hygiene for all LLM/news-derived features.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Learned linear aggregate must beat the arithmetic mean by >=5% Brier on the held-out season, with the error-decorrelation replication r_s >= 0.3, before production. No nonlinear aggregator needed — LR sufficiency is a paper result.
 */

/** Numerically stable logistic. */
export function logistic(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}/** Solve a square linear system via Gauss-Jordan with partial pivoting. */
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

/** Training row: source probs + disagreement features -> outcome. */
export interface AggRow {
  probs: number[];
  y: 0 | 1;
}

/** Pairwise absolute disagreement features between source probs. */
export function disagreementFeatures(probs: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < probs.length; i++) {
    for (let j = i + 1; j < probs.length; j++) {
      out.push(Math.abs((probs[i] ?? 0) - (probs[j] ?? 0)));
    }
  }
  return out;
}

/** Design row: [1, probs..., disagreements...]. */
export function aggDesign(probs: readonly number[]): number[] {
  return [1, ...probs, ...disagreementFeatures(probs)];
}

/**
 * L2-penalized logistic regression via Newton-Raphson (deterministic).
 * Returns weights over the design columns.
 */
export function fitLrAggregate(rows: readonly AggRow[], l2: number, iters = 30): number[] {
  if (rows.length === 0) throw new Error("fitLrAggregate: no rows");
  const p = aggDesign(rows[0]?.probs ?? []).length;
  let w = new Array<number>(p).fill(0);
  for (let it = 0; it < iters; it++) {
    const grad = new Array<number>(p).fill(0);
    const H: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
    for (const r of rows) {
      const x = aggDesign(r.probs);
      const eta = x.reduce((s, v, i) => s + v * (w[i] ?? 0), 0);
      const ph = logistic(eta);
      const res = r.y - ph;
      const wgt = ph * (1 - ph);
      for (let a = 0; a < p; a++) {
        grad[a] = (grad[a] ?? 0) + res * (x[a] ?? 0);
        for (let b = 0; b < p; b++) H[a]![b] = (H[a]?.[b] ?? 0) - wgt * (x[a] ?? 0) * (x[b] ?? 0);
      }
    }
    for (let a = 1; a < p; a++) {
      grad[a] = (grad[a] ?? 0) - l2 * (w[a] ?? 0);
      H[a]![a] = (H[a]?.[a] ?? 0) - l2;
    }
    const delta = solveLinear(H, grad.map((v) => -v));
    let mx = 0;
    for (let a = 0; a < p; a++) {
      w[a] = (w[a] ?? 0) + (delta[a] ?? 0);
      mx = Math.max(mx, Math.abs(delta[a] ?? 0));
    }
    if (mx < 1e-9) break;
  }
  return w;
}

/** Aggregate probability for new source probs. */
export function lrAggregate(w: readonly number[], probs: readonly number[]): number {
  const x = aggDesign(probs);
  if (x.length !== w.length) throw new Error("lrAggregate: dimension mismatch");
  return logistic(x.reduce((s, v, i) => s + v * (w[i] ?? 0), 0));
}
