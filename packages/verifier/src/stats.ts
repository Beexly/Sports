/**
 * Pure scoring + resampling statistics for the holdout harness.
 *
 * Ported from scratchpad/ctf/lib.py and incent/core.py (plan §4.2). No
 * dependencies. Every exported function is pinned by hand-computed values in
 * `__tests__/stats-pins.test.ts` (mirrors the 39 calibration-math pins).
 *
 * Not a public claim surface — these numbers gate MODEL_VERSION bumps (L11)
 * and factor keep/kill, nothing customer-facing.
 */

export const Z_95 = 1.959963984540054;
export const DEFAULT_BOOTSTRAP_RESAMPLES = 1000;
export const DEFAULT_BOOTSTRAP_SEED = 20260915;
export const LOG_LOSS_EPS = 1e-15;

export function clamp01(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.min(1, Math.max(0, p));
}

/** Brier score of one forecast: (p − y)² with p clamped to [0, 1]. */
export function brierScore(p: number, y: 0 | 1): number {
  const pp = clamp01(p);
  return (pp - y) ** 2;
}

export function meanBrier(rows: readonly { readonly p: number; readonly y: 0 | 1 }[]): number {
  if (rows.length === 0) return NaN;
  let s = 0;
  for (const r of rows) s += brierScore(r.p, r.y);
  return s / rows.length;
}

/** Log-loss of one forecast, p clamped to (eps, 1−eps). */
export function logLoss(p: number, y: 0 | 1, eps: number = LOG_LOSS_EPS): number {
  const pp = Math.min(1 - eps, Math.max(eps, p));
  return y === 1 ? -Math.log(pp) : -Math.log(1 - pp);
}

export function meanLogLoss(
  rows: readonly { readonly p: number; readonly y: 0 | 1 }[],
  eps: number = LOG_LOSS_EPS,
): number {
  if (rows.length === 0) return NaN;
  let s = 0;
  for (const r of rows) s += logLoss(r.p, r.y, eps);
  return s / rows.length;
}

export type WilsonInterval = {
  readonly successes: number;
  readonly n: number;
  readonly point: number;
  readonly low: number;
  readonly high: number;
  readonly z: number;
};

/**
 * Two-sided Wilson score interval on k successes of n trials.
 * n ≤ 0 returns null (no honest band).
 */
export function wilsonInterval(k: number, n: number, z: number = Z_95): WilsonInterval | null {
  if (!Number.isFinite(n) || n <= 0) return null;
  const total = Math.floor(n);
  const successes = Math.min(total, Math.max(0, Math.floor(k)));
  const p = successes / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denom;
  const margin = (z / denom) * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total));
  return {
    successes,
    n: total,
    point: p,
    low: clamp01(center - margin),
    high: clamp01(center + margin),
    z,
  };
}

/** Seeded 32-bit PRNG (mulberry32) — deterministic bootstrap streams. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type PairedBootstrapInput = {
  readonly candidateLoss: readonly number[];
  readonly marketLoss: readonly number[];
};

export type PairedBootstrapResult = {
  /** Fraction of resamples where mean(candidate) < mean(market). */
  readonly pBetter: number;
  /** mean(candidate − market) on the full sample. */
  readonly delta: number;
  readonly resamples: number;
  readonly seed: number;
  readonly n: number;
};

/**
 * Paired bootstrap of Δloss = candidate − market.
 *
 * Same resample indices for both arms (identical-row comparison). P(better)
 * is the fraction of resamples with mean(candidate) strictly below
 * mean(market). Empty or length-mismatched input yields pBetter 0.5 and a
 * NaN delta — never a silent 0 that would kill a factor by accident.
 */
export function pairedBootstrap(
  input: PairedBootstrapInput,
  options?: { readonly resamples?: number; readonly seed?: number },
): PairedBootstrapResult {
  const a = input.candidateLoss;
  const b = input.marketLoss;
  const resamples = Math.max(1, Math.floor(options?.resamples ?? DEFAULT_BOOTSTRAP_RESAMPLES));
  const seed = options?.seed ?? DEFAULT_BOOTSTRAP_SEED;
  const n = Math.min(a.length, b.length);
  if (n === 0 || a.length !== b.length) {
    return { pBetter: 0.5, delta: NaN, resamples, seed, n: 0 };
  }

  let full = 0;
  for (let i = 0; i < n; i++) full += a[i]! - b[i]!;
  const delta = full / n;

  const rand = mulberry32(seed);
  let better = 0;
  for (let r = 0; r < resamples; r++) {
    let sa = 0;
    let sb = 0;
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(rand() * n);
      sa += a[idx]!;
      sb += b[idx]!;
    }
    if (sa / n < sb / n) better += 1;
  }
  return { pBetter: better / resamples, delta, resamples, seed, n };
}

/** logit(p) with p clamped away from {0,1}. */
export function logit(p: number, eps: number = 1e-6): number {
  const x = Math.min(1 - eps, Math.max(eps, p));
  return Math.log(x / (1 - x));
}

export function sigmoid(x: number): number {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

export type LogisticFit = {
  readonly coef: readonly number[];
  readonly iterations: number;
  readonly converged: boolean;
  readonly logLik: number;
};

/**
 * Logistic regression via Newton–Raphson (IRLS), pure TS.
 *
 * X is row-major n×k WITHOUT an intercept column; an intercept is prepended
 * internally. y ∈ {0,1}. Ridge is applied only to non-intercept coefficients
 * to keep collinear factor+market designs invertible (factor scale is
 * pre-registered, not fitted).
 */
export function fitLogistic(
  X: readonly (readonly number[])[],
  y: readonly (0 | 1)[],
  options?: {
    readonly maxIter?: number;
    readonly tol?: number;
    readonly ridge?: number;
  },
): LogisticFit {
  const n = X.length;
  if (n === 0 || y.length !== n) {
    return { coef: [], iterations: 0, converged: false, logLik: NaN };
  }
  const kRaw = X[0]?.length ?? 0;
  const k = kRaw + 1; // intercept
  const maxIter = options?.maxIter ?? 50;
  const tol = options?.tol ?? 1e-10;
  const ridge = options?.ridge ?? 1e-6;

  const beta = new Array<number>(k).fill(0);
  let converged = false;
  let iter = 0;

  for (iter = 1; iter <= maxIter; iter++) {
    const score = new Array<number>(k).fill(0);
    const H = new Array<number>(k * k).fill(0);

    for (let i = 0; i < n; i++) {
      const xi = X[i]!;
      let z = beta[0]!;
      for (let j = 0; j < kRaw; j++) z += beta[j + 1]! * xi[j]!;
      const p = sigmoid(z);
      const w = Math.max(p * (1 - p), 1e-12);
      const resid = y[i]! - p;

      score[0] = (score[0] ?? 0) + resid;
      for (let j = 0; j < kRaw; j++) {
        score[j + 1] = (score[j + 1] ?? 0) + resid * xi[j]!;
      }

      H[0] = (H[0] ?? 0) + w;
      for (let j = 0; j < kRaw; j++) {
        const jx = xi[j]!;
        const idxJ0 = (j + 1) * k;
        const idx0J = j + 1;
        H[idxJ0] = (H[idxJ0] ?? 0) + w * jx;
        H[idx0J] = (H[idx0J] ?? 0) + w * jx;
        for (let l = 0; l < kRaw; l++) {
          const idx = (j + 1) * k + (l + 1);
          H[idx] = (H[idx] ?? 0) + w * jx * xi[l]!;
        }
      }
    }

    for (let j = 1; j < k; j++) {
      const idx = j * k + j;
      H[idx] = (H[idx] ?? 0) + ridge;
    }

    const delta = solveLinearSystem(H, score, k);
    if (delta === null) break;

    let maxStep = 0;
    for (let j = 0; j < k; j++) {
      beta[j] = (beta[j] ?? 0) + (delta[j] ?? 0);
      maxStep = Math.max(maxStep, Math.abs(delta[j] ?? 0));
    }
    if (maxStep < tol) {
      converged = true;
      break;
    }
  }

  let logLik = 0;
  for (let i = 0; i < n; i++) {
    const xi = X[i]!;
    let z = beta[0]!;
    for (let j = 0; j < kRaw; j++) z += beta[j + 1]! * xi[j]!;
    const p = sigmoid(z);
    logLik += y[i]! === 1 ? Math.log(Math.max(p, 1e-15)) : Math.log(Math.max(1 - p, 1e-15));
  }

  return { coef: beta, iterations: iter, converged, logLik };
}

/** Predict logistic probabilities from a fit (X without intercept column). */
export function logisticPredict(
  coef: readonly number[],
  X: readonly (readonly number[])[],
): number[] {
  const kRaw = X[0]?.length ?? 0;
  return X.map((xi) => {
    let z = coef[0] ?? 0;
    for (let j = 0; j < kRaw; j++) z += (coef[j + 1] ?? 0) * xi[j]!;
    return sigmoid(z);
  });
}

/** Gaussian elimination with partial pivoting. Returns null if singular. */
function solveLinearSystem(
  Ain: readonly number[],
  bin: readonly number[],
  k: number,
): number[] | null {
  const A = Ain.slice();
  const b = bin.slice();
  for (let col = 0; col < k; col++) {
    let piv = col;
    let best = Math.abs(A[col * k + col] ?? 0);
    for (let r = col + 1; r < k; r++) {
      const v = Math.abs(A[r * k + col] ?? 0);
      if (v > best) {
        best = v;
        piv = r;
      }
    }
    if (best < 1e-14) return null;
    if (piv !== col) {
      for (let c = 0; c < k; c++) {
        const t = A[col * k + c] ?? 0;
        A[col * k + c] = A[piv * k + c] ?? 0;
        A[piv * k + c] = t;
      }
      const t = b[col] ?? 0;
      b[col] = b[piv] ?? 0;
      b[piv] = t;
    }
    const diag = A[col * k + col] ?? 0;
    for (let r = col + 1; r < k; r++) {
      const f = (A[r * k + col] ?? 0) / diag;
      if (f === 0) continue;
      for (let c = col; c < k; c++) {
        A[r * k + c] = (A[r * k + c] ?? 0) - f * (A[col * k + c] ?? 0);
      }
      b[r] = (b[r] ?? 0) - f * (b[col] ?? 0);
    }
  }
  const x = new Array<number>(k).fill(0);
  for (let r = k - 1; r >= 0; r--) {
    let s = b[r] ?? 0;
    for (let c = r + 1; c < k; c++) s -= (A[r * k + c] ?? 0) * (x[c] ?? 0);
    x[r] = s / (A[r * k + r] ?? 1);
  }
  return x;
}

/** mean((p − y)²) helper used by scorecard strata. */
export function brierOf(p: readonly number[], y: readonly (0 | 1)[]): number {
  if (p.length === 0 || p.length !== y.length) return NaN;
  let s = 0;
  for (let i = 0; i < p.length; i++) s += brierScore(p[i]!, y[i]!);
  return s / p.length;
}

/** Mean log-loss helper. */
export function logLossOf(p: readonly number[], y: readonly (0 | 1)[]): number {
  if (p.length === 0 || p.length !== y.length) return NaN;
  let s = 0;
  for (let i = 0; i < p.length; i++) s += logLoss(p[i]!, y[i]!);
  return s / p.length;
}
