import { describe, it, expect } from "vitest";
import { scoreGame } from "../scoring.js";
import type { OddsInput, ScoredPick } from "@sports/types";

/**
 * TOTALS consensus is derived from the JUICE, and a symmetric market reads as
 * unanimous OVER.
 *
 * scoring.ts:655-660
 *     const overFavored = pricedTotals.filter(o => o.overPrice! <= o.underPrice!).length;
 *     const overFavoredPct = overFavored / pricedTotals.length;
 *     const overIsChosen = overFavoredPct >= 0.5;
 *     const consensusPct = overIsChosen ? overFavoredPct : 1 - overFavoredPct;
 *
 * At the standard -110/-110 total price, `-110 <= -110` is TRUE at every book.
 * So overFavoredPct = 1.0, the side is OVER, and consensusPct = 1.0 — the maximum
 * consensus score — even though not one book expressed a preference either way.
 * The `<=` is doing the picking, not the market.
 *
 * Contrast the SPREAD path (scoring.ts:390-393), which counts how many books have
 * a home-favoured LINE (`spreads.filter(s => s < 0)`). That measures real agreement
 * about who is favoured. The totals path measures agreement about vig.
 *
 * This matters beyond aesthetics:
 *   - -110/-110 is the DEFAULT price for a total, so this is the common case, not
 *     an edge case.
 *   - It feeds computeConsensusScore, which is a component of confidence — so a
 *     coin-flip is inflating a number the paywall sorts on
 *     (confidence >= PREMIUM_CONFIDENCE_THRESHOLD decides PREMIUM vs FREE).
 *   - In the 1999-2025 nflverse replay, 6868 of 6868 published total picks were
 *     OVER. Every one of them resolved by this tie-break, because the replay
 *     prices both sides at -110 by construction.
 *
 * These tests PIN CURRENT BEHAVIOUR. They are not an endorsement of it. Changing
 * the tie-break changes published picks and therefore requires a MODEL_VERSION
 * decision by the owner — it is deliberately not made here. If someone does change
 * it, these tests go red and force the conversation.
 */

const BOOKS = ["fanduel", "draftkings", "betmgm", "caesars", "pointsbet", "betrivers"];

function totalsInput(overPrice: number, underPrice: number): OddsInput {
  return {
    gameId: "g-totals-1",
    homeTeam: "Chiefs",
    awayTeam: "Bills",
    commenceTime: new Date("2026-09-10T18:00:00Z"),
    sport: "NFL",
    bookmakerOdds: BOOKS.map((bookmaker) => ({
      bookmaker,
      market: "TOTALS" as const,
      total: 47,
      overPrice,
      underPrice,
    })),
    context: { bookmakerCoverageMax: BOOKS.length },
  };
}

const total = (picks: ScoredPick[]) => picks.find((p) => p.pickType === "TOTAL");

describe("totals consensus is decided by the juice, not by the market's opinion", () => {
  it("a perfectly symmetric -110/-110 market publishes OVER, never UNDER", () => {
    const pick = total(scoreGame(totalsInput(-110, -110)));
    expect(pick).toBeDefined();
    expect(pick!.selection).toContain("OVER");
  });

  it("and reports that coin flip as 100% bookmaker consensus", () => {
    // The published reasoning is customer-facing. On a market where no book took
    // a side, it asserts total agreement.
    const pick = total(scoreGame(totalsInput(-110, -110)));
    expect(pick!.reasoning).toContain("100%");
  });

  it("on a genuinely asymmetric market it follows the favourite, correctly", () => {
    // The smaller SIGNED price is the market favourite (higher implied
    // probability): -112 implies 0.528, -108 implies 0.519. So:
    //   over -108 / under -112  -> UNDER is favoured
    //   over -112 / under -108  -> OVER is favoured
    // The engine follows the favourite in both directions, which is the point:
    // the side-selection logic is NOT hardcoded to OVER. It is specifically the
    // TIE at equal juice that resolves to OVER by the `<=` operator.
    expect(total(scoreGame(totalsInput(-108, -112)))!.selection).toContain("UNDER");
    expect(total(scoreGame(totalsInput(-112, -108)))!.selection).toContain("OVER");
  });

  it("CONTROL: the spread path measures agreement on the LINE, not on vig", () => {
    // Spreads count how many books show a home-favoured line, so symmetric juice
    // does not decide the side. This is the contrast that shows the totals
    // behaviour is a quirk of that path rather than a house convention.
    const input: OddsInput = {
      ...totalsInput(-110, -110),
      gameId: "g-spread-1",
      bookmakerOdds: BOOKS.map((bookmaker) => ({
        bookmaker,
        market: "SPREADS" as const,
        spread: -3,
        homeSpreadPrice: -110,
        awaySpreadPrice: -110,
      })),
    };
    const spread = scoreGame(input).find((p) => p.pickType === "SPREAD");
    expect(spread).toBeDefined();
    // Home is favoured by the LINE (-3), so the home side is chosen on line
    // evidence, with identical symmetric juice.
    expect(spread!.selection).toContain("Chiefs");
  });
});
