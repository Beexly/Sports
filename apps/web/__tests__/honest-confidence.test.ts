import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { committedProbabilityDisplay } from "@/lib/calibration/honest-confidence";

describe("committedProbabilityDisplay", () => {
  it("withholds missing, invalid, or gated probabilities", () => {
    expect(committedProbabilityDisplay(null, true)).toBeNull();
    expect(committedProbabilityDisplay(-0.01, true)).toBeNull();
    expect(committedProbabilityDisplay(1.01, true)).toBeNull();
    expect(committedProbabilityDisplay(0.61, false)).toBeNull();
  });

  it("renders only a valid committed probability", () => {
    expect(committedProbabilityDisplay(0.64, true)).toEqual({
      pct: 64,
      label: "Moderate",
    });
  });
});

describe("public probability wiring", () => {
  const root = resolve(__dirname, "..");

  it("only a receipt-committed model probability can reach the public calibrated field", () => {
    const src = readFileSync(resolve(root, "app/api/picks/route.ts"), "utf8");
    expect(src).not.toContain("getPublicCalibrator");
    expect(src).toContain("proofReceipt: { select: { contentHash: true, modelProb: true } }");
    expect(src).toContain("committedProbabilityDisplay");
    expect(src).toContain("gates.canApplyCalibrationAdjustments");
    expect(src).toContain("confidenceCalibrated:");
  });

  it("the pick card labels a committed probability when present", () => {
    const src = readFileSync(resolve(root, "components/picks/pick-card.tsx"), "utf8");
    expect(src).toContain("calibrated");
    expect(src).toContain("calibrated.label");
  });
});
