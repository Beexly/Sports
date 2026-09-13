import { describe, expect, it } from "vitest";
import { scoreGame } from "../scoring.js";
import { SKELLAM_COVER_SOURCE } from "../skellam.js";
import type { IndependentMarketFairValue, OddsInput, ScoredPick } from "@sports/types";

/**
 * The engine may not sell a bet it prices as a loser.
 *
 * On 2026-09-13, seven published PENDING rows carried
 * `factorBreakdown.independentEdge.decision = "PASS"` with a negative
 * `expectedClv` and `isPublished = true`. The worst was Dodgers -1.5: our own
 * cover model put it at 0.208 against a market fair value of 0.434, expectedClv
 * -0.1356, published at confidence 78 and sold as PREMIUM. The verdict was
 * computed, persisted, and rendered to the paying customer as the word
 * "neutral" in the factor trail, and read by no publish decision anywhere.
 *
 * These tests pin the gate that fixes it, and — just as important — pin its
 * narrowness. It may only WITHHOLD: no score, rank, probability or selection
 * moves, so MODEL_VERSION stays frozen. Silence is not evidence: a side with no
 * independent estimate is published exactly as before.
 */

const BOOKS = ["fanduel", "draftkings", "betmgm", "caesars", "pointsbet"];

function spreadInput(independentFairValues?: IndependentMarketFairValue[]): OddsInput {
  return {
    gameId: "nhl-adverse",
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

const spread = (picks: ScoredPick[]): ScoredPick | undefined =>
  picks.find((p) => p.pickType === "SPREAD");

/** Home is the favourite at -1.5, so home is the chosen side. */
const skellam = (homeFairProb: number): IndependentMarketFairValue[] => [
  { source: SKELLAM_COVER_SOURCE, homeFairProb, awayFairProb: 1 - homeFairProb },
];

describe("adverse-edge withhold gate", () => {
  it("publishes the spread when no independent estimate exists (silence is not a veto)", () => {
    const pick = spread(scoreGame(spreadInput(undefined)));
    expect(pick).toBeDefined();
  });

  it("withholds the spread when our own model prices the side worse than the book", () => {
    // Books sit near 0.5 on a -110/-110 line; our model says the home cover is a
    // 0.20 shot. That is the Dodgers -1.5 shape: trueProb far below market fair.
    const picks = scoreGame(spreadInput(skellam(0.2)));
    const pick = spread(picks);

    expect(pick).toBeUndefined();
  });

  it("still publishes when our model is MORE optimistic than the book", () => {
    const pick = spread(scoreGame(spreadInput(skellam(0.8))));

    expect(pick).toBeDefined();
    expect(pick!.factorBreakdown.independentEdge).toBeTruthy();
    expect(pick!.factorBreakdown.independentEdge!.expectedClv).toBeGreaterThan(0);
  });

  it("never publishes a pick whose stored expectedClv is negative", () => {
    // The invariant stated as the board-wide assertion that was missing. Sweep a
    // range of model probabilities; every pick that survives must carry a
    // non-negative expected CLV, whatever else changes about the composite.
    for (const p of [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95]) {
      const pick = spread(scoreGame(spreadInput(skellam(p))));
      if (!pick) continue;
      const edge = pick.factorBreakdown.independentEdge;
      if (!edge) continue;
      expect(
        edge.expectedClv,
        `published ${pick.selection} at homeFairProb ${p} with expectedClv ${edge.expectedClv}`,
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it("leaves confidence untouched on the picks it does publish", () => {
    // The gate must not become a scoring change by the back door: a published
    // pick's confidence must equal what it was before the gate existed, which
    // is the no-estimate baseline plus nothing.
    const baseline = spread(scoreGame(spreadInput(undefined)))!;
    const optimistic = spread(scoreGame(spreadInput(skellam(0.8))))!;

    expect(optimistic.confidence).toBe(baseline.confidence);
    expect(optimistic.edgeScore).toBe(baseline.edgeScore);
    expect(optimistic.selection).toBe(baseline.selection);
    expect(optimistic.line).toBe(baseline.line);
  });
});
