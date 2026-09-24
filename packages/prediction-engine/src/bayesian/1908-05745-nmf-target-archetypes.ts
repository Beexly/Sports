/**
 * arXiv 1908.05745: A Bayesian Marked Spatial Point Processes Model for Basketball Shot Chart
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * NMF-derived archetypal target zones from prior-season data serve as the NHPP intensity surface for NFL targets, with a completion/success mark model taking fitted intensity as a covariate; QBs and receivers are clustered into 5 style archetypes for matchup-typing and DFS stacking.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Adapt the marked point process to NFL targets: NMF-derived archetypal target zones from prior-season data as the NHPP intensity surface plus a completion/success mark model with fitted intensity as covariate, clustering QBs/receivers into 5 style archetypes for matchup-typing and DFS stacking.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the intensity + mark joint framework and the NMF-archetype clustering if the QB replication shows xi != 0 winning on held-out log-loss for most qualifying QBs; REJECT the assumption that xi > 0 universally (fit per player, don't pool); REJECT DIC-only model selection.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: bayesian | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** NMF via multiplicative updates (Frobenius): V ~= W H, V >= 0. */
export function nmfFrobenius(
  V: number[][],
  k: number,
  iters: number,
  rand: () => number,
): { W: number[][]; H: number[][]; err: number[] } {
  const m = V.length;
  const n = V[0]!.length;
  let W = Array.from({ length: m }, () => Array.from({ length: k }, () => rand() + 0.1));
  let H = Array.from({ length: k }, () => Array.from({ length: n }, () => rand() + 0.1));
  const err: number[] = [];
  for (let it = 0; it < iters; it++) {
    // update H
    const WtW = matMul(transpose(W), W);
    const WtV = matMul(transpose(W), V);
    H = H.map((row, a) =>
      row.map((h, j) => {
        let den = 0;
        for (let b = 0; b < k; b++) den += WtW[a]![b]! * H[b]![j]!;
        return (h * WtV[a]![j]!) / Math.max(1e-12, den);
      }),
    );
    // update W
    const HHt = matMul(H, transpose(H));
    const VHt = matMul(V, transpose(H));
    W = W.map((row, i) =>
      row.map((w, a) => {
        let den = 0;
        for (let b = 0; b < k; b++) den += W[i]![b]! * HHt[b]![a]!;
        return (w * VHt[i]![a]!) / Math.max(1e-12, den);
      }),
    );
    if (it % 10 === 0) err.push(reconError(V, W, H));
  }
  return { W, H, err };
}

function transpose(A: number[][]): number[][] {
  return A[0]!.map((_, j) => A.map((row) => row[j]!));
}

function matMul(A: number[][], B: number[][]): number[][] {
  return A.map((row) => B[0]!.map((_, j) => row.reduce((s, a, k) => s + a * B[k]![j]!, 0)));
}

function reconError(V: number[][], W: number[][], H: number[][]): number {
  const WH = matMul(W, H);
  let s = 0;
  for (let i = 0; i < V.length; i++)
    for (let j = 0; j < V[0]!.length; j++) s += (V[i]![j]! - WH[i]![j]!) ** 2;
  return s;
}

/** Assign each column (sample) to its dominant archetype. */
export function nmfArchetypeAssign(H: number[][]): number[] {
  const n = H[0]!.length;
  const out: number[] = [];
  for (let j = 0; j < n; j++) {
    let best = 0;
    for (let a = 1; a < H.length; a++) if (H[a]![j]! > H[best]![j]!) best = a;
    out.push(best);
  }
  return out;
}

/** Adjusted Rand Index between two clusterings. */
export function adjustedRandIndex(a: number[], b: number[]): number {
  const n = a.length;
  const comb2 = (x: number): number => (x * (x - 1)) / 2;
  let tp = 0;
  let sumA = 0;
  let sumB = 0;
  const ca = new Map<number, number>();
  const cb = new Map<number, number>();
  const cab = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    ca.set(a[i]!, (ca.get(a[i]!) ?? 0) + 1);
    cb.set(b[i]!, (cb.get(b[i]!) ?? 0) + 1);
    const k = `${a[i]},${b[i]}`;
    cab.set(k, (cab.get(k) ?? 0) + 1);
  }
  for (const c of cab.values()) tp += comb2(c);
  for (const c of ca.values()) sumA += comb2(c);
  for (const c of cb.values()) sumB += comb2(c);
  const expected = (sumA * sumB) / comb2(n);
  const maxIdx = 0.5 * (sumA + sumB);
  return maxIdx === expected ? 0 : (tp - expected) / (maxIdx - expected);
}
