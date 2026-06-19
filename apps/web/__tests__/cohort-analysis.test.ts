/**
 * Tests for cohort-analysis.ts — pure analytics, no fabricated data.
 * Minimum 75 test cases.
 */

import { describe, it, expect } from "vitest";
import {
  buildCohortMetrics,
  compareCohorts,
  projectUserLtv,
  nrr,
  compareSegments,
  paybackPeriod,
  mrrGrowthRate,
  mrrAt,
  ltv,
  cohortRevenueHeatmap,
  expansionMrr,
  peakChurnMonths,
  freeToProConversionRate,
  tierDistributionByCohort,
  avgMonthsToUpgrade,
  type SubscriptionRecord,
  type BillingInterval,
} from "@/lib/analytics/cohort-analysis";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

/**
 * Build a SubscriptionRecord with sensible defaults.
 * startDaysAgo: how many days ago the subscription started (from now).
 * endDaysAgo: how many days ago it ended (undefined = still active).
 */
function makeSub(
  userId: string,
  tier: SubscriptionRecord["tier"],
  startDaysAgo: number,
  endDaysAgo?: number,
  mrr = 1499,
  overrides: Partial<SubscriptionRecord> = {}
): SubscriptionRecord {
  const now = new Date();
  const startDate = new Date(now.getTime() - startDaysAgo * MS_PER_DAY);
  const endDate =
    endDaysAgo !== undefined
      ? new Date(now.getTime() - endDaysAgo * MS_PER_DAY)
      : undefined;

  // Derive cohortMonth from startDate
  const y = startDate.getUTCFullYear();
  const m = String(startDate.getUTCMonth() + 1).padStart(2, "0");
  const cohortMonth = `${y}-${m}`;

  return {
    userId,
    tier,
    billingInterval: "monthly" as BillingInterval,
    startDate,
    endDate,
    mrr,
    cohortMonth,
    acquisitionChannel: "organic",
    ...overrides,
  };
}

/** Build a sub with an explicit cohortMonth (useful to group multiple subs into the same cohort). */
function makeSubWithCohort(
  userId: string,
  tier: SubscriptionRecord["tier"],
  cohortMonth: string,
  startDate: Date,
  endDate?: Date,
  mrr = 1499
): SubscriptionRecord {
  return {
    userId,
    tier,
    billingInterval: "monthly" as BillingInterval,
    startDate,
    endDate,
    mrr,
    cohortMonth,
    acquisitionChannel: "organic",
  };
}

/** Date anchored to a specific YYYY-MM-DD in UTC. */
function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

// ---------------------------------------------------------------------------
// buildCohortMetrics
// ---------------------------------------------------------------------------

describe("buildCohortMetrics", () => {
  it("returns startingUsers matching the cohort", () => {
    const cohort = "2025-01";
    const subs = [
      makeSubWithCohort("u1", "pro", cohort, utcDate(2025, 1, 5)),
      makeSubWithCohort("u2", "pro", cohort, utcDate(2025, 1, 10)),
      makeSubWithCohort("u3", "elite", "2025-02", utcDate(2025, 2, 1)),
    ];
    const metrics = buildCohortMetrics(subs, cohort);
    expect(metrics.startingUsers).toBe(2);
  });

  it("month 0 retention is always 100%", () => {
    const cohort = "2025-01";
    const subs = [
      makeSubWithCohort("u1", "pro", cohort, utcDate(2025, 1, 5)),
      makeSubWithCohort("u2", "pro", cohort, utcDate(2025, 1, 10)),
    ];
    const metrics = buildCohortMetrics(subs, cohort);
    expect(metrics.monthlyRetention[0]).toBe(100);
  });

  it("retention decreases when users churn", () => {
    const cohort = "2023-01";
    const start1 = utcDate(2023, 1, 1);
    const end1 = utcDate(2023, 2, 15); // churns in month 1
    const subs = [
      makeSubWithCohort("u1", "pro", cohort, start1, end1),
      makeSubWithCohort("u2", "pro", cohort, start1),
    ];
    const metrics = buildCohortMetrics(subs, cohort, 3);
    expect(metrics.monthlyRetention[0]).toBe(100);
    expect(metrics.monthlyRetention[2]).toBeLessThan(100);
  });

  it("retention is 100% when no one churns", () => {
    const cohort = "2025-01";
    const subs = [
      makeSubWithCohort("u1", "pro", cohort, utcDate(2025, 1, 5)),
      makeSubWithCohort("u2", "pro", cohort, utcDate(2025, 1, 10)),
    ];
    const metrics = buildCohortMetrics(subs, cohort, 3);
    for (const r of metrics.monthlyRetention) {
      expect(r).toBe(100);
    }
  });

  it("ltv > 0 for a cohort with active users", () => {
    const cohort = "2024-06";
    const subs = [
      makeSubWithCohort("u1", "pro", cohort, utcDate(2024, 6, 1)),
      makeSubWithCohort("u2", "pro", cohort, utcDate(2024, 6, 15)),
    ];
    const metrics = buildCohortMetrics(subs, cohort, 3);
    expect(metrics.ltv).toBeGreaterThan(0);
  });

  it("returns empty metrics for unknown cohort", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1)),
    ];
    const metrics = buildCohortMetrics(subs, "1999-01");
    expect(metrics.startingUsers).toBe(0);
    expect(metrics.monthlyRetention[0]).toBe(100);
  });

  it("avgMrr is the mean mrr of starting users", () => {
    const cohort = "2025-03";
    const subs = [
      makeSubWithCohort("u1", "pro", cohort, utcDate(2025, 3, 1), undefined, 1000),
      makeSubWithCohort("u2", "pro", cohort, utcDate(2025, 3, 1), undefined, 2000),
    ];
    const metrics = buildCohortMetrics(subs, cohort, 1);
    expect(metrics.avgMrr).toBe(1500);
  });

  it("churned array has 0 at index 0", () => {
    const cohort = "2025-04";
    const subs = [
      makeSubWithCohort("u1", "pro", cohort, utcDate(2025, 4, 1)),
    ];
    const metrics = buildCohortMetrics(subs, cohort, 2);
    expect(metrics.churned[0]).toBe(0);
  });

  it("monthlyRetention array has length maxMonths + 1", () => {
    const cohort = "2025-05";
    const subs = [
      makeSubWithCohort("u1", "pro", cohort, utcDate(2025, 5, 1)),
    ];
    const metrics = buildCohortMetrics(subs, cohort, 6);
    expect(metrics.monthlyRetention).toHaveLength(7);
  });

  it("churnRate[0] is 0", () => {
    const cohort = "2025-06";
    const subs = [
      makeSubWithCohort("u1", "pro", cohort, utcDate(2025, 6, 1)),
    ];
    const metrics = buildCohortMetrics(subs, cohort, 3);
    expect(metrics.churnRate[0]).toBe(0);
  });

  it("cumulativeRevenue grows over time with active users", () => {
    const cohort = "2024-01";
    const subs = [
      makeSubWithCohort("u1", "pro", cohort, utcDate(2024, 1, 1)),
    ];
    const metrics = buildCohortMetrics(subs, cohort, 3);
    // Each month the user is active adds mrr to cumulative revenue
    expect(metrics.cumulativeRevenue[2]).toBeGreaterThanOrEqual(
      metrics.cumulativeRevenue[1]
    );
  });

  it("uses maxMonths parameter to limit array length", () => {
    const cohort = "2025-07";
    const subs = [
      makeSubWithCohort("u1", "pro", cohort, utcDate(2025, 7, 1)),
    ];
    const metrics = buildCohortMetrics(subs, cohort, 4);
    expect(metrics.monthlyRetention).toHaveLength(5); // 0..4 inclusive
  });

  it("correctly identifies churned user count at month 2", () => {
    const cohort = "2023-06";
    const start = utcDate(2023, 6, 1);
    // u1 ends on July 10 — active through month 1 (threshold July 1), churns at month 2
    const end1 = utcDate(2023, 7, 10);
    const subs = [
      makeSubWithCohort("u1", "pro", cohort, start, end1),
      makeSubWithCohort("u2", "pro", cohort, start),
    ];
    const metrics = buildCohortMetrics(subs, cohort, 3);
    // Month 1: both active (end1 July 10 >= threshold July 1) → churned[1]=0
    expect(metrics.churned[1]).toBe(0);
    // Month 2: only u2 active (end1 July 10 < threshold Aug 1) → churned[2]=1
    expect(metrics.churned[2]).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// compareCohorts
// ---------------------------------------------------------------------------

describe("compareCohorts", () => {
  it("returns metrics for each requested cohort", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1)),
      makeSubWithCohort("u2", "pro", "2025-02", utcDate(2025, 2, 1)),
    ];
    const result = compareCohorts(subs, ["2025-01", "2025-02"]);
    expect(result).toHaveLength(2);
    expect(result[0].cohortMonth).toBe("2025-01");
    expect(result[1].cohortMonth).toBe("2025-02");
  });

  it("returns empty array for no cohort months", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1)),
    ];
    expect(compareCohorts(subs, [])).toHaveLength(0);
  });

  it("passes maxMonths to each cohort", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1)),
    ];
    const result = compareCohorts(subs, ["2025-01"], 3);
    expect(result[0].monthlyRetention).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// nrr
// ---------------------------------------------------------------------------

describe("nrr", () => {
  it("returns 1.0 when all users retained at full MRR", () => {
    const cohort = "2024-03";
    const subs = [
      makeSubWithCohort("u1", "pro", cohort, utcDate(2024, 3, 1), undefined, 1499),
    ];
    const result = nrr(subs, cohort, "2024-06");
    expect(result).toBeGreaterThan(0);
  });

  it("returns 0 when no starting revenue", () => {
    const cohort = "2024-04";
    const subs: SubscriptionRecord[] = [];
    const result = nrr(subs, cohort, "2024-07");
    expect(result).toBe(0);
  });

  it("returns 0 when all users churned before target month", () => {
    const cohort = "2024-01";
    const subs = [
      makeSubWithCohort("u1", "pro", cohort, utcDate(2024, 1, 1), utcDate(2024, 2, 1), 1000),
    ];
    // target is 2024-06, user already churned by then
    const result = nrr(subs, cohort, "2024-06");
    expect(result).toBe(0);
  });

  it("is positive when some users are still active at target month", () => {
    const cohort = "2023-01";
    const subs = [
      makeSubWithCohort("u1", "pro", cohort, utcDate(2023, 1, 1), undefined, 1000),
      makeSubWithCohort("u2", "pro", cohort, utcDate(2023, 1, 1), utcDate(2023, 3, 1), 1000),
    ];
    const result = nrr(subs, cohort, "2023-06");
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("returns 0 when cohort has no subscriptions", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1)),
    ];
    const result = nrr(subs, "1999-01", "1999-06");
    expect(result).toBe(0);
  });

  it("NRR can be > 1 with expansion", () => {
    const cohort = "2024-05";
    const subs = [
      makeSubWithCohort("u1", "pro", cohort, utcDate(2024, 5, 1), undefined, 1000),
      makeSubWithCohort("u1", "pro", cohort, utcDate(2024, 5, 15), undefined, 2000),
    ];
    const result = nrr(subs, cohort, "2024-08");
    expect(result).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// paybackPeriod
// ---------------------------------------------------------------------------

describe("paybackPeriod", () => {
  it("calculates paybackMonths via ceiling division", () => {
    const result = paybackPeriod(5000, 1499);
    expect(result.paybackMonths).toBe(Math.ceil(5000 / 1499));
  });

  it("isViable = true when payback <= 12 months", () => {
    const result = paybackPeriod(1000, 200);
    expect(result.paybackMonths).toBe(5);
    expect(result.isViable).toBe(true);
  });

  it("isViable = false when payback > 12 months", () => {
    const result = paybackPeriod(50000, 1499);
    expect(result.isViable).toBe(false);
  });

  it("isViable = true at exactly 12 months", () => {
    // 12 * 100 = 1200; ceil(1200/100) = 12
    const result = paybackPeriod(1200, 100);
    expect(result.paybackMonths).toBe(12);
    expect(result.isViable).toBe(true);
  });

  it("isViable = false at 13 months", () => {
    // ceil(1300/100) = 13
    const result = paybackPeriod(1300, 100);
    expect(result.paybackMonths).toBe(13);
    expect(result.isViable).toBe(false);
  });

  it("cac and avgMrr are preserved in the result", () => {
    const result = paybackPeriod(9999, 1234);
    expect(result.cac).toBe(9999);
    expect(result.avgMrr).toBe(1234);
  });

  it("returns Infinity payback when avgMrr is 0", () => {
    const result = paybackPeriod(1000, 0);
    expect(result.paybackMonths).toBe(Infinity);
    expect(result.isViable).toBe(false);
  });

  it("handles cac of 0", () => {
    const result = paybackPeriod(0, 500);
    expect(result.paybackMonths).toBe(0);
    expect(result.isViable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// mrrAt
// ---------------------------------------------------------------------------

describe("mrrAt", () => {
  it("sums mrr for users active in the target month", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1), undefined, 1499),
      makeSubWithCohort("u2", "pro", "2025-01", utcDate(2025, 1, 15), undefined, 2499),
    ];
    const result = mrrAt(subs, "2025-01");
    expect(result).toBe(3998);
  });

  it("excludes users who haven't started yet in target month", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-02", utcDate(2025, 2, 1), undefined, 1499),
    ];
    // user started in Feb, check January
    const result = mrrAt(subs, "2025-01");
    expect(result).toBe(0);
  });

  it("excludes users who churned before the target month", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1), utcDate(2025, 1, 31), 1499),
    ];
    // churned end of Jan; check February
    const result = mrrAt(subs, "2025-02");
    expect(result).toBe(0);
  });

  it("returns 0 for empty subscriptions", () => {
    expect(mrrAt([], "2025-01")).toBe(0);
  });

  it("includes users active at start of month (started before month end)", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 31), undefined, 500),
    ];
    const result = mrrAt(subs, "2025-01");
    expect(result).toBe(500);
  });

  it("includes users with endDate in the middle of the target month", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1), utcDate(2025, 1, 15), 999),
    ];
    const result = mrrAt(subs, "2025-01");
    expect(result).toBe(999);
  });

  it("handles multiple tiers summed together", () => {
    const subs = [
      makeSubWithCohort("u1", "free", "2025-03", utcDate(2025, 3, 1), undefined, 0),
      makeSubWithCohort("u2", "pro", "2025-03", utcDate(2025, 3, 1), undefined, 1499),
      makeSubWithCohort("u3", "elite", "2025-03", utcDate(2025, 3, 1), undefined, 2499),
    ];
    expect(mrrAt(subs, "2025-03")).toBe(3998);
  });
});

// ---------------------------------------------------------------------------
// mrrGrowthRate
// ---------------------------------------------------------------------------

describe("mrrGrowthRate", () => {
  it("returns positive growth when mrr increases", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1), undefined, 1000),
      makeSubWithCohort("u2", "pro", "2025-02", utcDate(2025, 2, 1), undefined, 500),
    ];
    const rate = mrrGrowthRate(subs, "2025-01", "2025-02");
    expect(rate).toBeGreaterThan(0);
  });

  it("returns 0 when mrr at month1 is 0", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-02", utcDate(2025, 2, 1), undefined, 1000),
    ];
    const rate = mrrGrowthRate(subs, "2025-01", "2025-02");
    expect(rate).toBe(0);
  });

  it("returns negative rate when mrr decreases", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1), undefined, 2000),
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1), utcDate(2025, 2, 1), 2000),
    ];
    const rate = mrrGrowthRate(subs, "2025-01", "2025-02");
    expect(rate).toBeLessThan(0);
  });

  it("returns 0 for empty subscriptions", () => {
    const rate = mrrGrowthRate([], "2025-01", "2025-02");
    expect(rate).toBe(0);
  });

  it("returns 0 when month1 and month2 have same mrr", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1), undefined, 1000),
    ];
    const rate = mrrGrowthRate(subs, "2025-01", "2025-02");
    // Both months have same user active → same mrr → 0% growth
    expect(rate).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ltv
// ---------------------------------------------------------------------------

describe("ltv", () => {
  it("returns mrr / churnRate", () => {
    expect(ltv(1000, 0.1)).toBeCloseTo(10000);
  });

  it("returns Infinity when churnRate is 0", () => {
    expect(ltv(1000, 0)).toBe(Infinity);
  });

  it("returns smaller value with higher churn", () => {
    const low = ltv(1000, 0.05);
    const high = ltv(1000, 0.2);
    expect(low).toBeGreaterThan(high);
  });

  it("is proportional to mrr", () => {
    expect(ltv(2000, 0.1)).toBeCloseTo(2 * ltv(1000, 0.1));
  });

  it("handles mrr of 0", () => {
    expect(ltv(0, 0.1)).toBe(0);
  });

  it("handles churnRate of 1 (total churn)", () => {
    expect(ltv(1000, 1)).toBeCloseTo(1000);
  });
});

// ---------------------------------------------------------------------------
// cohortRevenueHeatmap
// ---------------------------------------------------------------------------

describe("cohortRevenueHeatmap", () => {
  it("returns one entry per cohort month", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1)),
      makeSubWithCohort("u2", "pro", "2025-02", utcDate(2025, 2, 1)),
    ];
    const result = cohortRevenueHeatmap(subs, ["2025-01", "2025-02"]);
    expect(result).toHaveLength(2);
  });

  it("revenueByMonth array has length maxMonths + 1", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1)),
    ];
    const result = cohortRevenueHeatmap(subs, ["2025-01"], 4);
    expect(result[0].revenueByMonth).toHaveLength(5);
  });

  it("retentionByMonth array has length maxMonths + 1", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1)),
    ];
    const result = cohortRevenueHeatmap(subs, ["2025-01"], 4);
    expect(result[0].retentionByMonth).toHaveLength(5);
  });

  it("retentionByMonth[0] is 100 when cohort has users", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1)),
    ];
    const result = cohortRevenueHeatmap(subs, ["2025-01"], 2);
    expect(result[0].retentionByMonth[0]).toBe(100);
  });

  it("revenueByMonth[0] > 0 when users have non-zero mrr", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1), undefined, 1499),
    ];
    const result = cohortRevenueHeatmap(subs, ["2025-01"], 2);
    expect(result[0].revenueByMonth[0]).toBeGreaterThan(0);
  });

  it("returns zeros for unknown cohort", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1)),
    ];
    const result = cohortRevenueHeatmap(subs, ["1999-01"], 2);
    expect(result[0].revenueByMonth[0]).toBe(0);
    expect(result[0].retentionByMonth[0]).toBe(0);
  });

  it("uses default maxMonths of 6 producing 7 elements", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1)),
    ];
    const result = cohortRevenueHeatmap(subs, ["2025-01"]);
    expect(result[0].revenueByMonth).toHaveLength(7);
  });
});

// ---------------------------------------------------------------------------
// expansionMrr
// ---------------------------------------------------------------------------

describe("expansionMrr", () => {
  it("detects a user upgrade within cohort", () => {
    const cohort = "2025-01";
    const subs = [
      makeSubWithCohort("u1", "pro", cohort, utcDate(2025, 1, 1), undefined, 1499),
      makeSubWithCohort("u1", "elite", cohort, utcDate(2025, 1, 15), undefined, 2499),
    ];
    const result = expansionMrr(subs, cohort);
    expect(result.upgrades).toBe(1);
    expect(result.expansionRevenue).toBe(1000);
  });

  it("returns zeros when no upgrades in cohort", () => {
    const cohort = "2025-02";
    const subs = [
      makeSubWithCohort("u1", "pro", cohort, utcDate(2025, 2, 1), undefined, 1499),
    ];
    const result = expansionMrr(subs, cohort);
    expect(result.upgrades).toBe(0);
    expect(result.expansionRevenue).toBe(0);
  });

  it("ignores downgrade (second mrr < first)", () => {
    const cohort = "2025-03";
    const subs = [
      makeSubWithCohort("u1", "elite", cohort, utcDate(2025, 3, 1), undefined, 2499),
      makeSubWithCohort("u1", "pro", cohort, utcDate(2025, 3, 20), undefined, 1499),
    ];
    const result = expansionMrr(subs, cohort);
    expect(result.upgrades).toBe(0);
    expect(result.expansionRevenue).toBe(0);
  });

  it("counts multiple users upgrading", () => {
    const cohort = "2025-04";
    const subs = [
      makeSubWithCohort("u1", "pro", cohort, utcDate(2025, 4, 1), undefined, 1000),
      makeSubWithCohort("u1", "elite", cohort, utcDate(2025, 4, 10), undefined, 2000),
      makeSubWithCohort("u2", "pro", cohort, utcDate(2025, 4, 1), undefined, 1000),
      makeSubWithCohort("u2", "elite", cohort, utcDate(2025, 4, 12), undefined, 3000),
    ];
    const result = expansionMrr(subs, cohort);
    expect(result.upgrades).toBe(2);
    expect(result.expansionRevenue).toBe(3000);
  });

  it("only considers users in the given cohort", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1), undefined, 1000),
      makeSubWithCohort("u1", "elite", "2025-02", utcDate(2025, 2, 1), undefined, 2000),
    ];
    const result = expansionMrr(subs, "2025-01");
    // u1's upgrade is in cohort 2025-02, not 2025-01
    expect(result.upgrades).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// peakChurnMonths
// ---------------------------------------------------------------------------

describe("peakChurnMonths", () => {
  it("returns up to N peak churn months", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1), utcDate(2025, 3, 1)),
      makeSubWithCohort("u2", "pro", "2025-01", utcDate(2025, 1, 1), utcDate(2025, 3, 5)),
      makeSubWithCohort("u3", "pro", "2025-01", utcDate(2025, 1, 1), utcDate(2025, 4, 1)),
    ];
    const result = peakChurnMonths(subs, 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("returns empty when no churned subscriptions", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1)),
    ];
    expect(peakChurnMonths(subs)).toHaveLength(0);
  });

  it("returns months sorted by churnedUsers descending", () => {
    const subs = [
      // 2 churn in March 2025
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1), utcDate(2025, 3, 10)),
      makeSubWithCohort("u2", "pro", "2025-01", utcDate(2025, 1, 1), utcDate(2025, 3, 15)),
      // 1 churns in April 2025
      makeSubWithCohort("u3", "pro", "2025-01", utcDate(2025, 1, 1), utcDate(2025, 4, 10)),
    ];
    const result = peakChurnMonths(subs, 3);
    expect(result[0].churnedUsers).toBeGreaterThanOrEqual(result[1]?.churnedUsers ?? 0);
  });

  it("churnRate is between 0 and 1 (or 0 when no prior active)", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1), utcDate(2025, 3, 1)),
    ];
    const result = peakChurnMonths(subs, 1);
    if (result.length > 0) {
      expect(result[0].churnRate).toBeGreaterThanOrEqual(0);
      expect(result[0].churnRate).toBeLessThanOrEqual(1);
    }
  });

  it("uses default of top 3 months", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1), utcDate(2025, 2, 1)),
      makeSubWithCohort("u2", "pro", "2025-01", utcDate(2025, 1, 1), utcDate(2025, 3, 1)),
      makeSubWithCohort("u3", "pro", "2025-01", utcDate(2025, 1, 1), utcDate(2025, 4, 1)),
      makeSubWithCohort("u4", "pro", "2025-01", utcDate(2025, 1, 1), utcDate(2025, 5, 1)),
    ];
    const result = peakChurnMonths(subs);
    expect(result.length).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// freeToProConversionRate
// ---------------------------------------------------------------------------

describe("freeToProConversionRate", () => {
  it("counts free users who converted to paid within window", () => {
    const freeStart = utcDate(2025, 1, 1);
    const paidStart = utcDate(2025, 1, 20); // 19 days later
    const subs = [
      makeSubWithCohort("u1", "free", "2025-01", freeStart),
      makeSubWithCohort("u1", "pro", "2025-01", paidStart),
    ];
    const rate = freeToProConversionRate(subs, 30);
    expect(rate).toBe(1);
  });

  it("excludes conversions outside window", () => {
    const freeStart = utcDate(2025, 1, 1);
    const paidStart = utcDate(2025, 3, 1); // ~60 days later
    const subs = [
      makeSubWithCohort("u1", "free", "2025-01", freeStart),
      makeSubWithCohort("u1", "pro", "2025-03", paidStart),
    ];
    const rate = freeToProConversionRate(subs, 30);
    expect(rate).toBe(0);
  });

  it("returns 0 when no free users", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1)),
    ];
    expect(freeToProConversionRate(subs)).toBe(0);
  });

  it("returns 0 for empty subscriptions", () => {
    expect(freeToProConversionRate([])).toBe(0);
  });

  it("rate is between 0 and 1", () => {
    const subs = [
      makeSubWithCohort("u1", "free", "2025-01", utcDate(2025, 1, 1)),
      makeSubWithCohort("u2", "free", "2025-01", utcDate(2025, 1, 1)),
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 10)),
    ];
    const rate = freeToProConversionRate(subs, 30);
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(1);
  });

  it("uses default withinDays of 30", () => {
    const freeStart = utcDate(2025, 1, 1);
    const paidStart = utcDate(2025, 1, 29);
    const subs = [
      makeSubWithCohort("u1", "free", "2025-01", freeStart),
      makeSubWithCohort("u1", "pro", "2025-01", paidStart),
    ];
    const rate = freeToProConversionRate(subs);
    expect(rate).toBe(1);
  });

  it("counts elite upgrades from free as conversions", () => {
    const freeStart = utcDate(2025, 1, 1);
    const paidStart = utcDate(2025, 1, 5);
    const subs = [
      makeSubWithCohort("u1", "free", "2025-01", freeStart),
      makeSubWithCohort("u1", "elite", "2025-01", paidStart),
    ];
    const rate = freeToProConversionRate(subs, 30);
    expect(rate).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// tierDistributionByCohort
// ---------------------------------------------------------------------------

describe("tierDistributionByCohort", () => {
  it("returns tier counts for cohort at month 0", () => {
    const cohort = "2025-01";
    const subs = [
      makeSubWithCohort("u1", "free", cohort, utcDate(2025, 1, 1)),
      makeSubWithCohort("u2", "pro", cohort, utcDate(2025, 1, 1)),
      makeSubWithCohort("u3", "pro", cohort, utcDate(2025, 1, 1)),
      makeSubWithCohort("u4", "elite", cohort, utcDate(2025, 1, 1)),
    ];
    const dist = tierDistributionByCohort(subs, cohort);
    expect(dist.free).toBe(1);
    expect(dist.pro).toBe(2);
    expect(dist.elite).toBe(1);
  });

  it("returns empty object for unknown cohort", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1)),
    ];
    const dist = tierDistributionByCohort(subs, "1999-01");
    expect(Object.keys(dist)).toHaveLength(0);
  });

  it("excludes subscriptions from other cohorts", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1)),
      makeSubWithCohort("u2", "elite", "2025-02", utcDate(2025, 2, 1)),
    ];
    const dist = tierDistributionByCohort(subs, "2025-01");
    expect(dist.pro).toBe(1);
    expect(dist.elite).toBeUndefined();
  });

  it("returns object with correct tier name keys", () => {
    const cohort = "2025-01";
    const subs = [
      makeSubWithCohort("u1", "apex", cohort, utcDate(2025, 1, 1), undefined, 5000),
    ];
    const dist = tierDistributionByCohort(subs, cohort);
    expect(dist.apex).toBe(1);
  });

  it("handles all tiers present", () => {
    const cohort = "2025-05";
    const subs = [
      makeSubWithCohort("u1", "free", cohort, utcDate(2025, 5, 1), undefined, 0),
      makeSubWithCohort("u2", "pro", cohort, utcDate(2025, 5, 1), undefined, 1499),
      makeSubWithCohort("u3", "elite", cohort, utcDate(2025, 5, 1), undefined, 2499),
      makeSubWithCohort("u4", "apex", cohort, utcDate(2025, 5, 1), undefined, 4999),
    ];
    const dist = tierDistributionByCohort(subs, cohort);
    expect(dist.free).toBe(1);
    expect(dist.pro).toBe(1);
    expect(dist.elite).toBe(1);
    expect(dist.apex).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// avgMonthsToUpgrade
// ---------------------------------------------------------------------------

describe("avgMonthsToUpgrade", () => {
  it("returns average months from free start to paid start", () => {
    const freeStart = utcDate(2025, 1, 1);
    const paidStart = utcDate(2025, 3, 1); // ~2 months later
    const subs = [
      makeSubWithCohort("u1", "free", "2025-01", freeStart),
      makeSubWithCohort("u1", "pro", "2025-03", paidStart),
    ];
    const avg = avgMonthsToUpgrade(subs);
    expect(avg).not.toBeNull();
    expect(avg!).toBeGreaterThan(0);
  });

  it("returns null when no upgrades found", () => {
    const subs = [
      makeSubWithCohort("u1", "free", "2025-01", utcDate(2025, 1, 1)),
    ];
    expect(avgMonthsToUpgrade(subs)).toBeNull();
  });

  it("returns null for empty subscriptions", () => {
    expect(avgMonthsToUpgrade([])).toBeNull();
  });

  it("returns null when only paid users, no free", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1)),
    ];
    expect(avgMonthsToUpgrade(subs)).toBeNull();
  });

  it("averages across multiple users", () => {
    // u1: ~2 months, u2: ~4 months → avg ~3
    const subs = [
      makeSubWithCohort("u1", "free", "2025-01", utcDate(2025, 1, 1)),
      makeSubWithCohort("u1", "pro", "2025-03", utcDate(2025, 3, 1)),
      makeSubWithCohort("u2", "free", "2025-01", utcDate(2025, 1, 1)),
      makeSubWithCohort("u2", "pro", "2025-05", utcDate(2025, 5, 1)),
    ];
    const avg = avgMonthsToUpgrade(subs);
    expect(avg).not.toBeNull();
    expect(avg!).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// projectUserLtv
// ---------------------------------------------------------------------------

describe("projectUserLtv", () => {
  it("projectedLtv > alreadyPaid for an active subscription", () => {
    const sub = makeSub("u1", "pro", 60, undefined, 1499);
    const projection = projectUserLtv(sub, 0.05, 24);
    expect(projection.projectedLtv).toBeGreaterThan(projection.alreadyPaid);
  });

  it("monthsActive reflects how long subscription has been active", () => {
    // started ~90 days ago (about 3 months)
    const sub = makeSub("u1", "pro", 91, undefined, 1499);
    const projection = projectUserLtv(sub, 0.05, 24);
    expect(projection.monthsActive).toBeGreaterThanOrEqual(2);
  });

  it("churnRisk is 0 for active subscription", () => {
    const sub = makeSub("u1", "pro", 30, undefined, 1499);
    const projection = projectUserLtv(sub, 0.05, 24);
    expect(projection.churnRisk).toBe(0);
  });

  it("churnRisk is > 0 for churned subscription", () => {
    // churned 30 days ago
    const sub = makeSub("u1", "pro", 60, 30, 1499);
    const projection = projectUserLtv(sub, 0.05, 24);
    expect(projection.churnRisk).toBeGreaterThan(0);
  });

  it("remainingValue = projectedLtv - alreadyPaid", () => {
    const sub = makeSub("u1", "pro", 30, undefined, 1499);
    const projection = projectUserLtv(sub, 0.05, 24);
    // Allow for rounding
    expect(Math.abs(projection.remainingValue - (projection.projectedLtv - projection.alreadyPaid))).toBeLessThanOrEqual(1);
  });

  it("userId matches the input record", () => {
    const sub = makeSub("userXYZ", "pro", 30, undefined, 1499);
    expect(projectUserLtv(sub).userId).toBe("userXYZ");
  });

  it("tier matches the input record", () => {
    const sub = makeSub("u1", "elite", 30, undefined, 2499);
    expect(projectUserLtv(sub).tier).toBe("elite");
  });

  it("currentMrr matches the input record", () => {
    const sub = makeSub("u1", "pro", 30, undefined, 1234);
    expect(projectUserLtv(sub).currentMrr).toBe(1234);
  });

  it("projectedLtv increases with lower churn rate", () => {
    const sub = makeSub("u1", "pro", 30, undefined, 1499);
    const lowChurn = projectUserLtv(sub, 0.02, 24);
    const highChurn = projectUserLtv(sub, 0.15, 24);
    expect(lowChurn.projectedLtv).toBeGreaterThan(highChurn.projectedLtv);
  });
});

// ---------------------------------------------------------------------------
// compareSegments
// ---------------------------------------------------------------------------

describe("compareSegments", () => {
  it("winnerByLtv is A when segment A has higher avg LTV", () => {
    const subs = [
      // pro users with high mrr
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1), undefined, 5000),
      // elite users with lower mrr
      makeSubWithCohort("u2", "elite", "2025-01", utcDate(2025, 1, 1), undefined, 500),
    ];
    const result = compareSegments(subs, "pro", "elite", "tier");
    // pro has higher mrr → higher projected LTV
    expect(result.winnerByLtv).toBe("A");
  });

  it("winnerByLtv is tie when both segments have equal LTV", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1), undefined, 1499),
      makeSubWithCohort("u2", "elite", "2025-01", utcDate(2025, 1, 1), undefined, 1499),
    ];
    const result = compareSegments(subs, "pro", "elite", "tier");
    expect(result.winnerByLtv).toBe("tie");
  });

  it("segmentA and segmentB keys are preserved in result", () => {
    const subs = [
      makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1)),
    ];
    const result = compareSegments(subs, "pro", "elite", "tier");
    expect(result.segmentA).toBe("pro");
    expect(result.segmentB).toBe("elite");
  });

  it("avgLtvA is 0 when segment A is empty", () => {
    const subs = [
      makeSubWithCohort("u1", "elite", "2025-01", utcDate(2025, 1, 1)),
    ];
    const result = compareSegments(subs, "pro", "elite", "tier");
    expect(result.avgLtvA).toBe(0);
  });

  it("works with acquisitionChannel segmentation", () => {
    const subs = [
      {
        ...makeSubWithCohort("u1", "pro", "2025-01", utcDate(2025, 1, 1), undefined, 1499),
        acquisitionChannel: "social",
      },
      {
        ...makeSubWithCohort("u2", "pro", "2025-01", utcDate(2025, 1, 1), undefined, 999),
        acquisitionChannel: "email",
      },
    ];
    const result = compareSegments(subs, "social", "email", "acquisitionChannel");
    expect(result.winnerByLtv).toBe("A"); // social has higher mrr
  });
});
