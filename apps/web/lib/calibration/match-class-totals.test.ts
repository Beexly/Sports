import { describe, it, expect } from "vitest";
import {
  kappaIndex,
  classifyFixture,
  classConditionalTotal,
  scorelineClusteringAnomaly,
  normalizedAnomaly,
  type MatchClass,
  type ClassScoringParams,
} from "@/lib/calibration/match-class-totals";

// ============================================================
// arXiv 2601.09673v3 — match classification. Additive only.
// ============================================================

const params: Record<MatchClass, ClassScoringParams> = {
  offensive: { mean: 3.2, dispersion: 1.4 },
  competitive: { mean: 2.5, dispersion: 1.1 },
  "collusion-vulnerable": { mean: 2.5, dispersion: 2.0 },
};

describe("match classification — 2601.09673v3", () => {
  it("kappaIndex is the observed/baseline ratio", () => {
    expect(kappaIndex(3.0, 2.5)).toBeCloseTo(1.2, 10);
    expect(kappaIndex(3.0, 0)).toBe(1);
  });

  it("classifyFixture applies the collusion flag first", () => {
    expect(classifyFixture(2.0, true)).toBe("collusion-vulnerable");
    expect(classifyFixture(1.5, false)).toBe("offensive");
    expect(classifyFixture(1.1, false)).toBe("competitive");
  });

  it("classConditionalTotal scales by class mean", () => {
    const t = classConditionalTotal(2.5, "offensive", params);
    expect(t).toBeCloseTo(3.2, 10);
    expect(classConditionalTotal(2.5, "competitive", params)).toBeCloseTo(2.5, 10);
  });

  it("scorelineClusteringAnomaly is 0 for a perfect match", () => {
    const h = { "1-0": 10, "2-1": 5 };
    expect(scorelineClusteringAnomaly(h, h)).toBeCloseTo(0, 10);
  });

  it("scorelineClusteringAnomaly grows with clustering", () => {
    const expected = { "1-0": 5, "2-1": 5, "0-0": 5 };
    const clustered = { "1-0": 13, "2-1": 1, "0-0": 1 };
    const even = { "1-0": 5, "2-1": 5, "0-0": 5 };
    expect(scorelineClusteringAnomaly(clustered, expected)).toBeGreaterThan(
      scorelineClusteringAnomaly(even, expected),
    );
  });

  it("normalizedAnomaly divides by the number of scorelines", () => {
    const o = { "1-0": 13, "2-1": 1 };
    const e = { "1-0": 7, "2-1": 7 };
    expect(normalizedAnomaly(o, e)).toBeCloseTo(
      scorelineClusteringAnomaly(o, e) / 2,
      10,
    );
    expect(normalizedAnomaly({}, e)).toBe(0);
  });
});
