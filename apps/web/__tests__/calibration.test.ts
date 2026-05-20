import { describe, it, expect } from "vitest";
import { computeCalibrationProposals } from "@/lib/calibration/compute";

describe("computeCalibrationProposals (stub)", () => {
  it("returns no proposals until restored", () => {
    expect(computeCalibrationProposals()).toEqual([]);
  });
});
