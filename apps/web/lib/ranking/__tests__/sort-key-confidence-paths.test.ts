import { describe, expect, it } from "vitest";
import { comparePicksByRanking, rankingSortKey, SORT_KEY_ORDERING } from "../sort-key";
import { RANKING_ORDERING_SWITCH } from "../../../../../packages/types/src/ranking-candidates";

/**
 * Pins CURRENT sort/ranking behaviour. Not the desired invariant.
 * Changing the ordering changes what a paying customer sees and is
 * founder-gated (architecture section 7). Do not "fix" these assertions.
 *
 * Reciprocal with ranking-queue task 1: if that queue landed first, cite
 * its SHA here instead of duplicating. This file is the shared pin.
 *
 * ranking-prob.ts is not imported here: apps/web tests that grow a new
 * engine-barrel import resolve to undefined under partial mocks.
 * The blend arithmetic below is the published formula from
 * packages/prediction-engine/src/ranking-prob.ts (default independentWeight 0.7).
 */

function currentBlend(trueProb: number, confidence: number): number {
  // current-not-desired: rankingP = 0.7 * trueProb + 0.3 * (confidence / 100)
  return 0.7 * trueProb + 0.3 * (confidence / 100);
}

describe("sort-key confidence paths — current, not desired", () => {
  it("route 1 (current-not-desired): rankingP already embeds 30% confidence", () => {
    // architecture section 7 — founder-gated ordering. Pin, do not change.
    const rankingP = currentBlend(0.4, 80);
    expect(rankingP).toBeCloseTo(0.7 * 0.4 + 0.3 * 0.8, 10);
    expect(rankingSortKey({ confidence: 80, factorBreakdown: { rankingP } })).toBeCloseTo(
      rankingP,
      10,
    );
  });

  it("route 2 (current-not-desired): missing trueProb falls back to confidence entirely", () => {
    // ranking-prob.ts:40 — missing or non-finite trueProb → confidence only.
    const rankingP = 80 / 100;
    expect(rankingSortKey({ confidence: 80, factorBreakdown: { rankingP } })).toBeCloseTo(0.8, 10);
  });

  it("route 3 (current-not-desired): no factorBreakdown falls back to confidence/100", () => {
    expect(rankingSortKey({ confidence: 72 })).toBeCloseTo(0.72, 10);
  });

  it("route 4 (current-not-desired): neither rankingP nor rankingScore → confidence/100", () => {
    expect(rankingSortKey({ confidence: 72, factorBreakdown: {} })).toBeCloseTo(0.72, 10);
    expect(
      rankingSortKey({ confidence: 72, factorBreakdown: { rankingScore: 55 } }),
    ).toBeCloseTo(0.55, 10);
  });

  it("featured pin (sort-key.ts:36,42,46) precedes the scalar", () => {
    const featuredLow = {
      confidence: 10,
      factorBreakdown: { rankingP: 0.1 },
      isFeatured: true,
    };
    const plainHigh = {
      confidence: 99,
      factorBreakdown: { rankingP: 0.99 },
      isFeatured: false,
    };
    expect(comparePicksByRanking(featuredLow, plainHigh)).toBeLessThan(0);
  });

  it("consults SORT_KEY_ORDERING=current, matching types RANKING_ORDERING_SWITCH", () => {
    expect(SORT_KEY_ORDERING).toBe("current");
    expect(RANKING_ORDERING_SWITCH).toBe(SORT_KEY_ORDERING);
  });
});
