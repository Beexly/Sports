/**
 * Tests for retention-analytics.ts — pure retention analytics utilities.
 * 150+ test cases covering every exported function and documented edge case.
 */

import { describe, it, expect } from "vitest";
import {
  // 1. Retention rates
  retentionRate,
  churnRate,
  nDayRetention,
  rollingRetention,
  bracketedRetention,
  // 2. Cohort curves
  retentionCurve,
  survivalCurve,
  averageRetention,
  retentionHalfLife,
  decayRate,
  // 3. Lifetime & value
  averageLifetimeDays,
  customerLifetime,
  ltvFromRetention,
  expectedRemainingLifetime,
  // 4. Engagement-based
  stickiness,
  engagementRate,
  powerUserRatio,
  resurrectionRate,
  activationRate,
  // 5. Cohort comparison
  cohortRetentionMatrix,
  bestRetainingCohort,
  retentionImprovement,
  cohortSizeWeightedRetention,
  // 6. Predictive signals
  churnRiskScore,
  predictedChurnProbability,
  healthScore,
  atRiskFlag,
  // 7. Aggregate metrics & DK-style ranking
  quickRatio,
  netRetentionRate,
  grossRetentionRate,
  magicNumber,
} from "@/lib/analytics/retention-analytics";

const close = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) <= eps;

// ===========================================================================
// 1. Retention rates
// ===========================================================================

describe("retentionRate", () => {
  it("computes retained / cohortSize", () => {
    expect(retentionRate(50, 100)).toBe(0.5);
  });
  it("returns 1 when all retained", () => {
    expect(retentionRate(100, 100)).toBe(1);
  });
  it("returns 0 when none retained", () => {
    expect(retentionRate(0, 100)).toBe(0);
  });
  it("returns 0 when cohortSize is 0", () => {
    expect(retentionRate(0, 0)).toBe(0);
  });
  it("returns 0 when cohortSize is 0 even with positive retained", () => {
    expect(retentionRate(5, 0)).toBe(0);
  });
  it("handles fractional results", () => {
    expect(retentionRate(1, 3)).toBeCloseTo(0.3333333, 6);
  });
  it("handles small cohorts", () => {
    expect(retentionRate(1, 2)).toBe(0.5);
  });
});

describe("churnRate", () => {
  it("computes churned / cohortSize", () => {
    expect(churnRate(30, 100)).toBe(0.3);
  });
  it("returns 0 when cohortSize is 0", () => {
    expect(churnRate(10, 0)).toBe(0);
  });
  it("returns 0 when nobody churned", () => {
    expect(churnRate(0, 100)).toBe(0);
  });
  it("returns 1 when everybody churned", () => {
    expect(churnRate(100, 100)).toBe(1);
  });
  it("is complementary to retentionRate", () => {
    expect(churnRate(40, 100) + retentionRate(60, 100)).toBe(1);
  });
});

describe("nDayRetention", () => {
  it("computes activeOnDayN / cohortSize", () => {
    expect(nDayRetention(25, 100)).toBe(0.25);
  });
  it("returns 0 when cohortSize is 0", () => {
    expect(nDayRetention(10, 0)).toBe(0);
  });
  it("returns 0 with no actives", () => {
    expect(nDayRetention(0, 50)).toBe(0);
  });
  it("returns 1 with full retention", () => {
    expect(nDayRetention(50, 50)).toBe(1);
  });
});

describe("rollingRetention", () => {
  it("computes stillActiveAfterN / cohortSize", () => {
    expect(rollingRetention(40, 100)).toBe(0.4);
  });
  it("returns 0 when cohortSize is 0", () => {
    expect(rollingRetention(40, 0)).toBe(0);
  });
  it("returns 0 with no actives", () => {
    expect(rollingRetention(0, 80)).toBe(0);
  });
  it("returns 1 with all active", () => {
    expect(rollingRetention(80, 80)).toBe(1);
  });
});

describe("bracketedRetention", () => {
  it("computes activeInWindow / cohortSize", () => {
    expect(bracketedRetention(60, 100)).toBe(0.6);
  });
  it("returns 0 when cohortSize is 0", () => {
    expect(bracketedRetention(60, 0)).toBe(0);
  });
  it("returns 0 with empty window actives", () => {
    expect(bracketedRetention(0, 100)).toBe(0);
  });
  it("returns 1 with full window retention", () => {
    expect(bracketedRetention(100, 100)).toBe(1);
  });
});

// ===========================================================================
// 2. Cohort curves
// ===========================================================================

describe("retentionCurve", () => {
  it("computes per-period fractions", () => {
    expect(retentionCurve([100, 80, 60, 40], 100)).toEqual([1, 0.8, 0.6, 0.4]);
  });
  it("returns empty array for empty input", () => {
    expect(retentionCurve([], 100)).toEqual([]);
  });
  it("returns zeros when cohortSize is 0", () => {
    expect(retentionCurve([10, 5], 0)).toEqual([0, 0]);
  });
  it("starts at 1.0 in period 0 when actives == size", () => {
    const curve = retentionCurve([200, 150], 200);
    expect(curve[0]).toBe(1);
  });
  it("handles a single period", () => {
    expect(retentionCurve([50], 100)).toEqual([0.5]);
  });
  it("preserves length", () => {
    expect(retentionCurve([100, 90, 80, 70, 60], 100)).toHaveLength(5);
  });
  it("handles fractional retention values", () => {
    const curve = retentionCurve([100, 33], 100);
    expect(curve[1]).toBe(0.33);
  });
});

describe("survivalCurve", () => {
  it("computes cumulative survival", () => {
    expect(survivalCurve([20, 20, 20], 100)).toEqual([0.8, 0.6, 0.4]);
  });
  it("returns empty array for empty input", () => {
    expect(survivalCurve([], 100)).toEqual([]);
  });
  it("returns zeros when cohortSize is 0", () => {
    expect(survivalCurve([5, 5], 0)).toEqual([0, 0]);
  });
  it("never drops below 0", () => {
    const curve = survivalCurve([60, 60], 100);
    expect(curve[0]).toBe(0.4);
    expect(curve[1]).toBe(0);
  });
  it("stays clamped at 0 after exhaustion", () => {
    const curve = survivalCurve([100, 10], 100);
    expect(curve[0]).toBe(0);
    expect(curve[1]).toBe(0);
  });
  it("reflects full survival with no churn", () => {
    expect(survivalCurve([0, 0, 0], 100)).toEqual([1, 1, 1]);
  });
  it("is monotonically non-increasing", () => {
    const curve = survivalCurve([10, 15, 5], 100);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i]! <= curve[i - 1]!).toBe(true);
    }
  });
});

describe("averageRetention", () => {
  it("computes the mean of the curve", () => {
    expect(averageRetention([1, 0.8, 0.6, 0.4])).toBeCloseTo(0.7, 9);
  });
  it("returns 0 for an empty curve", () => {
    expect(averageRetention([])).toBe(0);
  });
  it("returns the single value for one element", () => {
    expect(averageRetention([0.42])).toBe(0.42);
  });
  it("handles an all-zero curve", () => {
    expect(averageRetention([0, 0, 0])).toBe(0);
  });
  it("handles an all-one curve", () => {
    expect(averageRetention([1, 1, 1])).toBe(1);
  });
});

describe("retentionHalfLife", () => {
  it("finds the first index at or below 0.5", () => {
    expect(retentionHalfLife([1, 0.8, 0.5, 0.3])).toBe(2);
  });
  it("returns -1 when retention never drops to 0.5", () => {
    expect(retentionHalfLife([1, 0.9, 0.8, 0.7])).toBe(-1);
  });
  it("detects exactly 0.5 as the boundary", () => {
    expect(retentionHalfLife([1, 0.5])).toBe(1);
  });
  it("returns 0 when the very first period is already ≤ 0.5", () => {
    expect(retentionHalfLife([0.4, 0.3])).toBe(0);
  });
  it("returns -1 for an empty curve", () => {
    expect(retentionHalfLife([])).toBe(-1);
  });
  it("returns the first crossing even if it recovers later", () => {
    expect(retentionHalfLife([1, 0.5, 0.9])).toBe(1);
  });
  it("returns -1 when all values are above 0.5", () => {
    expect(retentionHalfLife([0.99, 0.6, 0.51])).toBe(-1);
  });
});

describe("decayRate", () => {
  it("returns 0 for fewer than 2 points", () => {
    expect(decayRate([])).toBe(0);
    expect(decayRate([0.9])).toBe(0);
  });
  it("computes a constant decline ratio", () => {
    // 1 -> 0.5 -> 0.25 : each step declines by 50%.
    expect(decayRate([1, 0.5, 0.25])).toBeCloseTo(0.5, 9);
  });
  it("returns 0 for a flat curve", () => {
    expect(decayRate([0.8, 0.8, 0.8])).toBe(0);
  });
  it("handles a single-step decline", () => {
    expect(decayRate([1, 0.7])).toBeCloseTo(0.3, 9);
  });
  it("ignores steps where previous value is 0", () => {
    // Valid steps: 1->0.5 (0.5) and 0.5->0 (1.0); the trailing 0->0 step is
    // skipped because its previous value is 0. Average = (0.5 + 1.0)/2 = 0.75.
    expect(decayRate([1, 0.5, 0, 0])).toBeCloseTo(0.75, 9);
  });
  it("returns 0 when every previous value is 0", () => {
    expect(decayRate([0, 0, 0])).toBe(0);
  });
  it("produces a negative ratio for growth", () => {
    expect(decayRate([0.5, 1])).toBeCloseTo(-1, 9);
  });
});

// ===========================================================================
// 3. Lifetime & value
// ===========================================================================

describe("averageLifetimeDays", () => {
  it("computes the trapezoidal area under the curve", () => {
    // segments: (1+0.5)/2 + (0.5+0)/2 = 0.75 + 0.25 = 1.0
    expect(averageLifetimeDays([1, 0.5, 0])).toBeCloseTo(1, 9);
  });
  it("returns 0 for an empty curve", () => {
    expect(averageLifetimeDays([])).toBe(0);
  });
  it("returns the single value for one element", () => {
    expect(averageLifetimeDays([0.8])).toBe(0.8);
  });
  it("computes area for a flat full-retention curve", () => {
    // (1+1)/2 * 3 segments... [1,1,1,1] => 3 segments each area 1 => 3
    expect(averageLifetimeDays([1, 1, 1, 1])).toBeCloseTo(3, 9);
  });
  it("returns 0 for an all-zero curve", () => {
    expect(averageLifetimeDays([0, 0, 0])).toBe(0);
  });
  it("is non-negative for valid retention curves", () => {
    expect(averageLifetimeDays([1, 0.9, 0.7, 0.4]) >= 0).toBe(true);
  });
});

describe("customerLifetime", () => {
  it("computes 1 / churnRate", () => {
    expect(customerLifetime(0.1)).toBeCloseTo(10, 9);
  });
  it("returns Infinity when churnRate is 0", () => {
    expect(customerLifetime(0)).toBe(Infinity);
  });
  it("returns 1 for churnRate 1", () => {
    expect(customerLifetime(1)).toBe(1);
  });
  it("handles small churn rates", () => {
    expect(customerLifetime(0.02)).toBeCloseTo(50, 9);
  });
});

describe("ltvFromRetention", () => {
  it("sums retention × revenuePerPeriod", () => {
    expect(ltvFromRetention([1, 0.5, 0.25], 100)).toBeCloseTo(175, 9);
  });
  it("returns 0 for an empty curve", () => {
    expect(ltvFromRetention([], 100)).toBe(0);
  });
  it("returns 0 when revenue is 0", () => {
    expect(ltvFromRetention([1, 0.8], 0)).toBe(0);
  });
  it("scales linearly with revenue", () => {
    const a = ltvFromRetention([1, 0.5], 10);
    const b = ltvFromRetention([1, 0.5], 20);
    expect(b).toBeCloseTo(a * 2, 9);
  });
});

describe("expectedRemainingLifetime", () => {
  it("computes 1 / churnRate (memoryless)", () => {
    expect(expectedRemainingLifetime(5, 0.1)).toBeCloseTo(10, 9);
  });
  it("returns Infinity when churnRate is 0", () => {
    expect(expectedRemainingLifetime(3, 0)).toBe(Infinity);
  });
  it("is independent of current period", () => {
    expect(expectedRemainingLifetime(0, 0.25)).toBe(expectedRemainingLifetime(99, 0.25));
  });
  it("returns 1 for churnRate 1", () => {
    expect(expectedRemainingLifetime(2, 1)).toBe(1);
  });
});

// ===========================================================================
// 4. Engagement-based
// ===========================================================================

describe("stickiness", () => {
  it("computes DAU / MAU", () => {
    expect(stickiness(200, 1000)).toBe(0.2);
  });
  it("returns 0 when MAU is 0", () => {
    expect(stickiness(50, 0)).toBe(0);
  });
  it("returns 1 when DAU equals MAU", () => {
    expect(stickiness(500, 500)).toBe(1);
  });
  it("returns 0 with no DAU", () => {
    expect(stickiness(0, 1000)).toBe(0);
  });
});

describe("engagementRate", () => {
  it("computes activeUsers / totalUsers", () => {
    expect(engagementRate(300, 1000)).toBe(0.3);
  });
  it("returns 0 when totalUsers is 0", () => {
    expect(engagementRate(10, 0)).toBe(0);
  });
  it("returns 1 when all engaged", () => {
    expect(engagementRate(1000, 1000)).toBe(1);
  });
});

describe("powerUserRatio", () => {
  it("computes powerUsers / totalUsers", () => {
    expect(powerUserRatio(50, 1000)).toBe(0.05);
  });
  it("returns 0 when totalUsers is 0", () => {
    expect(powerUserRatio(5, 0)).toBe(0);
  });
  it("returns 0 with no power users", () => {
    expect(powerUserRatio(0, 100)).toBe(0);
  });
});

describe("resurrectionRate", () => {
  it("computes resurrected / churned", () => {
    expect(resurrectionRate(25, 100)).toBe(0.25);
  });
  it("returns 0 when churned is 0", () => {
    expect(resurrectionRate(10, 0)).toBe(0);
  });
  it("returns 0 with no resurrections", () => {
    expect(resurrectionRate(0, 50)).toBe(0);
  });
  it("can exceed 1 if more resurrected than recently churned", () => {
    expect(resurrectionRate(60, 50)).toBe(1.2);
  });
});

describe("activationRate", () => {
  it("computes activated / signups", () => {
    expect(activationRate(40, 100)).toBe(0.4);
  });
  it("returns 0 when signups is 0", () => {
    expect(activationRate(10, 0)).toBe(0);
  });
  it("returns 1 when all signups activate", () => {
    expect(activationRate(100, 100)).toBe(1);
  });
  it("returns 0 with no activations", () => {
    expect(activationRate(0, 100)).toBe(0);
  });
});

// ===========================================================================
// 5. Cohort comparison
// ===========================================================================

describe("cohortRetentionMatrix", () => {
  it("builds a map of cohort -> retention curve", () => {
    const matrix = cohortRetentionMatrix([
      { cohort: "2024-01", periodActives: [100, 80, 60], size: 100 },
      { cohort: "2024-02", periodActives: [200, 180, 160], size: 200 },
    ]);
    expect(matrix.get("2024-01")).toEqual([1, 0.8, 0.6]);
    expect(matrix.get("2024-02")).toEqual([1, 0.9, 0.8]);
  });
  it("returns an empty map for empty input", () => {
    expect(cohortRetentionMatrix([]).size).toBe(0);
  });
  it("preserves all cohorts", () => {
    const matrix = cohortRetentionMatrix([
      { cohort: "a", periodActives: [10], size: 10 },
      { cohort: "b", periodActives: [20], size: 20 },
      { cohort: "c", periodActives: [30], size: 30 },
    ]);
    expect(matrix.size).toBe(3);
  });
  it("handles a cohort with size 0 (zeros curve)", () => {
    const matrix = cohortRetentionMatrix([
      { cohort: "z", periodActives: [5, 3], size: 0 },
    ]);
    expect(matrix.get("z")).toEqual([0, 0]);
  });
  it("handles cohorts with empty period actives", () => {
    const matrix = cohortRetentionMatrix([
      { cohort: "empty", periodActives: [], size: 100 },
    ]);
    expect(matrix.get("empty")).toEqual([]);
  });
});

describe("bestRetainingCohort", () => {
  it("returns the cohort with highest retention at a period", () => {
    const matrix = new Map<string, number[]>([
      ["a", [1, 0.5, 0.2]],
      ["b", [1, 0.7, 0.4]],
      ["c", [1, 0.6, 0.3]],
    ]);
    expect(bestRetainingCohort(matrix, 1)).toBe("b");
    expect(bestRetainingCohort(matrix, 2)).toBe("b");
  });
  it("returns null for an empty matrix", () => {
    expect(bestRetainingCohort(new Map(), 0)).toBeNull();
  });
  it("returns null when no cohort has data at the period", () => {
    const matrix = new Map<string, number[]>([["a", [1, 0.5]]]);
    expect(bestRetainingCohort(matrix, 5)).toBeNull();
  });
  it("returns null for a negative period", () => {
    const matrix = new Map<string, number[]>([["a", [1, 0.5]]]);
    expect(bestRetainingCohort(matrix, -1)).toBeNull();
  });
  it("works at period 0", () => {
    const matrix = new Map<string, number[]>([
      ["a", [0.9]],
      ["b", [1]],
    ]);
    expect(bestRetainingCohort(matrix, 0)).toBe("b");
  });
  it("ignores cohorts too short for the period", () => {
    const matrix = new Map<string, number[]>([
      ["short", [1]],
      ["long", [1, 0.8, 0.6]],
    ]);
    expect(bestRetainingCohort(matrix, 2)).toBe("long");
  });
});

describe("retentionImprovement", () => {
  it("computes the average delta (new − old)", () => {
    // deltas: 0, 0.1, 0.2 -> avg 0.1
    expect(retentionImprovement([1, 0.6, 0.4], [1, 0.7, 0.6])).toBeCloseTo(0.1, 9);
  });
  it("returns 0 for no overlap", () => {
    expect(retentionImprovement([], [1, 0.5])).toBe(0);
    expect(retentionImprovement([1, 0.5], [])).toBe(0);
  });
  it("returns negative when retention worsened", () => {
    expect(retentionImprovement([1, 0.8], [1, 0.6])).toBeCloseTo(-0.1, 9);
  });
  it("returns 0 for identical curves", () => {
    expect(retentionImprovement([1, 0.5], [1, 0.5])).toBe(0);
  });
  it("uses only overlapping periods", () => {
    // overlap length 2: deltas 0, 0.1 -> avg 0.05
    expect(retentionImprovement([1, 0.5], [1, 0.6, 0.4, 0.3])).toBeCloseTo(0.05, 9);
  });
});

describe("cohortSizeWeightedRetention", () => {
  it("computes a size-weighted average", () => {
    // (0.5*100 + 0.8*300) / 400 = (50 + 240)/400 = 0.725
    expect(
      cohortSizeWeightedRetention([
        { retention: 0.5, size: 100 },
        { retention: 0.8, size: 300 },
      ]),
    ).toBeCloseTo(0.725, 9);
  });
  it("returns 0 for empty input", () => {
    expect(cohortSizeWeightedRetention([])).toBe(0);
  });
  it("returns 0 when total size is 0", () => {
    expect(
      cohortSizeWeightedRetention([
        { retention: 0.5, size: 0 },
        { retention: 0.9, size: 0 },
      ]),
    ).toBe(0);
  });
  it("equals the simple value for a single cohort", () => {
    expect(cohortSizeWeightedRetention([{ retention: 0.42, size: 10 }])).toBeCloseTo(0.42, 9);
  });
  it("weights larger cohorts more heavily", () => {
    const result = cohortSizeWeightedRetention([
      { retention: 0.1, size: 1 },
      { retention: 0.9, size: 999 },
    ]);
    expect(result > 0.8).toBe(true);
  });
});

// ===========================================================================
// 6. Predictive signals
// ===========================================================================

describe("churnRiskScore", () => {
  it("returns a value within [0, 1]", () => {
    const score = churnRiskScore(10, 3, 0.5);
    expect(score >= 0 && score <= 1).toBe(true);
  });
  it("returns low risk for an on-schedule, engaged user", () => {
    const score = churnRiskScore(3, 3, 1);
    expect(score).toBeCloseTo(0, 9);
  });
  it("returns high risk for an overdue, disengaged user", () => {
    const score = churnRiskScore(100, 3, 0);
    expect(score).toBeCloseTo(1, 9);
  });
  it("is monotonic in days since active", () => {
    const low = churnRiskScore(3, 3, 0.5);
    const high = churnRiskScore(9, 3, 0.5);
    expect(high >= low).toBe(true);
  });
  it("is monotonic (inverse) in engagement", () => {
    const engaged = churnRiskScore(6, 3, 0.9);
    const disengaged = churnRiskScore(6, 3, 0.1);
    expect(disengaged >= engaged).toBe(true);
  });
  it("treats a zero average gap as 1 day", () => {
    const score = churnRiskScore(5, 0, 1);
    expect(score >= 0 && score <= 1).toBe(true);
  });
  it("never returns less than 0 for negative days", () => {
    const score = churnRiskScore(-5, 3, 1);
    expect(score >= 0).toBe(true);
  });
  it("clamps recency stress at 2x overdue", () => {
    const at2x = churnRiskScore(6, 3, 1);
    const at5x = churnRiskScore(15, 3, 1);
    expect(at2x).toBeCloseTo(at5x, 9);
  });
  it("clamps engagement above 1", () => {
    const score = churnRiskScore(3, 3, 5);
    expect(score >= 0 && score <= 1).toBe(true);
  });
});

describe("predictedChurnProbability", () => {
  it("returns a value within [0, 1]", () => {
    const p = predictedChurnProbability(7, 3);
    expect(p >= 0 && p <= 1).toBe(true);
  });
  it("is low for a very fresh user", () => {
    expect(predictedChurnProbability(0, 5)).toBeCloseTo(0, 9);
  });
  it("rises with recency", () => {
    const recent = predictedChurnProbability(2, 0);
    const old = predictedChurnProbability(60, 0);
    expect(old >= recent).toBe(true);
  });
  it("uses a default half-life of 14 days", () => {
    // freshness at recency=14 with default halfLife is 0.5, frequency 0 → p=0.5
    expect(predictedChurnProbability(14, 0)).toBeCloseTo(0.5, 9);
  });
  it("respects a custom half-life", () => {
    expect(predictedChurnProbability(7, 0, 7)).toBeCloseTo(0.5, 9);
  });
  it("falls back to default half-life when given 0", () => {
    expect(predictedChurnProbability(14, 0, 0)).toBeCloseTo(0.5, 9);
  });
  it("frequency lowers churn probability", () => {
    const lowFreq = predictedChurnProbability(30, 0);
    const highFreq = predictedChurnProbability(30, 10);
    expect(highFreq <= lowFreq).toBe(true);
  });
  it("clamps negative recency to 0 (fresh)", () => {
    expect(predictedChurnProbability(-5, 0)).toBeCloseTo(0, 9);
  });
  it("approaches 1 for a long-absent, low-frequency user", () => {
    expect(predictedChurnProbability(1000, 0) > 0.99).toBe(true);
  });
});

describe("healthScore", () => {
  it("returns a value within [0, 100]", () => {
    const h = healthScore(0.7, 0.5, 0.3);
    expect(h >= 0 && h <= 100).toBe(true);
  });
  it("returns 100 for perfect inputs", () => {
    expect(healthScore(1, 1, 1)).toBe(100);
  });
  it("returns 0 for all-zero inputs", () => {
    expect(healthScore(0, 0, 0)).toBe(0);
  });
  it("weights retention 50%, engagement 30%, growth 20%", () => {
    // 0.5*1 + 0.3*0 + 0.2*0 = 0.5 -> 50
    expect(healthScore(1, 0, 0)).toBeCloseTo(50, 9);
    expect(healthScore(0, 1, 0)).toBeCloseTo(30, 9);
    expect(healthScore(0, 0, 1)).toBeCloseTo(20, 9);
  });
  it("clamps inputs above 1", () => {
    expect(healthScore(5, 5, 5)).toBe(100);
  });
  it("clamps negative inputs to 0", () => {
    expect(healthScore(-1, -1, -1)).toBe(0);
  });
  it("increases monotonically with retention", () => {
    expect(healthScore(0.8, 0.5, 0.5) >= healthScore(0.4, 0.5, 0.5)).toBe(true);
  });
});

describe("atRiskFlag", () => {
  it("flags risk at or above the default threshold of 0.7", () => {
    expect(atRiskFlag(0.7)).toBe(true);
    expect(atRiskFlag(0.8)).toBe(true);
  });
  it("does not flag below the default threshold", () => {
    expect(atRiskFlag(0.69)).toBe(false);
    expect(atRiskFlag(0)).toBe(false);
  });
  it("respects a custom threshold", () => {
    expect(atRiskFlag(0.5, 0.5)).toBe(true);
    expect(atRiskFlag(0.49, 0.5)).toBe(false);
  });
  it("flags at exactly the threshold (inclusive)", () => {
    expect(atRiskFlag(0.9, 0.9)).toBe(true);
  });
  it("handles a zero threshold", () => {
    expect(atRiskFlag(0, 0)).toBe(true);
  });
});

// ===========================================================================
// 7. Aggregate metrics & DK-style ranking
// ===========================================================================

describe("quickRatio", () => {
  it("computes (new + resurrected) / churned", () => {
    expect(quickRatio(80, 20, 50)).toBeCloseTo(2, 9);
  });
  it("returns Infinity when churned is 0", () => {
    expect(quickRatio(10, 5, 0)).toBe(Infinity);
  });
  it("returns 0 when no new or resurrected users and some churn", () => {
    expect(quickRatio(0, 0, 50)).toBe(0);
  });
  it("returns 1 at break-even", () => {
    expect(quickRatio(30, 20, 50)).toBe(1);
  });
  it("returns less than 1 when shrinking", () => {
    expect(quickRatio(10, 0, 50) < 1).toBe(true);
  });
});

describe("netRetentionRate", () => {
  it("computes (start + expansion − contraction − churn) / start", () => {
    // (1000 + 200 - 50 - 100)/1000 = 1050/1000 = 1.05
    expect(netRetentionRate(1000, 200, 50, 100)).toBeCloseTo(1.05, 9);
  });
  it("returns 0 when startRevenue is 0", () => {
    expect(netRetentionRate(0, 100, 50, 50)).toBe(0);
  });
  it("can exceed 1 with net expansion", () => {
    expect(netRetentionRate(1000, 500, 0, 0)).toBeCloseTo(1.5, 9);
  });
  it("falls below 1 when contraction and churn dominate", () => {
    expect(netRetentionRate(1000, 0, 100, 200)).toBeCloseTo(0.7, 9);
  });
  it("returns 1 when flows cancel out", () => {
    expect(netRetentionRate(1000, 0, 0, 0)).toBe(1);
  });
});

describe("grossRetentionRate", () => {
  it("computes (start − contraction − churn) / start", () => {
    expect(grossRetentionRate(1000, 100, 200)).toBeCloseTo(0.7, 9);
  });
  it("returns 0 when startRevenue is 0", () => {
    expect(grossRetentionRate(0, 50, 50)).toBe(0);
  });
  it("caps at 1 (cannot exceed the starting base)", () => {
    expect(grossRetentionRate(1000, 0, 0)).toBe(1);
  });
  it("never exceeds net retention conceptually (no expansion)", () => {
    const gross = grossRetentionRate(1000, 100, 100);
    const net = netRetentionRate(1000, 0, 100, 100);
    expect(close(gross, net)).toBe(true);
  });
  it("can reach 0 with full contraction+churn", () => {
    expect(grossRetentionRate(1000, 500, 500)).toBe(0);
  });
});

describe("magicNumber", () => {
  it("computes netNewARR / priorQuarterSAndM", () => {
    expect(magicNumber(150, 100)).toBeCloseTo(1.5, 9);
  });
  it("returns 0 when prior-quarter S&M is 0", () => {
    expect(magicNumber(150, 0)).toBe(0);
  });
  it("returns 0 with no net new ARR", () => {
    expect(magicNumber(0, 100)).toBe(0);
  });
  it("can be negative with ARR contraction", () => {
    expect(magicNumber(-50, 100)).toBeCloseTo(-0.5, 9);
  });
  it("returns 1 at break-even efficiency", () => {
    expect(magicNumber(100, 100)).toBe(1);
  });
});

// ===========================================================================
// Cross-cutting / integration sanity
// ===========================================================================

describe("integration sanity", () => {
  it("retention curve + half-life agree on a declining cohort", () => {
    const curve = retentionCurve([100, 70, 50, 30], 100);
    expect(retentionHalfLife(curve)).toBe(2);
  });
  it("survival curve area approximates lifetime ordering", () => {
    const slow = averageLifetimeDays(survivalCurve([10, 10, 10], 100));
    const fast = averageLifetimeDays(survivalCurve([40, 40, 20], 100));
    expect(slow >= fast).toBe(true);
  });
  it("LTV scales with retention and revenue together", () => {
    const curve = retentionCurve([100, 80, 60], 100);
    expect(ltvFromRetention(curve, 10)).toBeCloseTo(24, 9);
  });
  it("weighted retention reduces to averageRetention when sizes equal", () => {
    const weighted = cohortSizeWeightedRetention([
      { retention: 0.4, size: 10 },
      { retention: 0.6, size: 10 },
    ]);
    expect(weighted).toBeCloseTo(averageRetention([0.4, 0.6]), 9);
  });
  it("best cohort matches the manually highest at a period", () => {
    const matrix = cohortRetentionMatrix([
      { cohort: "x", periodActives: [100, 90], size: 100 },
      { cohort: "y", periodActives: [100, 95], size: 100 },
    ]);
    expect(bestRetainingCohort(matrix, 1)).toBe("y");
  });
});
