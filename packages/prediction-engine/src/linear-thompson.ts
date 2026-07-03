/**
 * Linear Thompson Sampling — a contextual-bandit explore/exploit primitive.
 * R&D, NOT wired into live scoring or any allocation path (same dark posture as
 * calibration-map.ts / ml-estimator.ts). Extracted from the 2026-07-02 ZK/ML dump
 * (extraction ledger, Cluster B).
 *
 * WHY THIS EXISTS (the gap it fills):
 *   The engine has estimators, calibrators and honesty gates, but no principled
 *   way to DECIDE what to try next — which content variant to show, which
 *   candidate estimator to trial on the next slate. Today those are fiat choices.
 *   Thompson sampling turns them into measured ones: sample a plausible world
 *   from the posterior, act optimally in that world, update. LINEAR TS is chosen
 *   over neural bandits deliberately (the dump's own — correct — recommendation):
 *   it is simpler, stable, cheap, and carries strong regret theory
 *   (Agrawal & Goyal 2013 give O(d^{3/2}·sqrt(T)) for exactly this scheme).
 *
 * NO MONEY DECISIONS: this module must NEVER gate a real-money action (stake,
 * price, payout, purchase) without its own founder-approved policy. It is an
 * allocation primitive for content/experiment routing only until such a policy
 * exists. Same law as kelly.ts: exported for model work, not wired.
 *
 * THE MATH (Bayesian linear regression posterior, derived not copied):
 *   Model r = x·theta + noise. With a Gaussian prior theta ~ N(0, lambda^{-1} I)
 *   and unit-variance Gaussian likelihood, the posterior after observations
 *   {(x_i, r_i)} is N(theta_hat, A^{-1}) where
 *       A = lambda·I + Σ x_i x_i^T        (precision matrix, SPD for lambda>0)
 *       b = Σ r_i x_i
 *       theta_hat = A^{-1} b              (ridge-regression mean)
 *   Sampling step: draw z ~ N(0, I) and set
 *       theta_tilde = theta_hat + v · L^{-T} z    where A = L L^T (Cholesky).
 *   Correctness: Cov(L^{-T} z) = L^{-T} (L^{-1}) = (L L^T)^{-1} = A^{-1}, so
 *   theta_tilde ~ N(theta_hat, v^2 A^{-1}) — exactly the (scaled) posterior.
 *   v is the exploration scale (v=1 is the pure posterior; v<1 exploits harder).
 *
 * WHY TRIANGULAR SOLVES, NOT A^{-1}: we never form A^{-1}. Explicitly inverting
 * costs an extra O(d^3), destroys symmetry/positive-definiteness under rounding,
 * and roughly squares the error amplification (cond(A)^2 vs cond(A)). One
 * Cholesky factorization (backward-stable for SPD matrices) is reused for BOTH
 * the mean (solve L y = b, then L^T theta_hat = y) and the sample
 * (solve L^T w = z gives w = L^{-T} z). All linear algebra is hand-rolled and
 * intended for SMALL feature dimensions, d <= 16 (MAX_LIN_TS_DIM) — O(d^3) per
 * decision is trivial there and needs no dependency.
 *
 * DETERMINISM: no Math.random, no Date.now. Standard normals come from
 * Box–Muller over the package's seeded mulberry32 (u=0 guarded before log).
 * The state carries an RNG cursor: `step` (the number of updates applied) is
 * mixed into the seed, so the same seed + same call sequence reproduces the
 * exact same decisions. Two selectAction calls on the SAME state intentionally
 * return the same draw — replay-friendly by construction.
 *
 * Pure functions throughout; refused/degenerate input returns null, never throws.
 * updateLinTs is immutable — it returns a new state and never mutates its input.
 */

/** Hard cap on the feature dimension this hand-rolled linear algebra serves. */
export const MAX_LIN_TS_DIM = 16;

export interface LinTsOptions {
  /** Ridge/prior precision, must be finite and > 0. Default 1. */
  readonly lambda?: number;
  /** Exploration scale v, must be finite and > 0. Default 1 (pure posterior). */
  readonly v?: number;
  /** PRNG seed (any finite number; folded to uint32). Default 0x5eed. */
  readonly seed?: number;
}

export interface LinTsState {
  readonly dim: number;
  readonly lambda: number;
  readonly v: number;
  readonly seed: number;
  /** RNG cursor: number of updates applied; mixed into the seed per decision. */
  readonly step: number;
  /** Precision matrix A = lambda·I + Σ x x^T (row-major, dim×dim). */
  readonly A: readonly (readonly number[])[];
  /** Reward-weighted context sum b = Σ r x. */
  readonly b: readonly number[];
}

export interface LinTsDecision {
  /** Index of the chosen context (argmax of x·theta_tilde; first wins ties). */
  readonly index: number;
  /** The posterior draw theta_tilde the decision was made under (rounded). */
  readonly sampledTheta: readonly number[];
}

function round(value: number, digits = 6): number {
  const s = 10 ** digits;
  return Math.round(value * s) / s;
}

/** Deterministic PRNG (mulberry32) — matches the package's other seeded modules. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mix the base seed with the state's step counter (the RNG cursor). */
function mixSeed(seed: number, step: number): number {
  // Weyl-style mix: golden-ratio multiple keeps consecutive steps decorrelated.
  return ((seed >>> 0) ^ Math.imul(step + 1, 0x9e3779b1)) >>> 0;
}

/**
 * Draw n seeded standard normals via Box–Muller. u1 is guarded away from 0
 * (mulberry32 CAN return exactly 0, and log(0) = -Infinity).
 */
function seededStandardNormals(n: number, rand: () => number): number[] {
  const out = new Array<number>(n);
  for (let i = 0; i < n; i += 2) {
    const u1 = Math.max(rand(), Number.EPSILON); // guard u=0 before the log
    const u2 = rand();
    const radius = Math.sqrt(-2 * Math.log(u1));
    out[i] = radius * Math.cos(2 * Math.PI * u2);
    if (i + 1 < n) out[i + 1] = radius * Math.sin(2 * Math.PI * u2);
  }
  return out;
}

// ============================================================
// Small dense Cholesky + triangular solves (SPD, d <= 16)
// ============================================================

/**
 * Cholesky factorization A = L L^T for symmetric positive-definite A.
 * Returns the lower-triangular L, or null if A is not (numerically) SPD.
 */
function cholesky(A: readonly (readonly number[])[]): number[][] | null {
  const d = A.length;
  const L: number[][] = Array.from({ length: d }, () => new Array<number>(d).fill(0));
  for (let j = 0; j < d; j++) {
    let diag = A[j]![j]!;
    for (let k = 0; k < j; k++) diag -= L[j]![k]! ** 2;
    if (!(diag > 1e-12)) return null; // not SPD (also catches NaN)
    const ljj = Math.sqrt(diag);
    L[j]![j] = ljj;
    for (let i = j + 1; i < d; i++) {
      let s = A[i]![j]!;
      for (let k = 0; k < j; k++) s -= L[i]![k]! * L[j]![k]!;
      L[i]![j] = s / ljj;
    }
  }
  return L;
}

/** Forward substitution: solve L y = rhs for lower-triangular L. */
function forwardSolve(L: readonly (readonly number[])[], rhs: readonly number[]): number[] {
  const d = rhs.length;
  const y = new Array<number>(d);
  for (let i = 0; i < d; i++) {
    let s = rhs[i]!;
    for (let k = 0; k < i; k++) s -= L[i]![k]! * y[k]!;
    y[i] = s / L[i]![i]!;
  }
  return y;
}

/** Back substitution: solve L^T x = rhs for lower-triangular L. */
function backSolve(L: readonly (readonly number[])[], rhs: readonly number[]): number[] {
  const d = rhs.length;
  const x = new Array<number>(d);
  for (let i = d - 1; i >= 0; i--) {
    let s = rhs[i]!;
    for (let k = i + 1; k < d; k++) s -= L[k]![i]! * x[k]!;
    x[i] = s / L[i]![i]!;
  }
  return x;
}

/** Posterior mean theta_hat = A^{-1} b via the factor (never inverts A). */
function solvePosteriorMean(L: readonly (readonly number[])[], b: readonly number[]): number[] {
  return backSolve(L, forwardSolve(L, b));
}

function isFiniteVector(x: readonly number[], dim: number): boolean {
  if (!Array.isArray(x) || x.length !== dim) return false;
  for (const v of x) {
    if (typeof v !== "number" || !Number.isFinite(v)) return false;
  }
  return true;
}

// ============================================================
// Public API
// ============================================================

/**
 * Create a fresh LinTS state: A = lambda·I, b = 0, theta_hat = 0.
 * Returns null on refused input: non-integer dim, dim < 1, dim > MAX_LIN_TS_DIM,
 * lambda or v non-finite or <= 0, non-finite seed. (v = 0 is refused because a
 * zero exploration scale is greedy ridge regression, not Thompson sampling.)
 */
export function createLinTsState(dim: number, opts: LinTsOptions = {}): LinTsState | null {
  const lambda = opts.lambda ?? 1;
  const v = opts.v ?? 1;
  const seed = opts.seed ?? 0x5eed;
  if (!Number.isInteger(dim) || dim < 1 || dim > MAX_LIN_TS_DIM) return null;
  if (typeof lambda !== "number" || !Number.isFinite(lambda) || lambda <= 0) return null;
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return null;
  if (typeof seed !== "number" || !Number.isFinite(seed)) return null;
  const A: number[][] = Array.from({ length: dim }, (_, i) =>
    Array.from({ length: dim }, (_, j) => (i === j ? lambda : 0)),
  );
  return {
    dim,
    lambda,
    v,
    seed: seed >>> 0,
    step: 0,
    A,
    b: new Array<number>(dim).fill(0),
  };
}

/**
 * One Thompson round: draw theta_tilde = theta_hat + v·L^{-T} z from the
 * (scaled) posterior and pick the context maximizing x·theta_tilde.
 * ONE shared draw scores all candidates (that is Thompson sampling — acting
 * optimally in one sampled world, not re-sampling per arm). Ties go to the
 * lowest index. Returns null on refused input: empty/absent contexts, any
 * context with wrong dimension or non-finite entries, or a non-SPD A
 * (unreachable from this module's own constructors, guarded anyway).
 *
 * Does NOT advance the RNG cursor — the cursor is the update count, so
 * re-calling on the same state replays the same decision (deterministic,
 * audit-friendly). New randomness arrives with each updateLinTs.
 */
export function selectAction(
  state: LinTsState,
  contexts: readonly (readonly number[])[],
): LinTsDecision | null {
  if (!state || !Array.isArray(contexts) || contexts.length === 0) return null;
  const d = state.dim;
  for (const x of contexts) {
    if (!isFiniteVector(x, d)) return null;
  }
  const L = cholesky(state.A);
  if (!L) return null;
  const thetaHat = solvePosteriorMean(L, state.b);
  const rand = mulberry32(mixSeed(state.seed, state.step));
  const z = seededStandardNormals(d, rand);
  const w = backSolve(L, z); // w = L^{-T} z  →  Cov(w) = A^{-1}
  const thetaTilde = new Array<number>(d);
  for (let i = 0; i < d; i++) thetaTilde[i] = thetaHat[i]! + state.v * w[i]!;
  let bestIndex = 0;
  let bestScore = -Infinity;
  for (let a = 0; a < contexts.length; a++) {
    const x = contexts[a]!;
    let score = 0;
    for (let i = 0; i < d; i++) score += x[i]! * thetaTilde[i]!;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = a;
    }
  }
  return { index: bestIndex, sampledTheta: thetaTilde.map((t) => round(t)) };
}

/**
 * Bayesian update with one observation (context x, reward r):
 * A' = A + x x^T, b' = b + r·x, step' = step + 1 (advances the RNG cursor).
 * IMMUTABLE: returns a brand-new state; the input state is never mutated.
 * Returns null on refused input: wrong-dimension or non-finite context,
 * non-finite reward.
 */
export function updateLinTs(
  state: LinTsState,
  context: readonly number[],
  reward: number,
): LinTsState | null {
  if (!state) return null;
  const d = state.dim;
  if (!isFiniteVector(context, d)) return null;
  if (typeof reward !== "number" || !Number.isFinite(reward)) return null;
  const A: number[][] = state.A.map((row) => [...row]);
  const b: number[] = [...state.b];
  for (let i = 0; i < d; i++) {
    const xi = context[i]!;
    b[i] = b[i]! + reward * xi;
    const rowI = A[i]!;
    for (let j = 0; j < d; j++) rowI[j] = rowI[j]! + xi * context[j]!;
  }
  return {
    dim: state.dim,
    lambda: state.lambda,
    v: state.v,
    seed: state.seed,
    step: state.step + 1,
    A,
    b,
  };
}

/**
 * Current posterior mean theta_hat = A^{-1} b (via Cholesky solves, rounded).
 * Returns null only if A is not numerically SPD (unreachable for states built
 * through this module, since lambda > 0 keeps A ⪰ lambda·I).
 */
export function thetaEstimate(state: LinTsState): number[] | null {
  if (!state) return null;
  const L = cholesky(state.A);
  if (!L) return null;
  return solvePosteriorMean(L, state.b).map((t) => round(t));
}
