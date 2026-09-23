// Tests for 2608.23393 KellyBoost (additive; not wired into any publish path).
import { describe, it, expect } from "vitest";
import {
  softmaxAllocation,
  logGrowthLoss,
  applyCrraDial,
  looEnsemble,
  meanLogGrowth,
  maxDrawdown,
  bootstrapProbPositive,
  kellyBoostGatePasses,
} from "./2608-23393-kellyboost.js";

describe("softmaxAllocation", () => {
  it("is a distribution over picks plus cash", () => {
    const w = softmaxAllocation([1, 2, 0]);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(w[1]!).toBeGreaterThan(w[0]!);
    expect(w[0]!).toBeGreaterThan(w[2]!);
  });
});

describe("logGrowthLoss", () => {
  it("rewards growth-optimal weights", () => {
    const slates = [
      [0.5, -0.2],
      [0.3, 0.4],
    ];
    const concentrated = logGrowthLoss([0.9, 0.1], slates);
    const cash = logGrowthLoss([0, 1], slates);
    expect(concentrated).toBeLessThan(cash);
  });
});

describe("applyCrraDial", () => {
  it("shrinks pick weights toward cash", () => {
    const dialed = applyCrraDial([0.4, 0.4, 0.2], 1);
    expect(dialed[0]).toBeCloseTo(0.2, 12);
    expect(dialed[1]).toBeCloseTo(0.2, 12);
    expect(dialed[2]).toBeCloseTo(0.6, 12);
    expect(applyCrraDial([0.4, 0.4, 0.2], 0)).toEqual([0.4, 0.4, 0.2]);
  });
});

describe("looEnsemble", () => {
  it("averages member weight vectors", () => {
    expect(
      looEnsemble([
        [0.5, 0.5],
        [0.7, 0.3],
      ]),
    ).toEqual([0.6, 0.4]);
  });
});

describe("meanLogGrowth / maxDrawdown", () => {
  it("measures growth and drawdown", () => {
    expect(meanLogGrowth([0.1, 0.1])).toBeCloseTo(Math.log(1.1), 12);
    expect(maxDrawdown([0.2, -0.1])).toBeCloseTo(1 - 1.08 / 1.2, 10);
  });
});

describe("bootstrapProbPositive", () => {
  it("is near 1 for clearly positive deltas", () => {
    const deltas = new Array(30).fill(0.05);
    expect(bootstrapProbPositive(deltas, 200, 42)).toBe(1);
    expect(bootstrapProbPositive(new Array(30).fill(-0.05), 200, 42)).toBe(0);
  });
});

describe("kellyBoostGatePasses", () => {
  it("requires +0.05 log-growth, bounded drawdown, confident bootstrap", () => {
    const kb = Array.from({ length: 40 }, (_, i) => (i % 4 === 0 ? -0.05 : 0.12));
    const base = Array.from({ length: 40 }, (_, i) => (i % 4 === 0 ? -0.05 : 0.03));
    const gate = kellyBoostGatePasses(kb, base, 500, 7);
    expect(gate.logGrowthLift).toBeGreaterThan(0.05);
    expect(gate.mddRatio).toBeLessThanOrEqual(1.2);
    expect(gate.bootstrapProb).toBeGreaterThanOrEqual(0.8);
    expect(gate.passes).toBe(true);
    // Flat-identical series: no lift -> reject.
    expect(kellyBoostGatePasses(base, base, 500, 7).passes).toBe(false);
  });
});
