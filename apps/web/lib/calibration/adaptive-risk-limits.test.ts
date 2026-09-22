import { describe, it, expect } from "vitest";
import {
  volatilityBucket,
  drawdownBucket,
  adaptiveRiskLimit,
  smoothRiskLimit,
  DEFAULT_REGIME_MULTIPLIERS,
} from "@/lib/calibration/adaptive-risk-limits";

// ============================================================
// arXiv 2504.01781 — adaptive risk limits. Additive only.
// ============================================================

describe("adaptive risk limits — 2504.01781", () => {
  it("volatilityBucket thresholds", () => {
    expect(volatilityBucket(0.1)).toBe("calm");
    expect(volatilityBucket(0.3)).toBe("elevated");
    expect(volatilityBucket(0.6)).toBe("turbulent");
  });

  it("drawdownBucket thresholds", () => {
    expect(drawdownBucket(0.01)).toBe("none");
    expect(drawdownBucket(0.05)).toBe("shallow");
    expect(drawdownBucket(0.1)).toBe("deep");
  });

  it("adaptiveRiskLimit tightens in worse regimes", () => {
    const calm = adaptiveRiskLimit(100, "calm", "none");
    const bad = adaptiveRiskLimit(100, "turbulent", "deep");
    expect(calm).toBeGreaterThan(100);
    expect(bad).toBeLessThan(100);
    expect(bad).toBe(100 * DEFAULT_REGIME_MULTIPLIERS.turbulent.deep);
  });

  it("smoothRiskLimit caps the weekly step", () => {
    expect(smoothRiskLimit(100, 200, 0.25)).toBe(125);
    expect(smoothRiskLimit(100, 0, 0.25)).toBe(75);
    expect(smoothRiskLimit(100, 110, 0.25)).toBe(110);
    expect(smoothRiskLimit(0, 80)).toBe(80);
  });

  it("smoothRiskLimit converges over repeated applications", () => {
    let l = 100;
    for (let i = 0; i < 20; i++) l = smoothRiskLimit(l, 30, 0.25);
    expect(l).toBeCloseTo(30, 6);
  });
});
