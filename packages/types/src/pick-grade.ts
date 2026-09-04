import type { PickGrade } from "./index.js";
import { EDGE_INDEX_MAX } from "./edge-index.js";

/**
 * ============================================================================
 * THE PICK-GRADE LADDER — one definition, one grading function
 * ============================================================================
 *
 * Before this file the ladder existed TWICE and neither copy was authoritative
 * in the way it looked:
 *
 *   • `GRADE_THRESHOLDS` in `@sports/prediction-engine`'s `constants.ts` was
 *     referenced nowhere. A repo-wide search returned exactly one line — its own
 *     definition. Editing it changed no grade.
 *   • The numbers actually in force were bare literals inside `computePickGrade`
 *     in `@sports/types`.
 *   • A THIRD ladder lived in `generate-signal-slate.ts`, grading on confidence
 *     alone with different cut-points, writing the same words into the same
 *     column.
 *
 * Now: this object is the ladder, `computePickGrade` reads it, `constants.ts`
 * re-exports it rather than redeclaring it, and the signal slate calls the same
 * function. `__tests__/pick-grade.test.ts` proves the constant is consulted by
 * mutating it at runtime and demanding the output follow — a check that a
 * duplicated-literal implementation cannot pass.
 *
 * THE THRESHOLD VALUES ARE UNCHANGED (85/80, 75/65, 65/50).
 *
 * They were previously unreachable, but not because they were wrong: the Edge
 * Index axis they were written against only ever spanned 0–50. Restoring the
 * axis (see `edge-index.ts`) makes all three rungs reachable at their existing
 * values. No rung was moved to make it reachable.
 *
 * On the restored scale the edge half of each rung has a plain reading, since
 * the Edge Index is a price-quality number:
 *
 *   edge ≥ 80  ≈ two-way hold at or under ~2%   (a genuinely cheap price)
 *   edge ≥ 65  ≈ two-way hold at or under ~3.5%
 *   edge ≥ 50  ≈ two-way hold at or under ~5%   (an ordinary −110/−110 market)
 */
export const GRADE_THRESHOLDS = {
  ELITE_PLAY: { confidence: 85, edge: 80 },
  STRONG_PLAY: { confidence: 75, edge: 65 },
  SOLID_PLAY: { confidence: 65, edge: 50 },
  // Below these = LEAN
} as const;

/**
 * The highest grade a pick may be awarded when there is NO priced market to
 * read an Edge Index from.
 *
 * The signal slate publishes model-only picks: `bookmakerCount: 0`,
 * `marketFairProb: null`, no book line anywhere. Two rungs of this ladder are
 * claims about the PRICE — "you are getting this cheaply" — and there is no
 * price to make that claim about. So an unpriced pick can climb the confidence
 * rungs but stops here. This is strictly more conservative than the ladder the
 * signal slate used to run (which awarded STRONG_PLAY at confidence ≥ 80 with
 * no market involved at all).
 */
export const UNPRICED_MAX_GRADE = "SOLID_PLAY" as const satisfies PickGrade;

/** Rungs in descending order — the one traversal every grading decision uses. */
const RUNGS = ["ELITE_PLAY", "STRONG_PLAY", "SOLID_PLAY"] as const;

/**
 * THE grading function. Every pick on the site — market board and signal board
 * alike — gets its grade from here.
 *
 * @param confidence the engine's 0–100 composite score.
 * @param edgeIndex  the published Edge Index (`ScoredPick.edgeScore`) on the
 *                   scale defined in `edge-index.ts`, where 100 is a fair price
 *                   and 50 an ordinary −110/−110 two-way. Pass `null` when the
 *                   pick has no priced market; grading then uses the confidence
 *                   rungs only and is capped at `UNPRICED_MAX_GRADE`.
 *
 * Fail-closed on non-finite input: a NaN confidence or edge grades LEAN rather
 * than falling through comparisons that are all false.
 */
export function computePickGrade(
  confidence: number,
  edgeIndex: number | null,
): PickGrade {
  if (!Number.isFinite(confidence)) return "LEAN";

  const unpriced = edgeIndex === null;
  if (!unpriced && !Number.isFinite(edgeIndex)) return "LEAN";

  for (const rung of RUNGS) {
    if (confidence < GRADE_THRESHOLDS[rung].confidence) continue;
    if (unpriced) {
      // No price to judge, so the price half of the rung cannot be met. Award
      // the best grade that makes no claim about the price.
      return UNPRICED_MAX_GRADE;
    }
    if ((edgeIndex as number) >= GRADE_THRESHOLDS[rung].edge) return rung;
  }
  return "LEAN";
}

/** Minimum confidence a STRONG_PLAY needs before Featured promotion. */
export const FEATURED_STRONG_PLAY_MIN_CONFIDENCE = 80;

/**
 * The pick-quality half of Featured promotion. The operator gate
 * (`ReadinessGates.canPromoteFeaturedPicks`) is a separate, caller-side
 * condition and is NOT checked here.
 *
 * This predicate was previously dead code: it required ELITE_PLAY or
 * STRONG_PLAY, both of which demanded an Edge Index above 50 on an axis that
 * could not exceed 50. With the axis restored it is live again at the same
 * thresholds — no clause here was loosened to revive it.
 */
export function isFeaturedPromotionEligible(pick: {
  readonly pickGrade: PickGrade;
  readonly confidence: number;
  readonly edgeScore: number;
}): boolean {
  if (!Number.isFinite(pick.confidence) || !Number.isFinite(pick.edgeScore)) {
    return false;
  }
  // An Edge Index cannot exceed the top of its own axis. A value above it means
  // an upstream scale fault, not a spectacular price — refuse to feature it.
  if (pick.edgeScore > EDGE_INDEX_MAX) return false;
  return (
    pick.pickGrade === "ELITE_PLAY" ||
    (pick.pickGrade === "STRONG_PLAY" &&
      pick.confidence >= FEATURED_STRONG_PLAY_MIN_CONFIDENCE)
  );
}
