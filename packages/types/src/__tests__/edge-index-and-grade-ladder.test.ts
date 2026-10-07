import { describe, expect, it } from "vitest";
import {
  CONVERSION_MAX_ERROR_POINTS,
  EDGE_INDEX_MAX,
  EDGE_INDEX_MIN,
  OVERROUND_CONSISTENCY_EPSILON,
  EDGE_INDEX_POINTS_PER_RAW_EDGE,
  LEGACY_HALF_SCALE_THROUGH_MODEL_VERSION,
  RAW_EDGE_AT_FULL,
  RAW_EDGE_AT_ZERO,
  edgeIndexFromRawEdge,
  legacyHalfScaleToCurrent,
} from "../edge-index.js";
import {
  FEATURED_STRONG_PLAY_MIN_CONFIDENCE,
  GRADE_THRESHOLDS,
  UNPRICED_MAX_GRADE,
  computePickGrade,
  isFeaturedPromotionEligible,
} from "../pick-grade.js";
import { PICK_GRADE_LABELS } from "../index.js";
import type { PickGrade } from "../index.js";

/**
 * ============================================================================
 * THE EDGE INDEX SCALE
 * ============================================================================
 *
 * The retired mapping was `50 + 1000 · rawEdge`. Since `rawEdge ≤ 0` on every
 * internally consistent market (see `edge-index.ts` for the derivation), 50 was
 * an unreachable CEILING and the published 50–100 half of the axis was dead.
 * The current mapping is `100 + 2000 · rawEdge`: 100 is a fair price, ~50 an
 * ordinary −110/−110 two-way, 0 roughly a 10% two-way hold.
 *
 * These are runtime assertions on purpose. `apps/web/tsconfig.json` excludes
 * test files from `tsc`, so type-level claims there would be inert; and even
 * here a compile-time assertion could not catch a value that is arithmetically
 * wrong. Every check below executes.
 */

/** An ordinary vigged two-way market: 4% hold. */
const VIGGED = 1.04;

/** The retired mapping, reproduced verbatim so the migration claim is testable. */
function legacyEdgeIndex(rawEdge: number): number {
  return Math.max(0, Math.min(100, Math.round(50 + 1000 * rawEdge)));
}

describe("edgeIndexFromRawEdge — the one definition of the scale", () => {
  it("derives its slope from its own anchors rather than a literal", () => {
    expect(RAW_EDGE_AT_ZERO).toBe(-0.05);
    expect(RAW_EDGE_AT_FULL).toBe(0);
    expect(EDGE_INDEX_POINTS_PER_RAW_EDGE).toBe(2000);
  });

  it("anchors land exactly where the scale says they do", () => {
    // A perfectly fair price — the book takes nothing on this side.
    expect(edgeIndexFromRawEdge(RAW_EDGE_AT_FULL, VIGGED)).toBe(EDGE_INDEX_MAX);
    // Five probability points of juice on the picked side.
    expect(edgeIndexFromRawEdge(RAW_EDGE_AT_ZERO, VIGGED)).toBe(EDGE_INDEX_MIN);
    // The midpoint is a real, ordinary market rather than an unreachable one.
    expect(edgeIndexFromRawEdge(-0.025, VIGGED)).toBe(50);
  });

  it("the whole 0–100 axis is reachable from the honest (rawEdge ≤ 0) domain", () => {
    // The defect, stated as its own test: under the retired mapping no
    // rawEdge ≤ 0 could ever produce a value above 50.
    const honest = Array.from({ length: 501 }, (_, i) => -0.05 + i * 0.0001);
    const legacyValues = honest.map(legacyEdgeIndex);
    const currentValues = honest.map((r) => edgeIndexFromRawEdge(r, VIGGED));

    expect(Math.max(...legacyValues)).toBe(50);
    expect(Math.max(...currentValues)).toBe(100);
    expect(Math.min(...currentValues)).toBe(0);

    // Every integer 0–100 is produced by some honest rawEdge — no dead band.
    const produced = new Set(currentValues);
    for (let v = 0; v <= 100; v++) {
      expect(produced.has(v), `Edge Index ${v} is unreachable`).toBe(true);
    }
  });

  it("is monotone increasing in rawEdge — a cheaper price never reads lower", () => {
    let previous = -1;
    for (let raw = -0.06; raw <= 0.001; raw += 0.0005) {
      const value = edgeIndexFromRawEdge(raw, VIGGED);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it("clamps rather than overflowing, in both directions", () => {
    expect(edgeIndexFromRawEdge(0.05, VIGGED)).toBe(EDGE_INDEX_MAX);
    expect(edgeIndexFromRawEdge(-1, VIGGED)).toBe(EDGE_INDEX_MIN);
  });

  it("fails closed on non-finite input instead of emitting NaN into a grade", () => {
    expect(edgeIndexFromRawEdge(Number.NaN, VIGGED)).toBe(EDGE_INDEX_MIN);
    expect(edgeIndexFromRawEdge(Number.POSITIVE_INFINITY, VIGGED)).toBe(EDGE_INDEX_MIN);
  });
});

describe("historical comparability is an exact conversion, not an estimate", () => {
  it("names the last model version that emitted the retired scale", () => {
    expect(LEGACY_HALF_SCALE_THROUGH_MODEL_VERSION).toBe("v5.2.7");
  });

  it("converting a stored legacy value lands within one index point of a re-score", () => {
    // The residual is NOT slack in the conversion — it is the rounding the
    // stored legacy INTEGER already threw away. ±0.5 legacy points is ±1
    // current point, because one legacy point is worth two current ones. No
    // conversion recovers precision the stored value never had.
    let worst = 0;
    for (let raw = -0.05; raw <= 0; raw += 0.0001) {
      const converted = legacyHalfScaleToCurrent(legacyEdgeIndex(raw));
      const rescored = edgeIndexFromRawEdge(raw, VIGGED);
      worst = Math.max(worst, Math.abs(converted - rescored));
    }
    expect(worst).toBeLessThanOrEqual(CONVERSION_MAX_ERROR_POINTS);
    // …and the bound is TIGHT: it is reached, so it is not an idle allowance.
    expect(worst).toBe(CONVERSION_MAX_ERROR_POINTS);
  });

  it("conversion is exact wherever the legacy value lost no rounding", () => {
    // rawEdge on an exact half-point of the legacy scale: converting and
    // re-scoring must agree to the point.
    for (let legacy = 0; legacy <= 50; legacy++) {
      const raw = (legacy - 50) / 1000;
      expect(legacyEdgeIndex(raw)).toBe(legacy);
      expect(legacyHalfScaleToCurrent(legacy)).toBe(edgeIndexFromRawEdge(raw, VIGGED));
    }
  });

  it("saturates legacy values above the retired honest ceiling", () => {
    // A legacy value > 50 required rawEdge > 0, which no vigged two-way market
    // yields — the fingerprint of the American-odds averaging defect. It
    // converts to a clamped 100 and is not a strong price.
    expect(legacyHalfScaleToCurrent(51)).toBe(100);
    expect(legacyHalfScaleToCurrent(100)).toBe(100);
  });

  it("fails closed on non-finite stored values", () => {
    expect(legacyHalfScaleToCurrent(Number.NaN)).toBe(EDGE_INDEX_MIN);
  });
});

// ============================================================================
// THE LADDER — one definition, provably consulted
// ============================================================================

/** The ladder with its `as const` readonly-ness dropped, for the mutation test. */
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

describe("GRADE_THRESHOLDS is actually read by the grader", () => {
  /**
   * A boundary-value test cannot catch a duplicated literal: the copy agrees
   * with the constant right up until someone edits one of them. Mutating the
   * constant at runtime and demanding the OUTPUT follow is the check that a
   * duplicated-literal implementation fails.
   */
  it("moving a rung's confidence threshold moves the grade boundary", () => {
    expect(computePickGrade(84, 95)).not.toBe("ELITE_PLAY");
    withLadder({ ELITE_PLAY: { confidence: 84, edge: 80 } }, () => {
      expect(computePickGrade(84, 95)).toBe("ELITE_PLAY");
    });
    expect(computePickGrade(84, 95)).not.toBe("ELITE_PLAY");
  });

  it("moving a rung's edge threshold moves the grade boundary", () => {
    expect(computePickGrade(90, 60)).toBe("SOLID_PLAY");
    withLadder({ STRONG_PLAY: { confidence: 75, edge: 60 } }, () => {
      expect(computePickGrade(90, 60)).toBe("STRONG_PLAY");
    });
    expect(computePickGrade(90, 60)).toBe("SOLID_PLAY");
  });

  it("the shipped thresholds are unchanged by the rescale", () => {
    // The rescale made these reachable; it did not move them. If a future change
    // edits a number here it is re-defining what a customer is told a grade
    // means, and this assertion is the tripwire that makes them say so.
    expect(GRADE_THRESHOLDS.ELITE_PLAY).toEqual({ confidence: 85, edge: 80 });
    expect(GRADE_THRESHOLDS.STRONG_PLAY).toEqual({ confidence: 75, edge: 65 });
    expect(GRADE_THRESHOLDS.SOLID_PLAY).toEqual({ confidence: 65, edge: 50 });
  });

  it("every rung's edge threshold is now inside the reachable axis", () => {
    // This is the whole point of the rescale, asserted at the ladder rather
    // than at the scorer: under the retired axis (ceiling 50) ELITE and STRONG
    // sat ABOVE it and SOLID sat exactly ON it.
    for (const rung of ["ELITE_PLAY", "STRONG_PLAY", "SOLID_PLAY"] as const) {
      expect(GRADE_THRESHOLDS[rung].edge).toBeLessThan(EDGE_INDEX_MAX);
      const rawEdgeNeeded =
        (GRADE_THRESHOLDS[rung].edge - EDGE_INDEX_MAX) / EDGE_INDEX_POINTS_PER_RAW_EDGE;
      // …and the price that reaches it is one an honest market can offer.
      expect(rawEdgeNeeded).toBeLessThanOrEqual(0);
      expect(edgeIndexFromRawEdge(rawEdgeNeeded, VIGGED)).toBeGreaterThanOrEqual(
        GRADE_THRESHOLDS[rung].edge,
      );
    }
  });

  it("each rung's boundary is exactly the constant, on both axes", () => {
    for (const grade of ["ELITE_PLAY", "STRONG_PLAY", "SOLID_PLAY"] as const) {
      const { confidence, edge } = GRADE_THRESHOLDS[grade];
      expect(computePickGrade(confidence, edge)).toBe(grade);
      expect(computePickGrade(confidence - 1, edge)).not.toBe(grade);
      expect(computePickGrade(confidence, edge - 1)).not.toBe(grade);
    }
  });

  it("every rung has a customer-facing label", () => {
    for (const rung of ["ELITE_PLAY", "STRONG_PLAY", "SOLID_PLAY", "LEAN"] as PickGrade[]) {
      expect(PICK_GRADE_LABELS[rung]?.label, `no label for ${rung}`).toBeTruthy();
    }
  });
});

describe("computePickGrade is the ONE grader, including for unpriced picks", () => {
  it("fails closed on a non-finite confidence or edge", () => {
    expect(computePickGrade(Number.NaN, 95)).toBe("LEAN");
    expect(computePickGrade(95, Number.NaN)).toBe("LEAN");
  });

  /**
   * The signal slate publishes model-only picks with no book line at all. It
   * used to run a private third ladder (confidence ≥ 80 → STRONG_PLAY) that
   * wrote the same words into the same column as the market board. Passing
   * `null` says "there is no price here", and the two rungs that are claims
   * ABOUT a price become unavailable.
   */
  it("an unpriced pick is capped at SOLID_PLAY however confident the model is", () => {
    expect(UNPRICED_MAX_GRADE).toBe("SOLID_PLAY");
    for (const confidence of [65, 75, 80, 85, 99, 100]) {
      expect(computePickGrade(confidence, null)).toBe("SOLID_PLAY");
    }
  });

  it("an unpriced pick below the lowest confidence rung is still LEAN", () => {
    expect(computePickGrade(GRADE_THRESHOLDS.SOLID_PLAY.confidence - 1, null)).toBe("LEAN");
  });

  it("the retired signal ladder's top rung is strictly harder to reach now", () => {
    // Old signal ladder: confidence >= 80 => STRONG_PLAY, with no market.
    // New: SOLID_PLAY. No signal pick gains a rung; one class loses one.
    expect(computePickGrade(80, null)).toBe("SOLID_PLAY");
    expect(computePickGrade(80, null)).not.toBe("STRONG_PLAY");
  });
});

describe("Featured promotion eligibility", () => {
  const pick = (over: Partial<{ pickGrade: PickGrade; confidence: number; edgeScore: number }>) => ({
    pickGrade: "SOLID_PLAY" as PickGrade,
    confidence: 70,
    edgeScore: 60,
    ...over,
  });

  it("is satisfiable again — the gate is no longer dead code", () => {
    // Under the retired axis nothing could satisfy this: it needs ELITE_PLAY or
    // STRONG_PLAY, and both needed an Edge Index above the ceiling of 50.
    expect(
      isFeaturedPromotionEligible(pick({ pickGrade: "ELITE_PLAY", confidence: 90, edgeScore: 85 })),
    ).toBe(true);
  });

  it("still rejects every grade below the top two rungs", () => {
    expect(isFeaturedPromotionEligible(pick({ pickGrade: "SOLID_PLAY", confidence: 99, edgeScore: 99 }))).toBe(false);
    expect(isFeaturedPromotionEligible(pick({ pickGrade: "LEAN", confidence: 99, edgeScore: 99 }))).toBe(false);
  });

  it("still rejects a STRONG_PLAY below the featured confidence floor", () => {
    expect(
      isFeaturedPromotionEligible(
        pick({
          pickGrade: "STRONG_PLAY",
          confidence: FEATURED_STRONG_PLAY_MIN_CONFIDENCE - 1,
          edgeScore: 90,
        }),
      ),
    ).toBe(false);
    expect(
      isFeaturedPromotionEligible(
        pick({
          pickGrade: "STRONG_PLAY",
          confidence: FEATURED_STRONG_PLAY_MIN_CONFIDENCE,
          edgeScore: 90,
        }),
      ),
    ).toBe(true);
  });

  it("refuses an Edge Index above the top of its own axis (a scale fault, not a price)", () => {
    expect(
      isFeaturedPromotionEligible({ pickGrade: "ELITE_PLAY", confidence: 95, edgeScore: 101 }),
    ).toBe(false);
  });

  it("refuses a non-finite Edge Index or confidence — fail-closed, never NaN-through", () => {
    expect(
      isFeaturedPromotionEligible({ pickGrade: "ELITE_PLAY", confidence: 95, edgeScore: Number.NaN }),
    ).toBe(false);
    expect(
      isFeaturedPromotionEligible({ pickGrade: "ELITE_PLAY", confidence: Number.NaN, edgeScore: 95 }),
    ).toBe(false);
  });
});

describe("an inconsistent market publishes the BOTTOM of the axis", () => {
  /**
   * A negative-hold two-way market cannot arise from honest pricing, and
   * `computeEdgeScore` already clamps its fabricated positive edge to
   * `rawEdge = 0`. On the RETIRED half scale that clamped value rendered as 50 —
   * the middle of the published axis, so it read as unremarkable. On the current
   * scale `rawEdge = 0` is 100, the loudest number the product prints. Passing
   * it through would turn a refusal-to-vouch into a claim of a perfect price.
   */
  it("a sub-vig overround reads 0, not the fair-price maximum", () => {
    expect(edgeIndexFromRawEdge(0, 0.92)).toBe(EDGE_INDEX_MIN);
    // …and this is quieter than BOTH the retired behaviour (50) and a naive
    // rescale that ignored consistency (100).
    expect(edgeIndexFromRawEdge(0, VIGGED)).toBe(EDGE_INDEX_MAX);
  });

  it("holds for a negative rawEdge on an inconsistent market too", () => {
    expect(edgeIndexFromRawEdge(-0.02, 0.95)).toBe(EDGE_INDEX_MIN);
  });

  it("fails closed on a non-finite overround", () => {
    expect(edgeIndexFromRawEdge(0, Number.NaN)).toBe(EDGE_INDEX_MIN);
  });

  /**
   * −120/+120 is mathematically zero-hold. The bare sum of its two implied
   * probabilities is exactly 1 in IEEE-754, but the scorer does not compute the
   * bare sum: it averages each side across the books FIRST (sum of n identical
   * values, divided by n) and adds the two means. That extra round trip lands at
   * 0.9999999999999999. Without the tolerance, this perfectly fair market would
   * publish the WORST reading on the axis.
   *
   * Reproduced here as the scorer computes it, so the test pins the real trap
   * rather than a tidier one that never fires.
   */
  it("a float-rounded zero-hold market is not misfiled as inconsistent", () => {
    const meanOf = (implied: number, books: number) =>
      Array.from({ length: books }, () => implied).reduce((a, b) => a + b, 0) / books;
    const overround = meanOf(120 / 220, 5) + meanOf(100 / 220, 5);

    expect(120 / 220 + 100 / 220).toBe(1); // the bare sum is fine…
    expect(overround).toBeLessThan(1); // …the averaged one is not.
    expect(edgeIndexFromRawEdge(0, overround)).toBe(EDGE_INDEX_MAX);
  });

  it("the tolerance does not admit any real negative-hold quote", () => {
    // Ten times the tolerance still rejects; the shapes the guard exists for
    // are sub-vig by whole percentage points, not billionths.
    expect(edgeIndexFromRawEdge(0, 1 - OVERROUND_CONSISTENCY_EPSILON * 10)).toBe(
      EDGE_INDEX_MIN,
    );
    expect(edgeIndexFromRawEdge(0, 0.999)).toBe(EDGE_INDEX_MIN);
  });
});
