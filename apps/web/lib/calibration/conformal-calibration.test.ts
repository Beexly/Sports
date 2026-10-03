import { describe, expect, it } from "vitest";
import {
  CONFORMAL_METHODS,
  clipConformalAlpha,
  conformalQuantile,
  conformalRdPosture,
  mondrianResidualThresholds,
  residualNonconformity,
  splitConformalResidualThreshold,
} from "@/lib/calibration/conformal-calibration";

describe("conformal methods inventory", () => {
  it("lists core methods all defaultOff and not PROVEN unlocks", () => {
    expect(CONFORMAL_METHODS.length).toBeGreaterThanOrEqual(5);
    for (const m of CONFORMAL_METHODS) {
      expect(m.defaultOn).toBe(false);
      expect(m.unlocksProven).toBe(false);
      expect(m.raisesRes).toBe(false);
    }
  });

  it("conformalQuantile uses finite-sample rank", () => {
    const scores = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    // n=10, alpha=0.1 → ceil(0.9*11)-1 = ceil(9.9)-1 = 9 → index 9 → 1.0
    expect(conformalQuantile(scores, 0.1)).toBe(1.0);
    expect(splitConformalResidualThreshold(scores, 0.1)).toBe(1.0);
    expect(conformalQuantile([], 0.1)).toBe(Number.POSITIVE_INFINITY);
  });

  it("residual and Mondrian + alpha clip", () => {
    expect(residualNonconformity(0.8, 0)).toBeCloseTo(0.8);
    expect(clipConformalAlpha(0.001)).toBe(0.02);
    expect(clipConformalAlpha(0.9)).toBe(0.4);
    const th = mondrianResidualThresholds(
      [
        ...Array.from({ length: 25 }, () => ({ group: "a", residual: 0.2 })),
        { group: "thin", residual: 0.1 },
      ],
      0.1,
      20,
    );
    expect(th.a).toBeCloseTo(0.2);
    expect(th.thin).toBe(Number.POSITIVE_INFINITY);
  });

  it("posture reports abstain flag off by default", () => {
    const p = conformalRdPosture({});
    expect(p.product.conformalAbstainEnabled).toBe(false);
    expect(p.product.unlocksProven).toBe(false);
  });
});
