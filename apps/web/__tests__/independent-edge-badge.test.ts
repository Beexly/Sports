import { describe, expect, it } from "vitest";
import {
  independentEdgeRankingBadge,
  type IndependentEdgeBadgeInput,
} from "@/lib/picks/independent-edge-badge";

/**
 * C-252. The pick card must not tell a customer a pick is "priced" when no book
 * price exists. The signal slate is the case that matters: it sets
 * marketFairProb null deliberately and prints "No book price is attached to this
 * pick" in the same box the badge sits in.
 */
function input(over: Partial<IndependentEdgeBadgeInput> = {}): IndependentEdgeBadgeInput {
  return {
    rankingP: 0.66,
    rankingSource: "independent_trueProb",
    trueProb: 0.66,
    marketFairProb: 0.54,
    ...over,
  };
}

describe("independentEdgeRankingBadge", () => {
  it("claims a price only when a book fair probability exists", () => {
    expect(independentEdgeRankingBadge(input())).toBe("priced into ranking");
  });

  it("never says priced on a signal-slate row (marketFairProb null)", () => {
    // The exact shape generate-signal-slate.ts writes: trueProb and rankingP
    // finite, market deliberately null. This is the row the old badge called
    // "priced into ranking".
    expect(independentEdgeRankingBadge(input({ marketFairProb: null }))).toBe(
      "model signal, no book price",
    );
  });

  it("treats a non-finite market fair as no price", () => {
    expect(independentEdgeRankingBadge(input({ marketFairProb: Number.NaN }))).toBe(
      "model signal, no book price",
    );
  });

  it("keeps the pre-existing signal-only state when independents did not rank", () => {
    expect(
      independentEdgeRankingBadge({
        rankingP: null,
        rankingSource: "confidence",
        trueProb: null,
        marketFairProb: 0.54,
      }),
    ).toBe("signal only");
  });

  it("a BACKFILLED row does not claim the estimate drove its ranking", () => {
    // Devin. backfill-independent-trueprob.ts writes independentEdge.trueProb
    // onto settled picks for calibration and leaves rankingSource/rankingP as
    // published, a confidence echo. This is that exact row shape. Reading
    // trueProb as evidence of ranking impact would have claimed something the
    // backfill explicitly does not do.
    expect(
      independentEdgeRankingBadge({
        rankingP: 0.6,
        rankingSource: "confidence",
        trueProb: 0.6,
        marketFairProb: null,
      }),
    ).toBe("signal only");
  });

  it("accepts the two ranking sources that mean independents took part", () => {
    for (const rankingSource of ["independent_trueProb", "blend_indep_conf"]) {
      expect(
        independentEdgeRankingBadge({ rankingP: 0.66, rankingSource, trueProb: 0.66, marketFairProb: 0.54 }),
      ).toBe("priced into ranking");
    }
  });

  it("falls to signal only on an old row with no rankingSource at all", () => {
    expect(
      independentEdgeRankingBadge({ rankingP: 0.66, rankingSource: null, trueProb: 0.66, marketFairProb: 0.54 }),
    ).toBe("signal only");
  });

  it("no input shape returns the priced badge without a finite market fair", () => {
    const noMarket: IndependentEdgeBadgeInput[] = [
      input({ marketFairProb: null }),
      input({ marketFairProb: Number.NaN }),
      input({ marketFairProb: null, rankingSource: "blend_indep_conf" }),
      input({ marketFairProb: null, rankingSource: "blend_indep_conf" }),
    ];
    for (const row of noMarket) {
      expect(independentEdgeRankingBadge(row)).not.toBe("priced into ranking");
    }
  });
});
