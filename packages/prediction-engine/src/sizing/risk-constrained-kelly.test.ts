import { describe, expect, it } from "vitest";
import {
  plainKelly,
  riskAversionLambda,
  solveRiskConstrainedKelly,
} from "./risk-constrained-kelly";

describe("risk-constrained-kelly", () => {
  it("λ from the (α, β) pair matches the paper's example shape", () => {
    const lam = riskAversionLambda(0.7, 0.05);
    expect(lam).toBeCloseTo(Math.log(0.05) / Math.log(0.7), 12);
    expect(lam).toBeGreaterThan(0);
    expect(() => riskAversionLambda(1.2, 0.05)).toThrow();
  });

  it("RCK ≤ plain Kelly (the risk constraint binds or ties)", () => {
    const p = 0.6;
    const odds = 2.0;
    const rck = solveRiskConstrainedKelly(p, odds, riskAversionLambda(0.7, 0.05));
    expect(rck).toBeLessThanOrEqual(plainKelly(p, odds) + 1e-9);
    expect(rck).toBeGreaterThan(0);
  });

  it("no edge -> zero stake", () => {
    expect(solveRiskConstrainedKelly(0.4, 2.0, 5)).toBeCloseTo(0, 6);
    expect(plainKelly(0.4, 2.0)).toBe(0);
  });

  it("tighter drawdown tolerance shrinks the stake", () => {
    const loose = solveRiskConstrainedKelly(0.6, 2.0, riskAversionLambda(0.7, 0.2));
    const tight = solveRiskConstrainedKelly(0.6, 2.0, riskAversionLambda(0.9, 0.01));
    expect(tight).toBeLessThanOrEqual(loose + 1e-9);
  });

  it("respects the cap", () => {
    const f = solveRiskConstrainedKelly(0.8, 3.0, 2, 0.1);
    expect(f).toBeLessThanOrEqual(0.1 + 1e-9);
  });

  it("rejects invalid inputs", () => {
    expect(() => solveRiskConstrainedKelly(0, 2, 5)).toThrow();
    expect(() => solveRiskConstrainedKelly(0.6, 1, 5)).toThrow();
    expect(() => solveRiskConstrainedKelly(0.6, 2, 0)).toThrow();
  });
});
