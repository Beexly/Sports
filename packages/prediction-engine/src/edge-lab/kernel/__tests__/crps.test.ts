import { describe, expect, it } from "vitest";
import type { DiscreteDistribution } from "../contract.js";
import {
  CRPS_KILL_MIN_IMPROVEMENT,
  CRPS_KILL_MIN_N,
  PAPER_CRPS_IMPROVEMENT_MAX,
  crpsDiscrete,
  crpsEmpirical,
  crpsGaussian,
  evaluateCrpsGate,
  expectedGaussianCrps,
} from "../slots/crps.js";

function pointMass(k0: number): DiscreteDistribution {
  return {
    kind: "discrete",
    pmf: (k) => (k === k0 ? 1 : 0),
    cdf: (k) => (k >= k0 ? 1 : 0),
    quantile: (p) => (p <= 0 ? k0 : k0),
    sample: () => k0,
    mean: () => k0,
    variance: () => 0,
    support: () => ({ min: k0, max: k0 }),
  };
}

function twoPoint(a: number, b: number, pa: number): DiscreteDistribution {
  const pb = 1 - pa;
  return {
    kind: "discrete",
    pmf: (k) => (k === a ? pa : k === b ? pb : 0),
    cdf: (k) => {
      if (k < a) return 0;
      if (k < b) return pa;
      return 1;
    },
    quantile: (p) => (p <= pa ? a : b),
    sample: () => a,
    mean: () => pa * a + pb * b,
    variance: () => pa * pb * (a - b) * (a - b),
    support: () => ({ min: a, max: b }),
  };
}

describe("crpsDiscrete", () => {
  it("point mass at y is 0", () => {
    expect(crpsDiscrete(pointMass(3), 3)).toBeCloseTo(0, 12);
  });

  it("point mass vs y outside support is |x − y|, not a silent 0", () => {
    expect(crpsDiscrete(pointMass(3), 1)).toBeCloseTo(2, 12);
    expect(crpsDiscrete(pointMass(3), 5)).toBeCloseTo(2, 12);
    expect(crpsDiscrete(pointMass(3), 4)).toBeCloseTo(1, 12);
    expect(crpsEmpirical([3], 1)).toBeCloseTo(2, 12);
    expect(crpsEmpirical([3], 5)).toBeCloseTo(2, 12);
  });

  it("two-point mass is strictly positive away from both atoms", () => {
    const d = twoPoint(0, 2, 0.8);
    expect(crpsDiscrete(d, 1)).toBeGreaterThan(0);
    expect(crpsDiscrete(d, 0)).toBeLessThan(crpsDiscrete(d, 1));
    // Symmetric 0.5/0.5 two-point: y=1 → 0.25+0.25+0 = 0.5
    expect(crpsDiscrete(twoPoint(0, 2, 0.5), 1)).toBeCloseTo(0.5, 12);
  });
});

describe("crpsEmpirical", () => {
  it("point-mass ensemble at y is 0", () => {
    expect(crpsEmpirical([4, 4, 4, 4], 4)).toBeCloseTo(0, 12);
  });

  it("does not mutate the input", () => {
    const samples = [3, 1, 2];
    crpsEmpirical(samples, 2);
    expect(samples).toEqual([3, 1, 2]);
  });

  it("matches Gaussian closed form on a large N(0,1) ensemble at y=0, loosely", () => {
    const n = 2000;
    const samples: number[] = [];
    let rng = 99 >>> 0;
    for (let i = 0; i < n; i += 1) {
      rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
      const u1 = rng / 4294967296 || 1e-12;
      rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
      const u2 = rng / 4294967296;
      samples.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));
    }
    const emp = crpsEmpirical(samples, 0);
    const closed = crpsGaussian(0, 1, 0);
    expect(Math.abs(emp - closed)).toBeLessThan(0.05);
  });
});

describe("crpsGaussian", () => {
  it("at y=μ equals σ(√(2/π) − 1/√π)", () => {
    const sig = 14;
    const expected = sig * (Math.sqrt(2 / Math.PI) - 1 / Math.sqrt(Math.PI));
    expect(crpsGaussian(0, sig, 0)).toBeCloseTo(expected, 10);
  });

  it("expected CRPS of a calibrated Gaussian is σ/√π", () => {
    expect(expectedGaussianCrps(14)).toBeCloseTo(14 / Math.sqrt(Math.PI), 12);
  });

  it("0.01 is 0.022 SE of the mean at n=150, σ=14 (empty kill line)", () => {
    const e = expectedGaussianCrps(14);
    expect(PAPER_CRPS_IMPROVEMENT_MAX / e).toBeLessThan(0.002);
    // Monte-Carlo sd of CRPS is O(σ); SE at n=150 ≈ 0.45, 0.01/SE ≈ 0.02
    const sdCrps = 5.56;
    const se = sdCrps / Math.sqrt(150);
    expect(PAPER_CRPS_IMPROVEMENT_MAX / se).toBeLessThan(0.03);
  });
});

describe("evaluateCrpsGate", () => {
  it("kills a model that equals the baseline (improvement 0)", () => {
    const g = evaluateCrpsGate(7.9, 7.9, CRPS_KILL_MIN_N);
    expect(g.verdict).toBe("kill");
    expect(g.improvement).toBe(0);
  });

  it("kills a barely-better model that the inverted paper gate would graduate", () => {
    const baseline = 7.9;
    const model = baseline - 0.005; // 0 < Δ < 0.01
    const g = evaluateCrpsGate(model, baseline, CRPS_KILL_MIN_N);
    expect(g.improvement).toBeCloseTo(0.005, 12);
    expect(g.invertedPaperWouldGraduate).toBe(true);
    expect(g.verdict).toBe("kill");
    expect(g.minImprovement).toBe(CRPS_KILL_MIN_IMPROVEMENT);
  });

  it("survives a real 0.5-point improvement at n≥272", () => {
    const g = evaluateCrpsGate(7.4, 7.9, CRPS_KILL_MIN_N);
    expect(g.verdict).toBe("survive");
    expect(g.invertedPaperWouldGraduate).toBe(false);
  });

  it("underpowered is not a pass, even with a huge improvement", () => {
    const g = evaluateCrpsGate(1, 8, 20);
    expect(g.verdict).toBe("underpowered");
  });

  it("kills a worse model (negative improvement)", () => {
    const g = evaluateCrpsGate(8.5, 7.9, CRPS_KILL_MIN_N);
    expect(g.verdict).toBe("kill");
    expect(g.improvement).toBeLessThan(0);
    expect(g.invertedPaperWouldGraduate).toBe(false);
  });

  it("refuses NaN / negative caller thresholds instead of failing open", () => {
    expect(() => evaluateCrpsGate(1, 8, CRPS_KILL_MIN_N, { minImprovement: Number.NaN })).toThrow(
      /minImprovement/,
    );
    expect(() => evaluateCrpsGate(1, 8, CRPS_KILL_MIN_N, { minImprovement: -1 })).toThrow(
      /minImprovement/,
    );
    expect(() => evaluateCrpsGate(1, 8, CRPS_KILL_MIN_N, { minN: Number.NaN })).toThrow(/minN/);
    expect(() => evaluateCrpsGate(1, 8, CRPS_KILL_MIN_N, { minN: 0 })).toThrow(/minN/);
  });
});
