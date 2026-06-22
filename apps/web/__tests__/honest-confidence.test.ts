import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Calibrator } from "@sports/prediction-engine";
import { honestConfidence } from "@/lib/calibration/honest-confidence";

/**
 * Thread 2 — honest calibrated confidence for the public path.
 * The mapping is pure; we drive it with stub calibrators so the contract is
 * exact: calibration is applied ONLY when the gate is on AND the calibrator is
 * active, and the output is the calibrated probability + its honest label.
 */

function stub(isActive: boolean, probability: number): Calibrator {
  return {
    isActive,
    sampleSize: 393,
    minSample: 100,
    rawEce: 0.198,
    calibratedEce: 0.045,
    inactiveReason: isActive ? "" : "settled sample below minimum",
    apply: () => ({ probability, calibrated: isActive }),
  } as unknown as Calibrator;
}

describe("honestConfidence", () => {
  it("returns null when the calibrator is inactive (falls back to raw)", () => {
    expect(honestConfidence(82, stub(false, 0.64), true)).toBeNull();
  });

  it("returns null when the gate is off (canApply=false)", () => {
    expect(honestConfidence(82, stub(true, 0.64), false)).toBeNull();
  });

  it("returns null when confidence is hidden (raw null)", () => {
    expect(honestConfidence(null, stub(true, 0.64), true)).toBeNull();
  });

  it("maps to the calibrated probability + honest label when active", () => {
    const r = honestConfidence(82, stub(true, 0.64), true);
    expect(r).not.toBeNull();
    expect(r!.pct).toBe(64);
    expect(r!.label).toBe("Moderate"); // 60–69 band
  });

  it("labels track the calibrated value, not the raw input", () => {
    // Raw 95 but calibrator says 0.55 → honest label is Lean, not Strong.
    const r = honestConfidence(95, stub(true, 0.55), true);
    expect(r!.pct).toBe(55);
    expect(r!.label).toBe("Lean");
  });
});

describe("Thread 2 wiring is in place", () => {
  const root = resolve(__dirname, "..");
  it("the picks API attaches confidenceCalibrated via the audited gate", () => {
    const src = readFileSync(resolve(root, "app/api/picks/route.ts"), "utf8");
    expect(src).toContain("getPublicCalibrator");
    expect(src).toContain("gates.canApplyCalibrationAdjustments");
    expect(src).toContain("confidenceCalibrated:");
  });

  it("the pick card renders the calibrated label when present", () => {
    const src = readFileSync(resolve(root, "components/picks/pick-card.tsx"), "utf8");
    expect(src).toContain("calibrated");
    expect(src).toContain("calibrated.label");
  });
});
