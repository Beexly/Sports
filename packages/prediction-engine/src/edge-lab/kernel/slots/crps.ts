/**
 * CRPS kernel — proper scoring for whole distributions.
 *
 * LOWER IS BETTER. Units are outcome units. A "CRPS improvement of less than
 * 0.01" is not a kill line: at n=150 on NFL-margin scale (σ≈14, E[CRPS]≈7.9)
 * that delta is 0.022 SE and cannot fire. The inverted paper gate is pinned
 * below so a future reader cannot re-import it.
 *
 * Discrete CRPS is the primary for integer scores (margins, totals, props).
 * Gaussian closed form is a diagnostic / widened-point baseline, not a density
 * model. Empirical CRPS is for simulation ensembles.
 *
 * Gneiting & Raftery 2007; Hersbach 2000 for the sorted-sample identity.
 * Point-mass identity: CRPS(δ_x, y) = |x − y|. Summing only over the
 * distribution's support silently understates error when y is outside it
 * (verified: δ_3 vs y=1 returned 0 instead of 2). The loop covers the
 * support; the gap to y is added in O(1).
 */
import {
  KernelError,
  assertFinite,
  type CrpsDiscreteFn,
  type CrpsEmpiricalFn,
  type DiscreteDistribution,
} from "../contract.js";
import { normalCdf } from "../numeric.js";

/** Pre-registered kill: one NFL regular season of game-level margins. */
export const CRPS_KILL_MIN_N = 272;

/**
 * Minimum CRPS improvement (baseline − model) required to survive.
 * 0.5 points is ~6% of a σ=14 Gaussian baseline. 0.01 is forbidden.
 */
export const CRPS_KILL_MIN_IMPROVEMENT = 0.5;

/** The blueprint number. Never use it as a gate. Documented so tests can refute it. */
export const PAPER_CRPS_IMPROVEMENT_MAX = 0.01;

const INV_SQRT_PI = 1 / Math.sqrt(Math.PI);
const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);
const TAIL_MASS = 1e-12;
const MAX_SUPPORT_SPAN = 1_000_000;

function normalPdf(z: number): number {
  return Math.exp(-0.5 * z * z) * INV_SQRT_2PI;
}

function truncatedUpper(dist: DiscreteDistribution): number {
  const s = dist.support();
  if (Number.isFinite(s.max)) return s.max;
  let k = s.min;
  while (k - s.min < MAX_SUPPORT_SPAN && dist.cdf(k) < 1 - TAIL_MASS) k += 1;
  return k;
}

/**
 * CRPS = Σ_k (F(k) − 1{k ≥ y})² over the integers that can contribute.
 * Compact support [L, R]: sum the support, then add |gap| to y in O(1)
 * so an observation outside the support is not scored as a perfect hit.
 * Point mass at y ⇒ 0. Point mass at x vs y ⇒ |x − y|. Lower is better.
 */
export const crpsDiscrete: CrpsDiscreteFn = (dist, observed) => {
  assertFinite(observed, "observed");
  if (!Number.isInteger(observed)) {
    throw new KernelError("DOMAIN", `crpsDiscrete requires an integer observation, got ${observed}`);
  }
  const s = dist.support();
  const lo = s.min;
  const hi = truncatedUpper(dist);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) {
    throw new KernelError("DOMAIN", "crpsDiscrete: support bounds must be finite lo ≤ hi");
  }
  let sum = 0;
  for (let k = lo; k <= hi; k += 1) {
    const F = dist.cdf(k);
    const indicator = k >= observed ? 1 : 0;
    const d = F - indicator;
    sum += d * d;
  }
  // Integers strictly between the support and y, where F is 0 (left) or 1 (right).
  if (observed < lo) sum += lo - observed;
  if (observed > hi) sum += observed - hi - 1;
  return sum;
};

/**
 * Ensemble CRPS, O(n log n) sorted identity, does not mutate input.
 *   CRPS = mean_i |X_i − y| − 0.5 · mean_{i,j} |X_i − X_j|
 * Point-mass ensemble at y ⇒ 0.
 */
export const crpsEmpirical: CrpsEmpiricalFn = (samples, observed) => {
  assertFinite(observed, "observed");
  if (samples.length === 0) {
    throw new KernelError("DOMAIN", "crpsEmpirical requires a non-empty ensemble");
  }
  const x = samples.slice().sort((a, b) => a - b);
  const n = x.length;
  let abs = 0;
  let spread = 0;
  for (let i = 0; i < n; i += 1) {
    const xi = x[i]!;
    assertFinite(xi, `samples[${i}]`);
    abs += Math.abs(xi - observed);
    // 1-based rank k = i+1; Σ_k (2k − n − 1) x_{(k)} = Σ_i Σ_j |x_i − x_j| / 2
    spread += (2 * (i + 1) - n - 1) * xi;
  }
  return abs / n - spread / (n * n);
};

/**
 * Closed-form Gaussian CRPS (Gneiting & Raftery 2007):
 *   CRPS(N(μ,σ²), y) = σ { z(2Φ(z)−1) + 2φ(z) − 1/√π }, z=(y−μ)/σ
 * Diagnostic / widened-point baseline. Integer scores should use crpsDiscrete.
 */
export function crpsGaussian(mean: number, sd: number, observed: number): number {
  assertFinite(mean, "mean");
  assertFinite(sd, "sd");
  assertFinite(observed, "observed");
  if (!(sd > 0)) {
    throw new KernelError("DOMAIN", `crpsGaussian requires sd > 0, got ${sd}`);
  }
  const z = (observed - mean) / sd;
  return sd * (z * (2 * normalCdf(z) - 1) + 2 * normalPdf(z) - INV_SQRT_PI);
}

/** Calibrated Gaussian expected CRPS = σ/√π. */
export function expectedGaussianCrps(sd: number): number {
  assertFinite(sd, "sd");
  if (!(sd > 0)) throw new KernelError("DOMAIN", `expectedGaussianCrps requires sd > 0, got ${sd}`);
  return sd * INV_SQRT_PI;
}

export type CrpsGateVerdict = "survive" | "kill" | "underpowered";

export type CrpsGateResult = {
  readonly verdict: CrpsGateVerdict;
  /** baseline − model. Positive means the model is better (lower CRPS). */
  readonly improvement: number;
  readonly n: number;
  readonly minN: number;
  readonly minImprovement: number;
  readonly modelCrps: number;
  readonly baselineCrps: number;
  readonly priced: false;
  readonly status: "shadow";
  /**
   * True when a model that is barely better (0 < Δ < 0.01) would be graduated
   * by the blueprint's inverted "improvement of less than 0.01" wording.
   */
  readonly invertedPaperWouldGraduate: boolean;
};

/**
 * Kill line. Direction: LOWER CRPS is better. Survive iff n ≥ MIN_N and
 * (baseline − model) ≥ MIN_IMPROVEMENT. A model that equals the baseline
 * is killed. Underpowered is not a pass.
 *
 * Caller-supplied minN / minImprovement must be finite and non-negative.
 * NaN comparisons are all false in JS, so an unvalidated NaN threshold
 * used to fail OPEN (verdict survive). That is refused.
 */
export function evaluateCrpsGate(
  modelCrps: number,
  baselineCrps: number,
  n: number,
  opts?: { readonly minN?: number; readonly minImprovement?: number },
): CrpsGateResult {
  assertFinite(modelCrps, "modelCrps");
  assertFinite(baselineCrps, "baselineCrps");
  if (!Number.isInteger(n) || n < 0) {
    throw new KernelError("DOMAIN", `evaluateCrpsGate requires n integer ≥ 0, got ${n}`);
  }
  const minN = opts?.minN ?? CRPS_KILL_MIN_N;
  const minImprovement = opts?.minImprovement ?? CRPS_KILL_MIN_IMPROVEMENT;
  if (!Number.isInteger(minN) || minN < 1 || !Number.isFinite(minN)) {
    throw new KernelError("DOMAIN", `evaluateCrpsGate: minN must be an integer ≥ 1, got ${minN}`);
  }
  if (!(minImprovement >= 0) || !Number.isFinite(minImprovement)) {
    throw new KernelError(
      "DOMAIN",
      `evaluateCrpsGate: minImprovement must be finite ≥ 0, got ${minImprovement}`,
    );
  }
  const improvement = baselineCrps - modelCrps;
  const invertedPaperWouldGraduate =
    improvement > 0 && improvement < PAPER_CRPS_IMPROVEMENT_MAX;
  let verdict: CrpsGateVerdict;
  if (n < minN) verdict = "underpowered";
  else if (improvement < minImprovement) verdict = "kill";
  else verdict = "survive";
  return {
    verdict,
    improvement,
    n,
    minN,
    minImprovement,
    modelCrps,
    baselineCrps,
    priced: false,
    status: "shadow",
    invertedPaperWouldGraduate,
  };
}
