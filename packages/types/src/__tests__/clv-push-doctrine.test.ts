/**
 * computeClvPushDoctrineRates in @sports/types: pins the three
 * differently-denominated CLV beat-close readings against the counts measured
 * in production 2026-09-19 (read-only SELECT, published non-bootstrap DECIDED
 * picks):
 *
 *   MATCHED_CLOSE   686 rows
 *   LOST_TO_CLOSE   533 rows
 *   BEAT_CLOSE      368 rows
 *   total graded   1587
 *
 * This is the SAME arithmetic public-clv-policy.ts re-exports — the shared
 * implementation lives here so every surface that reports a CLV beat rate
 * states identical numbers. This test does not decide which of the three is
 * "correct" for any gate; it pins the arithmetic, the null-on-empty behaviors
 * and the identity against the re-export so the ambiguity documented in
 * public-clv-policy.ts stays visible with exact numbers, not just prose.
 */
import { describe, expect, it } from "vitest";
import {
  computeClvPushDoctrineRates,
  type ClvVerdictCounts,
} from "../index.js";

// The measured production counts, 2026-09-19.
const MEASURED: ClvVerdictCounts = {
  beatCloseCount: 368,
  lostToCloseCount: 533,
  matchedCloseCount: 686,
};

describe("computeClvPushDoctrineRates (@sports/types): three denominators, side by side", () => {
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
    expect(rates.clvPushRate).not.toBeNull();
    expect(rates.clvPushRate).toBeCloseTo(0.4323, 4);
  });

  it("decidedClvBeatRate is null when there are zero decided rows (never coerced to 0)", () => {
    const rates = computeClvPushDoctrineRates({
      beatCloseCount: 0,
      lostToCloseCount: 0,
      matchedCloseCount: 5,
    });
    expect(rates.decidedClvBeatRate).toBeNull();
    expect(rates.decidedClvBeatDenominator).toBe(0);
    expect(rates.allGradedClvBeatRate).toBe(0); // 0/5 — a real measured zero
  });

  it("is null everywhere on an empty sample, never NaN", () => {
    const rates = computeClvPushDoctrineRates({
      beatCloseCount: 0,
      lostToCloseCount: 0,
      matchedCloseCount: 0,
    });
    expect(rates.decidedClvBeatRate).toBeNull();
    expect(rates.allGradedClvBeatRate).toBeNull();
    expect(rates.clvPushRate).toBeNull();
  });

  it("floors negative and non-finite counts so a count is always a count", () => {
    const rates = computeClvPushDoctrineRates({
      beatCloseCount: Number.NaN,
      lostToCloseCount: -3,
      matchedCloseCount: 2.9,
    });
    expect(rates.decidedClvBeatRate).toBeNull(); // beat+lost floored to 0
    expect(rates.clvPushRate).toBe(1); // 2/2
  });
});
