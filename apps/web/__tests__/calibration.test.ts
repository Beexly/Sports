import { describe, it, expect } from "vitest";
import {
  buildProjectionPreGameCommit,
  buildProjectionSelfPublishingArtifact,
  computeCalibration,
  computeCalibrationProposals,
  computeDiscrimination,
  type ProjectionCalibrationInput,
} from "@/lib/calibration/compute";

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

  it("surfaces an insufficient-data discrimination signal below the sample floor", () => {
    const report = computeCalibration([{ id: "a", confidence: 72, result: "WIN" }]);
    expect(report.discrimination.trend).toBe("insufficient-data");
  });
});

describe("computeDiscrimination", () => {
  const bucket = (
    label: string,
    confidenceMin: number,
    confidenceMax: number,
    sampleSize: number,
    observedWinRate: number
  ) => ({
    label,
    confidenceMin,
    confidenceMax,
    sampleSize,
    observedWinRate,
    expectedWinRate: (confidenceMin + confidenceMax) / 200,
    delta: 0,
    brierScore: 0,
  });

  it("reports insufficient-data with fewer than two populated buckets", () => {
    expect(computeDiscrimination([]).trend).toBe("insufficient-data");
    expect(computeDiscrimination([bucket("70-79", 70, 79, 40, 0.6)]).trend).toBe(
      "insufficient-data"
    );
    // A bucket below the sample floor does not count toward the trend.
    expect(
      computeDiscrimination([
        bucket("50-59", 50, 59, 25, 0.5),
        bucket("80-89", 80, 89, 10, 0.8),
      ]).trend
    ).toBe("insufficient-data");
  });

  it("flags improving discrimination when win rate rises with confidence", () => {
    const d = computeDiscrimination([
      bucket("50-59", 50, 59, 25, 0.5),
      bucket("70-79", 70, 79, 30, 0.58),
      bucket("80-89", 80, 89, 22, 0.66),
    ]);
    expect(d.trend).toBe("improving");
    expect(d.monotonic).toBe(true);
    expect(d.spread).toBeCloseTo(0.16, 5);
    expect(d.populatedBucketCount).toBe(3);
    expect(d.lowestBucketLabel).toBe("50-59");
    expect(d.highestBucketLabel).toBe("80-89");
  });

  it("flags inverted discrimination when high confidence wins less", () => {
    const d = computeDiscrimination([
      bucket("50-59", 50, 59, 40, 0.62),
      bucket("80-89", 80, 89, 40, 0.47),
    ]);
    expect(d.trend).toBe("inverted");
    expect(d.spread).toBeLessThan(0);
  });

  it("flags flat discrimination when confidence does not separate outcomes", () => {
    const d = computeDiscrimination([
      bucket("50-59", 50, 59, 40, 0.55),
      bucket("80-89", 80, 89, 40, 0.56),
    ]);
    expect(d.trend).toBe("flat");
  });

  it("detects a local dip (non-monotonic) while still improving overall", () => {
    const d = computeDiscrimination([
      bucket("50-59", 50, 59, 25, 0.5),
      bucket("60-69", 60, 69, 25, 0.45), // dip below the prior bucket
      bucket("80-89", 80, 89, 25, 0.62),
    ]);
    expect(d.trend).toBe("improving");
    expect(d.monotonic).toBe(false);
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

describe("buildProjectionSelfPublishingArtifact", () => {
  const rows: ProjectionCalibrationInput[] = [
    {
      id: "wr-1",
      position: "WR",
      predictedFantasyPoints: 14,
      actualFantasyPoints: 15,
      intervalLower: 12,
      intervalUpper: 17,
      marketFantasyPoints: 10,
      preGameCommittedAt: "2026-09-10T16:00:00.000Z",
      settledAt: "2026-09-11T05:00:00.000Z",
      modelWinProbability: 0.78,
      marketWinProbability: 0.52,
      outcome: 1,
    },
    {
      id: "rb-1",
      position: "RB",
      predictedFantasyPoints: 9,
      actualFantasyPoints: 8,
      intervalLower: 6,
      intervalUpper: 11,
      marketFantasyPoints: 13,
      preGameCommittedAt: "2026-09-10T16:00:00.000Z",
      settledAt: "2026-09-11T05:00:00.000Z",
      modelWinProbability: 0.28,
      marketWinProbability: 0.5,
      outcome: 0,
    },
    {
      id: "wr-2",
      position: "WR",
      predictedFantasyPoints: 17,
      actualFantasyPoints: 18,
      intervalLower: 15,
      intervalUpper: 20,
      marketFantasyPoints: 14,
      preGameCommittedAt: "2026-09-10T16:00:00.000Z",
      settledAt: "2026-09-11T05:00:00.000Z",
      modelWinProbability: 0.74,
      marketWinProbability: 0.54,
      outcome: 1,
    },
    {
      id: "qb-1",
      position: "QB",
      predictedFantasyPoints: 11,
      actualFantasyPoints: 12,
      intervalLower: 9,
      intervalUpper: 13,
      marketFantasyPoints: 16,
      preGameCommittedAt: "2026-09-10T16:00:00.000Z",
      settledAt: "2026-09-11T05:00:00.000Z",
      modelWinProbability: 0.32,
      marketWinProbability: 0.49,
      outcome: 0,
    },
  ];

  it("builds draft-only public artifact data and criteria without flipping publish flags", () => {
    const artifact = buildProjectionSelfPublishingArtifact(rows, {
      generatedAt: "2026-09-12T00:00:00.000Z",
      criteria: { minSampleSize: 4, minRankCorrelation: 0.9 },
    });

    expect(artifact.status).toBe("DRAFT_ONLY");
    expect(artifact.preGameCommit.status).toBe("DRAFT_ONLY");
    expect(artifact.sampleSize).toBe(4);
    expect(artifact.overallModelMae).toBe(1);
    expect(artifact.overallMarketMae).toBeGreaterThan(artifact.overallModelMae ?? 0);
    expect(artifact.intervalCoverage).toBe(1);
    expect(artifact.rankCorrelation).toBe(1);
    expect(artifact.scores.brierScore).toBeLessThan(artifact.scores.marketBrierScore ?? 1);
    expect(artifact.scores.logLoss).toBeLessThan(artifact.scores.marketLogLoss ?? 1);
    expect(artifact.scores.crps).toBeLessThan(artifact.scores.marketCrps ?? 1);
    expect(artifact.canPublishProjections).toMatchObject({
      criterionId: "canPublishProjections",
      status: "DRAFT_ONLY",
      eligibleIfOwnerApproves: true,
      failedCriteria: [],
    });
  });

  it("is deterministic for the same pre-game projection set", () => {
    const commit = buildProjectionPreGameCommit(rows, "2026-09-10T16:00:00.000Z");
    const shuffled = buildProjectionPreGameCommit([...rows].reverse(), "2026-09-10T16:00:00.000Z");
    expect(commit.fingerprint).toBe(shuffled.fingerprint);
    expect(commit.id).toBe(shuffled.id);
  });

  it("fails closed when pre-game commits are missing", () => {
    const artifact = buildProjectionSelfPublishingArtifact(
      [{ ...rows[0]!, preGameCommittedAt: null }],
      {
        generatedAt: "2026-09-12T00:00:00.000Z",
        criteria: {
          minSampleSize: 1,
          minIntervalCoverage: 0,
          minRankCorrelation: 0,
          requireBetterBrierThanMarket: false,
          requireBetterCrpsThanMarket: false,
          requireBetterLogLossThanMarket: false,
        },
      }
    );

    expect(artifact.canPublishProjections.eligibleIfOwnerApproves).toBe(false);
    expect(artifact.canPublishProjections.failedCriteria).toContain("pre-game-commit");
  });
});
