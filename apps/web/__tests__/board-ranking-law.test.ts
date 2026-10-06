import { describe, expect, it } from "vitest";

import {
  comparePicksByRanking,
  rankingBasisCensus,
  readRankingKey,
  readSignedEdge,
} from "@/lib/ranking/sort-key";

/**
 * The board's ranking law, pinned.
 *
 * AGENTS.md records the defect this file exists to keep closed: a board ordered
 * on `confidence`, which is MEASURED ANTI-PREDICTIVE (n 2,385; conf 80+ claims
 * 0.8663, realizes 0.5191, z = -10.7). `adverse-edge-suppression.ts` closed the
 * NEGATIVE half by dropping adverse rows. This file pins the POSITIVE half:
 * what survives must be ordered by the engine's own signed edge.
 *
 * The comparator was already correct. That is exactly why this test is worth
 * having: the law was correct in `sort-key.ts` and unpinned, so it was one
 * careless edit away from a board that shows its worst pick first, and nothing
 * in the suite would have said so.
 */

const pick = (confidence: number, expectedClv: unknown, rankingP?: unknown) => ({
  confidence,
  factorBreakdown: {
    ...(expectedClv === undefined ? {} : { independentEdge: { expectedClv } }),
    ...(rankingP === undefined ? {} : { rankingP }),
  },
});

describe("the board is not ordered by confidence", () => {
  it("ranks on signed edge even when confidence points the other way", () => {
    // The exact shape AGENTS.md describes: the top-ranked pick by confidence
    // carried the SMALLEST positive edge on the slate.
    const bigEdge = pick(85, 0.2257);
    const smallEdge = pick(91, 0.0217);

    const ranked = [smallEdge, bigEdge].sort(comparePicksByRanking);
    expect(ranked[0]).toBe(bigEdge);
    expect(readSignedEdge(bigEdge)).toBe(0.2257);
  });

  it("keeps a row carrying an estimate above one without, regardless of confidence", () => {
    const measured = pick(40, 0.01);
    const unmeasured = pick(99);

    expect([unmeasured, measured].sort(comparePicksByRanking)[0]).toBe(measured);
    // A high confidence number must not buy the top slot on its own.
    expect(readSignedEdge(unmeasured)).toBeNull();
  });

  it("does not let the secondary key override a decided edge comparison", () => {
    // Same edge, so the secondary key decides. This is the ONE case where the
    // confidence branch is allowed to matter, and it is only a tie-break.
    const a = pick(90, 0.05);
    const b = pick(60, 0.05);
    expect([b, a].sort(comparePicksByRanking)[0]).toBe(a);
  });

  it("a featured row still pins above the rest", () => {
    const featured = { ...pick(10, 0.001), isFeatured: true };
    const bestEdge = pick(99, 0.5);
    expect([bestEdge, featured].sort(comparePicksByRanking)[0]).toBe(featured);
  });
});

describe("the cascade reports which branch ordered a row", () => {
  it("prefers rankingP, then rankingScore, then confidence", () => {
    expect(readRankingKey(pick(50, null, 0.8)).basis).toBe("rankingP");
    expect(readRankingKey({ confidence: 50, factorBreakdown: { rankingScore: 70 } }).basis).toBe(
      "rankingScore",
    );
    expect(readRankingKey(pick(50, null)).basis).toBe("confidence");
    expect(readRankingKey({ confidence: 50 }).basis).toBe("confidence");
  });

  it("measures the share of rows falling through to the anti-predictive branch", () => {
    // The number nobody had ever measured. If confidenceShare climbs on a real
    // slate, that is a signal the cascade needs attention, not a failure.
    const census = rankingBasisCensus([
      pick(50, null, 0.8),
      pick(50, null, 0.7),
      pick(50, null),
      pick(50, null),
    ]);
    expect(census).toMatchObject({ rankingP: 2, confidence: 2, total: 4 });
    expect(census.confidenceShare).toBe(0.5);
  });

  it("an empty slate is a real answer, not a fault", () => {
    expect(rankingBasisCensus([])).toMatchObject({ total: 0, confidenceShare: 0 });
  });
});

describe("absence of an estimate is never inherited from confidence", () => {
  it("returns null rather than substituting the score", () => {
    expect(readSignedEdge({})).toBeNull();
    expect(readSignedEdge({ factorBreakdown: {} })).toBeNull();
    expect(readSignedEdge({ factorBreakdown: { independentEdge: {} } })).toBeNull();
  });

  it("rejects a non-finite edge instead of ranking on it", () => {
    const nan = pick(50, Number.NaN);
    const inf = pick(50, Number.POSITIVE_INFINITY);
    expect(readSignedEdge(nan)).toBeNull();
    expect(readSignedEdge(inf)).toBeNull();
    // Both are unmeasured, so a genuinely measured row outranks them.
    const measured = pick(10, 0.001);
    expect([nan, measured].sort(comparePicksByRanking)[0]).toBe(measured);
  });
});
