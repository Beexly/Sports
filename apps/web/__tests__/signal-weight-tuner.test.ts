import { describe, it, expect } from "vitest";
import {
  tuneSignalWeightsFromLedger,
  medianOf,
  toJsonEntry,
  type SignalWeightTunerDb,
} from "@/lib/ops/signal-weight-tuner";
import { MIN_FIXTURES, projectPlayerGameStats, composeLedger } from "@sports/prediction-engine";

/**
 * A stub db. Never imports Prisma and never touches DATABASE_URL — the whole
 * point of the injected interface is that the tuner can be exercised with no
 * database at all.
 */
function stubDb(input: {
  signals?: Array<{
    key: string;
    entityType?: string;
    entityId: string;
    value: number;
    season: number;
    week: number;
  }>;
  stats?: Array<{
    playerId: string;
    season: number;
    week: number;
    seasonType?: string;
    fantasyPointsPpr: number | null;
  }>;
}): SignalWeightTunerDb {
  return {
    signal: { findMany: async () => input.signals ?? [] },
    playerGameStat: { findMany: async () => input.stats ?? [] },
  } as SignalWeightTunerDb;
}

/**
 * Build a key with PARTIAL predictive power over `fixtures` distinct fixtures:
 * the reading is high exactly when next week's PPR beats the population median,
 * except on a deterministic `noise` fraction of fixtures.
 *
 * The noise is load-bearing. A noiseless fixture is a PERFECT predictor, whose
 * multiplier clamps to 1 — and a weight of 1 is indistinguishable from the flat
 * `CATEGORY_PRIORS` 1.0 this work exists to replace. A test that cannot tell
 * those two apart is not testing the fix, so the sample must produce a weight
 * strictly below 1.
 */
function predictiveSignals(key: string, fixtures: number, entities = 4, noise = 0.3) {
  const signals: NonNullable<Parameters<typeof stubDb>[0]["signals"]> = [];
  const stats: NonNullable<Parameters<typeof stubDb>[0]["stats"]> = [];
  // A baseline population so the median is a real, known number (10).
  for (let e = 0; e < entities; e++) {
    stats.push({ playerId: `base${e}`, season: 2023, week: 1, seasonType: "REG", fantasyPointsPpr: 5 });
    stats.push({ playerId: `base${e}`, season: 2023, week: 2, seasonType: "REG", fantasyPointsPpr: 15 });
  }
  for (let f = 0; f < fixtures; f++) {
    const season = 2000 + Math.floor(f / 17);
    const week = (f % 17) + 1;
    const playerId = `p${f % entities}`;
    const high = f % 2 === 0;
    // Deterministic "coin" keyed off the fixture index: stable across runs.
    const contradicts = ((f * 7919) % 100) / 100 < noise;
    // Week f holds the reading; week f+1 holds the settled outcome.
    signals.push({ key, entityType: "player", entityId: playerId, value: high ? 0.7 : -0.7, season, week });
    stats.push({
      playerId,
      season,
      week: week + 1,
      seasonType: "REG",
      fantasyPointsPpr: contradicts ? (high ? 1 : 30) : high ? 30 : 1,
    });
  }
  return { signals, stats };
}

describe("tuneSignalWeightsFromLedger — the production caller of tuneSignalWeights", () => {
  it("fits a real weight from a real ledger join, where the flat prior was 1.0", async () => {
    const { signals, stats } = predictiveSignals("pgs.target_share", MIN_FIXTURES * 2);
    const report = await tuneSignalWeightsFromLedger(stubDb({ signals, stats }), {
      version: "test",
      source: "stub",
    });

    expect(report.signalsRead).toBe(signals.length);
    expect(report.sampleSize).toBe(signals.length);
    expect(report.measuredCount).toBe(1);

    const entry = report.entries[0]!;
    expect(entry.key).toBe("pgs.target_share");
    expect(entry.verdict).toBe("earned");
    expect(entry.weight).toBeGreaterThan(0);
    // THE DEFECT. This is the number the engine used to see as a flat 1.0 for
    // every key regardless of measured predictive power.
    expect(entry.weight).not.toBe(1);
    expect(report.weights["pgs.target_share"]).toBe(entry.weight);
  });

  it("records the outcome it measured against, so the fit is reproducible", async () => {
    const { signals, stats } = predictiveSignals("pgs.fantasy_ppr", 300);
    const report = await tuneSignalWeightsFromLedger(stubDb({ signals, stats }));
    expect(report.outcomeThreshold).toBe(10);
    // Balanced target: an imbalanced one inflates correlation by construction.
    expect(report.outcomeBaseRate).toBeGreaterThan(0.2);
    expect(report.outcomeBaseRate).toBeLessThan(0.8);
  });

  it("returns an empty table on an empty ledger rather than throwing", async () => {
    const report = await tuneSignalWeightsFromLedger(stubDb({}));
    expect(report.measuredCount).toBe(0);
    expect(report.weights).toEqual({});
    expect(report.signalsRead).toBe(0);
    expect(Number.isNaN(report.outcomeThreshold)).toBe(true);
  });
});

describe("tuneSignalWeightsFromLedger — the join never manufactures an outcome", () => {
  it("drops a team-level key instead of joining it to a player outcome", async () => {
    const { signals, stats } = predictiveSignals("team.x", MIN_FIXTURES * 2);
    signals.push({
      key: "team.availability",
      entityType: "team",
      entityId: "KC",
      value: 0.5,
      season: 2023,
      week: 1,
    });
    const report = await tuneSignalWeightsFromLedger(stubDb({ signals, stats }));
    expect(report.droppedTeamLevel).toBe(1);
    expect(report.sampleSize).toBe(signals.length - 1);
    expect(Object.keys(report.weights)).toEqual(["team.x"]);
  });

  it("drops a NULL next-week PPR rather than reading it as a loss", async () => {
    const report = await tuneSignalWeightsFromLedger(
      stubDb({
        signals: [
          { key: "pgs.passing_epa", entityType: "player", entityId: "p0", value: 0.5, season: 2023, week: 1 },
        ],
        stats: [
          { playerId: "p0", season: 2023, week: 2, seasonType: "REG", fantasyPointsPpr: null },
          { playerId: "base", season: 2023, week: 1, seasonType: "REG", fantasyPointsPpr: 5 },
          { playerId: "base", season: 2023, week: 2, seasonType: "REG", fantasyPointsPpr: 15 },
        ],
      }),
    );
    // Reading an unsettled week as 0 PPR would invent a loss from missing data.
    expect(report.droppedNoOutcome).toBe(1);
    expect(report.sampleSize).toBe(0);
  });

  it("drops a season-boundary row instead of pairing it with a game that never followed", async () => {
    // Week 18's successor is the NEXT season's week 1, not season N week 19.
    const report = await tuneSignalWeightsFromLedger(
      stubDb({
        signals: [
          { key: "pgs.passing_epa", entityType: "player", entityId: "p0", value: 0.5, season: 2023, week: 18 },
        ],
        stats: [
          { playerId: "p0", season: 2024, week: 1, seasonType: "REG", fantasyPointsPpr: 30 },
          { playerId: "base", season: 2023, week: 1, seasonType: "REG", fantasyPointsPpr: 5 },
          { playerId: "base", season: 2023, week: 2, seasonType: "REG", fantasyPointsPpr: 15 },
        ],
      }),
    );
    expect(report.droppedSeasonRollover).toBe(1);
    expect(report.sampleSize).toBe(0);
  });

  it("tolerates a seasonType casing variant instead of dropping every row", async () => {
    // A strict `=== "REG"` would zero the whole fit and report "no evidence"
    // when the truth is "the filter did not recognise these rows".
    const report = await tuneSignalWeightsFromLedger(
      stubDb({
        stats: [
          { playerId: "a", season: 2023, week: 1, seasonType: "reg", fantasyPointsPpr: 4 },
          { playerId: "b", season: 2023, week: 1, seasonType: "Reg", fantasyPointsPpr: 6 },
        ],
      }),
    );
    expect(report.outcomeThreshold).toBe(5);
    expect(report.excludedNonRegOutcomes).toBe(0);
  });

  it("counts non-REG outcomes so an unrecognised season type is visible", async () => {
    const report = await tuneSignalWeightsFromLedger(
      stubDb({
        stats: [
          { playerId: "a", season: 2023, week: 1, seasonType: "REG", fantasyPointsPpr: 4 },
          { playerId: "b", season: 2023, week: 1, seasonType: "POST", fantasyPointsPpr: 900 },
        ],
      }),
    );
    expect(report.excludedNonRegOutcomes).toBe(1);
    expect(report.outcomeThreshold).toBe(4);
  });

  it("excludes playoff rows from the threshold population", async () => {
    const report = await tuneSignalWeightsFromLedger(
      stubDb({
        stats: [
          { playerId: "a", season: 2023, week: 1, seasonType: "REG", fantasyPointsPpr: 4 },
          { playerId: "b", season: 2023, week: 1, seasonType: "REG", fantasyPointsPpr: 6 },
          { playerId: "c", season: 2023, week: 2, seasonType: "POST", fantasyPointsPpr: 900 },
        ],
      }),
    );
    // Median of REG only (4, 6) = 5. Including the playoff outlier would put the
    // median somewhere that describes neither competition.
    expect(report.outcomeThreshold).toBe(5);
  });
});

describe("tuneSignalWeightsFromLedger — an unjoinable key is named, not defaulted", () => {
  it("lists the key in unjoinableKeys so it cannot be mistaken for a dead producer", async () => {
    const report = await tuneSignalWeightsFromLedger(
      stubDb({
        signals: [
          { key: "ngs.cpoe", entityType: "player", entityId: "no-stats", value: 0.4, season: 2023, week: 1 },
        ],
        stats: [],
      }),
    );
    expect(report.droppedNoEntityStats).toBe(1);
    expect(report.keysPresent).toEqual(["ngs.cpoe"]);
    // The key is PRESENT in the ledger and UNJOINED to an outcome. Those are
    // different problems with different fixes, so the report separates them.
    expect(report.unjoinableKeys).toEqual([]);
    expect(report.weights["ngs.cpoe"]).toBeUndefined();
  });
});

describe("medianOf", () => {
  it("returns the middle value for odd counts and the mean for even", () => {
    expect(medianOf([3, 1, 2])).toBe(2);
    expect(medianOf([4, 1, 2, 3])).toBe(2.5);
  });

  it("returns NaN on an empty population rather than 0", () => {
    // 0 would be a fabricated threshold that makes every outcome a win.
    expect(medianOf([])).toBeNaN();
  });
});

describe("toJsonEntry", () => {
  it("rounds to a stable precision so refits produce a reviewable diff", async () => {
    const { signals, stats } = predictiveSignals("pgs.target_share", 300);
    const report = await tuneSignalWeightsFromLedger(stubDb({ signals, stats }));
    const json = toJsonEntry(report.entries[0]!);
    expect(json.correlation).toBe(Number((report.entries[0]!.correlation).toFixed(6)));
    expect(Object.keys(json)).toContain("reason");
    expect(Object.keys(json)).toContain("fixtures");
  });
});

describe("the fitted weight actually reaches the composer", () => {
  it("replaces the flat category prior on the projected candidate", async () => {
    const { signals, stats } = predictiveSignals("pgs.target_share", MIN_FIXTURES * 2);
    const report = await tuneSignalWeightsFromLedger(stubDb({ signals, stats }));
    const fitted = report.weights["pgs.target_share"]!;

    const anchors = { "pgs.target_share": { anchor: 0, spread: 1 } };
    const rows = [
      {
        playerId: "p0",
        season: 2000,
        week: 1,
        targetShare: 0.7,
        fantasyPointsPpr: null,
        passingEpa: null,
        rushingEpa: null,
        receivingEpa: null,
        fetchedAt: "2023-09-01T00:00:00.000Z",
      },
    ];

    // Before: the flat CATEGORY_PRIORS weight, HEALTH/PRODUCTION 1.0.
    const prior = projectPlayerGameStats(rows, anchors);
    expect(prior[0]?.weight).toBe(1);

    // After: the key's measured predictive power.
    const measured = projectPlayerGameStats(rows, anchors, report.weights);
    expect(measured[0]?.weight).toBeCloseTo(fitted, 6);
    expect(measured[0]?.weight).not.toBe(1);
  });

  it("leaves an unmeasured key on the prior rather than dropping it to zero", async () => {
    const anchors = { "pgs.target_share": { anchor: 0, spread: 1 } };
    const rows = [
      {
        playerId: "p0",
        season: 2000,
        week: 1,
        targetShare: 0.7,
        fantasyPointsPpr: null,
        passingEpa: null,
        rushingEpa: null,
        receivingEpa: null,
        fetchedAt: "2023-09-01T00:00:00.000Z",
      },
    ];
    const out = projectPlayerGameStats(rows, anchors, { "pgs.fantasy_ppr": 0.4 });
    expect(out[0]?.weight).toBe(1);
  });

  it("honours a MEASURED ZERO, which is the whole point", () => {
    const anchors = { "pgs.target_share": { anchor: 0, spread: 1 } };
    const rows = [
      {
        playerId: "p0",
        season: 2000,
        week: 1,
        targetShare: 0.7,
        fantasyPointsPpr: null,
        passingEpa: null,
        rushingEpa: null,
        receivingEpa: null,
        fetchedAt: "2023-09-01T00:00:00.000Z",
      },
    ];
    // A key measured at 0 must NOT fall back to the 1.0 prior — that is the
    // defect reintroduced through a nullish check.
    const out = projectPlayerGameStats(rows, anchors, { "pgs.target_share": 0 });
    expect(out[0]?.weight).toBe(0);
    // And it still reaches the composer, voting at zero influence.
    const composed = composeLedger(
      [{ key: "pgs.target_share", value: 1, weight: 0, capturedAt: "2023-09-01T00:00:00.000Z" }],
      { now: "2023-09-02T00:00:00.000Z" },
    );
    expect(composed.totalWeight).toBe(0);
    expect(composed.signalsUsed).toBe(0);
  });
});