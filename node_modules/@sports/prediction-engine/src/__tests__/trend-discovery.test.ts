import { describe, it, expect } from "vitest";
import {
  discoverCohortTrends,
  significantTrends,
  welchCompare,
  twoSidedP,
  range,
  type Observation,
} from "../trend-discovery";

// Deterministic synthetic slate: a small ± oscillation around a base mean keeps
// variance controlled and the test reproducible (no RNG). "Old" QBs (age 38)
// funnel more targets to the RB than "young" QBs (age 28) — a planted trend the
// discovery engine should recover with the right magnitude and significance.
function obsFor(age: number, base: number, count: number): Observation[] {
  return Array.from({ length: count }, (_, i) => ({
    metric: base + ((i % 5) - 2) * 0.01, // spread ±0.02
    features: { qbAge: age },
  }));
}

const SLATE: Observation[] = [
  ...obsFor(28, 0.18, 200),
  ...obsFor(38, 0.21, 100),
];

describe("trend discovery — cohort analysis", () => {
  it("recovers the planted QB-age trend with the right magnitude", () => {
    const trends = discoverCohortTrends(SLATE, {
      feature: "qbAge",
      buckets: [range("37+", 37), range("<34", 0, 33)],
      minSampleSize: 30,
    });

    const old = trends.find((t) => t.cohort === "37+")!;
    expect(old.n).toBe(100);
    expect(old.baselineN).toBe(200);
    expect(old.cohortMean).toBeCloseTo(0.21, 3);
    expect(old.baselineMean).toBeCloseTo(0.18, 3);
    expect(old.absoluteDelta).toBeCloseTo(0.03, 3);
    // (0.21 - 0.18) / 0.18 ≈ +16.7%
    expect(old.relativeDelta).toBeCloseTo(0.1667, 2);
    expect(old.significant).toBe(true);
    expect(old.pValue).toBeLessThan(0.001);
  });

  it("ranks the largest relative effect first", () => {
    const trends = discoverCohortTrends(SLATE, {
      feature: "qbAge",
      buckets: [range("37+", 37), range("27-29", 27, 29)],
      minSampleSize: 30,
    });
    expect(Math.abs(trends[0]!.relativeDelta)).toBeGreaterThanOrEqual(Math.abs(trends[1]!.relativeDelta));
  });

  it("does not flag a cohort with no real difference", () => {
    const flat: Observation[] = [
      ...obsFor(28, 0.2, 150),
      ...obsFor(38, 0.2, 150),
    ];
    const sig = significantTrends(flat, {
      feature: "qbAge",
      buckets: [range("37+", 37)],
      minSampleSize: 30,
    });
    expect(sig).toHaveLength(0);
  });

  it("skips cohorts below the minimum sample size", () => {
    const trends = discoverCohortTrends(SLATE, {
      feature: "qbAge",
      buckets: [range("45+", 45)], // nobody this old → empty cohort
      minSampleSize: 30,
    });
    expect(trends).toHaveLength(0);
  });
});

describe("trend discovery — statistics", () => {
  it("two-sided p is ~1 at z=0 and ~0 for a large z", () => {
    expect(twoSidedP(0)).toBeCloseTo(1, 5);
    expect(twoSidedP(8)).toBeLessThan(1e-6);
    expect(twoSidedP(1.96)).toBeCloseTo(0.05, 2);
  });

  it("welchCompare returns a neutral result for degenerate input", () => {
    expect(welchCompare([1], [1, 2, 3])).toEqual({ z: 0, pValue: 1 });
  });

  it("range() matches inclusive numeric bounds only", () => {
    const b = range("30-33", 30, 33);
    expect(b.test(30)).toBe(true);
    expect(b.test(33)).toBe(true);
    expect(b.test(34)).toBe(false);
    expect(b.test("30")).toBe(false); // strings never match a numeric range
  });
});
