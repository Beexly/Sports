import { describe, it, expect } from "vitest";
import {
  expectedCalibrationError,
  worstGroupViolation,
  approachabilityCorrection,
  applyGroupCorrection,
} from "@/lib/calibration/sequential-calibration-games";

// ============================================================
// arXiv 2509.04203v1 — sequential calibration games. Additive.
// ============================================================

describe("sequential calibration games — 2509.04203v1", () => {
  it("expectedCalibrationError is 0 for perfect forecasts", () => {
    expect(expectedCalibrationError([0, 1, 0, 1], [0, 1, 0, 1])).toBe(0);
    expect(expectedCalibrationError([], [])).toBe(0);
  });

  it("expectedCalibrationError detects miscalibration", () => {
    // Always predict 0.9, events happen 50%: ECE = 0.4.
    const p = Array(10).fill(0.9);
    const a = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0] as Array<0 | 1>;
    expect(expectedCalibrationError(p, a)).toBeCloseTo(0.4, 10);
  });

  it("worstGroupViolation finds the miscalibrated subgroup", () => {
    const predicted = [0.9, 0.9, 0.5, 0.5];
    const actual = [0, 0, 1, 0] as Array<0 | 1>;
    const groups = ["primetime", "primetime", "other", "other"];
    const worst = worstGroupViolation(predicted, actual, groups);
    expect(worst.group).toBe("primetime");
    expect(worst.ece).toBeCloseTo(0.9, 10);
  });

  it("approachabilityCorrection pushes against the violation", () => {
    expect(approachabilityCorrection(0.2, 0.5)).toBeCloseTo(-0.1, 10);
    expect(approachabilityCorrection(0, 0.5)).toBe(0);
  });

  it("applyGroupCorrection only touches the violating group", () => {
    const out = applyGroupCorrection(
      [0.9, 0.5],
      ["primetime", "other"],
      "primetime",
      -0.1,
    );
    expect(out[0]).toBeCloseTo(0.8, 10);
    expect(out[1]).toBe(0.5);
  });

  it("applyGroupCorrection clamps to [0,1]", () => {
    const out = applyGroupCorrection([0.05], ["g"], "g", -0.5);
    expect(out[0]).toBe(0);
  });
});
