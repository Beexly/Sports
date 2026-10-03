import { describe, expect, it } from "vitest";
import {
  invLogit,
  logit,
  skepticProb,
  skepticStakeFraction,
  skepticThetaStep,
} from "./skeptic-overlay";

describe("skeptic-overlay", () => {
  it("zero theta returns the market price", () => {
    expect(skepticProb(0.6, [1, 2], [0, 0])).toBeCloseTo(0.6, 10);
    expect(skepticProb(0.6, [], [])).toBeCloseTo(0.6, 10);
  });

  it("positive feature shift raises the corrected probability", () => {
    expect(skepticProb(0.5, [1], [0.5])).toBeGreaterThan(0.5);
    expect(skepticProb(0.5, [1], [-0.5])).toBeLessThan(0.5);
  });

  it("logit/invLogit are inverses", () => {
    expect(invLogit(logit(0.3))).toBeCloseTo(0.3, 12);
  });

  it("stake abstains below threshold and caps above", () => {
    expect(skepticStakeFraction(0.51, 0.5, 0.05)).toBe(0); // tiny edge
    const big = skepticStakeFraction(0.9, 0.5, 0.05, 0.25);
    expect(big).toBeCloseTo(0.25, 12); // capped
    expect(skepticStakeFraction(0.1, 0.5, 0.05, 0.25)).toBeCloseTo(-0.25, 12);
  });

  it("theta step moves toward the observed outcome", () => {
    const t0 = [0];
    const t1 = skepticThetaStep(t0, [1], 0.5, 1, 0.1);
    expect(t1[0]).toBeGreaterThan(0); // win pushes theta up
    const t2 = skepticThetaStep(t0, [1], 0.5, 0, 0.1);
    expect(t2[0]).toBeLessThan(0);
  });

  it("rejects invalid market prices", () => {
    expect(() => skepticProb(0, [1], [1])).toThrow();
    expect(() => skepticProb(1, [1], [1])).toThrow();
  });
});
