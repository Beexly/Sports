import { describe, expect, it } from "vitest";
import { scoreGame } from "../scoring.js";
import { shinFairForSide } from "../honesty/devig-method-compare.js";
import { americanToImpliedProbability } from "../scoring.js";
import type { OddsInput, ScoredPick } from "@sports/types";

// Moneyline scoring requires a deep book set before it will publish a pick.
const BOOKS = [
  "fanduel",
  "draftkings",
  "betmgm",
  "caesars",
  "pointsbet",
  "betrivers",
  "wynn",
  "bet365",
  "espnbet",
  "fanatics",
];

function h2hInput(homePrice: number, awayPrice: number): OddsInput {
  return {
    gameId: "g1",
    homeTeam: "Chiefs",
    awayTeam: "Bills",
    commenceTime: new Date("2026-09-10T18:00:00Z"),
    sport: "NFL",
    bookmakerOdds: BOOKS.map((bookmaker) => ({
      bookmaker,
      market: "H2H" as const,
      homePrice,
      awayPrice,
    })),
    context: { bookmakerCoverageMax: BOOKS.length },
  };
}

const ml = (picks: ScoredPick[]) => picks.find((p) => p.pickType === "MONEYLINE");

describe("shinFairForSide", () => {
  it("returns the chosen side, not always home", () => {
    const book = {
      homeImplied: americanToImpliedProbability(-350),
      awayImplied: americanToImpliedProbability(290),
    };
    const home = shinFairForSide(book, true);
    const away = shinFairForSide(book, false);
    expect(home).toBeGreaterThan(0.5);
    expect(away).toBeLessThan(0.5);
    // Two sides of one book must still be a probability pair.
    expect(home! + away!).toBeCloseTo(1, 6);
  });

  it("returns null on a degenerate book rather than inventing a price", () => {
    expect(shinFairForSide({ homeImplied: 0, awayImplied: 0.5 }, true)).toBeNull();
    expect(shinFairForSide({ homeImplied: Number.NaN, awayImplied: 0.5 }, true)).toBeNull();
  });

  it("agrees with proportional on a balanced book and diverges as the book tilts", () => {
    const gap = (home: number, away: number): number => {
      const hi = americanToImpliedProbability(home);
      const ai = americanToImpliedProbability(away);
      const proportional = hi / (hi + ai);
      return Math.abs(proportional - shinFairForSide({ homeImplied: hi, awayImplied: ai }, true)!);
    };
    // A symmetric book has no favourite–longshot bias to correct.
    expect(gap(-110, -110)).toBeLessThan(1e-6);
    // The heavier the favourite, the more the two methods disagree.
    const mild = gap(-350, 290);
    const heavy = gap(-2000, 1100);
    expect(mild).toBeGreaterThan(0.005);
    expect(heavy).toBeGreaterThan(mild);
  });
});

describe("scoring reports the de-vig method it actually used", () => {
  it("labels marketFairProb proportional and carries the Shin alternative", () => {
    const pick = ml(scoreGame(h2hInput(-350, 290)))!;
    const b = pick.factorBreakdown;
    expect(b.marketFairMethod).toBe("proportional");
    expect(typeof b.marketFairShinProb).toBe("number");
    // The disclosed pair must describe the SAME side the pick is on.
    expect(b.marketFairShinProb).toBeGreaterThan(0.5);
    expect(b.marketFairProb).toBeGreaterThan(0.5);
  });

  it("does not disturb the number scoring already published", () => {
    const pick = ml(scoreGame(h2hInput(-350, 290)))!;
    const hi = americanToImpliedProbability(-350);
    const ai = americanToImpliedProbability(290);
    // marketFairProb is still exactly the proportional de-vig, unchanged.
    expect(pick.factorBreakdown.marketFairProb).toBeCloseTo(hi / (hi + ai), 9);
  });

  it("on a heavy favourite the two methods differ by more than a typical claimed edge", () => {
    const pick = ml(scoreGame(h2hInput(-2000, 1100)))!;
    const b = pick.factorBreakdown;
    const delta = Math.abs(b.marketFairShinProb! - b.marketFairProb!);
    // ~1.5pt on the underdog at this price — wider than most edges we would claim,
    // which is exactly why the card must disclose the method rather than imply
    // a single canonical "fair" price.
    expect(delta).toBeGreaterThan(0.01);
  });
});
