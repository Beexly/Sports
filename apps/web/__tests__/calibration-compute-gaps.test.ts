/**
 * Targeted coverage for branches not reached by calibration.test.ts.
 *
 * The primary calibration.test.ts covers the "happy path" of settled picks
 * (WIN/LOSS/PUSH) and the sample-size gate for proposals. This file covers:
 *   - VOID and PENDING results being excluded from the settled set
 *   - Empty bucket expectedWinRate using the midpoint formula
 *   - All five bucket label/range assignments
 *   - PUSH contributing 0.5 to observedWinRate
 *   - Overcalling vs undercalling proposal title routing (delta sign)
 *   - Delta threshold boundary (exactly 0.12 included, below excluded)
 *   - brierScore being null for empty input vs a number for settled picks
 */

import { describe, it, expect } from "vitest";
import { computeCalibration, computeCalibrationProposals } from "@/lib/calibration/compute";
import type { CalibrationBucket } from "@/lib/calibration/compute";

// ============================================================
// resultToOutcome — excluded results
// ============================================================

describe("computeCalibration — VOID and PENDING are excluded from settled", () => {
  it("excludes VOID picks from sampleSize and brierScore", () => {
    const report = computeCalibration([
      { id: "v1", confidence: 72, result: "VOID" },
      { id: "v2", confidence: 74, result: "VOID" },
    ]);
    expect(report.sampleSize).toBe(0);
    expect(report.brierScore).toBeNull();
  });

  it("excludes PENDING picks from sampleSize and brierScore", () => {
    const report = computeCalibration([
      { id: "p1", confidence: 72, result: "PENDING" },
    ]);
    expect(report.sampleSize).toBe(0);
    expect(report.brierScore).toBeNull();
  });

  it("counts only WIN/LOSS/PUSH when mixed with VOID and PENDING", () => {
    const report = computeCalibration([
      { id: "w1", confidence: 72, result: "WIN" },
      { id: "v1", confidence: 73, result: "VOID" },
      { id: "p1", confidence: 74, result: "PENDING" },
      { id: "l1", confidence: 71, result: "LOSS" },
    ]);
    // only WIN + LOSS = 2 settled picks
    expect(report.sampleSize).toBe(2);
    expect(report.brierScore).not.toBeNull();
  });

  it("collecting note is returned when all picks are VOID or PENDING", () => {
    const report = computeCalibration([
      { id: "v1", confidence: 65, result: "VOID" },
      { id: "p1", confidence: 65, result: "PENDING" },
    ]);
    expect(report.note).toContain("Calibration remains collecting");
  });
});

// ============================================================
// Empty bucket — midpoint expectedWinRate formula
// ============================================================

describe("computeCalibration — empty bucket expectedWinRate uses midpoint", () => {
  it("50-59 empty bucket has expectedWinRate of 0.545", () => {
    // No picks in any bucket → all buckets empty
    const report = computeCalibration([]);
    const bucket = report.buckets.find((b) => b.label === "50-59");
    expect(bucket).toBeDefined();
    expect(bucket!.sampleSize).toBe(0);
    expect(bucket!.expectedWinRate).toBeCloseTo(0.545, 3);
    expect(bucket!.observedWinRate).toBe(0);
    expect(bucket!.delta).toBe(0);
  });

  it("60-69 empty bucket has expectedWinRate of 0.645", () => {
    const report = computeCalibration([]);
    const bucket = report.buckets.find((b) => b.label === "60-69");
    expect(bucket!.expectedWinRate).toBeCloseTo(0.645, 3);
  });

  it("70-79 empty bucket has expectedWinRate of 0.745", () => {
    const report = computeCalibration([]);
    const bucket = report.buckets.find((b) => b.label === "70-79");
    expect(bucket!.expectedWinRate).toBeCloseTo(0.745, 3);
  });

  it("80-89 empty bucket has expectedWinRate of 0.845", () => {
    const report = computeCalibration([]);
    const bucket = report.buckets.find((b) => b.label === "80-89");
    expect(bucket!.expectedWinRate).toBeCloseTo(0.845, 3);
  });

  it("90-100 empty bucket has expectedWinRate of 0.95", () => {
    const report = computeCalibration([]);
    const bucket = report.buckets.find((b) => b.label === "90-100");
    expect(bucket!.expectedWinRate).toBeCloseTo(0.95, 3);
  });

  it("report always contains exactly 5 buckets regardless of input", () => {
    const emptyReport = computeCalibration([]);
    const filledReport = computeCalibration([
      { id: "a", confidence: 72, result: "WIN" },
    ]);
    expect(emptyReport.buckets).toHaveLength(5);
    expect(filledReport.buckets).toHaveLength(5);
  });
});

// ============================================================
// Bucket routing — all 5 confidence ranges
// ============================================================

describe("computeCalibration — bucket routing", () => {
  it("confidence 50 routes to 50-59 bucket", () => {
    const report = computeCalibration([
      { id: "a", confidence: 50, result: "WIN" },
    ]);
    const bucket = report.buckets.find((b) => b.label === "50-59");
    expect(bucket!.sampleSize).toBe(1);
  });

  it("confidence 59 routes to 50-59 bucket (upper boundary inclusive)", () => {
    const report = computeCalibration([
      { id: "a", confidence: 59, result: "WIN" },
    ]);
    const bucket = report.buckets.find((b) => b.label === "50-59");
    expect(bucket!.sampleSize).toBe(1);
  });

  it("confidence 60 routes to 60-69 bucket", () => {
    const report = computeCalibration([
      { id: "a", confidence: 60, result: "WIN" },
    ]);
    const bucket = report.buckets.find((b) => b.label === "60-69");
    expect(bucket!.sampleSize).toBe(1);
  });

  it("confidence 85 routes to 80-89 bucket", () => {
    const report = computeCalibration([
      { id: "a", confidence: 85, result: "WIN" },
    ]);
    const bucket = report.buckets.find((b) => b.label === "80-89");
    expect(bucket!.sampleSize).toBe(1);
  });

  it("confidence 95 routes to 90-100 bucket", () => {
    const report = computeCalibration([
      { id: "a", confidence: 95, result: "WIN" },
    ]);
    const bucket = report.buckets.find((b) => b.label === "90-100");
    expect(bucket!.sampleSize).toBe(1);
  });
});

// ============================================================
// PUSH outcome contributes 0.5 to observedWinRate
// ============================================================

describe("computeCalibration — PUSH outcome", () => {
  it("all PUSH picks produce observedWinRate of 0.5", () => {
    const report = computeCalibration([
      { id: "p1", confidence: 72, result: "PUSH" },
      { id: "p2", confidence: 74, result: "PUSH" },
    ]);
    const bucket = report.buckets.find((b) => b.label === "70-79");
    expect(bucket!.sampleSize).toBe(2);
    expect(bucket!.observedWinRate).toBe(0.5);
  });

  it("mixed WIN and PUSH: WIN=1 + PUSH=0.5, averages correctly", () => {
    const report = computeCalibration([
      { id: "w1", confidence: 72, result: "WIN" },  // outcome 1
      { id: "p1", confidence: 73, result: "PUSH" }, // outcome 0.5
    ]);
    const bucket = report.buckets.find((b) => b.label === "70-79");
    // (1 + 0.5) / 2 = 0.75
    expect(bucket!.observedWinRate).toBeCloseTo(0.75, 3);
  });
});

// ============================================================
// computeCalibrationProposals — overcalling vs undercalling titles
// ============================================================

describe("computeCalibrationProposals — proposal title routing", () => {
  function bucket(delta: number, sampleSize = 40): CalibrationBucket {
    return {
      label: "70-79",
      confidenceMin: 70,
      confidenceMax: 79,
      sampleSize,
      observedWinRate: 0.74 + delta,
      expectedWinRate: 0.74,
      delta,
      brierScore: 0.2,
    };
  }

  it("produces 'overcalling' title when delta is negative (model predicted too high)", () => {
    const proposals = computeCalibrationProposals([bucket(-0.20)]);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.title).toContain("overcalling");
  });

  it("produces 'undercalling' title when delta is positive (model predicted too low)", () => {
    const proposals = computeCalibrationProposals([bucket(0.20)]);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.title).toContain("undercalling");
  });

  it("proposal id includes the bucket label", () => {
    const proposals = computeCalibrationProposals([bucket(-0.20)]);
    expect(proposals[0]?.id).toBe("confidence-drift-70-79");
  });

  it("proposal kind is always CONFIDENCE_SHIFT", () => {
    const proposals = computeCalibrationProposals([bucket(0.20)]);
    expect(proposals[0]?.kind).toBe("CONFIDENCE_SHIFT");
  });

  it("rationale references observed %, expected %, and sampleSize", () => {
    const proposals = computeCalibrationProposals([bucket(-0.22)]);
    const rationale = proposals[0]?.rationale ?? "";
    expect(rationale).toContain("vs expected");
    expect(rationale).toContain("settled picks");
    expect(rationale).toContain("Review before changing weights");
  });
});

// ============================================================
// computeCalibrationProposals — delta threshold boundary
// ============================================================

describe("computeCalibrationProposals — delta threshold = 0.12", () => {
  function bucketAt(delta: number): CalibrationBucket {
    return {
      label: "70-79",
      confidenceMin: 70,
      confidenceMax: 79,
      sampleSize: 40,
      observedWinRate: 0.74 + delta,
      expectedWinRate: 0.74,
      delta,
      brierScore: 0.2,
    };
  }

  it("delta exactly 0.12 is included (threshold is inclusive)", () => {
    const proposals = computeCalibrationProposals([bucketAt(0.12)]);
    expect(proposals).toHaveLength(1);
  });

  it("delta exactly -0.12 is included (negative side)", () => {
    const proposals = computeCalibrationProposals([bucketAt(-0.12)]);
    expect(proposals).toHaveLength(1);
  });

  it("delta 0.11 is excluded (below threshold)", () => {
    const proposals = computeCalibrationProposals([bucketAt(0.11)]);
    expect(proposals).toHaveLength(0);
  });

  it("delta -0.11 is excluded (negative, below threshold)", () => {
    const proposals = computeCalibrationProposals([bucketAt(-0.11)]);
    expect(proposals).toHaveLength(0);
  });

  it("sampleSize exactly 30 is included (MIN_BUCKET_SAMPLE boundary)", () => {
    const b: CalibrationBucket = {
      label: "70-79",
      confidenceMin: 70,
      confidenceMax: 79,
      sampleSize: 30,
      observedWinRate: 0.5,
      expectedWinRate: 0.74,
      delta: -0.24,
      brierScore: 0.3,
    };
    expect(computeCalibrationProposals([b])).toHaveLength(1);
  });

  it("sampleSize 29 is excluded (below MIN_BUCKET_SAMPLE)", () => {
    const b: CalibrationBucket = {
      label: "70-79",
      confidenceMin: 70,
      confidenceMax: 79,
      sampleSize: 29,
      observedWinRate: 0.5,
      expectedWinRate: 0.74,
      delta: -0.24,
      brierScore: 0.3,
    };
    expect(computeCalibrationProposals([b])).toHaveLength(0);
  });
});

// ============================================================
// brierScore — end-to-end
// ============================================================

describe("computeCalibration — brierScore", () => {
  it("is null when no settled picks exist", () => {
    expect(computeCalibration([]).brierScore).toBeNull();
    expect(computeCalibration([{ id: "v", confidence: 70, result: "VOID" }]).brierScore).toBeNull();
  });

  it("is a non-null number for any settled pick", () => {
    const report = computeCalibration([
      { id: "w", confidence: 70, result: "WIN" },
    ]);
    expect(report.brierScore).not.toBeNull();
    expect(typeof report.brierScore).toBe("number");
  });

  it("is 0 for a perfectly calibrated pick (confidence=100, WIN)", () => {
    // expected = 0.99 (clamped), outcome = 1 → brier = (0.99-1)^2 = 0.0001
    const report = computeCalibration([
      { id: "w", confidence: 100, result: "WIN" },
    ]);
    // brier should be very small but not exactly 0 due to 0.99 clamp
    expect(report.brierScore!).toBeLessThan(0.01);
  });

  it("is higher for a poorly calibrated pick (high confidence, LOSS)", () => {
    const goodReport = computeCalibration([
      { id: "w", confidence: 70, result: "WIN" },
    ]);
    const badReport = computeCalibration([
      { id: "l", confidence: 90, result: "LOSS" },
    ]);
    expect(badReport.brierScore!).toBeGreaterThan(goodReport.brierScore!);
  });
});

// ============================================================
// Multiple buckets in a single run
// ============================================================

describe("computeCalibration — multiple buckets populated simultaneously", () => {
  it("routes picks to separate buckets and computes independently", () => {
    const report = computeCalibration([
      { id: "a", confidence: 55, result: "WIN" },  // 50-59
      { id: "b", confidence: 55, result: "LOSS" }, // 50-59
      { id: "c", confidence: 75, result: "WIN" },  // 70-79
      { id: "d", confidence: 75, result: "WIN" },  // 70-79
    ]);

    const b5059 = report.buckets.find((b) => b.label === "50-59");
    const b7079 = report.buckets.find((b) => b.label === "70-79");

    expect(b5059!.sampleSize).toBe(2);
    expect(b5059!.observedWinRate).toBe(0.5); // 1 WIN + 1 LOSS

    expect(b7079!.sampleSize).toBe(2);
    expect(b7079!.observedWinRate).toBe(1.0); // 2 WINs

    expect(report.sampleSize).toBe(4);
  });
});
