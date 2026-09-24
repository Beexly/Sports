/**
 * arXiv 2208.08135v1: Gradient-Based Meta-Learning Using Uncertainty to Weigh Loss for Few-Shot Learning
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Build uncertainty-weighted meta-learning for new-regime team-seasons: task pool = team-seasons 2015-2025 (support = first K games, query = next games), small tabular MLP on game features -> margin, checkpoint initialization pool (score each checkpoint on the K observed games, pick argmin-loss), meta-loss Sum_i(L_i/sigma_i^2 + log sigma_i) with learned per-season sigma_i (expect 2020 COVID and injury-decimated seasons to learn large sigma) -- then go heteroscedastic: replace scalar sigma_i with input-dependent sigma_i(x) from game context (weather, injuries, rivalry), marrying the paper's uncertainty weighting to game-conditional noise.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build uncertainty-weighted meta-learning for new-regime team-seasons: task pool = team-seasons 2015-2025 (support = first K games, query = next games), small tabular MLP on game features -> margin, checkpoint initialization pool (score each checkpoint on the K observed games, pick argmin-loss), meta-loss Sum_i(L_i/sigma_i^2 + log sigma_i) with learned per-season sigma_i (expect 2020 COVID and injury-decimated seasons to learn large sigma) — then go heteroscedastic: replace scalar sigma_i with input-dependent sigma_i(x) from game context (weather, injuries, rivalry), marrying the paper's uncertainty weighting to game-conditional noise.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT iff the homoscedastic variant beats vanilla MAML by >=0.02 Brier on new-regime win prediction at K in {2,4} (2023-2025) AND shows the paper's robustness (loss spread across alpha values <= half of MAML's spread); reject if init-selection picks checkpoints no better than the global init at K=4.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Motif-lab | bucket: MODEL | lane: metalearning_fewshot | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** RBF kernel. */
export function rbfKernelGp(x: number[], y: number[], l: number): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += (x[i]! - y[i]!) ** 2;
  return Math.exp(-s / (2 * l * l));
}

/** 1D GP posterior at xstar (RBF kernel, Gaussian noise). */
export function gpPosterior1d(
  X: number[],
  y: number[],
  xstar: number,
  l: number,
  sigmaF: number,
  sigmaN: number,
): { mean: number; variance: number } {
  const n = X.length;
  const K: number[][] = X.map((xi) =>
    X.map((xj) => sigmaF * sigmaF * Math.exp(-((xi - xj) ** 2) / (2 * l * l))),
  );
  for (let i = 0; i < n; i++) K[i]![i]! += sigmaN * sigmaN;
  const ks = X.map((xi) => sigmaF * sigmaF * Math.exp(-((xstar - xi) ** 2) / (2 * l * l)));
  const alpha = solveGp(K, y);
  const mean = ks.reduce((s, k, i) => s + k * alpha[i]!, 0);
  const v = solveGp(K, ks);
  const variance = Math.max(1e-12, sigmaF * sigmaF - ks.reduce((s, k, i) => s + k * v[i]!, 0));
  return { mean, variance };
}

function solveGp(A: number[][], b: number[]): number[] {
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

/** Random Fourier features for RBF approximation. */
export function rffFeatures(
  X: number[][],
  D: number,
  gamma: number,
  rand: () => number,
): { Phi: number[][]; omega: number[][]; b: number[] } {
  const p = X[0]!.length;
  const omega = Array.from({ length: D }, () =>
    Array.from({ length: p }, () => Math.sqrt(2 * gamma) * gaussRand(rand)),
  );
  const b = Array.from({ length: D }, () => rand() * 2 * Math.PI);
  const Phi = X.map((x) =>
    omega.map((w, d) => Math.sqrt(2 / D) * Math.cos(w.reduce((s, wi, j) => s + wi * x[j]!, 0) + b[d]!)),
  );
  return { Phi, omega, b };
}

function gaussRand(rand: () => number): number {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Kernel ridge regression on explicit features. */
export function krrFit(Phi: number[][], y: number[], lambda: number): number[] {
  const n = Phi.length;
  const d = Phi[0]!.length;
  const A: number[][] = Array.from({ length: d }, () => new Array<number>(d).fill(0));
  const bv = new Array<number>(d).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j++) {
      bv[j]! += Phi[i]![j]! * y[i]!;
      for (let k = 0; k < d; k++) A[j]![k]! += Phi[i]![j]! * Phi[i]![k]!;
    }
  }
  for (let j = 0; j < d; j++) A[j]![j]! += lambda;
  return solveGp(A, bv);
}

/** Uncertainty-weighted meta-loss: Sum_i (L_i / sigma_i^2 + log sigma_i). */
export function uncertaintyMetaLoss(losses: number[], sigmas: number[]): number {
  let s = 0;
  for (let i = 0; i < losses.length; i++) {
    const sg = Math.max(1e-6, sigmas[i]!);
    s += losses[i]! / (sg * sg) + Math.log(sg);
  }
  return s;
}

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
