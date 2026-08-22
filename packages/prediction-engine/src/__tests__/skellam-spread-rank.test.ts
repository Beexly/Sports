import { describe, expect, it } from "vitest";
import { scoreGame } from "../scoring.js";
import { SKELLAM_COVER_SOURCE, skellamCoverFairValue } from "../skellam.js";
import type { IndependentMarketFairValue, OddsInput, ScoredPick } from "@sports/types";

const BOOKS = ["fanduel", "draftkings", "betmgm", "caesars", "pointsbet"];

function spreadInput(independentFairValues?: IndependentMarketFairValue[]): OddsInput {
  return {
    gameId: "nhl-1",
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
    context: { bookmakerCoverageMax: BOOKS.length, independentFairValues },
  };
}

const spread = (picks: ScoredPick[]) => picks.find((p) => p.pickType === "SPREAD")!;
const ml = (picks: ScoredPick[]) => picks.find((p) => p.pickType === "MONEYLINE");

describe("skellamCoverFairValue", () => {
  it("renormalises cover sides so they sum to 1", () => {
    const fv = skellamCoverFairValue({
      sportKey: "icehockey_nhl",
      lambdaHome: 3.1,
      lambdaAway: 2.4,
      spreadHome: -1.5,
    });
    expect(fv).toBeTruthy();
    expect(fv!.homeFairProb + fv!.awayFairProb).toBeCloseTo(1, 5);
    expect(fv!.homeFairProb).toBeGreaterThan(0);
    expect(fv!.awayFairProb).toBeGreaterThan(0);
  });

  it("refuses basketball", () => {
    expect(
      skellamCoverFairValue({
        sportKey: "basketball_nba",
        lambdaHome: 110,
        lambdaAway: 108,
        spreadHome: -3.5,
      }),
    ).toBeNull();
  });
});

describe("scoreSpreadPick — Skellam ATS ranking", () => {
  it("leaves heuristic confidence unchanged and prices ranking when skellam_cover is present", () => {
    const baseline = spread(scoreGame(spreadInput(undefined)));
    const cover = skellamCoverFairValue({
      sportKey: "icehockey_nhl",
      lambdaHome: 3.4,
      lambdaAway: 2.2,
      spreadHome: -1.5,
    })!;
    const withSkellam = spread(
      scoreGame(
        spreadInput([
          {
            source: SKELLAM_COVER_SOURCE,
            homeFairProb: cover.homeFairProb,
            awayFairProb: cover.awayFairProb,
          },
        ]),
      ),
    );
    expect(withSkellam.confidence).toBe(baseline.confidence);
    expect(withSkellam.edgeScore).toBe(baseline.edgeScore);
    expect(withSkellam.rankingScore).not.toBe(baseline.rankingScore ?? baseline.confidence);
    expect(withSkellam.factorBreakdown.rankingSource).not.toBe("confidence");
    expect(withSkellam.factorBreakdown.independentEdge?.sources).toEqual([SKELLAM_COVER_SOURCE]);
    expect(withSkellam.factorBreakdown.factors.some((f) => f.name.startsWith("Independent Edge"))).toBe(
      true,
    );
  });

  it("does not let skellam_cover pollute moneyline ranking", () => {
    const ten = [...BOOKS, "betrivers", "wynn", "bet365", "espnbet", "fanatics"];
    const picks = scoreGame({
      gameId: "nhl-ml",
      homeTeam: "Bruins",
      awayTeam: "Leafs",
      commenceTime: new Date("2026-04-15T18:00:00Z"),
      sport: "NHL",
      bookmakerOdds: ten.map((bookmaker) => ({
        bookmaker,
        market: "H2H" as const,
        homePrice: -350,
        awayPrice: 290,
      })),
      context: {
        bookmakerCoverageMax: ten.length,
        independentFairValues: [
          { source: SKELLAM_COVER_SOURCE, homeFairProb: 0.91, awayFairProb: 0.09 },
        ],
      },
    });
    const money = ml(picks);
    expect(money).toBeTruthy();
    expect(money!.factorBreakdown.independentEdge).toBeUndefined();
    expect(money!.rankingScore).toBe(money!.confidence);
  });
});
