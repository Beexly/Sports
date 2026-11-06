/**
 * Discrete CRPS vs widened-Gaussian CRPS on integer outcomes.
 *
 * Discrete CRPS is the primary for integer scores (margins, totals, props).
 * Gaussian closed form is a diagnostic. This mill asks whether the
 * diagnostic ranks two models the same way the primary does. If they
 * disagree, the Gaussian number is not a licensed kill instrument.
 *
 * No production rows. Synthetic integer y only. A caller with real
 * nflverse margins can pass them through `compareCrpsRankings`.
 *
 * SHADOW. priced false.
 */

import type { DiscreteDistribution, Rng } from "./contract.js";
import { KernelError, assertFinite, makeRng } from "./contract.js";
import { crpsDiscrete, crpsGaussian, evaluateCrpsGate, type CrpsGateResult } from "./slots/crps.js";

export type CrpsCompareRow = {
  readonly y: number;
  readonly discreteA: number;
  readonly discreteB: number;
  readonly gaussianA: number;
  readonly gaussianB: number;
};

export type CrpsRanking = "A" | "B" | "tie";

export type CrpsCompareReport = {
  readonly n: number;
  readonly meanDiscreteA: number;
  readonly meanDiscreteB: number;
  readonly meanGaussianA: number;
  readonly meanGaussianB: number;
  readonly discreteRanking: CrpsRanking;
  readonly gaussianRanking: CrpsRanking;
  readonly rankingsAgree: boolean;
  /** Gaussian closed form is a diagnostic. It never licenses a kill. */
  readonly gaussianLicensedAsKill: false;
  readonly priced: false;
  readonly status: "shadow";
};

function ranking(a: number, b: number, tol = 1e-12): CrpsRanking {
  if (Math.abs(a - b) <= tol) return "tie";
  return a < b ? "A" : "B";
}

function mean(xs: readonly number[]): number {
  if (xs.length === 0) throw new KernelError("EMPTY", "mean of empty CRPS series");
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/**
 * Score two discrete predictives and their Gaussian moment-matches on the
 * same integer observations. Rankings on mean CRPS (lower better).
 */
export function compareCrpsRankings(args: {
  readonly y: readonly number[];
  readonly distA: DiscreteDistribution;
  readonly distB: DiscreteDistribution;
  readonly gaussianA: { readonly mean: number; readonly sd: number };
  readonly gaussianB: { readonly mean: number; readonly sd: number };
}): CrpsCompareReport {
  if (args.y.length === 0) {
    throw new KernelError("EMPTY", "compareCrpsRankings requires observations");
  }
  const discreteA: number[] = [];
  const discreteB: number[] = [];
  const gaussianA: number[] = [];
  const gaussianB: number[] = [];
  for (const y of args.y) {
    assertFinite(y, "y");
    if (!Number.isInteger(y)) {
      throw new KernelError("DOMAIN", `compareCrpsRankings requires integer y, got ${y}`);
    }
    discreteA.push(crpsDiscrete(args.distA, y));
    discreteB.push(crpsDiscrete(args.distB, y));
    gaussianA.push(crpsGaussian(args.gaussianA.mean, args.gaussianA.sd, y));
    gaussianB.push(crpsGaussian(args.gaussianB.mean, args.gaussianB.sd, y));
  }
  const meanDiscreteA = mean(discreteA);
  const meanDiscreteB = mean(discreteB);
  const meanGaussianA = mean(gaussianA);
  const meanGaussianB = mean(gaussianB);
  const discreteRanking = ranking(meanDiscreteA, meanDiscreteB);
  const gaussianRanking = ranking(meanGaussianA, meanGaussianB);
  return {
    n: args.y.length,
    meanDiscreteA,
    meanDiscreteB,
    meanGaussianA,
    meanGaussianB,
    discreteRanking,
    gaussianRanking,
    rankingsAgree: discreteRanking === gaussianRanking,
    gaussianLicensedAsKill: false,
    priced: false,
    status: "shadow",
  };
}

/** Integer-support dist from a finite PMF. Mass is renormalised. */
export function distFromPmf(pmf: ReadonlyMap<number, number>): DiscreteDistribution {
  const keys = [...pmf.keys()].filter((k) => Number.isInteger(k) && (pmf.get(k) ?? 0) > 0).sort((a, b) => a - b);
  if (keys.length === 0) throw new KernelError("EMPTY", "distFromPmf: no positive mass");
  let total = 0;
  for (const k of keys) total += pmf.get(k)!;
  if (!(total > 0)) throw new KernelError("DOMAIN", "distFromPmf: mass does not sum to a positive number");
  const p = new Map<number, number>();
  for (const k of keys) p.set(k, pmf.get(k)! / total);
  const min = keys[0]!;
  const max = keys[keys.length - 1]!;
  const cdfAt = (k: number): number => {
    let s = 0;
    for (const key of keys) {
      if (key <= k) s += p.get(key)!;
    }
    return s;
  };
  let meanX = 0;
  let second = 0;
  for (const k of keys) {
    const pk = p.get(k)!;
    meanX += k * pk;
    second += k * k * pk;
  }
  return {
    kind: "discrete",
    pmf: (k) => {
      if (!Number.isInteger(k)) throw new KernelError("DOMAIN", `pmf requires integer k, got ${k}`);
      return p.get(k) ?? 0;
    },
    cdf: (k) => {
      if (!Number.isFinite(k)) throw new KernelError("NOT_FINITE", "cdf");
      if (k < min) return 0;
      return Math.min(1, cdfAt(Math.floor(k)));
    },
    quantile: (q) => {
      if (!(q >= 0 && q <= 1)) throw new KernelError("DOMAIN", `quantile p in [0,1], got ${q}`);
      let acc = 0;
      for (const k of keys) {
        acc += p.get(k)!;
        if (acc >= q) return k;
      }
      return max;
    },
    sample: (rng: Rng) => {
      const u = rng();
      let acc = 0;
      for (const k of keys) {
        acc += p.get(k)!;
        if (u < acc) return k;
      }
      return max;
    },
    mean: () => meanX,
    variance: () => Math.max(0, second - meanX * meanX),
    support: () => ({ min, max }),
  };
}

function gaussianPdf(x: number, mu: number, sd: number): number {
  const z = (x - mu) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

/** Discretised N(μ,σ²) on {lo..hi} via PMF ∝ φ((k-μ)/σ). */
export function discretizedGaussian(mean: number, sd: number, lo: number, hi: number): DiscreteDistribution {
  assertFinite(mean, "mean");
  assertFinite(sd, "sd");
  if (!(sd > 0)) throw new KernelError("DOMAIN", `discretizedGaussian sd > 0, got ${sd}`);
  if (!Number.isInteger(lo) || !Number.isInteger(hi) || hi < lo) {
    throw new KernelError("DOMAIN", "discretizedGaussian requires integer lo ≤ hi");
  }
  const pmf = new Map<number, number>();
  for (let k = lo; k <= hi; k += 1) pmf.set(k, gaussianPdf(k, mean, sd));
  return distFromPmf(pmf);
}

/**
 * NFL-ish integer margin: discretised N(0,σ²) with extra mass at ±3 and ±7
 * (the key-number bump). Renormalised. Not a production density.
 */
export function nflKeyNumberMixture(sd = 14, bump = 1.8, lo = -40, hi = 40): DiscreteDistribution {
  const base = discretizedGaussian(0, sd, lo, hi);
  const pmf = new Map<number, number>();
  for (let k = lo; k <= hi; k += 1) {
    const extra = k === 3 || k === -3 || k === 7 || k === -7 ? bump : 1;
    pmf.set(k, base.pmf(k) * extra);
  }
  return distFromPmf(pmf);
}

export type SyntheticCrpsCompare = CrpsCompareReport & {
  readonly discreteGate: CrpsGateResult;
  readonly gaussianGate: CrpsGateResult;
};

/**
 * Draw integer y from the key-number mixture. Model A is the mixture.
 * Model B is a matching-moment discretised Gaussian (no key-number bump).
 * Gaussian CRPS uses N(0, σ) for BOTH, so the diagnostic cannot see the
 * bump — rankingsAgree is expected false (discrete A wins, Gaussian ties).
 */
export function compareNflKeyNumberVsGaussian(opts?: {
  readonly n?: number;
  readonly sd?: number;
  readonly seed?: number;
}): SyntheticCrpsCompare {
  const n = opts?.n ?? 400;
  const sd = opts?.sd ?? 14;
  const mixture = nflKeyNumberMixture(sd);
  const gaussDisc = discretizedGaussian(0, sd, -40, 40);
  const rng = makeRng(opts?.seed ?? 17);
  const y: number[] = [];
  for (let i = 0; i < n; i += 1) y.push(mixture.sample(rng));
  const report = compareCrpsRankings({
    y,
    distA: mixture,
    distB: gaussDisc,
    gaussianA: { mean: 0, sd },
    gaussianB: { mean: 0, sd },
  });
  return {
    ...report,
    discreteGate: evaluateCrpsGate(report.meanDiscreteA, report.meanDiscreteB, n),
    gaussianGate: evaluateCrpsGate(report.meanGaussianA, report.meanGaussianB, n),
  };
}
