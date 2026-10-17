import { describe, it } from "vitest";
import { scoreGame, americanToImpliedProbability } from "../scoring.js";
import type { OddsInput } from "@sports/types";

describe("Live MNF Engine Scoring - Buffalo Bills @ LA Rams", () => {
  it("scores live MNF board through real prediction engine", () => {
    const oddsInput: OddsInput = {
      sport: "americanfootball_nfl",
      gameId: "401872994",
      homeTeam: "Los Angeles Rams",
      awayTeam: "Buffalo Bills",
      commenceTime: new Date("2026-10-13T00:15:00.000Z"),
      bookmakerOdds: [
        // 5 books to ensure deep consensus
        { bookmaker: "draftkings", market: "SPREADS", spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
        { bookmaker: "draftkings", market: "H2H", homePrice: -185, awayPrice: 154 },
        { bookmaker: "draftkings", market: "TOTALS", total: 55.5, overPrice: -110, underPrice: -110 },
        { bookmaker: "fanduel", market: "SPREADS", spread: -3.5, homeSpreadPrice: -112, awaySpreadPrice: -108 },
        { bookmaker: "fanduel", market: "H2H", homePrice: -180, awayPrice: 152 },
        { bookmaker: "fanduel", market: "TOTALS", total: 55.5, overPrice: -108, underPrice: -112 },
        { bookmaker: "betmgm", market: "SPREADS", spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
        { bookmaker: "betmgm", market: "H2H", homePrice: -185, awayPrice: 150 },
        { bookmaker: "betmgm", market: "TOTALS", total: 55.5, overPrice: -110, underPrice: -110 },
        { bookmaker: "caesars", market: "SPREADS", spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
        { bookmaker: "caesars", market: "H2H", homePrice: -185, awayPrice: 155 },
        { bookmaker: "caesars", market: "TOTALS", total: 55.5, overPrice: -110, underPrice: -110 },
        { bookmaker: "pointsbet", market: "SPREADS", spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
        { bookmaker: "pointsbet", market: "H2H", homePrice: -185, awayPrice: 155 },
        { bookmaker: "pointsbet", market: "TOTALS", total: 55.5, overPrice: -110, underPrice: -110 },
      ],
      context: {
        spreadOpeningLine: -3.5,
        totalOpeningLine: 54.5,
        homeRestDays: 7,
        awayRestDays: 7,
        homeAtsForm: { coverCount: 3, gameCount: 5, pushCount: 0 },
        awayAtsForm: { coverCount: 3, gameCount: 5, pushCount: 0 },
        isDivisional: false,
      },
    };

    const picks = scoreGame(oddsInput);
    console.log(`\n=== REAL ENGINE RESULT: ${picks.length} PICKS GENERATED ===`);
    for (const p of picks) {
      console.log(`\n--- [${p.pickType}] ${p.selection} ---`);
      console.log(`Line: ${p.line} @ ${p.entryPrice}`);
      console.log(`Tier: ${p.tier} | Confidence: ${p.confidence.toFixed(1)} | Grade: ${p.pickGrade}`);
      console.log(`Edge Score: ${p.edgeScore.toFixed(3)}`);
      console.log(`Market Fair Prob: ${p.marketFairProb?.toFixed(3) ?? "N/A"}`);
      if (p.factorBreakdown.independentEdge) {
        console.log(`Independent Edge Decision: ${p.factorBreakdown.independentEdge.decision}`);
        console.log(`Raw Edge: ${(p.factorBreakdown.independentEdge.rawEdge * 100).toFixed(2)}%`);
      }
    }
  });
});
