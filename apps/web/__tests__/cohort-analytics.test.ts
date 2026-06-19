/**
 * Tests for the cohort-analytics library.
 *
 * Covers: cohort matrix building, retention at period, survival curve,
 * LTV formulas, MRR growth, churn/retention relationships, payback period,
 * funnel dropoff, segmentation, and LTV/CAC ratio.
 */

import { describe, it, expect } from "vitest";
import {
  buildCohortMatrix,
  cohortRetentionAt,
  avgRetentionByPeriod,
  bestCohort,
  worstCohort,
  retentionTrend,
  cumulativeRetention,
  churnRate,
  retentionRate,
  monthlyChurnFromAnnual,
  annualChurnFromMonthly,
  survivalCurve,
  halfLife,
  expectedLifespan,
  basicLTV,
  discountedLTV,
  ltvByCohort,
  paybackPeriod,
  ltvCacRatio,
  ltvByTier,
  mrr,
  newMRR,
  expansionMRR,
  contractionMRR,
  churnedMRR,
  netMRRGrowth,
  mrrGrowthRate,
  annualRunRate,
  buildJourney,
  signupToProConversion,
  proToEliteConversion,
  timeToConvert,
  conversionFunnelDropoff,
  segmentByTenure,
  highValueUsers,
  atRiskUsers,
  reactivationRate,
} from "@/lib/analytics/cohort-analytics";
import type {
  CohortRow,
  CohortMatrix,
  SubscriberEvent,
  LTVModel,
  UserJourneyStep,
} from "@/lib/analytics/cohort-analytics";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_ROWS: CohortRow[] = [
  { cohortId: "2024-01", period: 0, users: 100, retained: 100 },
  { cohortId: "2024-01", period: 1, users: 100, retained: 80 },
  { cohortId: "2024-01", period: 2, users: 100, retained: 60 },
  { cohortId: "2024-02", period: 0, users: 200, retained: 200 },
  { cohortId: "2024-02", period: 1, users: 200, retained: 140 },
  { cohortId: "2024-02", period: 2, users: 200, retained: 100 },
];

function makeEvent(
  userId: string,
  type: SubscriberEvent["type"],
  daysAgo: number,
  tier?: SubscriberEvent["tier"],
  revenue?: number
): SubscriberEvent {
  const now = new Date("2026-06-19T00:00:00Z");
  return {
    userId,
    timestamp: new Date(now.getTime() - daysAgo * 86_400_000),
    type,
    tier,
    revenue,
  };
}

// ---------------------------------------------------------------------------
// 1. buildCohortMatrix
// ---------------------------------------------------------------------------

describe("buildCohortMatrix", () => {
  it("extracts unique cohort IDs in insertion order", () => {
    const matrix = buildCohortMatrix(BASE_ROWS);
    expect(matrix.cohortIds).toEqual(["2024-01", "2024-02"]);
  });

  it("extracts unique periods sorted ascending", () => {
    const matrix = buildCohortMatrix(BASE_ROWS);
    expect(matrix.periods).toEqual([0, 1, 2]);
  });

  it("computes retention as retained/users", () => {
    const matrix = buildCohortMatrix(BASE_ROWS);
    expect(matrix.retention[0]![0]).toBeCloseTo(1.0);
    expect(matrix.retention[0]![1]).toBeCloseTo(0.8);
    expect(matrix.retention[0]![2]).toBeCloseTo(0.6);
  });

  it("second cohort has correct retention rates", () => {
    const matrix = buildCohortMatrix(BASE_ROWS);
    expect(matrix.retention[1]![0]).toBeCloseTo(1.0);
    expect(matrix.retention[1]![1]).toBeCloseTo(0.7);
    expect(matrix.retention[1]![2]).toBeCloseTo(0.5);
  });

  it("fills missing period with 0 when another cohort has that period", () => {
    // Two cohorts: A has periods 0 and 2; B has periods 0, 1, and 2.
    // The matrix includes period 1 but cohort A has no row for it → 0.
    const rows: CohortRow[] = [
      { cohortId: "A", period: 0, users: 100, retained: 100 },
      { cohortId: "A", period: 2, users: 100, retained: 50 },
      { cohortId: "B", period: 0, users: 50, retained: 50 },
      { cohortId: "B", period: 1, users: 50, retained: 40 },
      { cohortId: "B", period: 2, users: 50, retained: 30 },
    ];
    const matrix = buildCohortMatrix(rows);
    // Periods should include 0, 1, 2
    expect(matrix.periods).toContain(1);
    const ci = matrix.cohortIds.indexOf("A");
    const pi = matrix.periods.indexOf(1);
    // Cohort A has no row for period 1 → retention should be 0
    expect(matrix.retention[ci]![pi]).toBe(0);
  });

  it("handles rows out of period order", () => {
    const rows: CohortRow[] = [
      { cohortId: "2024-01", period: 2, users: 100, retained: 60 },
      { cohortId: "2024-01", period: 0, users: 100, retained: 100 },
      { cohortId: "2024-01", period: 1, users: 100, retained: 80 },
    ];
    const matrix = buildCohortMatrix(rows);
    expect(matrix.periods).toEqual([0, 1, 2]);
  });

  it("returns empty matrix for empty input", () => {
    const matrix = buildCohortMatrix([]);
    expect(matrix.cohortIds).toHaveLength(0);
    expect(matrix.periods).toHaveLength(0);
    expect(matrix.retention).toHaveLength(0);
  });

  it("handles users=0 rows gracefully", () => {
    const rows: CohortRow[] = [
      { cohortId: "2024-01", period: 0, users: 0, retained: 0 },
    ];
    const matrix = buildCohortMatrix(rows);
    expect(matrix.retention[0]![0]).toBe(0);
  });

  it("handles single cohort single period", () => {
    const rows: CohortRow[] = [
      { cohortId: "2024-06", period: 0, users: 50, retained: 50 },
    ];
    const matrix = buildCohortMatrix(rows);
    expect(matrix.cohortIds).toEqual(["2024-06"]);
    expect(matrix.retention[0]![0]).toBe(1.0);
  });

  it("retention matrix dimensions match cohortIds × periods", () => {
    const matrix = buildCohortMatrix(BASE_ROWS);
    expect(matrix.retention).toHaveLength(matrix.cohortIds.length);
    for (const row of matrix.retention) {
      expect(row).toHaveLength(matrix.periods.length);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. cohortRetentionAt
// ---------------------------------------------------------------------------

describe("cohortRetentionAt", () => {
  const matrix = buildCohortMatrix(BASE_ROWS);

  it("returns correct retention for known cohort and period", () => {
    expect(cohortRetentionAt(matrix, "2024-01", 1)).toBeCloseTo(0.8);
  });

  it("returns 0 for unknown cohort", () => {
    expect(cohortRetentionAt(matrix, "9999-99", 0)).toBe(0);
  });

  it("returns 0 for unknown period", () => {
    expect(cohortRetentionAt(matrix, "2024-01", 99)).toBe(0);
  });

  it("returns 1.0 at period 0 for full cohort", () => {
    expect(cohortRetentionAt(matrix, "2024-02", 0)).toBeCloseTo(1.0);
  });
});

// ---------------------------------------------------------------------------
// 3. avgRetentionByPeriod
// ---------------------------------------------------------------------------

describe("avgRetentionByPeriod", () => {
  it("computes mean retention per period across cohorts", () => {
    const matrix = buildCohortMatrix(BASE_ROWS);
    const avg = avgRetentionByPeriod(matrix);
    // Period 0: (1.0 + 1.0) / 2 = 1.0
    expect(avg[0]).toBeCloseTo(1.0);
    // Period 1: (0.8 + 0.7) / 2 = 0.75
    expect(avg[1]).toBeCloseTo(0.75);
    // Period 2: (0.6 + 0.5) / 2 = 0.55
    expect(avg[2]).toBeCloseTo(0.55);
  });

  it("returns empty array for empty matrix", () => {
    const emptyMatrix: CohortMatrix = {
      cohortIds: [],
      periods: [],
      retention: [],
    };
    expect(avgRetentionByPeriod(emptyMatrix)).toHaveLength(0);
  });

  it("returns same length as periods array", () => {
    const matrix = buildCohortMatrix(BASE_ROWS);
    const avg = avgRetentionByPeriod(matrix);
    expect(avg).toHaveLength(matrix.periods.length);
  });
});

// ---------------------------------------------------------------------------
// 4. bestCohort / worstCohort
// ---------------------------------------------------------------------------

describe("bestCohort", () => {
  it("identifies cohort with highest retention at given period", () => {
    const matrix = buildCohortMatrix(BASE_ROWS);
    // Period 1: 0.8 (2024-01) vs 0.7 (2024-02)
    expect(bestCohort(matrix, 1)).toBe("2024-01");
  });

  it("returns empty string for empty matrix", () => {
    const emptyMatrix: CohortMatrix = {
      cohortIds: [],
      periods: [],
      retention: [],
    };
    expect(bestCohort(emptyMatrix, 0)).toBe("");
  });

  it("returns empty string for unknown period", () => {
    const matrix = buildCohortMatrix(BASE_ROWS);
    expect(bestCohort(matrix, 99)).toBe("");
  });

  it("handles tie by returning first cohort encountered", () => {
    const rows: CohortRow[] = [
      { cohortId: "A", period: 0, users: 100, retained: 100 },
      { cohortId: "B", period: 0, users: 100, retained: 100 },
    ];
    const matrix = buildCohortMatrix(rows);
    // Both tied at 1.0; should return the first one
    expect(bestCohort(matrix, 0)).toBe("A");
  });
});

describe("worstCohort", () => {
  it("identifies cohort with lowest retention at given period", () => {
    const matrix = buildCohortMatrix(BASE_ROWS);
    // Period 2: 0.6 (2024-01) vs 0.5 (2024-02)
    expect(worstCohort(matrix, 2)).toBe("2024-02");
  });

  it("returns empty string for empty matrix", () => {
    const emptyMatrix: CohortMatrix = {
      cohortIds: [],
      periods: [],
      retention: [],
    };
    expect(worstCohort(emptyMatrix, 0)).toBe("");
  });

  it("returns empty string for unknown period", () => {
    const matrix = buildCohortMatrix(BASE_ROWS);
    expect(worstCohort(matrix, 99)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// 5. retentionTrend
// ---------------------------------------------------------------------------

describe("retentionTrend", () => {
  it("returns retention values in cohort order for a given period", () => {
    const matrix = buildCohortMatrix(BASE_ROWS);
    const trend = retentionTrend(matrix, 1);
    expect(trend).toHaveLength(2);
    expect(trend[0]).toBeCloseTo(0.8);
    expect(trend[1]).toBeCloseTo(0.7);
  });

  it("returns all zeros for unknown period", () => {
    const matrix = buildCohortMatrix(BASE_ROWS);
    const trend = retentionTrend(matrix, 99);
    expect(trend.every((v) => v === 0)).toBe(true);
  });

  it("returns empty array for empty matrix", () => {
    const emptyMatrix: CohortMatrix = {
      cohortIds: [],
      periods: [],
      retention: [],
    };
    expect(retentionTrend(emptyMatrix, 0)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. cumulativeRetention
// ---------------------------------------------------------------------------

describe("cumulativeRetention", () => {
  it("starts with 1 as baseline", () => {
    const cum = cumulativeRetention([0.9, 0.8, 0.7]);
    expect(cum[0]).toBe(1);
  });

  it("computes running product correctly", () => {
    const cum = cumulativeRetention([0.8, 0.75, 0.9]);
    expect(cum[1]).toBeCloseTo(0.8);
    expect(cum[2]).toBeCloseTo(0.6);
    expect(cum[3]).toBeCloseTo(0.54);
  });

  it("length is input length + 1", () => {
    const cum = cumulativeRetention([0.9, 0.8]);
    expect(cum).toHaveLength(3);
  });

  it("handles empty input", () => {
    expect(cumulativeRetention([])).toEqual([1]);
  });

  it("handles all ones", () => {
    const cum = cumulativeRetention([1, 1, 1]);
    expect(cum).toEqual([1, 1, 1, 1]);
  });

  it("handles zero in sequence (propagates)", () => {
    const cum = cumulativeRetention([0.8, 0, 0.9]);
    expect(cum[2]).toBe(0);
    expect(cum[3]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 7. churnRate / retentionRate
// ---------------------------------------------------------------------------

describe("churnRate", () => {
  it("computes lost / activeStart", () => {
    expect(churnRate(100, 20)).toBeCloseTo(0.2);
  });

  it("returns 0 when activeStart is 0", () => {
    expect(churnRate(0, 0)).toBe(0);
  });

  it("returns 1 when all churned", () => {
    expect(churnRate(50, 50)).toBeCloseTo(1.0);
  });

  it("handles fractional values", () => {
    expect(churnRate(200, 15)).toBeCloseTo(0.075);
  });
});

describe("retentionRate", () => {
  it("is 1 - churn", () => {
    expect(retentionRate(0.2)).toBeCloseTo(0.8);
  });

  it("returns 1 for 0 churn", () => {
    expect(retentionRate(0)).toBe(1);
  });

  it("returns 0 for 100% churn", () => {
    expect(retentionRate(1)).toBe(0);
  });

  it("churn + retention sums to 1", () => {
    const c = 0.35;
    expect(churnRate(100, 35) + retentionRate(churnRate(100, 35))).toBeCloseTo(1);
  });
});

// ---------------------------------------------------------------------------
// 8. monthlyChurnFromAnnual / annualChurnFromMonthly
// ---------------------------------------------------------------------------

describe("monthlyChurnFromAnnual", () => {
  it("round-trips through annual conversion", () => {
    const annual = 0.5;
    const monthly = monthlyChurnFromAnnual(annual);
    const backToAnnual = annualChurnFromMonthly(monthly);
    expect(backToAnnual).toBeCloseTo(annual, 6);
  });

  it("30% annual yields ~2.93% monthly", () => {
    expect(monthlyChurnFromAnnual(0.3)).toBeCloseTo(0.02931, 4);
  });

  it("0 annual churn gives 0 monthly", () => {
    expect(monthlyChurnFromAnnual(0)).toBeCloseTo(0);
  });
});

describe("annualChurnFromMonthly", () => {
  it("5% monthly gives ~45.96% annual", () => {
    expect(annualChurnFromMonthly(0.05)).toBeCloseTo(0.4596, 3);
  });

  it("0 monthly gives 0 annual", () => {
    expect(annualChurnFromMonthly(0)).toBeCloseTo(0);
  });

  it("100% monthly gives 100% annual", () => {
    expect(annualChurnFromMonthly(1)).toBeCloseTo(1);
  });
});

// ---------------------------------------------------------------------------
// 9. survivalCurve
// ---------------------------------------------------------------------------

describe("survivalCurve", () => {
  it("first element equals initialUsers", () => {
    const curve = survivalCurve(1000, 0.1, 6);
    expect(curve[0]).toBe(1000);
  });

  it("length is months + 1", () => {
    const curve = survivalCurve(500, 0.05, 12);
    expect(curve).toHaveLength(13);
  });

  it("each step decays by (1 - churn)", () => {
    const curve = survivalCurve(100, 0.2, 3);
    expect(curve[1]).toBeCloseTo(80);
    expect(curve[2]).toBeCloseTo(64);
    expect(curve[3]).toBeCloseTo(51.2);
  });

  it("0% churn keeps all users", () => {
    const curve = survivalCurve(200, 0, 4);
    curve.forEach((v) => expect(v).toBeCloseTo(200));
  });

  it("100% churn empties after first period", () => {
    const curve = survivalCurve(100, 1, 3);
    expect(curve[0]).toBe(100);
    expect(curve[1]).toBe(0);
    expect(curve[2]).toBe(0);
  });

  it("is monotonically non-increasing for positive churn", () => {
    const curve = survivalCurve(1000, 0.08, 10);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i]!).toBeLessThanOrEqual(curve[i - 1]!);
    }
  });
});

// ---------------------------------------------------------------------------
// 10. halfLife
// ---------------------------------------------------------------------------

describe("halfLife", () => {
  it("returns Infinity for 0% churn", () => {
    expect(halfLife(0)).toBe(Infinity);
  });

  it("returns 0 for 100% churn", () => {
    expect(halfLife(1)).toBe(0);
  });

  it("5% monthly churn half-life ~13.5 months", () => {
    // ln(0.5)/ln(0.95) ≈ 13.5
    expect(halfLife(0.05)).toBeCloseTo(13.51, 1);
  });

  it("10% monthly churn half-life ~6.58 months", () => {
    expect(halfLife(0.1)).toBeCloseTo(6.58, 1);
  });
});

// ---------------------------------------------------------------------------
// 11. expectedLifespan
// ---------------------------------------------------------------------------

describe("expectedLifespan", () => {
  it("returns 1/monthlyChurn", () => {
    expect(expectedLifespan(0.1)).toBeCloseTo(10);
    expect(expectedLifespan(0.05)).toBeCloseTo(20);
  });

  it("returns Infinity for 0 churn", () => {
    expect(expectedLifespan(0)).toBe(Infinity);
  });

  it("returns 1 for 100% churn", () => {
    expect(expectedLifespan(1)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 12. basicLTV
// ---------------------------------------------------------------------------

describe("basicLTV", () => {
  it("returns avgRevenue / churnRate", () => {
    expect(basicLTV(100, 0.05)).toBeCloseTo(2000);
  });

  it("returns Infinity for 0 churn", () => {
    expect(basicLTV(50, 0)).toBe(Infinity);
  });

  it("scales with revenue", () => {
    expect(basicLTV(200, 0.1)).toBeCloseTo(2000);
    expect(basicLTV(100, 0.1)).toBeCloseTo(1000);
  });
});

// ---------------------------------------------------------------------------
// 13. discountedLTV
// ---------------------------------------------------------------------------

describe("discountedLTV", () => {
  it("returns a positive value for valid inputs", () => {
    const model: LTVModel = {
      avgMonthlyRevenue: 50,
      avgMonthlyChurnRate: 0.05,
    };
    expect(discountedLTV(model)).toBeGreaterThan(0);
  });

  it("discounted LTV is less than basic LTV (due to time value)", () => {
    const model: LTVModel = {
      avgMonthlyRevenue: 50,
      avgMonthlyChurnRate: 0.05,
    };
    const basic = basicLTV(50, 0.05);
    const discounted = discountedLTV(model, 200);
    expect(discounted).toBeLessThan(basic);
  });

  it("higher churn rate yields lower LTV", () => {
    const model1: LTVModel = { avgMonthlyRevenue: 50, avgMonthlyChurnRate: 0.05 };
    const model2: LTVModel = { avgMonthlyRevenue: 50, avgMonthlyChurnRate: 0.1 };
    expect(discountedLTV(model1)).toBeGreaterThan(discountedLTV(model2));
  });

  it("uses 60 months as default period", () => {
    const model: LTVModel = { avgMonthlyRevenue: 50, avgMonthlyChurnRate: 0.05 };
    const d60 = discountedLTV(model);
    const d60explicit = discountedLTV(model, 60);
    expect(d60).toBeCloseTo(d60explicit);
  });

  it("higher discount rate reduces LTV", () => {
    const model1: LTVModel = {
      avgMonthlyRevenue: 50,
      avgMonthlyChurnRate: 0.05,
      discountRate: 0.05,
    };
    const model2: LTVModel = {
      avgMonthlyRevenue: 50,
      avgMonthlyChurnRate: 0.05,
      discountRate: 0.2,
    };
    expect(discountedLTV(model1)).toBeGreaterThan(discountedLTV(model2));
  });
});

// ---------------------------------------------------------------------------
// 14. ltvByCohort
// ---------------------------------------------------------------------------

describe("ltvByCohort", () => {
  it("returns a value per cohort", () => {
    const result = ltvByCohort(BASE_ROWS, 50);
    expect(Object.keys(result)).toContain("2024-01");
    expect(Object.keys(result)).toContain("2024-02");
  });

  it("LTV is positive when there is retained revenue", () => {
    const result = ltvByCohort(BASE_ROWS, 50);
    expect(result["2024-01"]).toBeGreaterThan(0);
    expect(result["2024-02"]).toBeGreaterThan(0);
  });

  it("returns empty object for empty rows", () => {
    expect(ltvByCohort([], 50)).toEqual({});
  });

  it("scales proportionally with avgRevenue", () => {
    const r1 = ltvByCohort(BASE_ROWS, 50);
    const r2 = ltvByCohort(BASE_ROWS, 100);
    for (const id of Object.keys(r1)) {
      expect(r2[id]!).toBeCloseTo(r1[id]! * 2);
    }
  });
});

// ---------------------------------------------------------------------------
// 15. paybackPeriod
// ---------------------------------------------------------------------------

describe("paybackPeriod", () => {
  it("returns 1 when monthly revenue >= CAC immediately", () => {
    // CAC=50, revenue=100/mo, churn=0
    expect(paybackPeriod(50, 100, 0)).toBe(1);
  });

  it("caps at 120 when revenue is zero", () => {
    expect(paybackPeriod(500, 0, 0.05)).toBe(120);
  });

  it("returns correct months for known scenario", () => {
    // CAC=100, revenue=50/mo, no churn => 2 months
    expect(paybackPeriod(100, 50, 0)).toBe(2);
  });

  it("caps at 120 when high churn prevents recovery", () => {
    // Very high churn makes cumulative revenue too small
    const result = paybackPeriod(10000, 10, 0.99);
    expect(result).toBe(120);
  });

  it("churn extends payback period", () => {
    const noChurn = paybackPeriod(200, 50, 0);
    const withChurn = paybackPeriod(200, 50, 0.1);
    expect(withChurn).toBeGreaterThanOrEqual(noChurn);
  });
});

// ---------------------------------------------------------------------------
// 16. ltvCacRatio
// ---------------------------------------------------------------------------

describe("ltvCacRatio", () => {
  it("divides LTV by CAC", () => {
    expect(ltvCacRatio(3000, 1000)).toBeCloseTo(3);
  });

  it("returns Infinity for cac=0", () => {
    expect(ltvCacRatio(5000, 0)).toBe(Infinity);
  });

  it("returns less than 1 when LTV < CAC", () => {
    expect(ltvCacRatio(500, 1000)).toBeCloseTo(0.5);
  });
});

// ---------------------------------------------------------------------------
// 17. ltvByTier
// ---------------------------------------------------------------------------

describe("ltvByTier", () => {
  const avgRevenue: Record<"free" | "pro" | "elite", number> = {
    free: 0,
    pro: 15,
    elite: 25,
  };

  it("groups users by their last-seen tier", () => {
    const events: SubscriberEvent[] = [
      makeEvent("u1", "signup", 60, "free"),
      makeEvent("u1", "upgrade", 30, "pro", 15),
      makeEvent("u2", "signup", 90, "free"),
    ];
    const result = ltvByTier(events, avgRevenue);
    expect(result).toHaveProperty("pro");
    expect(result).toHaveProperty("free");
  });

  it("uses realized revenue from events when available", () => {
    const events: SubscriberEvent[] = [
      makeEvent("u1", "purchase", 10, "pro", 100),
    ];
    const result = ltvByTier(events, avgRevenue);
    expect(result["pro"]).toBe(100);
  });

  it("returns 0 for tiers with no users", () => {
    const events: SubscriberEvent[] = [
      makeEvent("u1", "signup", 30, "free"),
    ];
    const result = ltvByTier(events, avgRevenue);
    expect(result["elite"]).toBe(0);
  });

  it("handles multiple users in same tier", () => {
    const events: SubscriberEvent[] = [
      makeEvent("u1", "purchase", 5, "pro", 50),
      makeEvent("u2", "purchase", 5, "pro", 75),
    ];
    const result = ltvByTier(events, avgRevenue);
    expect(result["pro"]).toBe(125);
  });
});

// ---------------------------------------------------------------------------
// 18. mrr
// ---------------------------------------------------------------------------

describe("mrr", () => {
  it("sums count × revenue per tier", () => {
    const subs = [
      { count: 100, monthlyRevenue: 15 },
      { count: 50, monthlyRevenue: 25 },
    ];
    expect(mrr(subs)).toBe(2750);
  });

  it("returns 0 for empty input", () => {
    expect(mrr([])).toBe(0);
  });

  it("handles single tier", () => {
    expect(mrr([{ count: 200, monthlyRevenue: 14.99 }])).toBeCloseTo(2998);
  });
});

// ---------------------------------------------------------------------------
// 19. newMRR / expansionMRR / contractionMRR / churnedMRR
// ---------------------------------------------------------------------------

describe("newMRR", () => {
  it("multiplies subscribers by avgRevenue", () => {
    expect(newMRR(20, 15)).toBe(300);
  });

  it("returns 0 for 0 subscribers", () => {
    expect(newMRR(0, 15)).toBe(0);
  });
});

describe("expansionMRR", () => {
  it("sums to - from deltas", () => {
    const upgrades = [
      { fromRevenue: 15, toRevenue: 25 },
      { fromRevenue: 15, toRevenue: 25 },
    ];
    expect(expansionMRR(upgrades)).toBe(20);
  });

  it("returns 0 for empty", () => {
    expect(expansionMRR([])).toBe(0);
  });
});

describe("contractionMRR", () => {
  it("sums from - to deltas", () => {
    const downgrades = [
      { fromRevenue: 25, toRevenue: 15 },
      { fromRevenue: 25, toRevenue: 0 },
    ];
    expect(contractionMRR(downgrades)).toBe(35);
  });

  it("returns 0 for empty", () => {
    expect(contractionMRR([])).toBe(0);
  });
});

describe("churnedMRR", () => {
  it("sums monthly revenues of churned subscribers", () => {
    const churned = [{ monthlyRevenue: 15 }, { monthlyRevenue: 25 }];
    expect(churnedMRR(churned)).toBe(40);
  });

  it("returns 0 for empty", () => {
    expect(churnedMRR([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 20. netMRRGrowth
// ---------------------------------------------------------------------------

describe("netMRRGrowth", () => {
  it("computes new + expansion - contraction - churned", () => {
    expect(netMRRGrowth(300, 100, 50, 80)).toBe(270);
  });

  it("can be negative when churn dominates", () => {
    expect(netMRRGrowth(100, 0, 0, 200)).toBe(-100);
  });

  it("returns 0 when all components cancel", () => {
    expect(netMRRGrowth(100, 50, 100, 50)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 21. mrrGrowthRate
// ---------------------------------------------------------------------------

describe("mrrGrowthRate", () => {
  it("computes (current - previous) / previous", () => {
    expect(mrrGrowthRate(1100, 1000)).toBeCloseTo(0.1);
  });

  it("returns 0 when previousMrr is 0", () => {
    expect(mrrGrowthRate(500, 0)).toBe(0);
  });

  it("negative growth when current < previous", () => {
    expect(mrrGrowthRate(900, 1000)).toBeCloseTo(-0.1);
  });

  it("returns 0 for no change", () => {
    expect(mrrGrowthRate(500, 500)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 22. annualRunRate
// ---------------------------------------------------------------------------

describe("annualRunRate", () => {
  it("multiplies mrr by 12", () => {
    expect(annualRunRate(1000)).toBe(12000);
  });

  it("returns 0 for 0 mrr", () => {
    expect(annualRunRate(0)).toBe(0);
  });

  it("handles fractional mrr", () => {
    expect(annualRunRate(1499.5)).toBeCloseTo(17994);
  });
});

// ---------------------------------------------------------------------------
// 23. buildJourney
// ---------------------------------------------------------------------------

describe("buildJourney", () => {
  it("returns 5 steps", () => {
    const journey = buildJourney([]);
    expect(journey).toHaveLength(5);
  });

  it("steps are in correct order", () => {
    const journey = buildJourney([]);
    const names = journey.map((s) => s.step);
    expect(names).toEqual([
      "signup",
      "free_active",
      "upgrade_attempt",
      "pro_subscriber",
      "elite_subscriber",
    ]);
  });

  it("counts signup users correctly", () => {
    const events: SubscriberEvent[] = [
      makeEvent("u1", "signup", 30),
      makeEvent("u2", "signup", 25),
      makeEvent("u3", "signup", 20),
    ];
    const journey = buildJourney(events);
    expect(journey[0]!.users).toBe(3);
  });

  it("counts pro subscribers from upgrade events", () => {
    const events: SubscriberEvent[] = [
      makeEvent("u1", "signup", 30),
      makeEvent("u1", "upgrade", 25, "pro"),
      makeEvent("u2", "signup", 30),
    ];
    const journey = buildJourney(events);
    const proStep = journey.find((s) => s.step === "pro_subscriber");
    expect(proStep?.users).toBe(1);
  });

  it("counts elite subscribers from upgrade events", () => {
    const events: SubscriberEvent[] = [
      makeEvent("u1", "upgrade", 10, "elite"),
      makeEvent("u2", "upgrade", 10, "pro"),
    ];
    const journey = buildJourney(events);
    const eliteStep = journey.find((s) => s.step === "elite_subscriber");
    expect(eliteStep?.users).toBe(1);
  });

  it("dropoff is non-negative", () => {
    const events: SubscriberEvent[] = [
      makeEvent("u1", "signup", 30),
      makeEvent("u2", "signup", 20),
    ];
    const journey = buildJourney(events);
    journey.forEach((s) => expect(s.dropoff).toBeGreaterThanOrEqual(0));
  });

  it("returns all zeros for empty events", () => {
    const journey = buildJourney([]);
    journey.forEach((s) => {
      expect(s.users).toBe(0);
      expect(s.dropoff).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// 24. signupToProConversion
// ---------------------------------------------------------------------------

describe("signupToProConversion", () => {
  it("returns fraction of signups who upgraded to pro", () => {
    const events: SubscriberEvent[] = [
      makeEvent("u1", "signup", 60),
      makeEvent("u1", "upgrade", 30, "pro"),
      makeEvent("u2", "signup", 60),
      makeEvent("u3", "signup", 60),
    ];
    expect(signupToProConversion(events)).toBeCloseTo(1 / 3);
  });

  it("returns 0 when no signups", () => {
    expect(signupToProConversion([])).toBe(0);
  });

  it("returns 1 when all signups converted", () => {
    const events: SubscriberEvent[] = [
      makeEvent("u1", "signup", 60),
      makeEvent("u1", "upgrade", 30, "pro"),
    ];
    expect(signupToProConversion(events)).toBeCloseTo(1);
  });

  it("includes elite upgrades in pro conversion", () => {
    const events: SubscriberEvent[] = [
      makeEvent("u1", "signup", 60),
      makeEvent("u1", "upgrade", 30, "elite"),
    ];
    expect(signupToProConversion(events)).toBeCloseTo(1);
  });
});

// ---------------------------------------------------------------------------
// 25. proToEliteConversion
// ---------------------------------------------------------------------------

describe("proToEliteConversion", () => {
  it("returns fraction of pro users who reached elite", () => {
    const events: SubscriberEvent[] = [
      makeEvent("u1", "upgrade", 30, "pro"),
      makeEvent("u1", "upgrade", 15, "elite"),
      makeEvent("u2", "upgrade", 30, "pro"),
    ];
    expect(proToEliteConversion(events)).toBeCloseTo(0.5);
  });

  it("returns 0 when no pro users", () => {
    expect(proToEliteConversion([])).toBe(0);
  });

  it("returns 1 when all pro users reached elite", () => {
    const events: SubscriberEvent[] = [
      makeEvent("u1", "upgrade", 30, "elite"),
    ];
    expect(proToEliteConversion(events)).toBeCloseTo(1);
  });
});

// ---------------------------------------------------------------------------
// 26. timeToConvert
// ---------------------------------------------------------------------------

describe("timeToConvert", () => {
  it("returns 0 for empty events", () => {
    expect(timeToConvert([], "signup", "upgrade")).toBe(0);
  });

  it("computes median days between event types", () => {
    const baseDate = new Date("2026-01-01T00:00:00Z");
    const events: SubscriberEvent[] = [
      {
        userId: "u1",
        timestamp: baseDate,
        type: "signup",
      },
      {
        userId: "u1",
        timestamp: new Date(baseDate.getTime() + 10 * 86_400_000),
        type: "upgrade",
        tier: "pro",
      },
      {
        userId: "u2",
        timestamp: baseDate,
        type: "signup",
      },
      {
        userId: "u2",
        timestamp: new Date(baseDate.getTime() + 20 * 86_400_000),
        type: "upgrade",
        tier: "pro",
      },
    ];
    // Median of [10, 20] = 15
    expect(timeToConvert(events, "signup", "upgrade")).toBeCloseTo(15);
  });

  it("ignores users without both event types", () => {
    const baseDate = new Date("2026-01-01T00:00:00Z");
    const events: SubscriberEvent[] = [
      { userId: "u1", timestamp: baseDate, type: "signup" },
      // u1 has no upgrade
      {
        userId: "u2",
        timestamp: baseDate,
        type: "signup",
      },
      {
        userId: "u2",
        timestamp: new Date(baseDate.getTime() + 30 * 86_400_000),
        type: "upgrade",
        tier: "pro",
      },
    ];
    expect(timeToConvert(events, "signup", "upgrade")).toBeCloseTo(30);
  });
});

// ---------------------------------------------------------------------------
// 27. conversionFunnelDropoff
// ---------------------------------------------------------------------------

describe("conversionFunnelDropoff", () => {
  it("returns dropoff / users for each step", () => {
    const steps: UserJourneyStep[] = [
      { step: "signup", users: 100, dropoff: 20 },
      { step: "free_active", users: 80, dropoff: 40 },
      { step: "pro_subscriber", users: 40, dropoff: 40 },
    ];
    const rates = conversionFunnelDropoff(steps);
    expect(rates[0]).toBeCloseTo(0.2);
    expect(rates[1]).toBeCloseTo(0.5);
    expect(rates[2]).toBeCloseTo(1.0);
  });

  it("returns 0 for steps with 0 users", () => {
    const steps: UserJourneyStep[] = [
      { step: "signup", users: 0, dropoff: 0 },
    ];
    expect(conversionFunnelDropoff(steps)[0]).toBe(0);
  });

  it("returns empty array for empty steps", () => {
    expect(conversionFunnelDropoff([])).toHaveLength(0);
  });

  it("returns same length as steps", () => {
    const journey = buildJourney([]);
    const rates = conversionFunnelDropoff(journey);
    expect(rates).toHaveLength(journey.length);
  });
});

// ---------------------------------------------------------------------------
// 28. segmentByTenure
// ---------------------------------------------------------------------------

describe("segmentByTenure", () => {
  const now = new Date("2026-06-19T00:00:00Z");

  it("places users with signup <=30 days ago in 'new'", () => {
    const events: SubscriberEvent[] = [makeEvent("u1", "signup", 10)];
    const segs = segmentByTenure(events, now);
    expect(segs.new).toContain("u1");
  });

  it("places users 31-90 days in 'growing'", () => {
    const events: SubscriberEvent[] = [makeEvent("u2", "signup", 60)];
    const segs = segmentByTenure(events, now);
    expect(segs.growing).toContain("u2");
  });

  it("places users 91-365 days in 'mature'", () => {
    const events: SubscriberEvent[] = [makeEvent("u3", "signup", 180)];
    const segs = segmentByTenure(events, now);
    expect(segs.mature).toContain("u3");
  });

  it("places users >365 days with churn in 'at_risk'", () => {
    const events: SubscriberEvent[] = [
      makeEvent("u4", "signup", 400),
      makeEvent("u4", "churn", 5),
    ];
    const segs = segmentByTenure(events, now);
    expect(segs.at_risk).toContain("u4");
  });

  it("places users >365 days without churn in 'mature'", () => {
    const events: SubscriberEvent[] = [makeEvent("u5", "signup", 400)];
    const segs = segmentByTenure(events, now);
    expect(segs.mature).toContain("u5");
  });

  it("returns empty segments for no events", () => {
    const segs = segmentByTenure([], now);
    expect(segs.new).toHaveLength(0);
    expect(segs.growing).toHaveLength(0);
    expect(segs.mature).toHaveLength(0);
    expect(segs.at_risk).toHaveLength(0);
  });

  it("handles downgrade as at_risk trigger for old users", () => {
    const events: SubscriberEvent[] = [
      makeEvent("u6", "signup", 500),
      makeEvent("u6", "downgrade", 3),
    ];
    const segs = segmentByTenure(events, now);
    expect(segs.at_risk).toContain("u6");
  });
});

// ---------------------------------------------------------------------------
// 29. highValueUsers
// ---------------------------------------------------------------------------

describe("highValueUsers", () => {
  it("returns users with lifetime revenue >= threshold", () => {
    const events: SubscriberEvent[] = [
      makeEvent("u1", "purchase", 10, "pro", 150),
      makeEvent("u1", "purchase", 5, "pro", 75),  // total 225
      makeEvent("u2", "purchase", 10, "elite", 100), // total 100
    ];
    const hvus = highValueUsers(events, 200);
    expect(hvus).toContain("u1");
    expect(hvus).not.toContain("u2");
  });

  it("uses default threshold of 200", () => {
    const events: SubscriberEvent[] = [
      makeEvent("u1", "purchase", 5, "elite", 250),
      makeEvent("u2", "purchase", 5, "pro", 150),
    ];
    const hvus = highValueUsers(events);
    expect(hvus).toContain("u1");
    expect(hvus).not.toContain("u2");
  });

  it("returns empty for no events", () => {
    expect(highValueUsers([])).toHaveLength(0);
  });

  it("ignores events without revenue", () => {
    const events: SubscriberEvent[] = [makeEvent("u1", "signup", 30)];
    expect(highValueUsers(events, 0)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 30. atRiskUsers
// ---------------------------------------------------------------------------

describe("atRiskUsers", () => {
  it("returns users whose last event was >inactiveDays ago", () => {
    const events: SubscriberEvent[] = [
      makeEvent("u1", "purchase", 90),  // inactive 90 days
      makeEvent("u2", "purchase", 10),  // active recently
    ];
    const risky = atRiskUsers(events, 60);
    expect(risky).toContain("u1");
    expect(risky).not.toContain("u2");
  });

  it("uses default 60 days threshold", () => {
    const events: SubscriberEvent[] = [makeEvent("u1", "purchase", 61)];
    expect(atRiskUsers(events)).toContain("u1");
  });

  it("returns empty for no events", () => {
    expect(atRiskUsers([])).toHaveLength(0);
  });

  it("uses latest event per user", () => {
    const events: SubscriberEvent[] = [
      makeEvent("u1", "signup", 100),
      makeEvent("u1", "purchase", 5),  // recent event should keep them safe
    ];
    const risky = atRiskUsers(events, 60);
    expect(risky).not.toContain("u1");
  });
});

// ---------------------------------------------------------------------------
// 31. reactivationRate
// ---------------------------------------------------------------------------

describe("reactivationRate", () => {
  it("returns reactivated / churned", () => {
    expect(reactivationRate(10, 50)).toBeCloseTo(0.2);
  });

  it("returns 0 when churned is 0", () => {
    expect(reactivationRate(0, 0)).toBe(0);
  });

  it("returns 1 when all churned users reactivated", () => {
    expect(reactivationRate(100, 100)).toBeCloseTo(1);
  });
});

// ---------------------------------------------------------------------------
// 32. Integration / cross-function consistency
// ---------------------------------------------------------------------------

describe("integration tests", () => {
  it("survival curve at period N matches (1-churn)^N × initial", () => {
    const churn = 0.08;
    const initial = 1000;
    const curve = survivalCurve(initial, churn, 6);
    for (let t = 0; t <= 6; t++) {
      expect(curve[t]).toBeCloseTo(initial * Math.pow(1 - churn, t));
    }
  });

  it("halfLife and survivalCurve are consistent", () => {
    const churn = 0.1;
    const hl = halfLife(churn);
    const curve = survivalCurve(1, churn, Math.ceil(hl));
    // At the half-life month, ~50% should remain
    expect(curve[Math.round(hl)]).toBeCloseTo(0.5, 1);
  });

  it("basicLTV equals expectedLifespan × avgRevenue", () => {
    const revenue = 50;
    const churn = 0.05;
    expect(basicLTV(revenue, churn)).toBeCloseTo(
      expectedLifespan(churn) * revenue
    );
  });

  it("churnRate and retentionRate sum to 1", () => {
    const c = churnRate(100, 15);
    expect(c + retentionRate(c)).toBeCloseTo(1);
  });

  it("annualRunRate is consistent with 12 months of mrr", () => {
    const monthly = mrr([{ count: 100, monthlyRevenue: 15 }]);
    expect(annualRunRate(monthly)).toBeCloseTo(monthly * 12);
  });

  it("netMRRGrowth computes correct sign", () => {
    // More churned than new → negative growth
    const net = netMRRGrowth(500, 0, 0, 1000);
    expect(net).toBeLessThan(0);
  });

  it("buildCohortMatrix then cohortRetentionAt is consistent", () => {
    const matrix = buildCohortMatrix(BASE_ROWS);
    // retention at (2024-01, period 2) should be 0.6
    expect(cohortRetentionAt(matrix, "2024-01", 2)).toBeCloseTo(0.6);
  });

  it("avgRetentionByPeriod is between 0 and 1 for valid data", () => {
    const matrix = buildCohortMatrix(BASE_ROWS);
    const avg = avgRetentionByPeriod(matrix);
    avg.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
  });

  it("bestCohort and worstCohort differ when retention differs", () => {
    const matrix = buildCohortMatrix(BASE_ROWS);
    expect(bestCohort(matrix, 1)).not.toBe(worstCohort(matrix, 1));
  });

  it("cumulativeRetention is monotonically non-increasing for rates <= 1", () => {
    const avg = avgRetentionByPeriod(buildCohortMatrix(BASE_ROWS));
    const cum = cumulativeRetention(avg);
    for (let i = 1; i < cum.length; i++) {
      expect(cum[i]!).toBeLessThanOrEqual(cum[i - 1]!);
    }
  });
});
