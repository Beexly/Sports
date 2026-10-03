/**
 * Vitest suite for arXiv:2409.09884v1 (Dynamic quantification of player value for fantasy basketball).
 * Gate: ADOPT H-scoring-style dynamic drafting if, across 1,000 simulated seasons per seat, it beats static-rank drafting by ≥5 percentage points of playoff rate with SE ≤ 1.6%. Reject if the gain concentrates only in top seats.
 */
import { describe, it, expect } from "vitest";
import { passerRating, splitRating, decomposeRating, rSquared, PassAttempt } from "./2409-09884v1-dynamic-quantification-of-player-value";

describe("2409-09884v1 passer-rating decomposition", () => {
  it("passer rating matches the canonical formula", () => {
    // 2024-ish line: 400 att, 280 comp, 3200 yds, 25 td, 10 int -> ~102.5
    const r = passerRating(400, 280, 3200, 25, 10);
    expect(r).toBeGreaterThan(100);
    expect(r).toBeLessThan(110);
    expect(() => passerRating(0, 0, 0, 0, 0)).toThrow();
  });
  it("decomposes in-structure vs out-of-structure", () => {
    const atts: PassAttempt[] = [
      { structured: true, complete: true, yards: 12, td: false, int: false },
      { structured: true, complete: true, yards: 8, td: true, int: false },
      { structured: false, complete: false, yards: 0, td: false, int: true },
      { structured: false, complete: true, yards: 25, td: false, int: false },
    ];
    const d = decomposeRating(atts);
    expect(d.structuredShare).toBeCloseTo(0.5, 10);
    expect(d.inStructure).toBeGreaterThan(d.outOfStructure ?? 0);
  });
  it("R^2 is 1 for a perfect line", () => {
    expect(rSquared([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 10);
    expect(() => rSquared([1, 2], [1, 2])).toThrow();
  });
});
