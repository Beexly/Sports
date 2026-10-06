import { describe, expect, it } from "vitest";
import { gradeSelection } from "./grading.js";
import { runBacktest, toPreGameInputs } from "./harness.js";
import { parseHistoricalRowsJson } from "./loader.js";
import type { BacktestSelection, HistoricalGameRow, PreGameInputs, Scorer } from "./types.js";

// ---------------------------------------------------------------------------
// Synthetic fixtures. Clearly labelled as test data, never presented as a
// real corpus (README.md, "Refuses, never invents").
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<HistoricalGameRow> = {}): HistoricalGameRow {
  return {
    season: 2024,
    week: 1,
    kickoffUtc: "2024-09-08T17:00:00Z",
    homeTeam: "Home FC",
    awayTeam: "Away FC",
    homeScore: 24,
    awayScore: 20,
    closingSpreadHome: -3,
    closingTotal: 44,
    closingMlHome: -160,
    closingMlAway: 140,
    sourceUrl: "https://example.test/synthetic-fixture",
    ...overrides,
  };
}

// ============================================================
// Grading
// ============================================================

describe("gradeSelection — SPREAD", () => {
  it("grades a home cover as a WIN for HOME and a LOSS for AWAY", () => {
    // home 24, away 20, margin +4, line -3 -> home covers (4 - 3 = 1 > 0)
    const row = makeRow({ homeScore: 24, awayScore: 20, closingSpreadHome: -3 });
    const homeSel: BacktestSelection = { pickType: "SPREAD", side: "HOME", line: -3 };
    const awaySel: BacktestSelection = { pickType: "SPREAD", side: "AWAY", line: -3 };
    expect(gradeSelection(row, homeSel)).toBe("WIN");
    expect(gradeSelection(row, awaySel)).toBe("LOSS");
  });

  it("grades an away cover correctly", () => {
    // home 20, away 24, margin -4, line -3 -> home fails to cover (-4 - 3 = -7 < 0)
    const row = makeRow({ homeScore: 20, awayScore: 24, closingSpreadHome: -3 });
    const homeSel: BacktestSelection = { pickType: "SPREAD", side: "HOME", line: -3 };
    const awaySel: BacktestSelection = { pickType: "SPREAD", side: "AWAY", line: -3 };
    expect(gradeSelection(row, homeSel)).toBe("LOSS");
    expect(gradeSelection(row, awaySel)).toBe("WIN");
  });

  it("grades a PUSH only when the integer line exactly cancels the margin", () => {
    // home 23, away 20, margin +3, line -3 -> exactly 0
    const row = makeRow({ homeScore: 23, awayScore: 20, closingSpreadHome: -3 });
    const homeSel: BacktestSelection = { pickType: "SPREAD", side: "HOME", line: -3 };
    expect(gradeSelection(row, homeSel)).toBe("PUSH");
  });

  it("can never PUSH on a half-point (non-integer) line, across a full margin sweep", () => {
    for (let margin = -10; margin <= 10; margin += 1) {
      const row = makeRow({ homeScore: 20 + Math.max(margin, 0), awayScore: 20 + Math.max(-margin, 0) });
      const sel: BacktestSelection = { pickType: "SPREAD", side: "HOME", line: -3.5 };
      expect(gradeSelection(row, sel)).not.toBe("PUSH");
    }
  });
});

describe("gradeSelection — TOTAL", () => {
  it("grades OVER/UNDER against the combined score", () => {
    const row = makeRow({ homeScore: 24, awayScore: 20 }); // combined 44
    const over: BacktestSelection = { pickType: "TOTAL", side: "OVER", line: 43.5 };
    const under: BacktestSelection = { pickType: "TOTAL", side: "UNDER", line: 43.5 };
    expect(gradeSelection(row, over)).toBe("WIN");
    expect(gradeSelection(row, under)).toBe("LOSS");
  });

  it("grades a PUSH when the integer total line exactly matches the combined score", () => {
    const row = makeRow({ homeScore: 24, awayScore: 20 }); // combined 44
    const over: BacktestSelection = { pickType: "TOTAL", side: "OVER", line: 44 };
    expect(gradeSelection(row, over)).toBe("PUSH");
  });
});

describe("gradeSelection — MONEYLINE", () => {
  it("grades the winner as a WIN and the loser as a LOSS", () => {
    const row = makeRow({ homeScore: 24, awayScore: 20 });
    const home: BacktestSelection = { pickType: "MONEYLINE", side: "HOME", line: null };
    const away: BacktestSelection = { pickType: "MONEYLINE", side: "AWAY", line: null };
    expect(gradeSelection(row, home)).toBe("WIN");
    expect(gradeSelection(row, away)).toBe("LOSS");
  });

  it("grades a tie as a PUSH", () => {
    const row = makeRow({ homeScore: 17, awayScore: 17 });
    const home: BacktestSelection = { pickType: "MONEYLINE", side: "HOME", line: null };
    expect(gradeSelection(row, home)).toBe("PUSH");
  });
});

// ============================================================
// runBacktest: refuses empty / malformed corpora
// ============================================================

describe("runBacktest — refuses rather than invents", () => {
  const alwaysHome: Scorer = () => ({ pickType: "MONEYLINE", side: "HOME", line: null });

  it("throws on an empty corpus", () => {
    expect(() => runBacktest([], alwaysHome)).toThrow(/empty corpus/i);
  });

  it("throws on a malformed row instead of coercing it", () => {
    const badRow = makeRow({ homeTeam: "" });
    expect(() => runBacktest([badRow], alwaysHome)).toThrow(/homeTeam/);
  });

  it("throws when home and away teams are identical", () => {
    const badRow = makeRow({ homeTeam: "Same FC", awayTeam: "Same FC" });
    expect(() => runBacktest([badRow], alwaysHome)).toThrow(/must differ/);
  });
});

// ============================================================
// runBacktest: aggregation — pushes are never averaged into a win rate
// ============================================================

describe("runBacktest — decided-only aggregation", () => {
  it("computes decidedWinRate as wins / (wins + losses), pushes reported separately", () => {
    // Row A: home 24-20, line -3 -> HOME covers -> WIN
    // Row B: home 17-24, line -3 -> HOME fails to cover -> LOSS
    // Row C: home 23-20, line -3 -> exact PUSH
    const rows: HistoricalGameRow[] = [
      makeRow({ homeScore: 24, awayScore: 20, closingSpreadHome: -3 }),
      makeRow({ homeScore: 17, awayScore: 24, closingSpreadHome: -3 }),
      makeRow({ homeScore: 23, awayScore: 20, closingSpreadHome: -3 }),
    ];
    const homeSpreadScorer: Scorer = (game) => ({
      pickType: "SPREAD",
      side: "HOME",
      line: game.closingSpreadHome,
    });

    const report = runBacktest(rows, homeSpreadScorer);

    expect(report.corpusSize).toBe(3);
    expect(report.gradedCount).toBe(3);
    expect(report.declinedCount).toBe(0);

    const spread = report.byPickType.find((a) => a.pickType === "SPREAD");
    expect(spread).toBeDefined();
    expect(spread?.wins).toBe(1);
    expect(spread?.losses).toBe(1);
    expect(spread?.pushes).toBe(1);
    expect(spread?.decidedCount).toBe(2);
    // Must be exactly 1/2, never 1.5/3 (a push counted as a half win) or 1/3.
    expect(spread?.decidedWinRate).toBeCloseTo(0.5, 10);

    expect(report.overall.wins).toBe(1);
    expect(report.overall.losses).toBe(1);
    expect(report.overall.pushes).toBe(1);
    expect(report.overall.decidedWinRate).toBeCloseTo(0.5, 10);
  });

  it("reports decidedWinRate as null when there are zero decided rows", () => {
    const rows: HistoricalGameRow[] = [makeRow({ homeScore: 23, awayScore: 20, closingSpreadHome: -3 })];
    const homeSpreadScorer: Scorer = (game) => ({
      pickType: "SPREAD",
      side: "HOME",
      line: game.closingSpreadHome,
    });
    const report = runBacktest(rows, homeSpreadScorer);
    const spread = report.byPickType.find((a) => a.pickType === "SPREAD");
    expect(spread?.pushes).toBe(1);
    expect(spread?.decidedCount).toBe(0);
    expect(spread?.decidedWinRate).toBeNull();
  });

  it("counts scorer declines (null) separately and excludes them from grading", () => {
    const rows: HistoricalGameRow[] = [makeRow(), makeRow({ homeTeam: "Other Home" })];
    const alwaysDecline: Scorer = () => null;
    const report = runBacktest(rows, alwaysDecline);
    expect(report.gradedCount).toBe(0);
    expect(report.declinedCount).toBe(2);
    expect(report.overall.decidedCount).toBe(0);
  });

  it("always reports all three pick types, even with zero rows for a type", () => {
    const rows: HistoricalGameRow[] = [makeRow()];
    const onlyMoneyline: Scorer = () => ({ pickType: "MONEYLINE", side: "HOME", line: null });
    const report = runBacktest(rows, onlyMoneyline);
    const pickTypes = report.byPickType.map((a) => a.pickType).sort();
    expect(pickTypes).toEqual(["MONEYLINE", "SPREAD", "TOTAL"]);
    const spread = report.byPickType.find((a) => a.pickType === "SPREAD");
    expect(spread?.decidedCount).toBe(0);
    expect(spread?.decidedWinRate).toBeNull();
  });
});

// ============================================================
// Leakage test (mandatory)
// ============================================================

describe("runBacktest — leakage", () => {
  it("STRUCTURAL: never passes homeScore/awayScore keys to the scorer", () => {
    const rows: HistoricalGameRow[] = [
      makeRow({ homeScore: 24, awayScore: 20 }),
      makeRow({ homeTeam: "Other Home", homeScore: 3, awayScore: 45 }),
    ];
    const observedKeys: string[][] = [];
    const spy: Scorer = (game) => {
      observedKeys.push(Object.keys(game).sort());
      return { pickType: "MONEYLINE", side: "HOME", line: null };
    };

    runBacktest(rows, spy);

    expect(observedKeys).toHaveLength(2);
    for (const keys of observedKeys) {
      expect(keys).not.toContain("homeScore");
      expect(keys).not.toContain("awayScore");
    }
  });

  it("BEHAVIORAL: mutating the outcome columns never changes the selection made", () => {
    const originalRows: HistoricalGameRow[] = [
      makeRow({ homeScore: 24, awayScore: 20, closingSpreadHome: -3 }),
      makeRow({ homeTeam: "Other Home", homeScore: 10, awayScore: 30, closingSpreadHome: 6 }),
      makeRow({ homeTeam: "Third Home", homeScore: 0, awayScore: 0, closingSpreadHome: -1 }),
    ];

    // Wildly different, deliberately implausible outcomes — the point is
    // that these values must have zero effect on what the scorer picks.
    const mutatedRows: HistoricalGameRow[] = originalRows.map((row, i) => ({
      ...row,
      homeScore: 999 + i,
      awayScore: 1 + i,
    }));

    // A scorer that only reads pre-game fields, by contract.
    const spreadFavoriteScorer: Scorer = (game: PreGameInputs) => ({
      pickType: "SPREAD",
      side: game.closingSpreadHome < 0 ? "HOME" : "AWAY",
      line: game.closingSpreadHome,
    });

    const originalReport = runBacktest(originalRows, spreadFavoriteScorer);
    const mutatedReport = runBacktest(mutatedRows, spreadFavoriteScorer);

    const originalSelections = originalReport.graded.map((g) => g.selection);
    const mutatedSelections = mutatedReport.graded.map((g) => g.selection);

    expect(mutatedSelections).toEqual(originalSelections);
  });
});

// ============================================================
// toPreGameInputs
// ============================================================

describe("toPreGameInputs", () => {
  it("strips homeScore and awayScore and keeps every other field", () => {
    const row = makeRow();
    const preGame = toPreGameInputs(row);
    expect(Object.keys(preGame).sort()).not.toContain("homeScore");
    expect(Object.keys(preGame).sort()).not.toContain("awayScore");
    expect(preGame.homeTeam).toBe(row.homeTeam);
    expect(preGame.closingSpreadHome).toBe(row.closingSpreadHome);
  });
});

// ============================================================
// loader.ts — pure JSON parsing
// ============================================================

describe("parseHistoricalRowsJson", () => {
  it("parses a valid JSON array of rows", () => {
    const rows = [makeRow()];
    const parsed = parseHistoricalRowsJson(JSON.stringify(rows));
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.homeTeam).toBe(rows[0]?.homeTeam);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseHistoricalRowsJson("{not json")).toThrow(/invalid JSON/i);
  });

  it("throws on an empty array", () => {
    expect(() => parseHistoricalRowsJson("[]")).toThrow(/empty corpus/i);
  });

  it("throws on a row missing a required field", () => {
    const bad = [{ season: 2024 }];
    expect(() => parseHistoricalRowsJson(JSON.stringify(bad))).toThrow(/missing required field/);
  });

  it("throws when the top level is not an array", () => {
    expect(() => parseHistoricalRowsJson(JSON.stringify({ season: 2024 }))).toThrow(/JSON array/i);
  });
});
