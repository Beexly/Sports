/**
 * segmentClv: pins the decided-only reading beside the all-graded rate.
 *
 * Doctrine (AGENTS.md): a push is never averaged into a published rate.
 * MATCHED_CLOSE is the CLV analogue of a push. beatCloseRatePct uses the
 * all-graded denominator (established behavior, unchanged); the additive
 * decidedBeatCloseRatePct excludes ties from both sides and is null when the
 * segment has no decided rows. Nothing gates on the decided reading.
 */
import { describe, expect, it } from "vitest";
import { segmentClv, type ClvGradedItem } from "../clv-segments.js";

function item(overrides: Partial<ClvGradedItem> = {}): ClvGradedItem {
  return {
    sport: "americanfootball_nfl",
    pickType: "SPREAD",
    clvKind: "POINTS",
    clvValue: 0.02,
    verdict: "BEAT_CLOSE",
    confidence: 72,
    modelVersion: "v5.2.7",
    ...overrides,
  };
}

describe("segmentClv: decided-only reading beside the all-graded rate", () => {
  it("excludes ties from both sides of decidedBeatCloseRatePct", () => {
    const segments = segmentClv(
      [
        item({ verdict: "BEAT_CLOSE" }),
        item({ verdict: "LOST_TO_CLOSE" }),
        item({ verdict: "MATCHED_CLOSE" }),
        item({ verdict: "MATCHED_CLOSE" }),
      ],
      "pickType",
    );
    expect(segments).toHaveLength(1);
    const s = segments[0]!;
    expect(s.n).toBe(4);
    expect(s.beatCloseRatePct).toBe(25); // 1 beat / 4 graded — unchanged behavior
    expect(s.decidedBeatCloseRatePct).toBe(50); // 1 beat / 2 decided
  });

  it("is null for a segment with no decided rows, never coerced to 0", () => {
    const segments = segmentClv(
      [item({ verdict: "MATCHED_CLOSE" }), item({ verdict: "MATCHED_CLOSE" })],
      "pickType",
    );
    expect(segments[0]!.beatCloseRatePct).toBe(0);
    expect(segments[0]!.decidedBeatCloseRatePct).toBeNull();
  });
});
