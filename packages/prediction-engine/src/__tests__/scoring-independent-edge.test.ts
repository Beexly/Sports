import { describe, it, expect } from "vitest";
import { scoreGame } from "../scoring.js";
import type { OddsInput, ScoredPick, IndependentMarketFairValue } from "@sports/types";

// A moneyline-publishable game: 10 books, a heavy home favorite (~75% de-vigged
// fair) so consensus + depth clear the publish gate (ML pricing edge is
// structurally ≤0 when you back a favorite at its own price). A fixed `context`
// is shared so that — apart from independentFairValues — every scoring input is
// identical, isolating the wire-in's effect.
const baseContext = { bookmakerCoverageMax: 10 } as const;

const TEN_BOOKS = [
  "fanduel", "draftkings", "betmgm", "caesars", "pointsbet",
  "betrivers", "wynn", "bet365", "espnbet", "fanatics",
];

function makeInput(independentFairValues?: IndependentMarketFairValue[]): OddsInput {
  return {
    gameId: "game-ml-1",
    homeTeam: "Chiefs",
    awayTeam: "Eagles",
    commenceTime: new Date("2026-04-15T18:00:00Z"),
    sport: "NFL",
    bookmakerOdds: TEN_BOOKS.map((bookmaker) => ({
      bookmaker,
      market: "H2H" as const,
      homePrice: -350,
      awayPrice: 290,
    })),
    context: { ...baseContext, independentFairValues },
  };
}

const ml = (picks: ScoredPick[]) => picks.find((p) => p.pickType === "MONEYLINE")!;

describe("scoreMoneylinePick — independent-edge wire-in (honest, additive)", () => {
  it("is byte-for-byte unchanged when no independent fair values are supplied", () => {
    const pick = ml(scoreGame(makeInput(undefined)));
    expect(pick).toBeTruthy();
    // The structured field is absent, and no Independent Edge factor is added.
    expect(pick.factorBreakdown.independentEdge).toBeUndefined();
    expect(pick.factorBreakdown.factors.some((f) => f.name.startsWith("Independent Edge"))).toBe(false);
    expect(pick.rankingScore).toBe(pick.confidence);
  });

  it("prices SPEAK into rankingScore while keeping heuristic confidence stable", () => {
    const baseline = ml(scoreGame(makeInput(undefined)));
    const withEdge = ml(
      scoreGame(
        makeInput([
          { source: "kalshi", homeFairProb: 0.85, awayFairProb: 0.15 },
          { source: "poisson", homeFairProb: 0.84, awayFairProb: 0.16 },
        ]),
      ),
    );

    const ie = withEdge.factorBreakdown.independentEdge;
    expect(ie).toBeTruthy();
    expect(ie!.agreement).toBe("CONFIRMS");
    expect(ie!.decision).toBe("SPEAK");
    expect(ie!.rawEdge).toBeGreaterThan(0.05);
    expect(ie!.expectedClv).toBeGreaterThan(0);
    expect(ie!.sources).toEqual(["kalshi", "poisson"]);

    // MODEL_VERSION v5.2.0: ranking path priced; heuristic confidence unchanged.
    expect(ie!.priced).toBe(true);
    expect(withEdge.confidence).toBe(baseline.confidence);
    expect(withEdge.edgeScore).toBe(baseline.edgeScore);
    expect(withEdge.tier).toBe(baseline.tier);
    expect(withEdge.rankingScore).toBeDefined();
    // ranking blends independent trueProb with confidence → moves vs baseline ranking
    expect(withEdge.rankingScore).not.toBe(baseline.rankingScore ?? baseline.confidence);
    expect(withEdge.factorBreakdown.fairProbability).toBeTruthy();
    expect(withEdge.factorBreakdown.fairProbability!).toBeGreaterThan(0.5);

    const factor = withEdge.factorBreakdown.factors.find((f) => f.name.startsWith("Independent Edge"));
    expect(factor).toBeTruthy();
    expect(factor!.impact).toBe("positive");
  });

  it("PASSES (surfaced) when an independent referee sides with the sportsbook — our model is the outlier", () => {
    const withEdge = ml(
      scoreGame(
        makeInput([
          { source: "kalshi", homeFairProb: 0.85, awayFairProb: 0.15 }, // loves the side
          { source: "poisson", homeFairProb: 0.60, awayFairProb: 0.40 }, // disagrees, below the book
        ]),
      ),
    );
    const ie = withEdge.factorBreakdown.independentEdge;
    expect(ie!.agreement).toBe("CONTRADICTS");
    expect(ie!.decision).toBe("PASS");
    expect(ie!.priced).toBe(false); // PASS never prices ranking
    expect(ie!.rationale).toMatch(/outlier|sides with the sportsbook/i);
    // ranking falls back to confidence
    expect(withEdge.rankingScore).toBe(withEdge.confidence);
  });

  it("ignores a source that has no quote for the chosen side (null), never guessing", () => {
    // Only away probs given; chosen side is HOME → no usable independent estimate.
    const withEdge = ml(
      scoreGame(makeInput([{ source: "kalshi", homeFairProb: null, awayFairProb: 0.3 }])),
    );
    expect(withEdge.factorBreakdown.independentEdge).toBeUndefined();
  });
});
