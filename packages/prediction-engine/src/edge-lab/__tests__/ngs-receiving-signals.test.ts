import { describe, expect, it } from "vitest";
import {
  NGS_FIRST_SEASON,
  NGS_SEASON_SUMMARY_WEEK,
  NgsSeasonRangeError,
  aggregateSeasonSignals,
  isSeasonSummaryRow,
  isWeeklyRow,
  pairConsecutiveSeasons,
  type NgsReceivingRow,
} from "../ngs-receiving-signals.js";

const row = (over: Partial<NgsReceivingRow> = {}): NgsReceivingRow => ({
  playerGsisId: "00-0000001",
  season: 2023,
  seasonType: "REG",
  week: 1,
  targets: 10,
  avgSeparation: 3.0,
  ...over,
});

describe("trap 1 — week 0 is the season summary, not week zero", () => {
  it("classifies week 0 as a summary and week >= 1 as weekly", () => {
    expect(NGS_SEASON_SUMMARY_WEEK).toBe(0);
    expect(isSeasonSummaryRow(row({ week: 0 }))).toBe(true);
    expect(isWeeklyRow(row({ week: 0 }))).toBe(false);
    expect(isWeeklyRow(row({ week: 1 }))).toBe(true);
  });

  it("EXCLUDES the summary row so the season is not counted twice", () => {
    // Two weekly rows of 10 targets each, plus NGS's own 20-target summary.
    // Leaking the summary in yields 40 — double the truth.
    const out = aggregateSeasonSignals([
      row({ week: 1, targets: 10 }),
      row({ week: 2, targets: 10 }),
      row({ week: 0, targets: 20 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.targets).toBe(20);
    expect(out[0]!.weeks).toBe(2);
  });

  it("returns nothing when given ONLY summary rows, rather than silently half-working", () => {
    expect(aggregateSeasonSignals([row({ week: 0 })])).toHaveLength(0);
  });
});

describe("trap 2 — avg_separation is already an average, so it needs a weight", () => {
  it("weights separation by targets, not a mean of means", () => {
    // 1 target at 1.0 and 9 targets at 3.0.
    // Target-weighted: (1*1 + 9*3)/10 = 2.8. Mean-of-means would be 2.0.
    const out = aggregateSeasonSignals([
      row({ week: 1, targets: 1, avgSeparation: 1.0 }),
      row({ week: 2, targets: 9, avgSeparation: 3.0 }),
    ]);
    expect(out[0]!.avgSeparation).toBeCloseTo(2.8, 10);
    expect(out[0]!.avgSeparation).not.toBeCloseTo(2.0, 2);
  });

  it("a heavy week outweighs a light one", () => {
    const light = aggregateSeasonSignals([
      row({ week: 1, targets: 1, avgSeparation: 5.0 }),
      row({ week: 2, targets: 20, avgSeparation: 2.0 }),
    ]);
    expect(light[0]!.avgSeparation!).toBeLessThan(2.5);
  });

  it("keeps targets even when separation is uncharted, and reports separation as null", () => {
    const out = aggregateSeasonSignals([
      row({ week: 1, targets: 7, avgSeparation: null }),
    ]);
    expect(out[0]!.targets).toBe(7);
    expect(out[0]!.avgSeparation).toBeNull(); // never 0.0
  });
});

describe("trap 3 — NGS begins in 2016; earlier is absent, not zero", () => {
  it("throws rather than contributing a zero", () => {
    expect(NGS_FIRST_SEASON).toBe(2016);
    expect(() => aggregateSeasonSignals([row({ season: 2015 })])).toThrow(NgsSeasonRangeError);
  });

  it("accepts the first covered season", () => {
    expect(aggregateSeasonSignals([row({ season: 2016 })])).toHaveLength(1);
  });
});

describe("aggregation hygiene", () => {
  it("is market-free by construction", () => {
    const out = aggregateSeasonSignals([row()]);
    expect(out[0]!.priced).toBe(false);
    expect(Object.keys(out[0]!).sort()).toEqual(
      ["avgSeparation", "playerGsisId", "priced", "season", "targets", "weeks"],
    );
  });

  it("separates players and seasons", () => {
    const out = aggregateSeasonSignals([
      row({ playerGsisId: "A", season: 2023 }),
      row({ playerGsisId: "A", season: 2024 }),
      row({ playerGsisId: "B", season: 2023 }),
    ]);
    expect(out).toHaveLength(3);
  });

  it("drops POST rows when aggregating REG", () => {
    const out = aggregateSeasonSignals([
      row({ week: 1, targets: 10, seasonType: "REG" }),
      row({ week: 2, targets: 99, seasonType: "POST" }),
    ]);
    expect(out[0]!.targets).toBe(10);
  });
});

describe("t -> t+1 pairing", () => {
  it("pairs a player forward only", () => {
    const signals = aggregateSeasonSignals([
      row({ playerGsisId: "A", season: 2023 }),
      row({ playerGsisId: "A", season: 2024 }),
      row({ playerGsisId: "B", season: 2023 }),
    ]);
    const pairs = pairConsecutiveSeasons(signals, 2023);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.prior.season).toBe(2023);
    expect(pairs[0]!.next.season).toBe(2024);
  });

  it("yields nothing when the next season is absent", () => {
    const signals = aggregateSeasonSignals([row({ playerGsisId: "A", season: 2023 })]);
    expect(pairConsecutiveSeasons(signals, 2023)).toHaveLength(0);
  });
});
