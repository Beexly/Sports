// Tests for decision/1806-05293-multivariate-slate-sizer.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  pickReturn,
  sampleCorrelatedOutcomes,
  approximateWarmStart,
  solveMultivariateKelly,
  solveMultivariateKellyOnScenarios,
  correlationGuardrailHolds,
  shrinkageCorrelation,
  slateSizerGatePasses,
} from "./1806-05293-multivariate-slate-sizer.js";

const PICKS = [
  { id: "a", p: 0.6, odds: 2.0 },
  { id: "b", p: 0.58, odds: 2.0 },
  { id: "c", p: 0.55, odds: 2.1 },
];
const IDENT = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

describe("pickReturn / sampleCorrelatedOutcomes (1806.05293)", () => {
  it("pays decimal odds on wins, -1 on losses", () => {
    expect(pickReturn(PICKS[0]!, true)).toBeCloseTo(1.0, 10);
    expect(pickReturn(PICKS[0]!, false)).toBe(-1);
  });
  it("samples near-independent outcomes under the identity correlation", () => {
    const sc = sampleCorrelatedOutcomes(PICKS, IDENT, 4000, 11);
    const rateA = sc.filter((s) => s[0]).length / sc.length;
    expect(Math.abs(rateA - 0.6)).toBeLessThan(0.05);
  });
  it("induces co-movement under high correlation", () => {
    const corr = [
      [1, 0.9, 0],
      [0.9, 1, 0],
      [0, 0, 1],
    ];
    const sc = sampleCorrelatedOutcomes(PICKS, corr, 4000, 12);
    const agree = sc.filter((s) => s[0] === s[1]).length / sc.length;
    // Independent agreement would be ~0.6*0.58+0.4*0.42 = 0.516; correlated is higher.
    expect(agree).toBeGreaterThan(0.6);
  });
});

describe("solveMultivariateKelly", () => {
  it("warm start is only an initializer: the exact solver improves on it", () => {
    const { fractions, growth, warmStart } = solveMultivariateKelly(PICKS, IDENT, 3000, 13, 60);
    const sum = fractions.reduce((a, b) => a + b, 0);
    expect(sum).toBeLessThanOrEqual(1 + 1e-9);
    expect(fractions.every((f) => f >= 0)).toBe(true);
    expect(growth).toBeGreaterThan(-Infinity);
    // The served allocation is the exact solution, never the raw warm start object.
    expect(fractions).not.toBe(warmStart);
  });
  it("shrinks allocations when correlation rises (guardrail, exact scenarios)", () => {
    // Deterministic: exact 4-cell joint distributions (counts out of 2000)
    // for two SYMMETRIC +EV picks — same marginals, independent vs 0.85
    // correlated. No sampling, so the comparison is exact. Symmetry forces
    // an even split, and the higher correlation must shrink both fractions
    // (less diversification benefit) — the guardrail property itself.
    const picks = [
      { id: "a", p: 0.6, odds: 2.0 },
      { id: "b", p: 0.6, odds: 2.0 },
    ];
    // P(1,1) = 0.36 + 0.85*sqrt(0.24*0.24) = 0.564 under 0.85 correlation.
    const cells: Array<[boolean, boolean, number, number]> = [
      [true, true, 0.36, 0.564],
      [true, false, 0.24, 0.036],
      [false, true, 0.24, 0.036],
      [false, false, 0.16, 0.364],
    ];
    const indep: boolean[][] = [];
    const corr: boolean[][] = [];
    for (const [a, b, pIndep, pCorr] of cells) {
      for (let i = 0; i < Math.round(pIndep * 2000); i++) indep.push([a, b]);
      for (let i = 0; i < Math.round(pCorr * 2000); i++) corr.push([a, b]);
    }
    const low = solveMultivariateKellyOnScenarios(picks, indep, 200).fractions;
    const high = solveMultivariateKellyOnScenarios(picks, corr, 200).fractions;
    expect(correlationGuardrailHolds(low, high)).toBe(true);
    // Strict shrinkage on both picks (not just the predicate).
    expect(high[0]!).toBeLessThan(low[0]!);
    expect(high[1]!).toBeLessThan(low[1]!);
    // Symmetry: the even split is preserved exactly.
    expect(high[0]!).toBeCloseTo(high[1]!, 10);
    expect(low[0]!).toBeCloseTo(low[1]!, 10);
  });
});

describe("shrinkageCorrelation", () => {
  it("shrinks off-diagonals toward zero, keeps unit diagonal", () => {
    const raw = [
      [1, 0.8],
      [0.8, 1],
    ];
    const s = shrinkageCorrelation(raw, 0.5);
    expect(s[0]![0]).toBe(1);
    expect(s[0]![1]).toBeCloseTo(0.4, 10);
    expect(shrinkageCorrelation(raw, 1)[0]![1]).toBe(0);
  });
});

describe("slateSizerGatePasses", () => {
  it("encodes the >=5% growth / no-worse-drawdown gate", () => {
    expect(slateSizerGatePasses(1.051, 1.0, 0.2, 0.2)).toBe(true);
    expect(slateSizerGatePasses(1.049, 1.0, 0.2, 0.2)).toBe(false);
    expect(slateSizerGatePasses(1.1, 1.0, 0.21, 0.2)).toBe(false);
  });
});
