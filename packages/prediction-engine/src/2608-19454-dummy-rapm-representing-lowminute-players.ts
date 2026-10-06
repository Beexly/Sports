/**
 * arXiv:2608.19454 — Dummy RAPM: Representing Low-Minute Players in Regularized Adjusted Plus-Minus
 *
 * Dummy RAPM: ridge-regularized adjusted plus-minus with dummy count indicators for low-minute players,
 * pooling replacement-level production instead of dropping sparse rotation pieces.
 *
 * Improvement: Add 10 dummy count indicators (1-5 excluded low-minute players per lineup side) to GSE's RAPM-style player-rating layer with the paper's 2.2 dummy/player ridge-penalty ratio as the starting point, pooling replacement-level production for rotation/injury adjustment instead of dropping low-minute players.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Gate (ADAPT): replicate the paper's pipeline on one NBA season of GSE data with the chronological split; accept if Dummy RAPM RMSE < Filtered RAPM RMSE on the outer test with the improvement direction matching in >= 70% of seasons tested; improvement path = learned per-player replacement-level propensity, success = outer-test RMSE reduction >= 0.06 with the same chronological protocol.
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
 * Build the design matrix: one column per regular player plus D dummy
 * indicators (counts of excluded low-minute players per side per stint).
 */
export function dummyRapmDesign(
  stints: readonly { plus: string[]; minus: string[]; dummiesPlus: number; dummiesMinus: number; margin: number }[],
  players: readonly string[],
  nDummies: number,
): { X: number[][]; y: number[] } {
  const pIdx = new Map(players.map((p, i) => [p, i]));
  const X: number[][] = [];
  const y: number[] = [];
  for (const s of stints) {
    const row = new Array<number>(players.length + nDummies).fill(0);
    for (const p of s.plus) {
      const i = pIdx.get(p);
      if (i !== undefined) row[i] = 1;
    }
    for (const p of s.minus) {
      const i = pIdx.get(p);
      if (i !== undefined) row[i] = -1;
    }
    // Dummy indicators: +count for plus side, -count for minus side (first dummy col pair)
    if (nDummies >= 2) {
      row[players.length] = s.dummiesPlus;
      row[players.length + 1] = -s.dummiesMinus;
    }
    X.push(row);
    y.push(s.margin);
  }
  return { X, y };
}

/**
 * Fit Dummy RAPM: ridge regression with the dummy/player penalty ratio
 * (paper's 2.2 starting point): dummies get l2*ratio, players get l2.
 */
export function fitDummyRapm(
  X: number[][],
  y: number[],
  l2: number,
  dummyRatio: number,
  nPlayers: number,
): number[] {
  const p = X[0]?.length ?? 0;
  if (p === 0) throw new Error("fitDummyRapm: empty design");
  const XtX: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const Xty = new Array<number>(p).fill(0);
  for (let i = 0; i < X.length; i++) {
    const row = X[i]!;
    for (let a = 0; a < p; a++) {
      Xty[a] = (Xty[a] ?? 0) + row[a]! * (y[i] ?? 0);
      for (let b = 0; b < p; b++) XtX[a]![b] = (XtX[a]?.[b] ?? 0) + (row[a] ?? 0) * (row[b] ?? 0);
    }
  }
  for (let a = 0; a < p; a++) {
    XtX[a]![a] = (XtX[a]?.[a] ?? 0) + l2 * (a >= nPlayers ? dummyRatio : 1);
  }
  return solveLinear(XtX, Xty);
}
