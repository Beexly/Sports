import { describe, expect, it } from "vitest";
import {
  residualInfo,
  adaptiveLambda,
  mixTowardMarket,
  runResidualCapital,
  MIN_LAMBDA,
  MAX_LAMBDA,
} from "./residual-info.js";
import { DEFAULT_DESIGN } from "./synthetic-nb.js";
import { sideAdaptiveIncrement } from "./mve-eprocess.js";

describe("residualInfo proxy", () => {
  it("is 0 when p = m = h", () => {
    expect(residualInfo(0.5, 0.5, 0.5)).toBe(0);
  });
  it("is positive when model disagrees with market", () => {
    expect(residualInfo(0.8, 0.5, 0.5)).toBeGreaterThan(0);
  });
  it("is deterministic", () => {
    expect(residualInfo(0.7, 0.4, 0.55)).toBe(residualInfo(0.7, 0.4, 0.55));
  });
});

describe("adaptiveLambda", () => {
  it("stays inside [MIN, MAX]", () => {
    for (const i of [0, 0.5, 2, 5]) {
      for (const dd of [0, 0.2, 0.9]) {
        const lam = adaptiveLambda(i, dd);
        expect(lam).toBeGreaterThanOrEqual(MIN_LAMBDA);
        expect(lam).toBeLessThanOrEqual(MAX_LAMBDA);
      }
    }
  });
  it("drawdown cuts lambda", () => {
    expect(adaptiveLambda(1, 0.8)).toBeLessThan(adaptiveLambda(1, 0));
  });
});

describe("mixTowardMarket", () => {
  it("is between p and m", () => {
    const q = mixTowardMarket(0.9, 0.5, 0);
    expect(q).toBeGreaterThan(0.5);
    expect(q).toBeLessThan(0.9);
  });
});

describe("increment with max lambda", () => {
  it("miss increment is >= 0.7 at lambda 0.3", () => {
    const inc = sideAdaptiveIncrement({ qBet: 0.9, mBet: 0.5, hit: false, lambda: 0.3 });
    expect(inc).toBeGreaterThanOrEqual(0.7);
  });
});

describe("runResidualCapital", () => {
  it("open-loop terminal is 1", () => {
    const p = runResidualCapital({ seed: 3, planted: false, openLoop: true, design: DEFAULT_DESIGN });
    expect(p.terminal).toBeCloseTo(1, 12);
    expect(p.maxCapital).toBe(1);
  });
  it("is deterministic", () => {
    const a = runResidualCapital({ seed: 9, planted: true, design: DEFAULT_DESIGN });
    const b = runResidualCapital({ seed: 9, planted: true, design: DEFAULT_DESIGN });
    expect(a).toEqual(b);
  });
});
