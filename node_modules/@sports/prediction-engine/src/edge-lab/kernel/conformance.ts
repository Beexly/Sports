/**
 * Distribution conformance — implemented ONCE, here, so that many independently
 * authored distributions are held to one identical standard. Every distribution
 * slot's test suite MUST call `assertDistributionConformance` and pass.
 */

import {
  KernelError,
  makeRng,
  type DiscreteDistribution,
  type Probability,
} from "./contract.js";

export interface ConformanceOptions {
  /** Absolute tolerance for probability sums and inverse checks. Default 1e-9. */
  readonly tolerance?: number;
  /** Upper bound used when the support is unbounded. Default 100000. */
  readonly truncateAt?: number;
  /** Draws used for the sampling checks. Default 20000. */
  readonly draws?: number;
  /** Seed for the sampling checks. Default 12345. */
  readonly seed?: number;
}

export interface ConformanceViolation {
  readonly check: string;
  readonly detail: string;
}

/** Truncated support walk: [min .. k*] where remaining tail mass < 1e-12. */
function truncatedUpper(dist: DiscreteDistribution, cap: number): number {
  const s = dist.support();
  if (Number.isFinite(s.max)) return s.max;
  let k = s.min;
  while (k < cap && dist.cdf(k) < 1 - 1e-12) k += 1;
  return k;
}

/**
 * Runs every invariant a `DiscreteDistribution` must satisfy and returns the
 * violations found (empty array = conforming).
 *
 * Checks: pmf non-negative and sums to ~1 over the (truncated) support; cdf
 * non-decreasing, consistent with cumulative pmf, and reaching ~1; quantile is
 * the generalized inverse of cdf; samples land in the support and their
 * empirical mean/variance track the declared moments; invalid inputs throw
 * KernelError rather than returning NaN.
 */
export function distributionConformance(
  dist: DiscreteDistribution,
  options?: ConformanceOptions,
): readonly ConformanceViolation[] {
  const tol = options?.tolerance ?? 1e-9;
  const cap = options?.truncateAt ?? 100000;
  const draws = options?.draws ?? 20000;
  const seed = options?.seed ?? 12345;
  const out: ConformanceViolation[] = [];
  const s = dist.support();
  const hi = truncatedUpper(dist, cap);

  // 1. pmf: non-negative, sums to 1, matches cdf increments.
  let mass = 0;
  let prevCdf = 0;
  let nonNeg = true;
  let cdfMonotone = true;
  let pmfCdfConsistent = true;
  for (let k = s.min; k <= hi; k += 1) {
    const p = dist.pmf(k);
    if (!(p >= 0) || Number.isNaN(p)) nonNeg = false;
    mass += p;
    const c = dist.cdf(k);
    if (c + tol < prevCdf) cdfMonotone = false;
    if (Math.abs(c - mass) > 1e-7 + tol) pmfCdfConsistent = false;
    prevCdf = c;
  }
  if (!nonNeg) out.push({ check: "pmf-non-negative", detail: "pmf returned a negative or NaN value" });
  if (Math.abs(mass - 1) > 1e-6) {
    out.push({ check: "pmf-sums-to-one", detail: `total mass ${mass} over [${s.min}, ${hi}]` });
  }
  if (!cdfMonotone) out.push({ check: "cdf-monotone", detail: "cdf decreased between consecutive k" });
  if (!pmfCdfConsistent) {
    out.push({ check: "pmf-cdf-consistency", detail: "cdf(k) diverged from cumulative pmf" });
  }
  if (Math.abs(dist.cdf(hi) - 1) > 1e-6) {
    out.push({ check: "cdf-reaches-one", detail: `cdf(${hi}) = ${dist.cdf(hi)}` });
  }

  // 2. quantile inverts cdf (generalized inverse).
  const grid: Probability[] = [1e-9, 0.01, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99, 1 - 1e-9];
  for (const p of grid) {
    const q = dist.quantile(p);
    if (!Number.isInteger(q) || q < s.min) {
      out.push({ check: "quantile-in-support", detail: `quantile(${p}) = ${q}` });
      continue;
    }
    if (dist.cdf(q) + tol < p) {
      out.push({ check: "quantile-inverse", detail: `cdf(quantile(${p})) = ${dist.cdf(q)} < ${p}` });
    }
    if (q > s.min && dist.cdf(q - 1) >= p + tol) {
      out.push({ check: "quantile-minimal", detail: `quantile(${p}) = ${q} is not the smallest valid k` });
    }
  }

  // 3. sampling: in-support, moments track declared values.
  const rng = makeRng(seed);
  let sum = 0;
  let sumSq = 0;
  let inSupport = true;
  for (let i = 0; i < draws; i += 1) {
    const x = dist.sample(rng);
    if (!Number.isInteger(x) || x < s.min || x > s.max) inSupport = false;
    sum += x;
    sumSq += x * x;
  }
  if (!inSupport) out.push({ check: "sample-in-support", detail: "a draw fell outside the support" });
  const empMean = sum / draws;
  const empVar = sumSq / draws - empMean * empMean;
  const mean = dist.mean();
  const variance = dist.variance();
  const meanBand = 6 * Math.sqrt(Math.max(variance, 1e-12) / draws) + 1e-6;
  if (Math.abs(empMean - mean) > meanBand) {
    out.push({
      check: "sample-mean",
      detail: `empirical mean ${empMean} vs declared ${mean} (band ${meanBand})`,
    });
  }
  if (variance > 1e-9 && Math.abs(empVar - variance) > 0.25 * variance + 1e-6) {
    out.push({
      check: "sample-variance",
      detail: `empirical variance ${empVar} vs declared ${variance}`,
    });
  }

  // 4. fail-closed on invalid inputs.
  const mustThrow: readonly { readonly check: string; readonly fn: () => unknown }[] = [
    { check: "pmf-non-integer-throws", fn: () => dist.pmf(s.min + 0.5) },
    { check: "quantile-domain-throws", fn: () => dist.quantile(1.5) },
    { check: "quantile-negative-throws", fn: () => dist.quantile(-0.1) },
  ];
  for (const { check, fn } of mustThrow) {
    let threw = false;
    try {
      fn();
    } catch (e) {
      threw = e instanceof KernelError;
    }
    if (!threw) out.push({ check, detail: "expected KernelError, none thrown" });
  }

  return out;
}

/** Throws with a readable report if the distribution violates any invariant. */
export function assertDistributionConformance(
  dist: DiscreteDistribution,
  options?: ConformanceOptions,
): void {
  const violations = distributionConformance(dist, options);
  if (violations.length > 0) {
    const lines = violations.map((v) => `  - [${v.check}] ${v.detail}`).join("\n");
    throw new Error(`Distribution conformance failed:\n${lines}`);
  }
}
