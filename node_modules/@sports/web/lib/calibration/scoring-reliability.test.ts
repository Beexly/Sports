import { describe, expect, it } from "vitest";
import { computeCalibration } from "@/lib/calibration/compute";
import { buildScoringReliabilityReport } from "@/lib/calibration/scoring-reliability";

describe("buildScoringReliabilityReport", () => {
  it("summarizes Brier score, ECE, max gap, and non-empty reliability buckets", () => {
    // Buckets must clear the min-publish sample floor (>= 30 settled/bucket) to
    // appear in the reliability diagram and feed the ECE / max-gap aggregates —
    // a thin bucket (e.g. 2 picks reading a raw single-sample rate) is withheld.
    const mk = (confidence: number, id: string, result: "WIN" | "LOSS") => ({ confidence, id, result });
    const calibration = computeCalibration([
      ...Array.from({ length: 30 }, (_, i) => mk(65, `mid-${i}`, i < 15 ? "WIN" : "LOSS")),
      ...Array.from({ length: 30 }, (_, i) => mk(75, `high-${i}`, i < 24 ? "WIN" : "LOSS")),
    ]);

    const report = buildScoringReliabilityReport({ ...calibration, isCollecting: false });

    expect(report).toMatchObject({
      draftOnly: true,
      priced: false,
      sampleSize: 60,
      status: "READY",
    });
    expect(report.brierScore).toBeTypeOf("number");
    expect(report.expectedCalibrationError).toBeTypeOf("number");
    expect(report.maximumCalibrationError).toBeTypeOf("number");
    // The max gap can never be below the sample-weighted mean gap.
    expect(report.maximumCalibrationError!).toBeGreaterThanOrEqual(report.expectedCalibrationError!);
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
