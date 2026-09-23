import { describe, expect, it } from "vitest";
import { scoreGame } from "../scoring.js";
import type { IndependentMarketFairValue, OddsInput, ScoredPick } from "@sports/types";

/**
 * STEELERS ML -285 REGRESSION SPECIMEN (AGENTS.md 2026-09-13).
 *
 * The pick that must never publish:
 *   independentEdge.decision = "PASS"
 *   rawEdge = -0.1629
 *   book path published it at confidence 50 despite the engine's own
 *   independent read declining it.
 *
 * Specimen odds: Steelers ML -285 (home) / +235 (away), 10 books.
 *
 * v5.3.0 rule (AGENTS.md): never publish when independentEdge.decision is
 * PASS, regardless of path. Today the mint gate expresses this as
 * `pricesWorseThanMarket` (expectedClv < 0) in packages/types, which
 * selects the identical set for this specimen (rawEdge -0.1629 ⇒
 * expectedClv < 0). This file pins THE SPECIMEN BY NAME AND NUMBER so a
 * future edit to the predicate cannot silently re-open it.
 *
 * Keep this green. If it fails, the board can again sell a bet the engine
 * priced as a loser.
 */

const BOOKS = [
  "fanduel", "draftkings", "betmgm", "caesars", "pointsbet",
  "betrivers", "wynn", "bet365", "espnbet", "fanatics",
];

/** Steelers ML -285 shape: heavy favourite, books tight, model says PASS. */
function steelersMlInput(independentFairValues?: IndependentMarketFairValue[]): OddsInput {
  return {
    gameId: "nfl-steelers-ml-285",
    homeTeam: "Pittsburgh Steelers",
    awayTeam: "Cleveland Browns",
    commenceTime: new Date("2026-09-13T17:00:00Z"),
    sport: "NFL",
    // Specimen odds are Steelers ML -285 / +235. The scorer needs a heavy
    // favourite to clear MIN_PUBLISH_CONFIDENCE on the no-estimate control
    // (same shape as scoring-independent-edge.test.ts at -350/+290), so the
    // fixture uses that publishable ladder while the SPECIMEN numbers stay
    // pinned in the header and in the independent fair values below
    // (trueProb 0.58 vs market fair ≈ 0.74 ⇒ rawEdge ≈ -0.163 ≈ -0.1629).
    bookmakerOdds: BOOKS.map((bookmaker) => ({
      bookmaker,
      market: "H2H" as const,
      homePrice: -350,
      awayPrice: 290,
    })),
    context: { bookmakerCoverageMax: BOOKS.length, independentFairValues },
  };
}

const ml = (picks: ScoredPick[]): ScoredPick | undefined =>
  picks.find((p) => p.pickType === "MONEYLINE");

/**
 * The independent read this specimen carried: our own cover model put the
 * home side near 0.58 while the book's de-vigged fair sits near 0.74 at
 * -285. rawEdge ≈ 0.58 − 0.743 ≈ -0.163, matching the recorded -0.1629.
 * `assessIndependentEdge` turns that into decision PASS / expectedClv < 0,
 * and `pricesWorseThanMarket` must withhold the pick.
 *
 * Source is deliberately NOT SKELLAM_COVER_SOURCE: the moneyline path
 * reads `independentFairValues.filter(fv => fv.source !== SKELLAM_COVER_SOURCE)`
 * (scoring.ts scoreMoneylinePick).
 */
const steelersIndependent: IndependentMarketFairValue[] = [
  {
    source: "nfl-epa-fair-value",
    homeFairProb: 0.58,
    awayFairProb: 0.42,
  },
];

describe("Steelers ML -285 regression specimen (must never publish)", () => {
  it("withholds the pick when our own model prices the favourite worse than the book", () => {
    // Home is the chosen side (heavy favourite). Independent trueProb 0.58
    // against market fair ≈ 0.74 ⇒ rawEdge ≈ -0.163 (the recorded -0.1629),
    // decision PASS, expectedClv < 0.
    const picks = scoreGame(steelersMlInput(steelersIndependent));
    expect(ml(picks)).toBeUndefined();
  });

  it("still publishes when there is NO independent estimate (silence is not a veto)", () => {
    // Negative control: the gate may only WITHHOLD. If this fails, the
    // guard is over-broad and is wiping the board.
    const pick = ml(scoreGame(steelersMlInput(undefined)));
    expect(pick).toBeDefined();
  });

  it("still publishes when our model is MORE optimistic than the book", () => {
    // Positive control: independent trueProb 0.85 vs fair ≈ 0.74 ⇒ +edge.
    const pick = ml(
      scoreGame(
        steelersMlInput([
          { source: "nfl-epa-fair-value", homeFairProb: 0.85, awayFairProb: 0.15 },
        ]),
      ),
    );
    expect(pick).toBeDefined();
    const edge = pick!.factorBreakdown.independentEdge;
    if (edge) {
      expect(edge.expectedClv).toBeGreaterThanOrEqual(0);
    }
  });

  it("every published pick from this game carries non-negative expectedClv", () => {
    for (const p of [0.4, 0.5, 0.58, 0.65, 0.7, 0.74, 0.8, 0.9]) {
      const pick = ml(
        scoreGame(
          steelersMlInput([
            { source: "nfl-epa-fair-value", homeFairProb: p, awayFairProb: 1 - p },
          ]),
        ),
      );
      if (!pick) continue;
      const edge = pick.factorBreakdown.independentEdge;
      if (!edge) continue;
      expect(
        edge.expectedClv,
        `published Steelers ML at homeFairProb ${p} with expectedClv ${edge.expectedClv}`,
      ).toBeGreaterThanOrEqual(0);
    }
  });
});
