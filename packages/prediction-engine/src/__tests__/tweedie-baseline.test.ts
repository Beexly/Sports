import { describe, expect, it } from "vitest";
import {
  adaptiveConformalIntervals,
  buildTemporalProjectionSplits,
  clarkWestTest,
  fitTweedieBaseline,
  predictTweedieFantasyPoints,
  runTweedieBaselineBacktest,
  tweedieDeviance,
  type TweedieProjectionSample,
} from "../tweedie-baseline.js";

function sample(id: number, season: number, week: number, usage: number): TweedieProjectionSample {
  const actualFantasyPoints = 4 + usage * 20 + (id % 2 === 0 ? 1 : -1);
  return {
    sampleId: `s-${id}`,
    season,
    week,
    position: id % 3 === 0 ? "RB" : "WR",
    features: { usage, market: 0.5 + usage / 4, unclearedNoise: id * 100 },
    actualFantasyPoints,
    marketBaselineFantasyPoints: 7 + usage * 13,
  };
}

const samples: readonly TweedieProjectionSample[] = Array.from({ length: 48 }, (_, index) =>
  sample(index + 1, 2024, Math.floor(index / 4) + 1, ((index % 4) + 1) / 5),
);

describe("fitTweedieBaseline", () => {
  it("fits a shadow boosted baseline using only cleared features", () => {
    const model = fitTweedieBaseline(samples.slice(0, 24), {
      clearedFeatureIds: ["usage"],
      rounds: 4,
      learningRate: 0.3,
    });

    expect(model.featureIds).toEqual(["usage"]);
    expect(model.stumps.length).toBeGreaterThan(0);
    expect(model.priced).toBe(false);
    expect(model.status).toBe("shadow");
    expect(predictTweedieFantasyPoints(model, { usage: 0.8 })).toBeGreaterThan(
      predictTweedieFantasyPoints(model, { usage: 0.2 }),
    );
  });

  it("scores non-negative Tweedie deviance", () => {
    expect(tweedieDeviance(0, 0.5)).toBeGreaterThanOrEqual(0);
    expect(tweedieDeviance(14, 14)).toBeLessThan(tweedieDeviance(14, 5));
  });
});

describe("buildTemporalProjectionSplits", () => {
  it("builds purged and embargoed walk-forward splits", () => {
    const splits = buildTemporalProjectionSplits(samples, {
      minTrainWeeks: 4,
      purgeWeeks: 1,
      embargoWeeks: 1,
    });

    expect(splits[0]?.trainWeekKeys).toEqual(["2024-W01", "2024-W02", "2024-W03"]);
    expect(splits[0]?.testWeekKey).toBe("2024-W05");
    expect(splits[0]?.purgedWeekKeys).toEqual(["2024-W04"]);
    expect(splits[0]?.embargoedWeekKeys).toEqual(["2024-W06"]);
  });
});

describe("runTweedieBaselineBacktest", () => {
  it("emits Clark-West market comparison and stays priced=false", () => {
    const report = runTweedieBaselineBacktest(samples, {
      clearedFeatureIds: ["usage", "market"],
      rounds: 6,
      minTrainWeeks: 4,
      purgeWeeks: 1,
      embargoWeeks: 1,
    });

    expect(report.sampleSize).toBe(32);
    expect(report.folds).toBe(8);
    expect(report.clarkWest.sampleSize).toBe(32);
    expect(report.clarkWest.modelMae).toBeGreaterThanOrEqual(0);
    expect(report.clarkWest.marketMae).toBeGreaterThanOrEqual(0);
    expect(report.priced).toBe(false);
  });
});

describe("clarkWestTest", () => {
  it("requires enough out-of-sample observations before declaring market beat", () => {
    const report = clarkWestTest([
      { actual: 10, modelPrediction: 10, marketPrediction: 4 },
      { actual: 20, modelPrediction: 20, marketPrediction: 10 },
    ]);

    expect(report.sampleSize).toBe(2);
    expect(report.beatsMarket).toBe(false);
  });
});

describe("adaptiveConformalIntervals", () => {
  it("adapts interval width by position after misses", () => {
    const intervals = adaptiveConformalIntervals(
      [
        { sampleId: "wr-1", position: "WR", predictedMean: 10, actualFantasyPoints: 10 },
        { sampleId: "rb-1", position: "RB", predictedMean: 10, actualFantasyPoints: 10 },
        { sampleId: "wr-2", position: "WR", predictedMean: 10, actualFantasyPoints: 25 },
        { sampleId: "rb-2", position: "RB", predictedMean: 10, actualFantasyPoints: 11 },
        { sampleId: "wr-3", position: "WR", predictedMean: 10, actualFantasyPoints: 14 },
      ],
      0.8,
      0.1,
    );

    const wrThird = intervals.find((interval) => interval.sampleId === "wr-3");
    const rbSecond = intervals.find((interval) => interval.sampleId === "rb-2");

    expect(wrThird?.residualQuantile).toBeGreaterThan(rbSecond?.residualQuantile ?? 0);
    expect(intervals.every((interval) => interval.lower >= 0)).toBe(true);
  });
});
