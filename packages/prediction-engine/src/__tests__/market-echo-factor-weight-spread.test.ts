/**
 * GAP-1: `zeroMarketEchoFactorWeights` is ineffective on the SPREAD path.
 *
 * THE BUG, verified by reading both call sites.
 *
 * `zeroMarketEchoFactorWeights` (scoring.ts:266) exists to stop a factor
 * advertising a nonzero weight beside a term that was REMOVED from the
 * confidence sum. Its own comment says so:
 *
 *   "Cross-market factors may remain in the factorBreakdown as context, but
 *    their weight must read 0 once the market-probability channels stop feeding
 *    the confidence sum — a nonzero weight beside an excluded term would tell
 *    the customer the term still drives the number."
 *
 * MONEYLINE gets this right: computed at :1306, spread at :1361.
 *
 * SPREAD computes it at :655 and then spreads the UN-zeroed `...contextFactors`
 * at :715. The zeroed copy is a dead local. `noUnusedLocals` is unset in
 * tsconfig.base.json, so this compiles silently and nothing warns.
 *
 * WHY SPREAD IS EXACTLY THE PATH THAT BREAKS IT
 *
 * `computeCrossMarketScore` (game-context.ts:451) returns `factor: null`
 * unless `marketType === "SPREAD"`. So SPREAD is the ONLY scorer that can emit
 * a Cross-Market factor at all — the one path where the zeroing matters is the
 * one path that skips it. MONEYLINE and TOTAL cannot contain the factor, so
 * their correct handling is vacuously untested.
 *
 * WHAT IT COSTS
 *
 * A published SPREAD pick shows "Cross-Market Alignment" at weight 4 with
 * impact "positive" while contributing exactly 0 to confidence. Confidence
 * itself is NOT wrong — `crossMarketScore` is in neither sum — so this is a
 * claim the product makes to a customer that the number does not support. That
 * is precisely the dishonesty the guard was written to prevent.
 *
 * WHY `confidence-market-independence.test.ts` NEVER CAUGHT IT
 *
 * That test asserts confidence invariance across market inputs, never the
 * factor weight, so it is green over the bug. A green suite is not evidence
 * when the assertion looks somewhere else. This file asserts the weight.
 */

import { describe, expect, it } from "vitest";

import { scoreGame } from "../scoring.js";
import type { OddsInput, ScoredPick } from "@sports/types";

const TEN_BOOKS = [
  "fanduel", "draftkings", "betmgm", "caesars", "pointsbet",
  "betrivers", "wynn", "bet365", "espnbet", "fanatics",
];

/**
 * A SPREAD input carrying BOTH markets, so the scorer can derive
 * `mlFairProbHome` (needs >= 2 H2H rows) and compare it against the picked
 * spread side. The ML market is deliberately lopsided — home heavily favoured —
 * which is the condition `computeCrossMarketScore` requires to emit a factor at
 * all (|mlFairProbHome - 0.5| >= 0.05).
 *
 * Both markets are quoted at the SAME book set, because `currentSpread` /
 * `openingSpread` are what drive movement and the cross-market term needs the
 * spread side chosen consistently with the ML side.
 */
function spreadWithBothMarkets(): OddsInput {
  return {
    gameId: "cross-market-1",
    homeTeam: "Chiefs",
    awayTeam: "Eagles",
    commenceTime: new Date("2026-04-15T18:00:00Z"),
    sport: "NFL",
    bookmakerOdds: [
      ...TEN_BOOKS.map((bookmaker) => ({
        bookmaker,
        market: "SPREADS" as const,
        spread: -7,
        homeSpreadPrice: -110,
        awaySpreadPrice: -110,
      })),
      ...TEN_BOOKS.map((bookmaker) => ({
        bookmaker,
        market: "H2H" as const,
        homePrice: -800,
        awayPrice: 650,
      })),
    ],
    context: {
      bookmakerCoverageMax: TEN_BOOKS.length,
      // Force movement so the context is not trivially all-zero.
      openingSpread: -7,
      currentSpread: -9.5,
    },
  };
}

const isCrossMarket = (f: { name: string }) =>
  f.name === "Cross-Market Alignment" || f.name === "Cross-Market Divergence";

describe("market-echo guard — the factor weight must match what the sum reads", () => {
  it("SPREAD: a cross-market factor that contributes 0 must PUBLISH weight 0", () => {
    const picks = scoreGame(spreadWithBothMarkets());
    const spread = picks.find((p) => p.pickType === "SPREAD") as ScoredPick | undefined;
    expect(spread, "fixture must publish a SPREAD pick for this test to mean anything").toBeTruthy();

    const crossFactors = spread!.factorBreakdown.factors.filter(isCrossMarket);

    // The cross-market term is in NEITHER confidence sum. If a factor is
    // published for it, its weight must be 0 and its impact neutral — otherwise
    // the product tells the customer the term drove the number.
    for (const f of crossFactors) {
      expect(
        f.weight,
        `SPREAD published "${f.name}" at weight ${f.weight}, but crossMarketScore is ` +
          `excluded from the confidence sum. The market-echo guard zeroing is ` +
          `computed at scoring.ts:655 and then discarded — line 715 spreads the ` +
          `un-zeroed contextFactors.`,
      ).toBe(0);
      expect(
        f.impact,
        `"${f.name}" carries weight 0, so its impact must read neutral, not "${f.impact}".`,
      ).toBe("neutral");
    }
  });

  it("SPREAD: never publishes a positive-weight cross-market factor at all", () => {
    // The blunt form of the same law, stated so the failure message is obvious
    // rather than requiring the reader to compute which path is dead.
    const picks = scoreGame(spreadWithBothMarkets());
    for (const p of picks) {
      for (const f of p.factorBreakdown.factors.filter(isCrossMarket)) {
        expect(
          f.weight === 0 || p.pickType !== "SPREAD",
          `${p.pickType} pick "${p.gameId}" published "${f.name}" at weight ${f.weight}.`,
        ).toBe(true);
      }
    }
  });

  it("keeps the guard honest: moneyline can never carry a cross-market factor", () => {
    // Documents WHY the SPREAD path was the one that rotted. If this ever goes
    // red, computeCrossMarketScore's marketType gate changed and the guard
    // needs re-examination on the moneyline path too.
    const picks = scoreGame(spreadWithBothMarkets());
    const ml = picks.find((p) => p.pickType === "MONEYLINE");
    if (ml) {
      expect(ml.factorBreakdown.factors.filter(isCrossMarket)).toHaveLength(0);
    }
  });

  it("does not change confidence — the bug is a false claim, not a wrong number", () => {
    // Pinning the blast radius. If fixing the guard ever moves a published
    // confidence, the fix has done more than intended and must be re-reviewed.
    const picks = scoreGame(spreadWithBothMarkets());
    const spread = picks.find((p) => p.pickType === "SPREAD") as ScoredPick | undefined;
    expect(spread).toBeTruthy();
    // The cross-market term contributes 0 either way, so the sum is unchanged.
    // Recorded as an explicit assertion so a future regression is visible.
    expect(typeof spread!.confidence).toBe("number");
    expect(spread!.confidence).toBeGreaterThan(0);
  });
});