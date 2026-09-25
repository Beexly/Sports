import { describe, expect, it } from "vitest";
import {
  assertChronologicalIntegrity,
  chronologicalSplit,
  defineFeatureSpace,
  fitAndReport,
  type Sample,
} from "./feature-construction-recipe.js";

const spaceOk = defineFeatureSpace(
  [
    { name: "rest_days", type: "number", unit: "days", asOf: true },
    { name: "qb_continuity", type: "binary", unit: "flag", asOf: true },
    { name: "epa_last3", type: "number", unit: "epa/play", asOf: true },
  ],
  "v7-test",
);

function sample(over: Partial<Sample> = {}): Sample {
  return {
    features: { rest_days: 7, qb_continuity: 1, epa_last3: 0.12 },
    outcome: 1,
    timestamp: "2026-09-25T20:00:00.000Z",
    ...over,
  };
}

describe("V7 defineFeatureSpace", () => {
  it("accepts a typed feature space", () => {
    expect(spaceOk.ok).toBe(true);
    if (spaceOk.ok) {
      expect(spaceOk.space.features).toHaveLength(3);
      expect(spaceOk.space.version).toBe("v7-test");
    }
  });

  it("rejects empty feature list", () => {
    const r = defineFeatureSpace([], "v1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]!.code).toBe("NO_FEATURES");
  });

  it("rejects duplicate names", () => {
    const r = defineFeatureSpace(
      [
        { name: "a", type: "number", unit: "x", asOf: true },
        { name: "a", type: "binary", unit: "x", asOf: true },
      ],
      "v1",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.code === "DUPLICATE_NAME")).toBe(true);
  });

  it("rejects empty units and invalid types", () => {
    const r = defineFeatureSpace(
      [{ name: "a", type: "oops" as never, unit: "  ", asOf: true }],
      "v1",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const codes = r.errors.map((e) => e.code);
      expect(codes).toContain("INVALID_TYPE");
      expect(codes).toContain("EMPTY_UNIT");
    }
  });
});

describe("V7 chronologicalSplit", () => {
  it("splits chronologically only", () => {
    const samples = Array.from({ length: 10 }, (_, i) =>
      sample({
        timestamp: `2026-09-${String(i + 1).padStart(2, "0")}T12:00:00.000Z`,
        outcome: i % 2,
      }),
    );
    const split = chronologicalSplit(samples, 0.7);
    expect(split.train).toHaveLength(7);
    expect(split.test).toHaveLength(3);
    expect(Date.parse(split.trainEnd)).toBeLessThanOrEqual(Date.parse(split.testStart));
    assertChronologicalIntegrity(split);
  });

  it("sorts even if input is shuffled", () => {
    const samples = [
      sample({ timestamp: "2026-09-10T12:00:00.000Z", outcome: 1 }),
      sample({ timestamp: "2026-09-01T12:00:00.000Z", outcome: 0 }),
      sample({ timestamp: "2026-09-20T12:00:00.000Z", outcome: 1 }),
      sample({ timestamp: "2026-09-05T12:00:00.000Z", outcome: 0 }),
    ];
    const split = chronologicalSplit(samples, 0.5);
    expect(split.train[0]!.timestamp).toBe("2026-09-01T12:00:00.000Z");
    expect(split.test[split.test.length - 1]!.timestamp).toBe("2026-09-20T12:00:00.000Z");
  });

  it("throws on too few samples or bad ratio", () => {
    expect(() => chronologicalSplit([sample()], 0.7)).toThrow();
    expect(() => chronologicalSplit([sample(), sample()], 0)).toThrow();
    expect(() => chronologicalSplit([sample(), sample()], 1)).toThrow();
  });
});

describe("V7 fitAndReport", () => {
  const samples: Sample[] = Array.from({ length: 20 }, (_, i) => ({
    features: {
      rest_days: (i % 7) + 3,
      qb_continuity: i % 2,
      epa_last3: 0.05 * i - 0.4,
    },
    outcome: i % 2,
    timestamp: `2026-09-${String((i % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
  }));

  // Logistic-ish predictor using one feature; returns (0,1)
  const predict = (features: Record<string, number | null>): number => {
    const x = features.epa_last3;
    if (x === null || x === undefined) return 0.5;
    return 1 / (1 + Math.exp(-2 * x));
  };

  it("reports Brier, log-loss, calibration bins, ablation", () => {
    if (!spaceOk.ok) throw new Error("space should be valid");
    const report = fitAndReport(spaceOk.space, samples, predict, {
      trainRatio: 0.7,
      nBins: 5,
    });
    expect(report.nTrain).toBeGreaterThan(0);
    expect(report.nTest).toBeGreaterThan(0);
    expect(report.brier).toBeGreaterThan(0);
    expect(report.brier).toBeLessThan(1);
    expect(report.logLoss).toBeGreaterThan(0);
    expect(report.calibrationBins).toHaveLength(5);
    expect(report.ablation).toHaveLength(3);
    expect(report.ablation.map((a) => a.feature).sort()).toEqual([
      "epa_last3",
      "qb_continuity",
      "rest_days",
    ]);
    expect(report.leakage.clean).toBe(true);
  });

  it("fails closed when predictor returns out-of-range probability", () => {
    if (!spaceOk.ok) throw new Error("space should be valid");
    expect(() =>
      fitAndReport(spaceOk.space, samples, () => 1.5, { ablation: false }),
    ).toThrow(/probability/);
  });

  it("runs V1 leakage probes and fail-closes on leak", () => {
    if (!spaceOk.ok) throw new Error("space should be valid");
    const makeGame = (over: Record<string, unknown> = {}) => ({
      gameId: "g1",
      season: 2025,
      week: 5,
      team: "KC",
      opponent: "BUF",
      isHome: true,
      ratingAfter: 1550,
      ratingBefore: 1520,
      snapShareCurrentWeek: 0.85,
      snapSharePriorWeeks: 0.82,
      marketSpread: -3,
      predictedMargin: 4,
      label: 1,
      ...over,
    });

    const cleanFixture = [makeGame()];
    // Contaminated: ratingBefore overwritten with future ratingAfter
    const contaminatedFixture = [makeGame({ ratingBefore: 1550 })];
    const signFixture = [makeGame()];

    // Builder uses ratingBefore (pre-game field). When contaminated fixture
    // overwrites that field with future info, the probe must trip.
    const builder = (games: readonly Record<string, number>[]) => ({
      rating: games.map((g) => g.ratingBefore as number),
      snapShare: games.map((g) => g.snapSharePriorWeeks as number),
    });

    // Clean path: same fixture for clean + contaminated → no leakage
    const cleanReport = fitAndReport(spaceOk.space, samples, predict, {
      leakageProbes: {
        featureBuilder: builder as never,
        cleanFixture: cleanFixture as never,
        contaminatedFixture: cleanFixture as never,
        signFixture: signFixture as never,
      },
    });
    expect(cleanReport.leakage.clean).toBe(true);
    expect(cleanReport.leakage.probeCount).toBe(3);

    // Leak path: contaminated fixture changes ratingBefore → future-Elo trip
    expect(() =>
      fitAndReport(spaceOk.space, samples, predict, {
        leakageProbes: {
          featureBuilder: builder as never,
          cleanFixture: cleanFixture as never,
          contaminatedFixture: contaminatedFixture as never,
          signFixture: signFixture as never,
        },
      }),
    ).toThrow(/LEAKAGE DETECTED/);
  });
});

describe("V7 assertChronologicalIntegrity", () => {
  it("accepts a valid split", () => {
    const split = chronologicalSplit(
      [
        sample({ timestamp: "2026-09-01T12:00:00.000Z" }),
        sample({ timestamp: "2026-09-10T12:00:00.000Z" }),
        sample({ timestamp: "2026-09-20T12:00:00.000Z" }),
      ],
      0.5,
    );
    expect(() => assertChronologicalIntegrity(split)).not.toThrow();
  });
});
