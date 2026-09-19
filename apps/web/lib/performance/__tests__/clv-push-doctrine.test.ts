/**
 * computeClvPushDoctrineRates: pins the three differently-denominated CLV
 * beat-close readings against the counts measured in production 2026-09-19
 * (read-only SELECT, published non-bootstrap DECIDED picks):
 *
 *   MATCHED_CLOSE   686 rows
 *   LOST_TO_CLOSE   533 rows
 *   BEAT_CLOSE      368 rows
 *   total graded   1587
 *
 * This test does not decide which of the three is "correct" for any gate.
 * It pins the arithmetic and the null-on-zero-decided behavior so the
 * ambiguity documented in public-clv-policy.ts stays visible with exact
 * numbers, not just prose.
 */
import { describe, expect, it } from "vitest";
import {
  computeClvPushDoctrineRates,
  type ClvVerdictCounts,
} from "@/lib/performance/public-clv-policy";

// The measured production counts, 2026-09-19.
const MEASURED: ClvVerdictCounts = {
  beatCloseCount: 368,
  lostToCloseCount: 533,
  matchedCloseCount: 686,
};

describe("computeClvPushDoctrineRates: three denominators, side by side", () => {
  it("pins decidedClvBeatRate = BEAT_CLOSE / (BEAT_CLOSE + LOST_TO_CLOSE) to 4 decimals", () => {
    const rates = computeClvPushDoctrineRates(MEASURED);
    expect(rates.decidedClvBeatDenominator).toBe(901); // 368 + 533
    expect(rates.decidedClvBeatRate).not.toBeNull();
    expect(rates.decidedClvBeatRate).toBeCloseTo(0.4084, 4);
  });

  it("pins allGradedClvBeatRate = BEAT_CLOSE / totalGraded to 4 decimals", () => {
    const rates = computeClvPushDoctrineRates(MEASURED);
    expect(rates.allGradedClvBeatDenominator).toBe(1587); // 368 + 533 + 686
    expect(rates.allGradedClvBeatRate).not.toBeNull();
    expect(rates.allGradedClvBeatRate).toBeCloseTo(0.2319, 4);
  });

  it("pins clvPushRate = MATCHED_CLOSE / totalGraded to 4 decimals", () => {
    const rates = computeClvPushDoctrineRates(MEASURED);
    expect(rates.clvPushRateDenominator).toBe(1587); // 368 + 533 + 686
    expect(rates.clvPushRate).not.toBeNull();
    expect(rates.clvPushRate).toBeCloseTo(0.4323, 4);
  });

  it("the three denominators differ: decided excludes the push, all-graded and push-rate include it", () => {
    const rates = computeClvPushDoctrineRates(MEASURED);
    expect(rates.decidedClvBeatDenominator).not.toBe(rates.allGradedClvBeatDenominator);
    expect(rates.decidedClvBeatDenominator).toBe(901);
    expect(rates.allGradedClvBeatDenominator).toBe(1587);
    // allGradedClvBeatRate and clvPushRate share one denominator (totalGraded)
    // by construction: both include every MATCHED_CLOSE row in the count.
    expect(rates.allGradedClvBeatDenominator).toBe(rates.clvPushRateDenominator);
  });

  it("allGradedClvBeatRate matches beatCloseRatePct's own computation (beat / gradedSampleSize)", () => {
    const rates = computeClvPushDoctrineRates(MEASURED);
    const gradedSampleSize =
      MEASURED.beatCloseCount + MEASURED.lostToCloseCount + MEASURED.matchedCloseCount;
    const expected = Math.round((MEASURED.beatCloseCount / gradedSampleSize) * 1000) / 10;
    // beatCloseRatePct is rounded to one decimal PERCENT; allGradedClvBeatRate
    // is rounded to four decimal FRACTION. Same ratio, different display precision.
    expect(rates.allGradedClvBeatRate! * 100).toBeCloseTo(expected, 1);
  });

  it("returns null (never 0, never NaN) for decidedClvBeatRate when there are zero decided rows", () => {
    const rates = computeClvPushDoctrineRates({
      beatCloseCount: 0,
      lostToCloseCount: 0,
      matchedCloseCount: 42,
    });
    expect(rates.decidedClvBeatDenominator).toBe(0);
    expect(rates.decidedClvBeatRate).toBeNull();
    // The graded denominator is still nonzero here (42 pushes), so the other
    // two readings are real numbers, not null: zero DECIDED rows is a
    // different state from zero GRADED rows, and only the former is true here.
    expect(rates.allGradedClvBeatDenominator).toBe(42);
    expect(rates.allGradedClvBeatRate).toBe(0);
    expect(rates.clvPushRate).toBe(1);
  });

  it("returns null for all three rates when there are zero graded rows of any kind", () => {
    const rates = computeClvPushDoctrineRates({
      beatCloseCount: 0,
      lostToCloseCount: 0,
      matchedCloseCount: 0,
    });
    expect(rates.decidedClvBeatDenominator).toBe(0);
    expect(rates.allGradedClvBeatDenominator).toBe(0);
    expect(rates.clvPushRateDenominator).toBe(0);
    expect(rates.decidedClvBeatRate).toBeNull();
    expect(rates.allGradedClvBeatRate).toBeNull();
    expect(rates.clvPushRate).toBeNull();
  });

  it("never returns NaN, for any zero-denominator combination", () => {
    const rates = computeClvPushDoctrineRates({
      beatCloseCount: 0,
      lostToCloseCount: 0,
      matchedCloseCount: 0,
    });
    for (const value of [rates.decidedClvBeatRate, rates.allGradedClvBeatRate, rates.clvPushRate]) {
      expect(value === null || Number.isFinite(value)).toBe(true);
    }
  });

  it("floors negative or non-finite counts to 0 defensively, never producing a negative denominator", () => {
    const rates = computeClvPushDoctrineRates({
      beatCloseCount: -5,
      lostToCloseCount: Number.NaN,
      matchedCloseCount: -Infinity,
    });
    expect(rates.decidedClvBeatDenominator).toBe(0);
    expect(rates.allGradedClvBeatDenominator).toBe(0);
    expect(rates.decidedClvBeatRate).toBeNull();
    expect(rates.allGradedClvBeatRate).toBeNull();
    expect(rates.clvPushRate).toBeNull();
  });

  it("does not touch any gate: computeClvPushDoctrineRates has no side effects and takes only counts", () => {
    // Additive-reporting contract: the function signature is (counts) => rates,
    // with no db, no flags, no gate input. This test exists so a future edit
    // that widens the signature to accept a gate or a flag is caught here.
    expect(computeClvPushDoctrineRates.length).toBe(1);
  });
});
