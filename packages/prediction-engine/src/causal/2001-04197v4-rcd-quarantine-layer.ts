/**
 * arXiv 2001.04197v4: Causal discovery of linear non-Gaussian acyclic models in the presence of latent confounders
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * RCD quarantine layer over the ~35-indicator set: reimplemented RCD (ancestor loop with least-squares residualization, parent filtering, bi-directed marking); any indicator pair joined by a bi-directed edge in >= 60% of bootstrap runs is quarantined -- neither may be used as a cause in narrative content and at most one enters the prediction stack.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Add an RCD quarantine layer over the ~35-indicator set (reimplemented RCD: ancestor loop with least-squares residualization, parent filtering, bi-directed marking): any indicator pair joined by a bi-directed edge in >=60% of bootstrap runs is quarantined -- neither may be used as a cause in narrative content and at most one enters the prediction stack.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the RCD quarantine layer if: (a) model (b) matches or beats (a) on 2024-2025 Brier (parity within 0.002) while removing >=15% of directed edges as confounded; (b) bootstrap Jaccard of bi-directed edge set >= 0.5; (c) >=3 of 5 hand-labeled known-confounded pairs are flagged bi-directed.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: causal_discovery | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Least-squares residualization of each column on ancestor columns. */
export function residualizeOnAncestors(X: number[][], ancestors: number[][]): number[][] {
  const n = X.length;
  const V = X[0]!.length;
  return Array.from({ length: V }, (_, j) => {
    const anc = ancestors[j]!;
    if (anc.length === 0) return X.map((row) => row[j]!);
    const Z = X.map((row) => anc.map((a) => row[a]!));
    const v = X.map((row) => row[j]!);
    const p = anc.length;
    const XtX: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
    const Xtv = new Array<number>(p).fill(0);
    for (let i = 0; i < n; i++) {
      for (let a = 0; a < p; a++) {
        Xtv[a]! += Z[i]![a]! * v[i]!;
        for (let b = 0; b < p; b++) XtX[a]![b]! += Z[i]![a]! * Z[i]![b]!;
      }
    }
    for (let a = 0; a < p; a++) XtX[a]![a]! += 1e-6;
    const beta = solveRcd(XtX, Xtv);
    return v.map((vi, i) => vi - Z[i]!.reduce((s, z, a) => s + z * beta[a]!, 0));
  }).map((col) => col)
    .reduce((rows, col, j) => {
      col.forEach((v, i) => { rows[i]![j] = v; });
      return rows;
    }, Array.from({ length: n }, () => new Array<number>(V).fill(0)));
}

function solveRcd(A: number[][], b: number[]): number[] {
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

/** Pearson correlation matrix. */
export function corMatrix(X: number[][]): number[][] {
  const V = X[0]!.length;
  const cols = Array.from({ length: V }, (_, j) => X.map((row) => row[j]!));
  return cols.map((a, i) =>
    cols.map((b, j) => {
      if (i === j) return 1;
      return pearsonLocal(a, b);
    }),
  );
}

function pearsonLocal(xs: number[], ys: number[]): number {
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

/**
 * Mark bi-directed edges: pairs whose residual correlation stays high after
 * ancestor residualization (signature of latent confounding).
 */
export function markBidirected(residCor: number[][], thresh: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < residCor.length; i++)
    for (let j = i + 1; j < residCor.length; j++)
      if (Math.abs(residCor[i]![j]!) >= thresh) out.push([i, j]);
  return out;
}

/** Quarantine rule: pairs bi-directed in >= freqThresh of bootstrap runs. */
export function quarantinePairs(
  bootBidirected: [number, number][][],
  freqThresh: number,
): [number, number][] {
  const counts = new Map<string, number>();
  const B = bootBidirected.length;
  for (const edges of bootBidirected)
    for (const [i, j] of edges) {
      const k = `${i},${j}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  const out: [number, number][] = [];
  for (const [k, c] of counts)
    if (c / B >= freqThresh) {
      const [i, j] = k.split(",").map(Number);
      out.push([i!, j!]);
    }
  return out;
}

/** Jaccard similarity of two edge sets (stability diagnostic). */
export function edgeJaccard(a: [number, number][], b: [number, number][]): number {
  const ka = new Set(a.map(([i, j]) => `${i},${j}`));
  const kb = new Set(b.map(([i, j]) => `${i},${j}`));
  let inter = 0;
  for (const k of ka) if (kb.has(k)) inter++;
  const union = ka.size + kb.size - inter;
  return union === 0 ? 1 : inter / union;
}
