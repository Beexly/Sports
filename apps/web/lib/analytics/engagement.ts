/**
 * Engagement and retention analytics utilities — pure, zero dependencies.
 *
 * Funnel analysis, cohort retention, session scoring, churn risk,
 * and engagement metrics for sports subscription products.
 */

export type FunnelStage =
  | "visitor"
  | "registered"
  | "free_active"
  | "trial"
  | "pro_subscriber"
  | "elite_subscriber"
  | "churned";

export interface FunnelMetrics {
  readonly stage: FunnelStage;
  readonly count: number;
  readonly conversionFromPrev: number | null; // [0,1] or null for first stage
  readonly dropoffFromPrev: number | null;
}

export interface SessionEvent {
  readonly type: string;
  readonly timestamp: number; // ms since epoch
  readonly value?: number;
}

export interface SessionScore {
  readonly totalEvents: number;
  readonly uniqueEventTypes: number;
  readonly durationMs: number;
  readonly engagementScore: number; // [0, 100]
  readonly pickViewCount: number;
  readonly isHighValue: boolean; // engagementScore >= 70
}

export interface CohortRetention {
  readonly cohortLabel: string; // e.g., "2024-01" (month)
  readonly size: number;
  readonly retentionByWeek: readonly number[]; // [0, 1] fraction retained each week
}

export interface ChurnSignals {
  readonly daysSinceLastVisit: number;
  readonly recentActivityDrop: number; // [0, 1] drop from prior period
  readonly churnRisk: "low" | "medium" | "high" | "critical";
  readonly riskScore: number; // [0, 100]
}

/**
 * Build funnel metrics from an ordered list of stage counts.
 * conversionFromPrev = current.count / prev.count (null for first stage).
 */
export function buildFunnel(
  stageCounts: readonly { stage: FunnelStage; count: number }[],
): FunnelMetrics[] {
  return stageCounts.map((entry, index) => {
    if (index === 0) {
      return {
        stage: entry.stage,
        count: entry.count,
        conversionFromPrev: null,
        dropoffFromPrev: null,
      };
    }
    const prev = stageCounts[index - 1];
    const conversionFromPrev =
      prev.count > 0 ? entry.count / prev.count : 0;
    const dropoffFromPrev = 1 - conversionFromPrev;
    return {
      stage: entry.stage,
      count: entry.count,
      conversionFromPrev,
      dropoffFromPrev,
    };
  });
}

/**
 * Overall conversion rate: ratio of last stage count to first stage count.
 */
export function overallConversionRate(metrics: readonly FunnelMetrics[]): number {
  if (metrics.length < 2) return metrics.length === 1 ? 1 : 0;
  const first = metrics[0].count;
  const last = metrics[metrics.length - 1].count;
  if (first === 0) return 0;
  return last / first;
}

/**
 * Score a session from its events.
 * engagementScore = min(100, base + variety + duration + pick)
 *   base     = min(events.length * 5, 40)
 *   variety  = uniqueEventTypes * 8
 *   duration = min(durationMs / 60000 * 5, 20)   // 5pts per minute, max 20
 *   pick     = min(pickViewCount * 4, 12)
 */
export function sessionScore(events: readonly SessionEvent[]): SessionScore {
  const totalEvents = events.length;

  if (totalEvents === 0) {
    return {
      totalEvents: 0,
      uniqueEventTypes: 0,
      durationMs: 0,
      engagementScore: 0,
      pickViewCount: 0,
      isHighValue: false,
    };
  }

  const typeSet = new Set<string>();
  let pickViewCount = 0;
  let minTs = events[0].timestamp;
  let maxTs = events[0].timestamp;

  for (const e of events) {
    typeSet.add(e.type);
    if (e.type === "pick_view") pickViewCount++;
    if (e.timestamp < minTs) minTs = e.timestamp;
    if (e.timestamp > maxTs) maxTs = e.timestamp;
  }

  const uniqueEventTypes = typeSet.size;
  const durationMs = maxTs - minTs;

  const base = Math.min(totalEvents * 5, 40);
  const variety = uniqueEventTypes * 8;
  const duration = Math.min((durationMs / 60000) * 5, 20);
  const pick = Math.min(pickViewCount * 4, 12);
  const engagementScore = Math.min(100, base + variety + duration + pick);

  return {
    totalEvents,
    uniqueEventTypes,
    durationMs,
    engagementScore,
    pickViewCount,
    isHighValue: engagementScore >= 70,
  };
}

/**
 * Fraction of cohort users still "active" at weekNumber weeks after joining.
 * Active = lastActiveAt >= joinedAt + weekNumber * 7 * 86400000.
 * Week 0 checks whether lastActiveAt >= joinedAt (always true if data is clean).
 */
export function cohortRetentionRate(
  cohort: readonly { joinedAt: number; lastActiveAt: number }[],
  weekNumber: number,
): number {
  if (cohort.length === 0) return 0;
  const threshold = weekNumber * 7 * 86400000;
  const active = cohort.filter((u) => u.lastActiveAt >= u.joinedAt + threshold).length;
  return active / cohort.length;
}

/**
 * Build a retention matrix for multiple cohorts.
 * Week 0 is always 1.0 by definition.
 */
export function buildCohortRetention(
  cohorts: readonly {
    label: string;
    users: readonly { joinedAt: number; lastActiveAt: number }[];
  }[],
  maxWeeks = 12,
): CohortRetention[] {
  return cohorts.map((cohort) => {
    const retentionByWeek: number[] = [];
    for (let w = 0; w <= maxWeeks; w++) {
      retentionByWeek.push(w === 0 ? 1.0 : cohortRetentionRate(cohort.users, w));
    }
    return {
      cohortLabel: cohort.label,
      size: cohort.users.length,
      retentionByWeek,
    };
  });
}

/**
 * Compute churn risk signals from visit/activity data.
 *
 * dayScore: linear interpolation
 *   0 days → 0, 7 → 20, 14 → 40, 30 → 70, 60 → 100
 * dropScore: recentActivityDrop * 30
 * riskScore: min(100, dayScore + dropScore)
 */
export function churnRisk(signals: {
  daysSinceLastVisit: number;
  priorPeriodVisits: number;
  recentVisits: number;
}): ChurnSignals {
  const { daysSinceLastVisit, priorPeriodVisits, recentVisits } = signals;

  const recentActivityDrop = Math.max(
    0,
    1 - recentVisits / (priorPeriodVisits + 0.01),
  );

  // Piecewise linear interpolation for dayScore
  let dayScore: number;
  const d = daysSinceLastVisit;
  if (d <= 0) {
    dayScore = 0;
  } else if (d <= 7) {
    dayScore = (d / 7) * 20;
  } else if (d <= 14) {
    dayScore = 20 + ((d - 7) / 7) * 20;
  } else if (d <= 30) {
    dayScore = 40 + ((d - 14) / 16) * 30;
  } else if (d <= 60) {
    dayScore = 70 + ((d - 30) / 30) * 30;
  } else {
    dayScore = 100;
  }

  const dropScore = recentActivityDrop * 30;
  const riskScore = Math.min(100, dayScore + dropScore);

  let churnRiskLevel: "low" | "medium" | "high" | "critical";
  if (riskScore < 25) {
    churnRiskLevel = "low";
  } else if (riskScore < 50) {
    churnRiskLevel = "medium";
  } else if (riskScore < 75) {
    churnRiskLevel = "high";
  } else {
    churnRiskLevel = "critical";
  }

  return {
    daysSinceLastVisit,
    recentActivityDrop,
    churnRisk: churnRiskLevel,
    riskScore,
  };
}

/**
 * Lifetime value: monthlyRevenue / churnRateMonthly.
 * Returns Infinity if churnRateMonthly === 0.
 * Returns 0 if monthlyRevenue === 0.
 */
export function lifetimeValue(
  monthlyRevenue: number,
  churnRateMonthly: number,
): number {
  if (monthlyRevenue === 0) return 0;
  if (churnRateMonthly === 0) return Infinity;
  return monthlyRevenue / churnRateMonthly;
}

/**
 * Payback period in months: CAC / monthlyRevenue.
 * Returns Infinity if monthlyRevenue === 0.
 */
export function paybackPeriod(cac: number, monthlyRevenue: number): number {
  if (monthlyRevenue === 0) return Infinity;
  return cac / monthlyRevenue;
}

/**
 * MRR growth rate: (current - prev) / prev.
 * Returns NaN if mrrPrev === 0.
 */
export function mrrGrowthRate(mrrPrev: number, mrrCurrent: number): number {
  if (mrrPrev === 0) return NaN;
  return (mrrCurrent - mrrPrev) / mrrPrev;
}

/**
 * Net Revenue Retention:
 * (startMrr + expansion - contraction - churn) / startMrr
 * Returns NaN if startMrr === 0.
 */
export function netRevenueRetention(
  startMrr: number,
  expansionMrr: number,
  contractionMrr: number,
  churnMrr: number,
): number {
  if (startMrr === 0) return NaN;
  return (startMrr + expansionMrr - contractionMrr - churnMrr) / startMrr;
}

/**
 * Engagement trend over weekly scores.
 * Compares avg of last 3 vs avg of first 3.
 * Returns "stable" if < 6 data points.
 */
export function engagementTrend(
  weeklyScores: readonly number[],
): "improving" | "stable" | "declining" {
  if (weeklyScores.length < 6) return "stable";
  const firstThree = weeklyScores.slice(0, 3);
  const lastThree = weeklyScores.slice(-3);
  const avgFirst = firstThree.reduce((a, b) => a + b, 0) / 3;
  const avgLast = lastThree.reduce((a, b) => a + b, 0) / 3;
  if (avgLast - avgFirst > 5) return "improving";
  if (avgFirst - avgLast > 5) return "declining";
  return "stable";
}

/**
 * Pick engagement rate: pickViews / totalPageViews.
 * Returns 0 if totalPageViews === 0.
 */
export function pickEngagementRate(
  pickViews: number,
  totalPageViews: number,
): number {
  if (totalPageViews === 0) return 0;
  return pickViews / totalPageViews;
}

/**
 * Active days rate: activeDays / totalDays, clamped to [0, 1].
 * Returns 0 if totalDays === 0.
 */
export function activeDaysRate(activeDays: number, totalDays: number): number {
  if (totalDays === 0) return 0;
  return Math.min(1, Math.max(0, activeDays / totalDays));
}

/**
 * Feature adoption rate: usersWhoUsedFeature / totalUsers.
 * Returns 0 if totalUsers === 0.
 */
export function featureAdoptionRate(
  usersWhoUsedFeature: number,
  totalUsers: number,
): number {
  if (totalUsers === 0) return 0;
  return usersWhoUsedFeature / totalUsers;
}

/**
 * Average sessions per user: totalSessions / totalUsers.
 * Returns 0 if totalUsers === 0.
 */
export function averageSessionsPerUser(
  totalSessions: number,
  totalUsers: number,
): number {
  if (totalUsers === 0) return 0;
  return totalSessions / totalUsers;
}

/**
 * DAU/MAU ratio.
 * Returns 0 if mau === 0.
 */
export function dailyActiveRate(dau: number, mau: number): number {
  if (mau === 0) return 0;
  return dau / mau;
}

/**
 * Retention delta: absolute change from week1 to week4 (can be negative).
 */
export function retentionDelta(week1: number, week4: number): number {
  return week4 - week1;
}
