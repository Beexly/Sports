/**
 * Angular combining — tests (arXiv 2305.16735).
 *
 * ACCEPTANCE GATE: theta=90 recovers vertical averaging and small
 * theta approximates horizontal averaging; angular CRPS beats the
 * linear opinion pool on a constructed case; theta optimization picks
 * a stable optimum; interval coverage is near-nominal on calibrated
 * inputs; degenerate inputs throw.
 */
import { describe, expect, it } from "vitest";
import {
  angularAverage,
  crps,
  FALLBACK_THETA_DEG,
  horizontalAverage,
  intervalCoverage,
  optimizeTheta,
  verticalAverage,
  weightedAngularAverage,
  type Cdf,
} from "./angular-combining";

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

function normalCdf(xs: number[], mean: number, sd: number): Cdf {
  const erf = (x: number): number => {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const y =
      1 -
      (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) *
        Math.exp(-x * x);
    return x >= 0 ? y : -y;
  };
  return {
    xs: [...xs],
    fs: xs.map((x) => 0.5 * (1 + erf((x - mean) / (sd * Math.SQRT2)))),
  };
}

const xs = Array.from({ length: 61 }, (_, i) => -30 + i);

describe("angularAverage", () => {
  it("interpolates between vertical and horizontal", () => {
    const a = normalCdf(xs, -3, 8);
    const b = normalCdf(xs, 3, 8);
    const at90 = angularAverage([a, b], 90);
    const v = verticalAverage([a, b]);
    at90.fs.forEach((f, i) => expect(f).toBeCloseTo(v.fs[i] as number, 10));
    // Small theta approximates the horizontal average.
    const at5 = angularAverage([a, b], 5);
    const h = horizontalAverage([a, b]);
    const maxDiff = Math.max(...at5.fs.map((f, i) => Math.abs(f - (h.fs[i] as number))));
    expect(maxDiff).toBeLessThan(0.05);
    expect(FALLBACK_THETA_DEG).toBe(67.5);
    expect(() => angularAverage([], 45)).toThrow();
    expect(() => angularAverage([a], 0)).toThrow();
    expect(() => horizontalAverage([])).toThrow();
  });
});

describe("crps", () => {
  it("is lower for the better-centered forecast", () => {
    const good = normalCdf(xs, 0, 8);
    const bad = normalCdf(xs, 15, 8);
    expect(crps(good, 1)).toBeLessThan(crps(bad, 1));
    expect(crps(good, 1)).toBeGreaterThanOrEqual(0);
  });
});

describe("optimizeTheta", () => {
  it("finds a stable optimum beating the linear pool", () => {
    const rand = mulberry32(371);
    const weeks: Cdf[][] = [];
    const outcomes: number[] = [];
    // Truth: N(0, 8). Expert 1 is sharp but biased; expert 2 is wide
    // but centered; the linear pool is over-dispersed, so an
    // intermediate theta wins.
    for (let w = 0; w < 12; w++) {
      const y = (rand() + rand() + rand() - 1.5) * 16;
      outcomes.push(y);
      weeks.push([normalCdf(xs, 2, 5), normalCdf(xs, 0, 12)]);
    }
    const { theta, meanCrps, stable } = optimizeTheta(weeks, outcomes);
    const poolCrps =
      weeks.reduce((s, cdfs, w) => s + crps(verticalAverage(cdfs), outcomes[w] as number), 0) /
      weeks.length;
    expect(meanCrps).toBeLessThanOrEqual(poolCrps);
    expect(stable).toBe(true);
    expect(theta).toBeGreaterThan(0);
    expect(theta).toBeLessThanOrEqual(90);
    expect(() => optimizeTheta([], [])).toThrow();
  });
});

describe("weightedAngularAverage + intervalCoverage", () => {
  it("weights by inverse CRPS and covers near-nominally", () => {
    const rand = mulberry32(373);
    const good = normalCdf(xs, 0, 8);
    const bad = normalCdf(xs, 0, 20);
    const w = weightedAngularAverage([good, bad], [2, 10], 67.5);
    const u = angularAverage([good, bad], 67.5);
    // Weighted toward the good expert: sharper (higher CDF slope at 0).
    const slope = (c: Cdf): number => {
      const i = c.xs.indexOf(0);
      return ((c.fs[i + 1] as number) - (c.fs[i - 1] as number)) / 2;
    };
    expect(slope(w)).toBeGreaterThan(slope(u));
    // Coverage of calibrated CDFs on their own distribution.
    const cdfs: Cdf[] = [];
    const outs: number[] = [];
    for (let i = 0; i < 300; i++) {
      const y = (rand() + rand() + rand() - 1.5) * 16;
      outs.push(y);
      cdfs.push(normalCdf(xs, 0, 8));
    }
    const cov = intervalCoverage(cdfs, outs);
    expect(cov).toBeGreaterThan(0.9);
    expect(cov).toBeLessThanOrEqual(1);
    expect(() => weightedAngularAverage([good], [1, 2], 45)).toThrow();
    expect(() => intervalCoverage([], [])).toThrow();
  });
});
