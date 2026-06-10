import { describe, it, expect } from "vitest";
import { computeCalibration, computeCalibrationProposals } from "@/lib/calibration/compute";

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

  it("excludes VOID picks from calibration tallies (R-05)", () => {
    // VOID (postponed/cancelled games swept by the worker) must never count
    // toward calibration: resultToOutcome maps it to null, same as PENDING.
    const withVoids = computeCalibration([
      { id: "a", confidence: 72, result: "WIN" },
      { id: "b", confidence: 74, result: "LOSS" },
      { id: "c", confidence: 76, result: "VOID" },
      { id: "d", confidence: 78, result: "VOID" },
    ]);

    const bucket = withVoids.buckets.find((entry) => entry.label === "70-79");
    expect(withVoids.sampleSize).toBe(2);
    expect(bucket?.sampleSize).toBe(2);
    expect(bucket?.observedWinRate).toBe(0.5);

    // Brier and win rates are identical to the same slate without the voids.
    const withoutVoids = computeCalibration([
      { id: "a", confidence: 72, result: "WIN" },
      { id: "b", confidence: 74, result: "LOSS" },
    ]);
    expect(withVoids.brierScore).toBe(withoutVoids.brierScore);

    // An all-VOID slate is "no evidence", not a 0% or 100% win rate.
    const allVoid = computeCalibration([
      { id: "x", confidence: 72, result: "VOID" },
      { id: "y", confidence: 88, result: "VOID" },
    ]);
    expect(allVoid.sampleSize).toBe(0);
    expect(allVoid.brierScore).toBeNull();
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
});
