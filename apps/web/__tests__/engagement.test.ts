/**
 * Tests for engagement and retention analytics utilities.
 * Minimum 55 test cases.
 */

import { describe, it, expect } from "vitest";
import {
  buildFunnel,
  overallConversionRate,
  sessionScore,
  cohortRetentionRate,
  buildCohortRetention,
  churnRisk,
  lifetimeValue,
  paybackPeriod,
  mrrGrowthRate,
  netRevenueRetention,
  engagementTrend,
  pickEngagementRate,
  activeDaysRate,
  featureAdoptionRate,
  averageSessionsPerUser,
  dailyActiveRate,
  retentionDelta,
} from "@/lib/analytics/engagement";

// ---------------------------------------------------------------------------
// buildFunnel
// ---------------------------------------------------------------------------
describe("buildFunnel", () => {
  it("returns metrics for each stage in order", () => {
    const result = buildFunnel([
      { stage: "visitor", count: 1000 },
      { stage: "registered", count: 400 },
      { stage: "pro_subscriber", count: 100 },
    ]);
    expect(result).toHaveLength(3);
    expect(result[0].stage).toBe("visitor");
    expect(result[1].stage).toBe("registered");
    expect(result[2].stage).toBe("pro_subscriber");
  });

  it("first stage has null conversionFromPrev and null dropoffFromPrev", () => {
    const result = buildFunnel([
      { stage: "visitor", count: 1000 },
      { stage: "registered", count: 400 },
    ]);
    expect(result[0].conversionFromPrev).toBeNull();
    expect(result[0].dropoffFromPrev).toBeNull();
  });

  it("calculates conversion correctly for second stage", () => {
    const result = buildFunnel([
      { stage: "visitor", count: 1000 },
      { stage: "registered", count: 400 },
    ]);
    expect(result[1].conversionFromPrev).toBeCloseTo(0.4);
  });

  it("calculates dropoff correctly for second stage", () => {
    const result = buildFunnel([
      { stage: "visitor", count: 1000 },
      { stage: "registered", count: 400 },
    ]);
    expect(result[1].dropoffFromPrev).toBeCloseTo(0.6);
  });

  it("handles three stages with correct conversions throughout", () => {
    const result = buildFunnel([
      { stage: "visitor", count: 1000 },
      { stage: "registered", count: 500 },
      { stage: "pro_subscriber", count: 100 },
    ]);
    expect(result[1].conversionFromPrev).toBeCloseTo(0.5);
    expect(result[2].conversionFromPrev).toBeCloseTo(0.2);
  });

  it("handles prev count of 0 gracefully", () => {
    const result = buildFunnel([
      { stage: "visitor", count: 0 },
      { stage: "registered", count: 50 },
    ]);
    expect(result[1].conversionFromPrev).toBe(0);
  });

  it("returns empty array for empty input", () => {
    expect(buildFunnel([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// overallConversionRate
// ---------------------------------------------------------------------------
describe("overallConversionRate", () => {
  it("returns ratio of last to first stage", () => {
    const metrics = buildFunnel([
      { stage: "visitor", count: 1000 },
      { stage: "registered", count: 200 },
      { stage: "pro_subscriber", count: 50 },
    ]);
    expect(overallConversionRate(metrics)).toBeCloseTo(0.05);
  });

  it("returns 1 for single-stage funnel", () => {
    const metrics = buildFunnel([{ stage: "visitor", count: 500 }]);
    expect(overallConversionRate(metrics)).toBe(1);
  });

  it("returns 0 for empty metrics", () => {
    expect(overallConversionRate([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// sessionScore
// ---------------------------------------------------------------------------
describe("sessionScore", () => {
  it("returns zero-score for empty events array", () => {
    const score = sessionScore([]);
    expect(score.totalEvents).toBe(0);
    expect(score.engagementScore).toBe(0);
    expect(score.isHighValue).toBe(false);
  });

  it("calculates totalEvents correctly", () => {
    const events = [
      { type: "page_view", timestamp: 1000 },
      { type: "page_view", timestamp: 2000 },
      { type: "click", timestamp: 3000 },
    ];
    expect(sessionScore(events).totalEvents).toBe(3);
  });

  it("calculates uniqueEventTypes correctly", () => {
    const events = [
      { type: "page_view", timestamp: 1000 },
      { type: "page_view", timestamp: 2000 },
      { type: "click", timestamp: 3000 },
      { type: "pick_view", timestamp: 4000 },
    ];
    expect(sessionScore(events).uniqueEventTypes).toBe(3);
  });

  it("calculates durationMs as last minus first timestamp", () => {
    const events = [
      { type: "page_view", timestamp: 1000 },
      { type: "click", timestamp: 4000 },
    ];
    expect(sessionScore(events).durationMs).toBe(3000);
  });

  it("durationMs is 0 for single event", () => {
    const events = [{ type: "page_view", timestamp: 5000 }];
    expect(sessionScore(events).durationMs).toBe(0);
  });

  it("counts pickViewCount accurately", () => {
    const events = [
      { type: "pick_view", timestamp: 1000 },
      { type: "pick_view", timestamp: 2000 },
      { type: "pick_view", timestamp: 3000 },
      { type: "page_view", timestamp: 4000 },
    ];
    expect(sessionScore(events).pickViewCount).toBe(3);
  });

  it("isHighValue is true when engagementScore >= 70", () => {
    // Many pick_views across many types drives score high
    const events: { type: string; timestamp: number }[] = [];
    const types = ["pick_view", "page_view", "click", "scroll", "share", "like"];
    for (let i = 0; i < 20; i++) {
      events.push({ type: types[i % types.length], timestamp: i * 30000 });
    }
    const score = sessionScore(events);
    expect(score.isHighValue).toBe(true);
  });

  it("isHighValue is false for low-engagement session", () => {
    const events = [{ type: "page_view", timestamp: 0 }];
    const score = sessionScore(events);
    expect(score.isHighValue).toBe(false);
  });

  it("engagementScore is capped at 100", () => {
    const events: { type: string; timestamp: number }[] = [];
    for (let i = 0; i < 50; i++) {
      events.push({ type: `type_${i}`, timestamp: i * 120000 });
    }
    const score = sessionScore(events);
    expect(score.engagementScore).toBeLessThanOrEqual(100);
  });

  it("pick bonus is capped at 12 (3 pick_views = 12 pts)", () => {
    // 3 events (base = 15), 1 type (variety = 8), 0 duration, 3 pick_views (pick = 12)
    // score = min(100, 15 + 8 + 0 + 12) = 35, not high value
    const events = [
      { type: "pick_view", timestamp: 0 },
      { type: "pick_view", timestamp: 0 },
      { type: "pick_view", timestamp: 0 },
    ];
    const score = sessionScore(events);
    expect(score.pickViewCount).toBe(3);
    expect(score.engagementScore).toBe(35);
  });
});

// ---------------------------------------------------------------------------
// cohortRetentionRate
// ---------------------------------------------------------------------------
describe("cohortRetentionRate", () => {
  const now = Date.now();
  const week = 7 * 86400000;

  it("returns 1.0 at week 0 when all users are active after joining", () => {
    const cohort = [
      { joinedAt: now - week * 2, lastActiveAt: now },
      { joinedAt: now - week * 3, lastActiveAt: now - week },
    ];
    expect(cohortRetentionRate(cohort, 0)).toBe(1.0);
  });

  it("returns 0 when no users active at week 52", () => {
    const cohort = [
      { joinedAt: 0, lastActiveAt: week * 10 },
      { joinedAt: 0, lastActiveAt: week * 5 },
    ];
    expect(cohortRetentionRate(cohort, 52)).toBe(0);
  });

  it("returns partial retention at intermediate week", () => {
    const baseTime = 0;
    const cohort = [
      { joinedAt: baseTime, lastActiveAt: baseTime + week * 5 }, // active at w4
      { joinedAt: baseTime, lastActiveAt: baseTime + week * 2 }, // not active at w4
      { joinedAt: baseTime, lastActiveAt: baseTime + week * 8 }, // active at w4
    ];
    // At week 4, threshold = joinedAt + 4*week
    // User 0: lastActive = 5wk ≥ 4wk ✓
    // User 1: lastActive = 2wk < 4wk ✗
    // User 2: lastActive = 8wk ≥ 4wk ✓
    expect(cohortRetentionRate(cohort, 4)).toBeCloseTo(2 / 3);
  });

  it("returns 0 for empty cohort", () => {
    expect(cohortRetentionRate([], 1)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// buildCohortRetention
// ---------------------------------------------------------------------------
describe("buildCohortRetention", () => {
  const week = 7 * 86400000;

  it("produces correct retentionByWeek length (maxWeeks + 1 entries)", () => {
    const cohorts = [
      {
        label: "2024-01",
        users: [
          { joinedAt: 0, lastActiveAt: week * 20 },
          { joinedAt: 0, lastActiveAt: week * 5 },
        ],
      },
    ];
    const result = buildCohortRetention(cohorts, 12);
    expect(result[0].retentionByWeek).toHaveLength(13); // weeks 0..12
  });

  it("week 0 retention is always 1.0", () => {
    const cohorts = [
      {
        label: "2024-02",
        users: [
          { joinedAt: 0, lastActiveAt: 0 },
          { joinedAt: 0, lastActiveAt: 0 },
        ],
      },
    ];
    const result = buildCohortRetention(cohorts, 4);
    expect(result[0].retentionByWeek[0]).toBe(1.0);
  });

  it("maps cohort labels and sizes correctly", () => {
    const cohorts = [
      {
        label: "2024-03",
        users: [
          { joinedAt: 0, lastActiveAt: week * 2 },
          { joinedAt: 0, lastActiveAt: week * 2 },
          { joinedAt: 0, lastActiveAt: week * 2 },
        ],
      },
    ];
    const result = buildCohortRetention(cohorts, 4);
    expect(result[0].cohortLabel).toBe("2024-03");
    expect(result[0].size).toBe(3);
  });

  it("handles multiple cohorts", () => {
    const cohorts = [
      { label: "A", users: [{ joinedAt: 0, lastActiveAt: week * 10 }] },
      { label: "B", users: [{ joinedAt: 0, lastActiveAt: week * 2 }] },
    ];
    const result = buildCohortRetention(cohorts, 4);
    expect(result).toHaveLength(2);
    expect(result[0].cohortLabel).toBe("A");
    expect(result[1].cohortLabel).toBe("B");
  });

  it("uses default maxWeeks of 12 when not provided", () => {
    const cohorts = [
      { label: "D", users: [{ joinedAt: 0, lastActiveAt: week * 20 }] },
    ];
    const result = buildCohortRetention(cohorts);
    expect(result[0].retentionByWeek).toHaveLength(13);
  });
});

// ---------------------------------------------------------------------------
// churnRisk
// ---------------------------------------------------------------------------
describe("churnRisk", () => {
  it("inactive for 60 days → critical", () => {
    const result = churnRisk({
      daysSinceLastVisit: 60,
      priorPeriodVisits: 10,
      recentVisits: 0,
    });
    expect(result.churnRisk).toBe("critical");
  });

  it("active yesterday → low risk", () => {
    const result = churnRisk({
      daysSinceLastVisit: 1,
      priorPeriodVisits: 10,
      recentVisits: 9,
    });
    expect(result.churnRisk).toBe("low");
  });

  it("computes recentActivityDrop when visits drop to zero", () => {
    const result = churnRisk({
      daysSinceLastVisit: 5,
      priorPeriodVisits: 20,
      recentVisits: 0,
    });
    // drop = max(0, 1 - 0 / 20.01) ≈ 1.0
    expect(result.recentActivityDrop).toBeCloseTo(1.0, 1);
  });

  it("recentActivityDrop is 0 when recent visits exceed prior", () => {
    const result = churnRisk({
      daysSinceLastVisit: 0,
      priorPeriodVisits: 5,
      recentVisits: 20,
    });
    expect(result.recentActivityDrop).toBe(0);
  });

  it("riskScore is in [0, 100]", () => {
    const r1 = churnRisk({ daysSinceLastVisit: 0, priorPeriodVisits: 5, recentVisits: 5 });
    const r2 = churnRisk({ daysSinceLastVisit: 90, priorPeriodVisits: 10, recentVisits: 0 });
    expect(r1.riskScore).toBeGreaterThanOrEqual(0);
    expect(r1.riskScore).toBeLessThanOrEqual(100);
    expect(r2.riskScore).toBeGreaterThanOrEqual(0);
    expect(r2.riskScore).toBeLessThanOrEqual(100);
  });

  it("medium risk for moderate inactivity", () => {
    // ~10 days no visit, modest drop
    const result = churnRisk({
      daysSinceLastVisit: 10,
      priorPeriodVisits: 10,
      recentVisits: 8,
    });
    // dayScore ≈ 20 + (3/7)*20 ≈ 28.6; dropScore ≈ (1-8/10.01)*30 ≈ 6; total ≈ 34.6 → medium
    expect(result.churnRisk).toBe("medium");
  });

  it("high risk for extended inactivity without full drop", () => {
    const result = churnRisk({
      daysSinceLastVisit: 25,
      priorPeriodVisits: 10,
      recentVisits: 2,
    });
    expect(["high", "critical"]).toContain(result.churnRisk);
  });

  it("preserves daysSinceLastVisit in output", () => {
    const result = churnRisk({
      daysSinceLastVisit: 14,
      priorPeriodVisits: 5,
      recentVisits: 2,
    });
    expect(result.daysSinceLastVisit).toBe(14);
  });
});

// ---------------------------------------------------------------------------
// lifetimeValue
// ---------------------------------------------------------------------------
describe("lifetimeValue", () => {
  it("computes LTV correctly: 100/0.05 → 2000", () => {
    expect(lifetimeValue(100, 0.05)).toBeCloseTo(2000);
  });

  it("returns Infinity when churnRateMonthly === 0", () => {
    expect(lifetimeValue(100, 0)).toBe(Infinity);
  });

  it("returns 0 when monthlyRevenue === 0", () => {
    expect(lifetimeValue(0, 0.1)).toBe(0);
  });

  it("returns 0 when both are 0", () => {
    expect(lifetimeValue(0, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// paybackPeriod
// ---------------------------------------------------------------------------
describe("paybackPeriod", () => {
  it("computes payback: 600/200 → 3", () => {
    expect(paybackPeriod(600, 200)).toBeCloseTo(3);
  });

  it("returns Infinity when monthlyRevenue === 0", () => {
    expect(paybackPeriod(500, 0)).toBe(Infinity);
  });

  it("returns 0 when CAC is 0", () => {
    expect(paybackPeriod(0, 100)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// mrrGrowthRate
// ---------------------------------------------------------------------------
describe("mrrGrowthRate", () => {
  it("computes growth rate: 1000 → 1100 = 0.1", () => {
    expect(mrrGrowthRate(1000, 1100)).toBeCloseTo(0.1);
  });

  it("returns negative for MRR decline", () => {
    expect(mrrGrowthRate(1000, 900)).toBeCloseTo(-0.1);
  });

  it("returns NaN when mrrPrev === 0", () => {
    expect(mrrGrowthRate(0, 1000)).toBeNaN();
  });

  it("returns 0 when no change", () => {
    expect(mrrGrowthRate(1000, 1000)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// netRevenueRetention
// ---------------------------------------------------------------------------
describe("netRevenueRetention", () => {
  it("computes NRR with expansion and churn", () => {
    // (1000 + 200 - 50 - 100) / 1000 = 1050/1000 = 1.05
    expect(netRevenueRetention(1000, 200, 50, 100)).toBeCloseTo(1.05);
  });

  it("returns NaN when startMrr === 0", () => {
    expect(netRevenueRetention(0, 100, 0, 0)).toBeNaN();
  });

  it("returns < 1 when churn exceeds expansion", () => {
    // (1000 + 0 - 0 - 200) / 1000 = 0.8
    expect(netRevenueRetention(1000, 0, 0, 200)).toBeCloseTo(0.8);
  });

  it("returns exactly 1.0 when expansion/contraction/churn all zero", () => {
    expect(netRevenueRetention(1000, 0, 0, 0)).toBeCloseTo(1.0);
  });
});

// ---------------------------------------------------------------------------
// engagementTrend
// ---------------------------------------------------------------------------
describe("engagementTrend", () => {
  it("returns 'improving' for clearly rising scores", () => {
    expect(engagementTrend([10, 12, 14, 50, 60, 70])).toBe("improving");
  });

  it("returns 'declining' for clearly falling scores", () => {
    expect(engagementTrend([70, 65, 60, 20, 15, 10])).toBe("declining");
  });

  it("returns 'stable' for flat scores", () => {
    expect(engagementTrend([50, 50, 50, 50, 50, 50])).toBe("stable");
  });

  it("returns 'stable' when fewer than 6 data points", () => {
    expect(engagementTrend([10, 80, 90, 100])).toBe("stable");
  });

  it("returns 'stable' for exactly 5 data points", () => {
    expect(engagementTrend([10, 10, 10, 90, 90])).toBe("stable");
  });

  it("returns 'improving' with exactly 6 points that improve by more than 5", () => {
    // avg first 3 = 10, avg last 3 = 80; diff = 70 > 5
    expect(engagementTrend([10, 10, 10, 80, 80, 80])).toBe("improving");
  });

  it("returns 'stable' when difference is exactly 5", () => {
    // avg first 3 = 50, avg last 3 = 55; diff = 5, not > 5
    expect(engagementTrend([50, 50, 50, 55, 55, 55])).toBe("stable");
  });
});

// ---------------------------------------------------------------------------
// pickEngagementRate
// ---------------------------------------------------------------------------
describe("pickEngagementRate", () => {
  it("computes rate: 10/100 → 0.1", () => {
    expect(pickEngagementRate(10, 100)).toBeCloseTo(0.1);
  });

  it("returns 0 when totalPageViews === 0", () => {
    expect(pickEngagementRate(5, 0)).toBe(0);
  });

  it("returns 1.0 when all views are pick views", () => {
    expect(pickEngagementRate(50, 50)).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// activeDaysRate
// ---------------------------------------------------------------------------
describe("activeDaysRate", () => {
  it("computes rate: 5/7", () => {
    expect(activeDaysRate(5, 7)).toBeCloseTo(5 / 7);
  });

  it("returns 0 when totalDays === 0", () => {
    expect(activeDaysRate(3, 0)).toBe(0);
  });

  it("clamps to 1 when activeDays > totalDays", () => {
    expect(activeDaysRate(10, 7)).toBe(1);
  });

  it("returns 0 when activeDays === 0", () => {
    expect(activeDaysRate(0, 30)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// featureAdoptionRate
// ---------------------------------------------------------------------------
describe("featureAdoptionRate", () => {
  it("computes rate: 50/100 → 0.5", () => {
    expect(featureAdoptionRate(50, 100)).toBeCloseTo(0.5);
  });

  it("returns 0 when totalUsers === 0", () => {
    expect(featureAdoptionRate(10, 0)).toBe(0);
  });

  it("returns 1.0 when all users adopted", () => {
    expect(featureAdoptionRate(100, 100)).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// averageSessionsPerUser
// ---------------------------------------------------------------------------
describe("averageSessionsPerUser", () => {
  it("computes average: 300/100 → 3", () => {
    expect(averageSessionsPerUser(300, 100)).toBeCloseTo(3);
  });

  it("returns 0 when totalUsers === 0", () => {
    expect(averageSessionsPerUser(300, 0)).toBe(0);
  });

  it("returns 1 when sessions equal users", () => {
    expect(averageSessionsPerUser(50, 50)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// dailyActiveRate
// ---------------------------------------------------------------------------
describe("dailyActiveRate", () => {
  it("computes DAU/MAU: 30/100 → 0.3", () => {
    expect(dailyActiveRate(30, 100)).toBeCloseTo(0.3);
  });

  it("returns 0 when mau === 0", () => {
    expect(dailyActiveRate(0, 0)).toBe(0);
  });

  it("returns 1.0 when DAU equals MAU", () => {
    expect(dailyActiveRate(100, 100)).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// retentionDelta
// ---------------------------------------------------------------------------
describe("retentionDelta", () => {
  it("returns positive delta when week4 > week1", () => {
    expect(retentionDelta(0.8, 0.9)).toBeCloseTo(0.1);
  });

  it("returns negative delta when week4 < week1", () => {
    expect(retentionDelta(0.9, 0.6)).toBeCloseTo(-0.3);
  });

  it("returns 0 when week1 === week4", () => {
    expect(retentionDelta(0.7, 0.7)).toBe(0);
  });

  it("returns exact week4 - week1 value", () => {
    expect(retentionDelta(0.4, 0.65)).toBeCloseTo(0.25);
  });
});
