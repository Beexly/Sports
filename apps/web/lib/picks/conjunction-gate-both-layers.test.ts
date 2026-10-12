import { describe, expect, it } from "vitest";
import { scoreGame, SKELLAM_COVER_SOURCE } from "@sports/prediction-engine";
import type {
  IndependentMarketFairValue,
  OddsInput,
  ScoredPick,
} from "@sports/types";
import {
  dropAdverseEdgePicks,
  isAdverseEdgeRow,
} from "./adverse-edge-suppression";

/**
 * The conjunction gate, proven as ONE property across BOTH layers.
 *
 * The rule lives once — `pricesWorseThanMarket` in @sports/types — and is
 * enforced twice: at MINT (scoring.ts refuses to create a row whose own
 * expectedClv is negative) and at DISPLAY (this directory's suppression drops
 * a stored row whose expectedClv is negative). Each layer has its own suite
 * (scoring-adverse-edge-withhold.test.ts, adverse-edge-suppression.test.ts).
 * What neither proves alone is the conjunction: that the SAME engine output
 * is treated identically by both layers — a row the mint would refuse is a
 * row the display drops, and every row the mint actually publishes survives
 * the display gate untouched. If the two layers ever drift apart in the
 * adverse direction, a bet the engine priced worse than the book reaches a
 * customer; in the other direction, the board silently empties. This file
 * runs the REAL scorer and the REAL display filter over the same fixtures
 * so a drift in either layer fails here.
 *
 * The fixture mirrors scoring-adverse-edge-withhold.test.ts: a -110/-110
 * spread with a Skellam cover estimate. At a 0.20 home cover probability the
 * model's expectedClv is negative (the Dodgers -1.5 shape from 2026-09-13);
 * at 0.80 it is positive.
 */

const BOOKS = ["fanduel", "draftkings", "betmgm", "caesars", "pointsbet"];

function spreadInput(
  independentFairValues?: IndependentMarketFairValue[],
): OddsInput {
  return {
    gameId: "nhl-conjunction",
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

/** The stored-row shape the display gate reads: a pick as Prisma returns it. */
const storedRow = (pick: ScoredPick) => ({
  factorBreakdown: pick.factorBreakdown,
});

describe("conjunction gate — mint and display agree", () => {
  it("MINT: the scorer withholds a spread its own model prices worse than the book", () => {
    const pick = spread(scoreGame(spreadInput(skellam(0.2))));
    expect(pick).toBeUndefined();
  });

  it("DISPLAY: a stored row carrying that same adverse estimate is dropped", () => {
    // The measured 2026-09-13 Dodgers -1.5 shape: expectedClv -0.1356,
    // decision PASS — minted before the mint gate existed, so only the
    // display gate can reach it.
    const legacyRow = {
      factorBreakdown: {
        independentEdge: { expectedClv: -0.1356, decision: "PASS" },
      },
    };
    expect(isAdverseEdgeRow(legacyRow)).toBe(true);
    expect(dropAdverseEdgePicks([legacyRow])).toEqual([]);
  });

  it("AGREEMENT: a pick the mint publishes passes the display gate untouched", () => {
    const pick = spread(scoreGame(spreadInput(skellam(0.8))));
    expect(pick).toBeDefined();
    expect(pick!.factorBreakdown.independentEdge).toBeTruthy();
    expect(
      pick!.factorBreakdown.independentEdge!.expectedClv,
    ).toBeGreaterThan(0);

    const row = storedRow(pick!);
    expect(isAdverseEdgeRow(row)).toBe(false);
    const kept = dropAdverseEdgePicks([row]);
    expect(kept).toHaveLength(1);
    // Same object reference: suppression hides, it never rewrites.
    expect(kept[0]).toBe(row);
  });

  it("AGREEMENT SWEEP: every pick the mint publishes is display-kept, across the probability range", () => {
    // The conjunction stated as an invariant over real engine output: for
    // any model probability, IF a spread pick is minted THEN its stored
    // factorBreakdown carries a non-negative expectedClv AND the display
    // gate keeps it. A failure here means the layers disagree about a real
    // row, not a synthetic one.
    for (const p of [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95]) {
      const pick = spread(scoreGame(spreadInput(skellam(p))));
      if (!pick) continue; // withheld at mint — the display never sees it
      const edge = pick.factorBreakdown.independentEdge;
      if (!edge) continue; // no estimate is silence at both layers
      expect(
        edge.expectedClv,
        `mint published at homeFairProb ${p} with expectedClv ${edge.expectedClv}`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        isAdverseEdgeRow(storedRow(pick)),
        `display dropped a row the mint published at homeFairProb ${p}`,
      ).toBe(false);
    }
  });
});
