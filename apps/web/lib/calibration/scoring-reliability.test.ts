import { describe, expect, it } from "vitest";
import { computeCalibration } from "@/lib/calibration/compute";
import { buildScoringReliabilityReport } from "@/lib/calibration/scoring-reliability";

describe("buildScoringReliabilityReport", () => {
  it("summarizes Brier score, ECE, max gap, and non-empty reliability buckets", () => {
    const calibration = computeCalibration([
      { confidence: 60, id: "low-win", result: "WIN" },
      { confidence: 60, id: "low-loss", result: "LOSS" },
      { confidence: 70, id: "high-win-1", result: "WIN" },
      { confidence: 70, id: "high-win-2", result: "WIN" },
    ]);

    const report = buildScoringReliabilityReport({ ...calibration, isCollecting: false });

    expect(report).toMatchObject({
      brierScore: 0.175,
      draftOnly: true,
      expectedCalibrationError: 0.2,
      maximumCalibrationError: 0.3,
      priced: false,
      sampleSize: 4,
      status: "READY",
    });
    expect(report.reliabilityPoints).toHaveLength(2);
    expect(report.reliabilityPoints.map((point) => point.label)).toEqual(["60-69", "70-79"]);
  });

  it("stays collecting when the public report is empty or gated", () => {
    const calibration = computeCalibration([]);

    const report = buildScoringReliabilityReport({ ...calibration, isCollecting: true });

    expect(report.status).toBe("COLLECTING");
    expect(report.reliabilityPoints).toEqual([]);
    expect(report.expectedCalibrationError).toBeNull();
    expect(report.maximumCalibrationError).toBeNull();
    expect(report.note).toContain("gated");
  });
});
