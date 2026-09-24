/**
 * arXiv 2006.07513: Bayesian Group Learning for Shot Selection (Log-Gaussian Cox Process + Mixture of Finite Mixtures)
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * LGCP+MFM Bayesian group learning as GSE's probabilistic player-archetype prior for low-sample shooters: partial pooling toward the archetype's shot distribution stabilizes prop projections (3P attempt rate, shot diet); paired with AFBART (MFM archetypes as priors, AFBART as likelihood); single-stage joint model or Stage-1 posterior uncertainty propagated by fitting MFM on posterior draws of the intensity surfaces.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Adopt LGCP+MFM Bayesian group learning as GSE's probabilistic player-archetype prior for low-sample shooters (rookies, role changes): partial pooling toward the archetype's shot distribution stabilizes prop projections (3P attempt rate, shot diet); pair with AFBART (MFM archetypes as priors, AFBART as the likelihood); improvement experiment: single-stage joint model or propagate Stage-1 posterior uncertainty by fitting MFM on posterior draws of the intensity surfaces.
 *
 * ACCEPTANCE GATE (verbatim):
 * Simulation Rand 0.9988 vs best baseline 0.9005 (K-means), 42/50 correct-K recovery, real-data concordance 0.948; improvement success = concordance RI >= 0.95 maintained AND archetype assignments improve a downstream 3P-attempt-rate prediction task (held-out RMSE).
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: props_dfs | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
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

function gauss1d(x: number, mu: number, s2: number): number {
  return Math.exp(-((x - mu) ** 2) / (2 * s2)) / Math.sqrt(2 * Math.PI * s2);
}

/** 1D two-component Gaussian mixture EM. */
export function emGaussianMixture1d(
  x: number[],
  iters: number,
): { pi: number; mu1: number; mu2: number; s1: number; s2: number; ll: number[] } {
  let pi = 0.5;
  let mu1 = Math.min(...x);
  let mu2 = Math.max(...x);
  let s1 = 1;
  let s2 = 1;
  const ll: number[] = [];
  for (let it = 0; it < iters; it++) {
    // E step
    const gamma = x.map((xi) => {
      const a = pi * gauss1d(xi, mu1, s1);
      const b = (1 - pi) * gauss1d(xi, mu2, s2);
      return a / Math.max(1e-300, a + b);
    });
    // M step
    const n1 = gamma.reduce((a, b) => a + b, 0);
    const n2 = x.length - n1;
    pi = n1 / x.length;
    mu1 = gamma.reduce((s, g, i) => s + g * x[i]!, 0) / Math.max(1e-12, n1);
    mu2 = gamma.reduce((s, g, i) => s + (1 - g) * x[i]!, 0) / Math.max(1e-12, n2);
    s1 = Math.max(1e-6, gamma.reduce((s, g, i) => s + g * (x[i]! - mu1) ** 2, 0) / Math.max(1e-12, n1));
    s2 = Math.max(1e-6, gamma.reduce((s, g, i) => s + (1 - g) * (x[i]! - mu2) ** 2, 0) / Math.max(1e-12, n2));
    ll.push(x.reduce((s, xi) => s + Math.log(Math.max(1e-300, pi * gauss1d(xi, mu1, s1) + (1 - pi) * gauss1d(xi, mu2, s2))), 0));
  }
  return { pi, mu1, mu2, s1, s2, ll };
}

/** EM log-likelihood is monotone non-decreasing. */
export function emMonotone(ll: number[]): boolean {
  return ll.every((v, i) => i === 0 || v >= ll[i - 1]! - 1e-9);
}
