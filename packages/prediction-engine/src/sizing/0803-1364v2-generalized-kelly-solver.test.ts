import { describe, it, expect } from "vitest";
import {
  laplaceSmoothed,
  lMinGatePasses,
  solveGeneralizedKelly,
  independentKellyFractions,
  unsaturatedLogGrowth,
  correlationHaircut,
  sizeSlate,
} from "./0803-1364v2-generalized-kelly-solver.js";

describe("laplaceSmoothed", () => {
  it("shrinks raw win rates toward 0.5", () => {
    expect(laplaceSmoothed(8, 10)).toBeCloseTo(9 / 12, 10);
    expect(laplaceSmoothed(8, 10)).toBeLessThan(0.8);
    expect(laplaceSmoothed(0, 0)).toBe(0.5);
  });
});

describe("lMinGatePasses", () => {
  it("refuses tiny backtests and passes huge ones", () => {
    expect(lMinGatePasses(5, 0.6, 2.0)).toBe(false);
    expect(lMinGatePasses(100000, 0.6, 2.0)).toBe(true);
  });
  it("refuses non-positive edge regardless of N", () => {
    expect(lMinGatePasses(100000, 0.4, 2.0)).toBe(false);
  });
});

describe("solveGeneralizedKelly", () => {
  const picks = [
    { p: 0.6, decimalOdds: 2.0 },
    { p: 0.55, decimalOdds: 2.2 },
    { p: 0.35, decimalOdds: 2.5 }, // negative edge -> clamped to 0
  ];
  it("matches the unsaturated independent solution when uncorrelated", () => {
    const f = solveGeneralizedKelly(picks);
    // Even with independent outcomes, M has off-diagonal e_i*e_j (simultaneous
    // bets couple through the log), so the active 2x2 system is solved directly:
    // e = [0.2, 0.21], M = [[1, 0.042], [0.042, 1.242]].
    const e0 = 0.2;
    const e1 = 0.21;
    const m00 = 1.0;
    const m11 = 1.242;
    const m01 = e0 * e1;
    const det = m00 * m11 - m01 * m01;
    const expected0 = (e0 * m11 - e1 * m01) / det;
    const expected1 = (e1 * m00 - e0 * m01) / det;
    expect(f[0]).toBeCloseTo(expected0, 10);
    expect(f[1]).toBeCloseTo(expected1, 10);
    expect(f[2]).toBe(0);
  });
  it("is nonnegative and conservative under correlation", () => {
    const corr = [
      [1, 0.7, 0.7],
      [0.7, 1, 0.7],
      [0.7, 0.7, 1],
    ];
    const gen = solveGeneralizedKelly(picks, corr);
    const ind = independentKellyFractions(picks);
    expect(gen.every((x) => x >= 0)).toBe(true);
    // generalized solver maximizes the unsaturated objective by construction
    expect(unsaturatedLogGrowth(gen, picks, corr)).toBeGreaterThanOrEqual(
      unsaturatedLogGrowth(ind, picks, corr) - 1e-9,
    );
    const total = (a: number[]) => a.reduce((s, x) => s + x, 0);
    expect(total(gen)).toBeLessThan(total(ind));
  });
});

describe("correlationHaircut", () => {
  it("is 1 for uncorrelated slates, 1/lambda_max otherwise", () => {
    expect(correlationHaircut([[1, 0], [0, 1]])).toBeCloseTo(1, 6);
    expect(correlationHaircut([[1, 0.8], [0.8, 1]])).toBeCloseTo(1 / 1.8, 3);
  });
});

describe("sizeSlate", () => {
  it("sizes a clean slate and reports positive expected growth", () => {
    const r = sizeSlate([{ p: 0.6, decimalOdds: 2.0, backtestN: 100000 }]);
    expect(r.sized).toBe(true);
    expect(r.fractions[0]).toBeGreaterThan(0);
    expect(r.expectedLogGrowth).toBeGreaterThan(0);
  });
  it("refuses a slate that fails the L_min gate", () => {
    const r = sizeSlate([{ p: 0.6, decimalOdds: 2.0, backtestN: 3 }]);
    expect(r.sized).toBe(false);
    expect(r.reason).toContain("L_min");
  });
  it("Laplace-smoothing path shrinks aggressive raw probabilities", () => {
    const raw = sizeSlate([{ p: 0.9, decimalOdds: 2.0, backtestN: 100000 }]);
    const smooth = sizeSlate([{ p: 0.9, decimalOdds: 2.0, backtestN: 100000 }], undefined, [9], [10]);
    expect(smooth.fractions[0]!).toBeLessThan(raw.fractions[0]!);
  });
});
