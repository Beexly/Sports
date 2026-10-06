import { describe, expect, it } from "vitest";
import { scoreGame } from "../scoring.js";
import type { CalibrationHistoryRow, OddsInput, ScoredPick } from "@sports/types";

/**
 * A pooled calibration score can read as calm while a path, a stratum, or a
 * tail is broken. That history may only WITHHOLD a pick. It must not move
 * confidence, edge, selection, line, or ranking on a pick that survives.
 * No history is silence, not a veto.
 */

const BOOKS = ["fanduel", "draftkings", "betmgm", "caesars", "pointsbet"];
const ML_BOOKS = [...BOOKS, "betrivers", "wynn", "bet365", "espnbet", "fanatics"];

/** Game context strong enough that the moneyline clears MIN_PUBLISH_CONFIDENCE. */
const ML_CONTEXT = {
  homeAtsForm: { wins: 6, losses: 2, pushes: 0, sampleSize: 8 },
  awayAtsForm: { wins: 2, losses: 6, pushes: 0, sampleSize: 8 },
  homeAtsFormAtHome: { wins: 4, losses: 1, pushes: 0, sampleSize: 5 },
  awayAtsFormAway: { wins: 1, losses: 4, pushes: 0, sampleSize: 5 },
  headToHeadForm: { wins: 3, losses: 0, pushes: 0, sampleSize: 3 },
  restDaysHome: 7,
  restDaysAway: 3,
  dataQualityScore: 10,
} as const;

function spreadInput(history?: CalibrationHistoryRow[]): OddsInput {
  return {
    gameId: "nhl-calibration-blindspot",
    homeTeam: "Bruins",
    awayTeam: "Leafs",
    commenceTime: new Date("2026-04-15T18:00:00Z"),
    sport: "NHL",
    bookmakerOdds: BOOKS.map((bookmaker) => ({
      bookmaker,
      market: "SPREADS" as const,
      spread: -1.5,
      homeSpreadPrice: -110,
      awaySpreadPrice: -110,
    })),
    context: history ? { bookmakerCoverageMax: BOOKS.length, calibrationHistory: history } : { bookmakerCoverageMax: BOOKS.length },
  };
}

function totalInput(history?: CalibrationHistoryRow[]): OddsInput {
  return {
    gameId: "nfl-calibration-blindspot-total",
    homeTeam: "Fixture Home",
    awayTeam: "Fixture Away",
    commenceTime: new Date("2026-09-13T17:00:00Z"),
    sport: "NFL",
    bookmakerOdds: BOOKS.map((bookmaker) => ({
      bookmaker,
      market: "TOTALS" as const,
      total: 45.5,
      overPrice: -110,
      underPrice: -110,
    })),
    context: history ? { bookmakerCoverageMax: BOOKS.length, calibrationHistory: history } : { bookmakerCoverageMax: BOOKS.length },
  };
}

function moneylineInput(history?: CalibrationHistoryRow[]): OddsInput {
  return {
    gameId: "nfl-calibration-blindspot-ml",
    homeTeam: "Chiefs",
    awayTeam: "Bills",
    commenceTime: new Date("2026-09-10T18:00:00Z"),
    sport: "NFL",
    bookmakerOdds: [
      // The spread market must be present for the moneyline scorer to run:
      // it reads cross-market context from the same input. Without these rows
      // the H2H-only input mints no moneyline pick at all, and "withholds"
      // would pass for the wrong reason.
      ...BOOKS.map((bookmaker) => ({
        bookmaker,
        market: "SPREADS" as const,
        spread: -3.5,
        homeSpreadPrice: -110,
        awaySpreadPrice: -110,
      })),
      ...ML_BOOKS.map((bookmaker) => ({
        bookmaker,
        market: "H2H" as const,
        homePrice: -180,
        awayPrice: 155,
      })),
    ],
    // A moneyline confidence sum is consensus + depth + game-context + 10; it
    // no longer includes the market-echo edgeComponent term. A bare two-sided
    // board therefore lands near 27 and never clears MIN_PUBLISH_CONFIDENCE,
    // so the context must carry the rest. Without a strong context this test
    // would assert "withheld" against a pick that was never minted at all.
    context: history
      ? { ...ML_CONTEXT, bookmakerCoverageMax: ML_BOOKS.length, calibrationHistory: history }
      : { ...ML_CONTEXT, bookmakerCoverageMax: ML_BOOKS.length },
  };
}

const spread = (picks: ScoredPick[]): ScoredPick | undefined => picks.find((p) => p.pickType === "SPREAD");
const total = (picks: ScoredPick[]): ScoredPick | undefined => picks.find((p) => p.pickType === "TOTAL");
const moneyline = (picks: ScoredPick[]): ScoredPick | undefined => picks.find((p) => p.pickType === "MONEYLINE");

function brokenPath(): CalibrationHistoryRow[] {
  return Array.from({ length: 200 }, (_, i) => ({
    p: 0.5,
    y: (i < 100 ? 1 : 0) as 0 | 1,
    stratum: "all",
    path: i,
  }));
}

function calmHistory(): CalibrationHistoryRow[] {
  return Array.from({ length: 200 }, (_, i) => ({
    p: 0.5,
    y: (i % 2 === 0 ? 1 : 0) as 0 | 1,
    stratum: i < 100 ? "A" : "B",
    path: i,
  }));
}

describe("calibration blind-spot withhold", () => {
  it("publishes when no calibration history is attached", () => {
    expect(spread(scoreGame(spreadInput()))).toBeDefined();
    expect(total(scoreGame(totalInput()))).toBeDefined();
    expect(moneyline(scoreGame(moneylineInput()))).toBeDefined();
  });

  it("withholds spread, total, and moneyline when the history cancels inside the pool", () => {
    expect(spread(scoreGame(spreadInput(brokenPath())))).toBeUndefined();
    expect(total(scoreGame(totalInput(brokenPath())))).toBeUndefined();
    expect(moneyline(scoreGame(moneylineInput(brokenPath())))).toBeUndefined();
  });

  it("withholds when the attached history cannot be read", () => {
    const corrupt: CalibrationHistoryRow[] = [{ p: 1.4, y: 1, stratum: "all", path: 0 }];
    expect(spread(scoreGame(spreadInput(corrupt)))).toBeUndefined();
  });

  it("leaves the published pick identical when the history is actually calm", () => {
    const baseline = spread(scoreGame(spreadInput()))!;
    const calm = spread(scoreGame(spreadInput(calmHistory())))!;
    expect(calm.confidence).toBe(baseline.confidence);
    expect(calm.edgeScore).toBe(baseline.edgeScore);
    expect(calm.selection).toBe(baseline.selection);
    expect(calm.line).toBe(baseline.line);
    expect(calm.rankingScore).toBe(baseline.rankingScore);
  });
});
