import { describe, expect, it } from "vitest";
import {
  GRADE_THRESHOLDS,
  HONEST_MARKET_EDGE_INDEX_MAX,
  FEATURED_STRONG_PLAY_MIN_CONFIDENCE,
  computePickGrade,
  isFeaturedPromotionEligible,
  PICK_GRADE_LABELS,
} from "../index.js";
import type { PickGrade } from "../index.js";

/**
 * ============================================================================
 * WHY THIS FILE EXISTS
 * ============================================================================
 *
 * `GRADE_THRESHOLDS` used to be decorative. It was declared in
 * `@sports/prediction-engine`'s `constants.ts` and referenced NOWHERE — a
 * repo-wide `grep -rn "GRADE_THRESHOLDS"` returned exactly one line, its own
 * definition. The numbers actually in force were bare literals duplicated
 * inside `computePickGrade` here in `@sports/types`. Two sources of truth, one
 * inert: you could edit the named constant to anything at all and not one pick
 * would be graded differently.
 *
 * A test that only checks boundary VALUES cannot catch that — duplicated
 * literals agree with the constant right up until someone edits one of them.
 * The test that catches it is the mutation test below: change the constant at
 * runtime and demand the grading output follow. A constant nobody reads cannot
 * pass it.
 */

/** The shape of GRADE_THRESHOLDS with its `as const` readonly-ness dropped. */
type MutableLadder = {
  -readonly [K in keyof typeof GRADE_THRESHOLDS]: { confidence: number; edge: number };
};

/** Mutate the live ladder for the duration of `body`, then restore it exactly. */
function withLadder(
  patch: Partial<Record<keyof typeof GRADE_THRESHOLDS, { confidence: number; edge: number }>>,
  body: () => void,
): void {
  const live = GRADE_THRESHOLDS as unknown as MutableLadder;
  const saved: MutableLadder = {
    ELITE_PLAY: { ...live.ELITE_PLAY },
    STRONG_PLAY: { ...live.STRONG_PLAY },
    SOLID_PLAY: { ...live.SOLID_PLAY },
  };
  try {
    for (const key of Object.keys(patch) as (keyof MutableLadder)[]) {
      const next = patch[key];
      if (next) live[key] = { ...next };
    }
    body();
  } finally {
    live.ELITE_PLAY = saved.ELITE_PLAY;
    live.STRONG_PLAY = saved.STRONG_PLAY;
    live.SOLID_PLAY = saved.SOLID_PLAY;
  }
}

describe("GRADE_THRESHOLDS is actually consulted (not decorative)", () => {
  it("moving ELITE_PLAY's confidence threshold moves the grade boundary", () => {
    // Pre-condition: at the shipped ladder this input is one point short of ELITE.
    expect(computePickGrade(84, 95)).not.toBe("ELITE_PLAY");

    withLadder({ ELITE_PLAY: { confidence: 84, edge: 80 } }, () => {
      expect(computePickGrade(84, 95)).toBe("ELITE_PLAY");
    });

    // Restored.
    expect(computePickGrade(84, 95)).not.toBe("ELITE_PLAY");
  });

  it("moving STRONG_PLAY's edge threshold moves the grade boundary", () => {
    expect(computePickGrade(90, 60)).toBe("SOLID_PLAY");

    withLadder({ STRONG_PLAY: { confidence: 75, edge: 60 } }, () => {
      expect(computePickGrade(90, 60)).toBe("STRONG_PLAY");
    });

    expect(computePickGrade(90, 60)).toBe("SOLID_PLAY");
  });

  it("raising SOLID_PLAY out of reach demotes a formerly-SOLID pick to LEAN", () => {
    expect(computePickGrade(70, 55)).toBe("SOLID_PLAY");

    withLadder({ SOLID_PLAY: { confidence: 99, edge: 99 } }, () => {
      expect(computePickGrade(70, 55)).toBe("LEAN");
    });

    expect(computePickGrade(70, 55)).toBe("SOLID_PLAY");
  });

  it("every rung's boundary is exactly the constant, on both axes", () => {
    for (const grade of ["ELITE_PLAY", "STRONG_PLAY", "SOLID_PLAY"] as const) {
      const { confidence, edge } = GRADE_THRESHOLDS[grade];
      // Exactly at both thresholds → this grade (or better).
      expect(computePickGrade(confidence, edge)).toBeTruthy();
      // One point short on EITHER axis → not this grade.
      expect(computePickGrade(confidence - 1, edge)).not.toBe(grade);
      expect(computePickGrade(confidence, edge - 1)).not.toBe(grade);
    }
  });

  it("the ladder is ordered — each rung is at least as demanding as the one below", () => {
    expect(GRADE_THRESHOLDS.ELITE_PLAY.confidence).toBeGreaterThanOrEqual(
      GRADE_THRESHOLDS.STRONG_PLAY.confidence,
    );
    expect(GRADE_THRESHOLDS.ELITE_PLAY.edge).toBeGreaterThanOrEqual(
      GRADE_THRESHOLDS.STRONG_PLAY.edge,
    );
    expect(GRADE_THRESHOLDS.STRONG_PLAY.confidence).toBeGreaterThanOrEqual(
      GRADE_THRESHOLDS.SOLID_PLAY.confidence,
    );
    expect(GRADE_THRESHOLDS.STRONG_PLAY.edge).toBeGreaterThanOrEqual(
      GRADE_THRESHOLDS.SOLID_PLAY.edge,
    );
  });

  it("every rung in the ladder has a customer-facing label", () => {
    const rungs: PickGrade[] = ["ELITE_PLAY", "STRONG_PLAY", "SOLID_PLAY", "LEAN"];
    for (const rung of rungs) {
      expect(PICK_GRADE_LABELS[rung]?.label, `no label for ${rung}`).toBeTruthy();
    }
  });
});

describe("Featured promotion eligibility", () => {
  const pick = (over: Partial<{ pickGrade: PickGrade; confidence: number; edgeScore: number }>) => ({
    pickGrade: "SOLID_PLAY" as PickGrade,
    confidence: 70,
    edgeScore: 50,
    ...over,
  });

  it("rejects every grade below the top two rungs", () => {
    expect(isFeaturedPromotionEligible(pick({ pickGrade: "SOLID_PLAY", confidence: 99, edgeScore: 50 }))).toBe(false);
    expect(isFeaturedPromotionEligible(pick({ pickGrade: "LEAN", confidence: 99, edgeScore: 50 }))).toBe(false);
  });

  it("rejects a STRONG_PLAY below the featured confidence floor", () => {
    expect(
      isFeaturedPromotionEligible(
        pick({
          pickGrade: "STRONG_PLAY",
          confidence: FEATURED_STRONG_PLAY_MIN_CONFIDENCE - 1,
          edgeScore: HONEST_MARKET_EDGE_INDEX_MAX,
        }),
      ),
    ).toBe(false);
  });

  /**
   * The guard clause. An Edge Index above the honest-market ceiling means the
   * pick's "edge" was manufactured by inconsistent or mis-averaged pricing —
   * the engine claiming value against its own de-vigged fair probability, which
   * is arithmetically impossible on a market that charges vig. Featuring is the
   * loudest claim the product makes about a pick and must never be spent on the
   * one pick whose price arithmetic is provably broken.
   */
  it("refuses to feature a pick whose Edge Index exceeds the honest-market ceiling", () => {
    expect(
      isFeaturedPromotionEligible({
        pickGrade: "ELITE_PLAY",
        confidence: 95,
        edgeScore: HONEST_MARKET_EDGE_INDEX_MAX + 1,
      }),
    ).toBe(false);

    expect(
      isFeaturedPromotionEligible({
        pickGrade: "ELITE_PLAY",
        confidence: 95,
        edgeScore: 100,
      }),
    ).toBe(false);
  });

  it("refuses a non-finite Edge Index (fail-closed, never NaN-through)", () => {
    expect(
      isFeaturedPromotionEligible({ pickGrade: "ELITE_PLAY", confidence: 95, edgeScore: Number.NaN }),
    ).toBe(false);
  });

  /**
   * THE STANDING CONTRADICTION, pinned so it cannot be forgotten.
   *
   * Both featured-eligible rungs demand an Edge Index the honest-market ceiling
   * forbids. Whoever changes either number is changing what customers are told
   * a "Featured" pick is, and this assertion is the tripwire that makes them
   * say so out loud.
   */
  it("both featured-eligible rungs sit above the honest-market Edge Index ceiling", () => {
    expect(GRADE_THRESHOLDS.ELITE_PLAY.edge).toBeGreaterThan(HONEST_MARKET_EDGE_INDEX_MAX);
    expect(GRADE_THRESHOLDS.STRONG_PLAY.edge).toBeGreaterThan(HONEST_MARKET_EDGE_INDEX_MAX);

    // …therefore no pick can satisfy BOTH halves of the predicate.
    for (const edgeScore of [0, 25, 49, 50, 51, 65, 80, 100]) {
      const grade = computePickGrade(100, edgeScore);
      expect(isFeaturedPromotionEligible({ pickGrade: grade, confidence: 100, edgeScore })).toBe(false);
    }
  });
});
