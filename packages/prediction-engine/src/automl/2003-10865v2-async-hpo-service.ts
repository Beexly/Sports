/**
 * arXiv 2003.10865v2: Model-based Asynchronous Hyperparameter and Neural Architecture Search
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Async offseason HPO service: N workers pull (config, fidelity) tasks from a queue (fidelity = training seasons 2 -> 4 -> 8 -> full), joint GP (or CQR surrogate) over (config, seasons), bracket sampling per P(s), fantasize pending evaluations -- async because model families have heterogeneous runtimes.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build an async offseason HPO service: N workers pull (config, fidelity) tasks from a queue (fidelity = training seasons 2 -> 4 -> 8 -> full), joint GP (or CQR surrogate) over (config, seasons), bracket sampling per P(s), fantasize pending evaluations -- async because model families have heterogeneous runtimes (CatBoost fast, FT-Transformer slow).
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT if: the async method reaches the synchronous-BOHB final log-loss in <=60% of the wall-clock time with 8 workers, AND beats the 1-epoch baseline's final log-loss by >=0.001.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: nas_automl | verdict: ADAPT | doctrine: INFRA
 */

export const ENABLED = false;

/** Successive-halving bracket: keep top 1/eta configs by low-fidelity loss. */
export function successiveHalving(losses: number[][], eta = 3): number[] {
  // losses[rung][config]; returns surviving config indices after all rungs
  let alive = losses[0]!.map((_, i) => i);
  for (let r = 0; r < losses.length; r++) {
    const ranked = alive
      .map((i) => [losses[r]![i]!, i] as [number, number])
      .sort((a, b) => a[0] - b[0]);
    const keep = Math.max(1, Math.floor(ranked.length / eta));
    alive = ranked.slice(0, keep).map(([, i]) => i);
  }
  return alive;
}

/** Bracket sampling probability P(s) for fidelity level s (BOHB-style). */
export function bracketSampleProb(s: number, sMax: number): number {
  // geometric-ish weighting toward higher fidelities
  const w = Math.pow(2, s);
  let tot = 0;
  for (let i = 0; i <= sMax; i++) tot += Math.pow(2, i);
  return w / tot;
}

/** Fantasize pending evaluations: impute with the surrogate mean. */
export function fantasizePending(
  observed: { config: number; loss: number }[],
  pending: number[],
  surrogate: (config: number) => number,
): { config: number; loss: number }[] {
  return [
    ...observed,
    ...pending.map((c) => ({ config: c, loss: surrogate(c) })),
  ];
}

/** Wall-clock comparison: did async reach the sync final loss faster? */
export function asyncSpeedup(syncTime: number, asyncTime: number): number {
  return syncTime / Math.max(1e-9, asyncTime);
}

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
