/**
 * De-vig oracle — seven methods that turn decimal odds into a fair probability
 * vector (sum = 1). This is the reference implementation; existing in-repo Shin
 * helpers (`shin-devig.ts`, `edge-lab/devig.ts`) should be validated against it
 * before any de-duplication.
 *
 * Ported from penaltyblog (MIT), github.com/martineastwood/penaltyblog
 * (`implied.py`; verified against 1.12.0 commit 5ebd602, numpy 2.4.6 / scipy 1.17.1).
 *
 * Field integration: `DevigResult.probabilities` are fair calibration *inputs*
 * to the pick pipeline. They must never bypass scoring (Prediction Engine Rules).
 *
 * Pure, deterministic, no I/O.
 */

export type DevigMethod =
  | "multiplicative"
  | "additive"
  | "power"
  | "shin"
  | "differential_margin_weighting"
  | "odds_ratio"
  | "logarithmic";

export interface DevigResult {
  probabilities: number[];
  method: DevigMethod;
  margin: number;
  methodParams?: Record<string, number>;
}

const POWER_HI = 100;
const SHIN_HI = 1 - 1e-12;
const ODDS_RATIO_HI = 100;
const LOG_HI = 20;
const ROOT_TOL = 1e-12;
const ZERO_MARGIN = 1e-9;

function sum(xs: readonly number[]): number {
  let total = 0;
  for (const x of xs) total += x;
  return total;
}

function assertValidOdds(decimalOdds: readonly number[]): void {
  if (decimalOdds.length === 0) {
    throw new RangeError("devig requires at least one decimal price");
  }
  for (const o of decimalOdds) {
    if (!Number.isFinite(o) || o <= 0) {
      throw new RangeError(`devig requires finite decimal odds > 0, got ${o}`);
    }
  }
}

/**
 * Algorithm-independent root finder. Bisection to 1e-12 reproduces scipy's
 * converged root on the golden fixtures (penaltyblog 1.12.0).
 */
export function bisectRoot(
  f: (x: number) => number,
  lo: number,
  hi: number,
  tol = ROOT_TOL,
  maxIter = 200,
): number {
  let flo = f(lo);
  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2;
    const fmid = f(mid);
    if (Math.abs(fmid) < tol || hi - lo < tol) return mid;
    if (flo * fmid <= 0) {
      hi = mid;
    } else {
      lo = mid;
      flo = fmid;
    }
  }
  return (lo + hi) / 2;
}

function hasSignChange(f: (x: number) => number, lo: number, hi: number): boolean {
  const flo = f(lo);
  const fhi = f(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi)) return false;
  return flo === 0 || fhi === 0 || flo * fhi < 0;
}

function sigmoid(x: number): number {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

function multiplicative(invOdds: readonly number[]): number[] {
  const total = sum(invOdds);
  return invOdds.map((p) => p / total);
}

function additive(invOdds: readonly number[], margin: number): number[] {
  const n = invOdds.length;
  return invOdds.map((p) => p - margin / n);
}

function powerMethod(invOdds: readonly number[]): { probs: number[]; k: number } {
  const f = (k: number) => 1 - sum(invOdds.map((p) => Math.pow(p, k)));
  if (!hasSignChange(f, 0, POWER_HI)) {
    return { probs: multiplicative(invOdds), k: Number.NaN };
  }
  const k = bisectRoot(f, 0, POWER_HI);
  return { probs: invOdds.map((p) => Math.pow(p, k)), k };
}

function shinProbAt(invOdds: readonly number[], booksum: number, z: number): number[] {
  const denom = 2 - 2 * z;
  return invOdds.map((pi) => {
    const inner = z * z + (4 * (1 - z) * (pi * pi)) / booksum;
    return (Math.sqrt(inner) - z) / denom;
  });
}

function shinMethod(invOdds: readonly number[]): { probs: number[]; z: number } {
  const booksum = sum(invOdds);
  const f = (z: number) => sum(shinProbAt(invOdds, booksum, z)) - 1;
  // Shin's z is an insider-share in [0, 1). Bracket just below 1 so (2-2z) stays
  // nonzero. Fall back to multiplicative when the residual does not change sign
  // (do not port scipy.ridder's unguarded no-bracket throw).
  if (!hasSignChange(f, 0, SHIN_HI)) {
    return { probs: multiplicative(invOdds), z: Number.NaN };
  }
  const z = bisectRoot(f, 0, SHIN_HI);
  return { probs: shinProbAt(invOdds, booksum, z), z };
}

function differentialMarginWeighting(
  decimalOdds: readonly number[],
  invOdds: readonly number[],
  margin: number,
): number[] {
  const n = decimalOdds.length;
  return decimalOdds.map((odds, i) => {
    const denom = n - margin * odds;
    if (denom === 0 || !Number.isFinite(denom)) return invOdds[i] ?? 0;
    const fairOdds = (n * odds) / denom;
    return 1 / fairOdds;
  });
}

function oddsRatioMethod(invOdds: readonly number[]): { probs: number[]; c: number } {
  const f = (c: number) =>
    sum(invOdds.map((p) => p / (c + p - c * p))) - 1;
  if (!hasSignChange(f, 0, ODDS_RATIO_HI)) {
    return { probs: multiplicative(invOdds), c: Number.NaN };
  }
  const c = bisectRoot(f, 0, ODDS_RATIO_HI);
  return {
    probs: invOdds.map((p) => p / (c + p - c * p)),
    c,
  };
}

function logarithmicMethod(invOdds: readonly number[], margin: number): { probs: number[]; c: number } {
  if (Math.abs(margin) < ZERO_MARGIN) {
    return { probs: [...invOdds], c: 0 };
  }
  const logOdds = invOdds.map((p) => {
    const clipped = Math.min(1 - 1e-15, Math.max(1e-15, p));
    return Math.log(clipped / (1 - clipped));
  });
  const f = (c: number) => sum(logOdds.map((lo) => sigmoid(lo - c))) - 1;
  let lo = 0;
  let hi = LOG_HI;
  if (!hasSignChange(f, lo, hi)) {
    lo = -LOG_HI;
    hi = LOG_HI;
  }
  if (!hasSignChange(f, lo, hi)) {
    return { probs: multiplicative(invOdds), c: Number.NaN };
  }
  const c = bisectRoot(f, lo, hi);
  return { probs: logOdds.map((l) => sigmoid(l - c)), c };
}

export function devig(decimalOdds: number[], method: DevigMethod): DevigResult {
  assertValidOdds(decimalOdds);
  const invOdds = decimalOdds.map((o) => 1 / o);
  const margin = sum(invOdds) - 1;

  if (method !== "multiplicative" && Math.abs(margin) < ZERO_MARGIN) {
    return { probabilities: [...invOdds], method, margin };
  }

  switch (method) {
    case "multiplicative":
      return { probabilities: multiplicative(invOdds), method, margin };
    case "additive":
      return { probabilities: additive(invOdds, margin), method, margin };
    case "power": {
      const { probs, k } = powerMethod(invOdds);
      return { probabilities: probs, method, margin, methodParams: { k } };
    }
    case "shin": {
      const { probs, z } = shinMethod(invOdds);
      return { probabilities: probs, method, margin, methodParams: { z } };
    }
    case "differential_margin_weighting":
      return {
        probabilities: differentialMarginWeighting(decimalOdds, invOdds, margin),
        method,
        margin,
      };
    case "odds_ratio": {
      const { probs, c } = oddsRatioMethod(invOdds);
      return { probabilities: probs, method, margin, methodParams: { c } };
    }
    case "logarithmic": {
      const { probs, c } = logarithmicMethod(invOdds, margin);
      return { probabilities: probs, method, margin, methodParams: { c } };
    }
    default: {
      const _never: never = method;
      throw new Error(`unknown devig method: ${String(_never)}`);
    }
  }
}
