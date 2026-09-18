import { describe, expect, it } from "vitest";
import {
  JACKKNIFE_PLUS_TWO_ALPHA_REASON,
  boundedDriftCoverageGap,
  changepointCoverageGap,
  compareRecipesAtNflScale,
  constantMeanLoo,
  coverageFloor,
  cvPlusInterval,
  exponentialDecayWeights,
  finiteIntervalMinN,
  jackknifeMinmaxInterval,
  jackknifePlusInterval,
  jackknifeCensusFlags,
  lowerOrderStat,
  naiveJackknifeInterval,
  nexCoverageFloor,
  nexJackknifePlusInterval,
  nflScaleWidthDiagnostic,
  normalizeNexWeights,
  olsLoo,
  simulateJackknifePlusCoverage,
  splitConformalCoverage,
  splitConformalInterval,
  upperOrderStat,
  weightedUpperOrderStat,
  UNCONDITIONAL_JACKKNIFE_PLUS_FLOOR_REASON,
} from "../jackknife-plus.js";

describe("coverageFloor", () => {
  it("is 1-2α, not 1-α", () => {
    expect(coverageFloor(0.1)).toBeCloseTo(0.8, 12);
    expect(splitConformalCoverage(0.1)).toBeCloseTo(0.9, 12);
    expect(coverageFloor(0.1)).not.toBe(splitConformalCoverage(0.1));
  });

  it("the 2 is the n+1 residual comparison, not two Gaussian tails", () => {
    expect(JACKKNIFE_PLUS_TWO_ALPHA_REASON).toMatch(/leave-one-out residual/);
    expect(JACKKNIFE_PLUS_TWO_ALPHA_REASON).toMatch(/not two Gaussian tails/);
  });
});

describe("finiteIntervalMinN", () => {
  it("is 9 at α=0.10 and 4 at α=0.20", () => {
    expect(finiteIntervalMinN(0.1)).toBe(9);
    expect(finiteIntervalMinN(0.2)).toBe(4);
  });
});

describe("fail-closed order stats", () => {
  it("returns +∞ when (n+1)(1-α) exceeds n (same hole CQR clamped)", () => {
    // n=5, α=0.1 → ceil(6*0.9)=6 > 5
    expect(upperOrderStat([0.1, 0.2, 0.3, 0.4, 0.5], 0.1)).toBe(Number.POSITIVE_INFINITY);
    expect(lowerOrderStat([0.1, 0.2, 0.3, 0.4, 0.5], 0.1)).toBe(Number.NEGATIVE_INFINITY);
  });

  it("does not clamp to the max residual", () => {
    const v = [1, 2, 3];
    const q = upperOrderStat(v, 0.1);
    expect(q).not.toBe(3);
    expect(q).toBe(Number.POSITIVE_INFINITY);
  });

  it("is finite at the threshold n = 1/α − 1", () => {
    const n = finiteIntervalMinN(0.1);
    const v = Array.from({ length: n }, (_, i) => i);
    expect(upperOrderStat(v, 0.1)).toBe(n - 1);
  });
});

describe("jackknifePlusInterval", () => {
  it("reports coverageFloor 1-2α and never 1-α", () => {
    const y = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const iv = jackknifePlusInterval(constantMeanLoo(y, 0), 0.1);
    expect(iv.coverageFloor).toBeCloseTo(0.8, 12);
    expect(iv.coverageKind).toBe("floor_1_minus_2alpha");
    expect(iv.coverageScope).toBe("marginal");
    expect(iv.exchangeabilityRequired).toBe(true);
    expect(iv.recipe).toBe("jackknife-plus");
    expect(iv.priced).toBe(false);
    expect(iv.refusedBound).toBe("none");
    expect(iv.minimumNForFiniteInterval).toBe(9);
    expect(Object.prototype.hasOwnProperty.call(iv, "guaranteedCoverage")).toBe(false);
  });

  it("n too small for this alpha refuses both bounds and names the n it needs", () => {
    const y = [1, 2, 3, 4, 5];
    const iv = jackknifePlusInterval(constantMeanLoo(y, 0), 0.1);
    expect(iv.licensed).toBe(false);
    expect(iv.refusedBound).toBe("both");
    expect(iv.lower).toBe(Number.NEGATIVE_INFINITY);
    expect(iv.upper).toBe(Number.POSITIVE_INFINITY);
    expect(iv.minimumNForFiniteInterval).toBe(9);
  });

  it("jackknifeCensusFlags distinguishes a licensed interval from a both-bound refuse", () => {
    const ok = jackknifePlusInterval(constantMeanLoo([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 0), 0.1);
    expect(jackknifeCensusFlags(ok)).toEqual({ jackknifeLicensed: true, jackknifeRefusedBound: "none" });
    const small = jackknifePlusInterval(constantMeanLoo([1, 2, 3, 4, 5], 0), 0.1);
    expect(jackknifeCensusFlags(small)).toEqual({
      jackknifeLicensed: false,
      jackknifeRefusedBound: "both",
    });
  });

  it("minmax contains plus (nested, not just wider)", () => {
    const y = Array.from({ length: 30 }, (_, i) => i - 15);
    const loo = constantMeanLoo(y, 0);
    const plus = jackknifePlusInterval(loo, 0.1);
    const mm = jackknifeMinmaxInterval(loo, 0.1);
    expect(mm.lower).toBeLessThanOrEqual(plus.lower + 1e-12);
    expect(mm.upper).toBeGreaterThanOrEqual(plus.upper - 1e-12);
  });

  it("naive jackknife carries no finite-sample guarantee", () => {
    const y = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const naive = naiveJackknifeInterval(constantMeanLoo(y, 0), 0.1);
    expect(naive.coverageKind).toBe("no_finite_sample_guarantee");
    expect(Number.isNaN(naive.coverageFloor)).toBe(true);
  });
});

describe("olsLoo identity", () => {
  it("matches brute-force leave-one-out at a query point", () => {
    const train = [
      { x: 0, y: 1 },
      { x: 1, y: 2.1 },
      { x: 2, y: 2.9 },
      { x: 3, y: 4.2 },
      { x: 4, y: 5.0 },
    ];
    const queryX = 2.5;
    const analytic = olsLoo(train, queryX);
    for (let i = 0; i < train.length; i += 1) {
      const rest = train.filter((_, j) => j !== i);
      let sx = 0,
        sy = 0,
        sxx = 0,
        sxy = 0;
      for (const p of rest) {
        sx += p.x;
        sy += p.y;
        sxx += p.x * p.x;
        sxy += p.x * p.y;
      }
      const n = rest.length;
      const slope = (sxy - (sx * sy) / n) / (sxx - (sx * sx) / n);
      const intercept = sy / n - slope * (sx / n);
      expect(analytic.muLooAtQuery[i]!).toBeCloseTo(intercept + slope * queryX, 10);
    }
  });
});

describe("simulateJackknifePlusCoverage", () => {
  it("typical coverage sits nearer 1-α than the 1-2α floor (the misreport trap)", () => {
    const cell = simulateJackknifePlusCoverage({ n: 20, alpha: 0.1, trials: 250, seed: 17 });
    expect(cell.floor).toBeCloseTo(0.8, 12);
    expect(cell.nominal).toBeCloseTo(0.9, 12);
    expect(cell.licensedFraction).toBe(1);
    expect(cell.empiricalJackknifePlus).toBeGreaterThan(cell.floor);
    expect(cell.empiricalJackknifePlus).toBeGreaterThan(0.82);
    expect(cell.meanWidthPlus).toBeGreaterThan(0);
  });

  it("n below the finite threshold yields unlicensed infinite intervals, not fake cover", () => {
    const cell = simulateJackknifePlusCoverage({ n: 5, alpha: 0.1, trials: 40, seed: 2 });
    expect(cell.licensedFraction).toBe(0);
    expect(cell.meanWidthPlus).toBe(Number.POSITIVE_INFINITY);
    expect(cell.empiricalJackknifePlus).toBe(0);
  });
});

describe("nflScaleWidthDiagnostic", () => {
  it("80% PI at σ=14 is ±18 points — unusable on a 3-point spread", () => {
    const d = nflScaleWidthDiagnostic();
    expect(d.coverageFloor).toBeCloseTo(0.8, 12);
    expect(d.halfWidthGaussian80).toBeGreaterThan(17);
    expect(d.halfWidthGaussian80).toBeLessThan(19);
    expect(d.usableOnThreePointSpread).toBe(false);
    expect(d.sampleIsHeadToHeadNotGameLevel).toBe(true);
    expect(d.n).toBe(70);
    expect(d.finiteIntervalMinN).toBe(9);
  });
});

describe("split conformal vs Jackknife+", () => {
  it("split conformal reports 1-α and burns a calibration slice", () => {
    const train = Array.from({ length: 40 }, (_, i) => ({ x: i, y: i + (i % 3) - 1 }));
    const split = splitConformalInterval(train, 20, 0.1, 0.5);
    expect(split.coverageKind).toBe("exact_1_minus_alpha");
    expect(split.coverageFloor).toBeCloseTo(0.9, 12);
    expect(split.n).toBe(20);
  });

  it("CV+ keeps the 1-2α floor", () => {
    const train = Array.from({ length: 24 }, (_, i) => ({ x: i, y: 2 * i }));
    const cv = cvPlusInterval(train, 10, 0.1, 6);
    expect(cv.coverageKind).toBe("floor_1_minus_2alpha");
    expect(cv.coverageFloor).toBeCloseTo(0.8, 12);
  });
});

describe("non-exchangeable Jackknife+", () => {
  it("uniform weights recover the ordinary conformal quantile", () => {
    const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const { tildeW } = normalizeNexWeights(Array.from({ length: 10 }, () => 1));
    expect(weightedUpperOrderStat(v, tildeW, 0.1)).toBe(upperOrderStat(v, 0.1));
  });

  it("omitting d_i does not print a fake 1-2α robustness number", () => {
    const y = Array.from({ length: 20 }, (_, i) => i);
    const iv = nexJackknifePlusInterval(constantMeanLoo(y, 0), 0.1, { rho: 0.95 });
    expect(iv.tvDistancesSupplied).toBe(false);
    expect(iv.tvPenalty).toBeNull();
    expect(Number.isNaN(iv.coverageFloor)).toBe(true);
    expect(iv.exchangeabilityRequired).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(iv, "guaranteedCoverage")).toBe(false);
    expect(UNCONDITIONAL_JACKKNIFE_PLUS_FLOOR_REASON).toMatch(/Omitting d_TV is not d_TV=0/);
    expect(UNCONDITIONAL_JACKKNIFE_PLUS_FLOOR_REASON).toMatch(/Nex Thm 5/);
  });

  it("supplied d_i degrade the floor by Σ ŵ_i d_i", () => {
    const n = 12;
    const y = Array.from({ length: n }, (_, i) => i);
    const d = Array.from({ length: n }, () => 0.1);
    const iv = nexJackknifePlusInterval(constantMeanLoo(y, 0), 0.1, { tvDistances: d });
    expect(iv.tvDistancesSupplied).toBe(true);
    expect(iv.coverageKind).toBe("floor_1_minus_2alpha_minus_tv");
    const { tildeW } = normalizeNexWeights(Array.from({ length: n }, () => 1));
    const expected = nexCoverageFloor(0.1, tildeW, d);
    expect(iv.coverageFloor).toBeCloseTo(expected!, 12);
    expect(iv.coverageFloor).toBeLessThan(coverageFloor(0.1));
  });

  it("exponential weights put more mass on recent points", () => {
    const w = exponentialDecayWeights(4, 0.5);
    expect(w[0]!).toBeCloseTo(0.5 ** 4, 12);
    expect(w[3]!).toBeCloseTo(0.5, 12);
    expect(w[3]!).toBeGreaterThan(w[0]!);
  });

  it("bounded-drift gap is 2ε/(1-ρ) and does not invent ε", () => {
    expect(boundedDriftCoverageGap(0.01, 0.9)).toBeCloseTo(0.2, 12);
    expect(changepointCoverageGap(0.9, 2)).toBeCloseTo(0.81, 12);
  });
});

describe("compareRecipesAtNflScale", () => {
  it("JK+ keeps n=70 at floor 0.80; split burns half at 0.90", () => {
    const rows = compareRecipesAtNflScale({ n: 70, alpha: 0.1, sigma: 14, seed: 5 });
    const plus = rows.find((r) => r.recipe === "jackknife-plus")!;
    const split = rows.find((r) => r.recipe === "split-conformal")!;
    expect(plus.nUsed).toBe(70);
    expect(plus.coverageFloor).toBeCloseTo(0.8, 12);
    expect(plus.licensed).toBe(true);
    expect(split.nUsed).toBe(35);
    expect(split.coverageFloor).toBeCloseTo(0.9, 12);
    const mm = rows.find((r) => r.recipe === "jackknife-minmax")!;
    expect(mm.width).toBeGreaterThanOrEqual(plus.width - 1e-12);
  });
});
