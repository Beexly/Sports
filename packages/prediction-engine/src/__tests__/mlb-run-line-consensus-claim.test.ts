import { describe, it, expect } from "vitest";
import { scoreGame } from "../scoring.js";
import type { OddsInput } from "@sports/types";

// ============================================================
// Honesty defect (AGENTS.md, measured 2026-09-13 production):
// every published MLB SPREAD pick's `consensusPct` reads exactly 1.0000.
// The run line is a FIXED ladder (1.5 standard, 2.5/3.5 alternates only),
// so "N% bookmaker consensus" is structurally near-guaranteed on this one
// market and reads to a customer as independent book agreement that the
// side is a good bet, which it is not. TOTAL and MONEYLINE picks genuinely
// vary and must keep the honest claim.
//
// This suite pins the fix: the SPREAD reasoning strings stop asserting
// book agreement for baseball run lines (the claim), while `consensusPct`
// itself stays on the pick unmodified (the number is never hidden) and
// every non-baseball / non-SPREAD path keeps reporting a genuinely varying
// consensus exactly as before (negative controls).
// ============================================================

const CONSENSUS_CLAIM_RE = /\d{1,3}%\s+bookmaker consensus/i;

const runLineInput = (): OddsInput => ({
  gameId: "mlb-run-line-1",
  homeTeam: "St. Louis Cardinals",
  awayTeam: "Texas Rangers",
  commenceTime: new Date("2026-06-01T18:00:00Z"),
  sport: "baseball_mlb",
  bookmakerOdds: ["fanduel", "draftkings", "betmgm", "caesars", "pointsbet"].map(
    (bookmaker) => ({
      bookmaker,
      market: "SPREADS" as const,
      spread: -1.5,
      homeSpreadPrice: -140,
      awaySpreadPrice: 120,
    }),
  ),
});

describe("MLB run-line SPREAD reasoning — consensus claim honesty fix", () => {
  it("consensusPct is genuinely saturated at 1.0 on a fixed run line (confirms the defect)", () => {
    const pick = scoreGame(runLineInput()).find((p) => p.pickType === "SPREAD");
    expect(pick).toBeTruthy();
    expect(pick!.consensusPct).toBe(1);
  });

  it("does NOT claim a quantified 'bookmaker consensus' for a baseball run line", () => {
    const pick = scoreGame(runLineInput()).find((p) => p.pickType === "SPREAD");
    expect(pick).toBeTruthy();
    expect(pick!.reasoningShort).not.toMatch(CONSENSUS_CLAIM_RE);
    expect(pick!.reasoning).not.toMatch(/backed by \d{1,3}% of \d+ bookmakers/i);
  });

  it("still reports the real bookmaker count honestly, and names the run line as fixed", () => {
    const pick = scoreGame(runLineInput()).find((p) => p.pickType === "SPREAD");
    expect(pick).toBeTruthy();
    expect(pick!.reasoningShort).toContain("5 bookmakers");
    expect(pick!.reasoningShort.toLowerCase()).toContain("run line");
    expect(pick!.reasoning.toLowerCase()).toContain("fixed");
  });

  it("does not suppress consensusPct: the number still ships on the pick and factor breakdown", () => {
    const pick = scoreGame(runLineInput()).find((p) => p.pickType === "SPREAD");
    expect(pick).toBeTruthy();
    expect(typeof pick!.consensusPct).toBe("number");
    expect(pick!.consensusPct).toBe(1);
    expect(typeof pick!.factorBreakdown.consensusScore).toBe("number");
  });

  it("never emits an em dash in the new baseball reasoning strings", () => {
    const pick = scoreGame(runLineInput()).find((p) => p.pickType === "SPREAD");
    expect(pick).toBeTruthy();
    expect(pick!.reasoning).not.toContain("—");
    expect(pick!.reasoningShort).not.toContain("—");
  });
});

describe("negative control — a genuinely varying consensus is still reported as varying", () => {
  it("a non-baseball SPREAD pick still claims a quantified bookmaker consensus", () => {
    const books = [
      "fanduel", "draftkings", "betmgm", "caesars", "pointsbet",
      "williamhill", "unibet", "betrivers", "bovada", "superbook",
    ];
    // 8 of 10 books home-favored -> consensusPct = 0.8, genuinely below 1.0.
    // The 2 dissenting books sit close to the pack (+0.5, not the old +2.0),
    // which keeps spreadOfSpreads at 1.4 (under the >1.5 volatility-penalty
    // threshold in computeVolatilityPenalty) and 10 full-price books clear
    // the market-depth ideal, so confidence lands at 55, above
    // MIN_PUBLISH_CONFIDENCE (50) and the pick actually mints. The prior
    // 9-book fixture (7 of 9 home-favored, dissent at +2.0) tripped that same
    // confidence floor: consensus 0.778 plus a -5 line-variance penalty plus
    // a small negative pricing edge landed at ~46, so scoreGame silently
    // returned no SPREAD pick and this negative control asserted nothing.
    const spreads = [-3.0, -3.0, -3.0, -3.0, -3.0, -3.0, -3.0, -3.0, 0.5, 0.5];
    const input: OddsInput = {
      gameId: "nfl-varying-1",
      homeTeam: "Chiefs",
      awayTeam: "Eagles",
      commenceTime: new Date("2026-09-15T18:00:00Z"),
      sport: "NFL",
      bookmakerOdds: books.map((bookmaker, i) => ({
        bookmaker,
        market: "SPREADS" as const,
        spread: spreads[i]!,
        homeSpreadPrice: -110,
        awaySpreadPrice: -110,
      })),
    };
    const pick = scoreGame(input).find((p) => p.pickType === "SPREAD");
    expect(pick).toBeTruthy();
    expect(pick!.consensusPct).toBeGreaterThan(0.5);
    expect(pick!.consensusPct).toBeLessThan(1);
    expect(pick!.reasoningShort).toMatch(CONSENSUS_CLAIM_RE);
    expect(pick!.reasoning).toMatch(/backed by \d{1,3}% of \d+ bookmakers/i);
  });

  it("a baseball TOTAL pick (not SPREAD) is unaffected and keeps its honest varying claim", () => {
    const input: OddsInput = {
      gameId: "mlb-total-1",
      homeTeam: "St. Louis Cardinals",
      awayTeam: "Texas Rangers",
      commenceTime: new Date("2026-06-01T18:00:00Z"),
      sport: "baseball_mlb",
      bookmakerOdds: [
        { bookmaker: "fanduel", market: "TOTALS" as const, total: 7.5, overPrice: -110, underPrice: -110 },
        { bookmaker: "draftkings", market: "TOTALS" as const, total: 7.5, overPrice: -112, underPrice: -108 },
        { bookmaker: "betmgm", market: "TOTALS" as const, total: 8.0, overPrice: -110, underPrice: -110 },
        { bookmaker: "caesars", market: "TOTALS" as const, total: 7.5, overPrice: -108, underPrice: -112 },
        { bookmaker: "pointsbet", market: "TOTALS" as const, total: 8.0, overPrice: 105, underPrice: -125 },
      ],
    };
    const pick = scoreGame(input).find((p) => p.pickType === "TOTAL");
    expect(pick).toBeTruthy();
    expect(pick!.consensusPct).toBeLessThan(1);
    expect(pick!.reasoningShort).toMatch(/\d{1,3}% of bookmakers favor/i);
  });
});
