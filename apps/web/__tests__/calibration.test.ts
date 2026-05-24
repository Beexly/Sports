import { describe, it, expect } from "vitest";
import { computeCalibration, computeCalibrationProposals } from "@/lib/calibration/compute";
import type { CalibrationPickInput } from "@/lib/calibration/compute";

describe("computeCalibration", () => {
  it("returns a collecting report when no settled picks are provided", () => {
    const report = computeCalibration([]);
    expect(report.sampleSize).toBe(0);
    expect(report.brierScore).toBeNull();
    expect(report.proposals).toEqual([]);
  });

  it("computes bucket deltas and Brier score from settled outcomes", () => {
    const report = computeCalibration([
      { id: "a", confidence: 72, result: "WIN" },
      { id: "b", confidence: 74, result: "LOSS" },
      { id: "c", confidence: 76, result: "PUSH" },
      { id: "d", confidence: 61, result: "PENDING" },
    ]);

    const bucket = report.buckets.find((entry) => entry.label === "70-79");
    expect(report.sampleSize).toBe(3);
    expect(report.brierScore).toBeTypeOf("number");
    expect(bucket?.sampleSize).toBe(3);
    expect(bucket?.observedWinRate).toBe(0.5);
  });
});

describe("computeCalibration — VOID and PENDING exclusion", () => {
  it("excludes VOID picks from the settled sample", () => {
    const report = computeCalibration([
      { id: "a", confidence: 72, result: "WIN" },
      { id: "b", confidence: 73, result: "VOID" },
    ]);
    expect(report.sampleSize).toBe(1);
  });

  it("excludes PENDING picks from the settled sample", () => {
    const report = computeCalibration([
      { id: "a", confidence: 72, result: "WIN" },
      { id: "b", confidence: 73, result: "PENDING" },
    ]);
    expect(report.sampleSize).toBe(1);
  });
});

describe("computeCalibration — PUSH outcome handling", () => {
  it("counts PUSH as 0.5 in observed win rate", () => {
    const report = computeCalibration([
      { id: "a", confidence: 72, result: "PUSH" },
      { id: "b", confidence: 73, result: "PUSH" },
    ]);
    const bucket = report.buckets.find((b) => b.label === "70-79")!;
    expect(bucket.observedWinRate).toBeCloseTo(0.5, 3);
  });
});

describe("computeCalibration — bucket assignment", () => {
  it("assigns each confidence range to the correct bucket", () => {
    const picks: CalibrationPickInput[] = [
      { id: "1", confidence: 55, result: "WIN" },
      { id: "2", confidence: 65, result: "WIN" },
      { id: "3", confidence: 75, result: "WIN" },
      { id: "4", confidence: 85, result: "WIN" },
      { id: "5", confidence: 95, result: "WIN" },
    ];
    const report = computeCalibration(picks);
    expect(report.sampleSize).toBe(5);
    const labels = report.buckets.map((b) => b.label);
    expect(labels).toEqual(["50-59", "60-69", "70-79", "80-89", "90-100"]);
    for (const bucket of report.buckets) {
      expect(bucket.sampleSize).toBe(1);
    }
  });

  it("empty buckets have sampleSize 0 and delta 0", () => {
    const report = computeCalibration([{ id: "a", confidence: 72, result: "WIN" }]);
    const emptyBucket = report.buckets.find((b) => b.label === "50-59")!;
    expect(emptyBucket.sampleSize).toBe(0);
    expect(emptyBucket.delta).toBe(0);
    expect(emptyBucket.brierScore).toBe(0);
  });
});

describe("computeCalibration — Brier score", () => {
  it("is null when no settled picks are provided", () => {
    expect(computeCalibration([]).brierScore).toBeNull();
  });

  it("is 0 for a perfect predictor (WIN at confidence 100)", () => {
    // When confidence=99 (clamped from 100 by expectedFromConfidence) and outcome=1,
    // Brier score = (0.99 - 1)^2 = 0.0001
    const report = computeCalibration([{ id: "a", confidence: 99, result: "WIN" }]);
    expect(report.brierScore).toBeLessThan(0.01);
  });

  it("is bounded between 0 and 1", () => {
    const picks: CalibrationPickInput[] = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      confidence: 50 + i * 2,
      result: i % 2 === 0 ? "WIN" : "LOSS",
    }));
    const report = computeCalibration(picks);
    expect(report.brierScore).toBeGreaterThanOrEqual(0);
    expect(report.brierScore).toBeLessThanOrEqual(1);
  });
});

describe("computeCalibration — overall report shape", () => {
  it("always returns exactly 5 buckets", () => {
    expect(computeCalibration([]).buckets).toHaveLength(5);
    expect(computeCalibration([{ id: "a", confidence: 75, result: "WIN" }]).buckets).toHaveLength(5);
  });

  it("note describes collecting state when no picks", () => {
    expect(computeCalibration([]).note.toLowerCase()).toContain("collecting");
  });

  it("note describes evidence-only when picks exist", () => {
    const report = computeCalibration([{ id: "a", confidence: 75, result: "WIN" }]);
    expect(report.note.toLowerCase()).toContain("evidence");
  });
});

describe("computeCalibrationProposals", () => {
  it("requires enough sample before proposing model changes", () => {
    expect(
      computeCalibrationProposals([
        {
          label: "70-79",
          confidenceMin: 70,
          confidenceMax: 79,
          sampleSize: 12,
          observedWinRate: 0.4,
          expectedWinRate: 0.75,
          delta: -0.35,
          brierScore: 0.28,
        },
      ])
    ).toEqual([]);
  });

  it("emits review-only proposals after material drift", () => {
    const proposals = computeCalibrationProposals([
      {
        label: "70-79",
        confidenceMin: 70,
        confidenceMax: 79,
        sampleSize: 40,
        observedWinRate: 0.52,
        expectedWinRate: 0.74,
        delta: -0.22,
        brierScore: 0.24,
      },
    ]);

    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.kind).toBe("CONFIDENCE_SHIFT");
  });

  it("emits proposal at exactly the threshold (>= 0.12)", () => {
    const proposals = computeCalibrationProposals([
      {
        label: "80-89",
        confidenceMin: 80,
        confidenceMax: 89,
        sampleSize: 35,
        observedWinRate: 0.72,
        expectedWinRate: 0.84,
        delta: -0.12,
        brierScore: 0.2,
      },
    ]);
    expect(proposals).toHaveLength(1);
  });

  it("does not emit proposal when delta is below the threshold (< 0.12)", () => {
    const proposals = computeCalibrationProposals([
      {
        label: "80-89",
        confidenceMin: 80,
        confidenceMax: 89,
        sampleSize: 35,
        observedWinRate: 0.73,
        expectedWinRate: 0.84,
        delta: -0.11,
        brierScore: 0.2,
      },
    ]);
    expect(proposals).toHaveLength(0);
  });

  it("describes undercalling when delta is positive", () => {
    const proposals = computeCalibrationProposals([
      {
        label: "60-69",
        confidenceMin: 60,
        confidenceMax: 69,
        sampleSize: 40,
        observedWinRate: 0.80,
        expectedWinRate: 0.65,
        delta: 0.15,
        brierScore: 0.16,
      },
    ]);
    expect(proposals[0]?.title.toLowerCase()).toContain("undercalling");
  });

  it("describes overcalling when delta is negative", () => {
    const proposals = computeCalibrationProposals([
      {
        label: "60-69",
        confidenceMin: 60,
        confidenceMax: 69,
        sampleSize: 40,
        observedWinRate: 0.50,
        expectedWinRate: 0.65,
        delta: -0.15,
        brierScore: 0.26,
      },
    ]);
    expect(proposals[0]?.title.toLowerCase()).toContain("overcalling");
  });

  it("returns no proposals when all buckets are empty", () => {
    expect(computeCalibrationProposals([])).toEqual([]);
  });
});
