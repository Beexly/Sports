import { describe, expect, it } from "vitest";
import {
  bystanderEquityDonation,
  calibrateLambdaFromLadder,
  requiredDeltaEV,
  varianceBudgetPass,
} from "./tournament-variance";

describe("tournament-variance", () => {
  it("rejects variance without enough expected-score gain", () => {
    expect(varianceBudgetPass(0.5, 10, 0.1)).toBe(false); // 0.5 < 1.0
    expect(varianceBudgetPass(1.5, 10, 0.1)).toBe(true); // 1.5 >= 1.0
  });

  it("boundary: ΔEV exactly covering the penalty passes", () => {
    expect(varianceBudgetPass(2, 10, 0.2)).toBe(true);
  });

  it("zero or negative ΔVar reduces to the plain EV check", () => {
    expect(varianceBudgetPass(0, 0, 0.5)).toBe(true);
    expect(varianceBudgetPass(-0.1, 0, 0.5)).toBe(false);
  });

  it("calibrates λ from a concave payout ladder", () => {
    // concave ladder: f(s) = sqrt(s)
    const lambda = calibrateLambdaFromLadder((s) => Math.sqrt(Math.max(s, 0)), 100, 1);
    expect(lambda).toBeGreaterThan(0);
    // linear ladder -> zero concavity -> zero lambda
    expect(calibrateLambdaFromLadder((s) => 2 * s, 100, 1)).toBeCloseTo(0, 10);
  });

  it("bystander donation is positive for bad variance", () => {
    expect(bystanderEquityDonation(80, 100)).toBeCloseTo(20, 12); // donates 20
    expect(bystanderEquityDonation(110, 100)).toBeCloseTo(-10, 12); // extracts 10
  });

  it("required ΔEV scales linearly with ΔVar", () => {
    expect(requiredDeltaEV(10, 0.2)).toBeCloseTo(2, 12);
    expect(requiredDeltaEV(0, 0.2)).toBe(0);
    expect(() => varianceBudgetPass(1, 1, -0.1)).toThrow();
  });
});
