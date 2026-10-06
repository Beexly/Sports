import { describe, it, expect } from "vitest";
import {
  evaluatePublicClvPolicy,
  type PublicClvPolicyInput,
} from "@/lib/performance/public-clv-policy";

/**
 * What MATCHED_CLOSE does to the published beat-close rate, made executable.
 *
 * `evaluatePublicClvPolicy` publishes `beatCloseCount / gradedSampleSize`, and
 * `gradedSampleSize` counts every graded row -- BEAT_CLOSE, LOST_TO_CLOSE and
 * MATCHED_CLOSE alike. A MATCHED_CLOSE is a line that did not move between our
 * lock and the close: we neither beat it nor lost to it.
 *
 * The existing suite cannot see what that costs. Every test in
 * public-clv-policy.test.ts that exercises the 52.4% threshold passes
 * `matchedCloseCount: 0` (lines 30, 65 and 95 there), so in each one
 * `graded === beat + lost` and the denominator question never arises.
 *
 * MEASURED on production 2026-09-14, canonical published non-bootstrap rows
 * with VOID excluded -- the same population loadPublicClvPolicy counts:
 *
 *     BEAT_CLOSE       348
 *     MATCHED_CLOSE    659      <- 43% of the sample
 *     LOST_TO_CLOSE    527
 *     graded         1,534
 *
 * So the share this policy publishes is 22.7%, and the share among rows where
 * the line actually moved is 39.8%. The gap between those two numbers is the
 * entire content of this file.
 *
 * WHY IT MATTERS THAT NOBODY DECIDED THIS. The repo has a settled doctrine on
 * the analogous question for win rates, stated in several places and in
 * AGENTS.md as "Never average a push into a published win rate":
 *   - lib/calibration/calib-types.ts:6  "One training pair ... (pushes excluded)"
 *   - lib/performance/build-performance-summaries.ts:63  "Decided picks only:
 *     the allow-listed helper keeps pushes out of the denominator, as the site says"
 *   - lib/calibration/compute.ts:272 documents the exact bug of leaving a push
 *     in the denominator and what it drags.
 * CLV is the one published rate that does not apply it. That may be correct --
 * a no-move is arguably a genuine failure to find a better price, not a push --
 * but it is a decision, and the suite currently records no decision at all.
 *
 * THIS FILE DOES NOT ASSERT WHICH DENOMINATOR IS RIGHT. It pins the arithmetic
 * of the one in use and demonstrates that the choice can move the published
 * verdict, so the question is visible to whoever decides it. Changing the
 * denominator changes what `beatCloseRate` feeds `evaluatePhaseAdvance`, which
 * is a pricing-ladder gate -- founder-only under law 3.
 */

function withCounts(
  beat: number,
  lost: number,
  matched: number,
  overrides: Partial<PublicClvPolicyInput> = {},
): PublicClvPolicyInput {
  return {
    canExposePerformanceStats: true,
    minGradedForPublic: 25,
    gradedSampleSize: beat + lost + matched,
    beatCloseCount: beat,
    lostToCloseCount: lost,
    matchedCloseCount: matched,
    ...overrides,
  };
}

describe("the published beat-close rate counts no-moves against us", () => {
  it("reproduces the live production rate exactly", () => {
    // The numbers above, unmodified. If this ever stops matching a fresh
    // production pull, the population or the grader changed -- not this test.
    const p = evaluatePublicClvPolicy(withCounts(348, 527, 659));
    expect(p.gradedSampleSize).toBe(1534);
    expect(p.beatCloseRatePct).toBe(22.7);
    expect(p.clearsBreakEven).toBe(false);
  });

  it("the same rows read 39.8% when only moved lines count", () => {
    // Identical BEAT and LOST counts, matched removed from the denominator.
    const decidedOnly = evaluatePublicClvPolicy(withCounts(348, 527, 0));
    expect(decidedOnly.gradedSampleSize).toBe(875);
    expect(decidedOnly.beatCloseRatePct).toBe(39.8);
    // Still nowhere near break-even, so on TODAY'S data the denominator does
    // not change the verdict. That is the reassuring half of this finding and
    // it is why this is a recorded question rather than an incident.
    expect(decidedOnly.clearsBreakEven).toBe(false);
  });

  it("but the denominator CAN flip the break-even verdict", () => {
    // The load-bearing demonstration. One sample, two denominators, two
    // opposite public claims -- so "which denominator" is not a presentational
    // detail, it decides whether the product asserts a settled edge.
    //
    // 420 beat / 280 lost is 60% on moved lines, a lower bound clear of 52.4%.
    // Add 300 no-moves and the same rows publish 42% and claim nothing.
    const decided = evaluatePublicClvPolicy(withCounts(420, 280, 0));
    expect(decided.clearsBreakEven).toBe(true);

    const withNoMoves = evaluatePublicClvPolicy(withCounts(420, 280, 300));
    expect(withNoMoves.clearsBreakEven).toBe(false);
    expect(withNoMoves.beatCloseRatePct).toBeLessThan(decided.beatCloseRatePct!);
  });

  it("a sample that is ALL no-moves publishes 0% rather than refusing", () => {
    // The degenerate end of the same arithmetic: a market that never moved
    // reads as a total failure to beat the close. Recorded because it is the
    // clearest statement of what the current denominator means, and because a
    // thin, illiquid sport is exactly where this shape shows up.
    const p = evaluatePublicClvPolicy(withCounts(0, 0, 40));
    expect(p.beatCloseRatePct).toBe(0);
    expect(p.clearsBreakEven).toBe(false);
  });
});
