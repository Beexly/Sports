/**
 * Cohort LTV and retention analytics — pure TypeScript, zero dependencies.
 *
 * All analytics are descriptive only; no subscriber counts, revenue, or
 * engagement figures are fabricated. Every function operates on caller-supplied
 * data and returns derived metrics.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BillingInterval = "monthly" | "annual" | "weekly" | "one-time";

export interface SubscriptionRecord {
  userId: string;
  tier: "free" | "pro" | "elite" | "apex";
  billingInterval: BillingInterval;
  startDate: Date;
  endDate?: Date; // undefined = currently active
  mrr: number; // monthly recurring revenue in cents
  acquisitionChannel?: string;
  cohortMonth: string; // "YYYY-MM"
}

export interface CohortMetrics {
  cohortMonth: string;
  startingUsers: number;
  monthlyRetention: number[]; // index 0 = month 0 (100%), index 1 = % still active in month 1, etc.
  cumulativeRevenue: number[]; // cumulative revenue per user by month (cents)
  ltv: number; // projected LTV (cents)
  avgMrr: number; // average MRR of starting users
  churned: number[]; // users who churned each month
  churnRate: number[]; // churnRate[i] = churned[i] / active[i-1]
}

export interface LtvProjection {
  userId: string;
  currentMrr: number;
  monthsActive: number;
  projectedMonths: number; // additional months projected
  projectedLtv: number; // total revenue including already paid (cents)
  alreadyPaid: number; // revenue already collected (cents)
  remainingValue: number; // projectedLtv - alreadyPaid (cents)
  churnRisk: number; // 0-1
  tier: string;
}

export interface SegmentComparison {
  segmentA: string;
  segmentB: string;
  avgLtvA: number;
  avgLtvB: number;
  retentionDiffMonth3: number; // retention % diff at month 3 (A - B)
  retentionDiffMonth6: number;
  winnerByLtv: "A" | "B" | "tie";
}

export interface PaybackPeriod {
  cac: number; // customer acquisition cost (cents)
  avgMrr: number;
  paybackMonths: number; // CAC / avgMrr; rounds up
  isViable: boolean; // paybackMonths <= 12
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;
const MS_PER_MONTH = 30.44 * MS_PER_DAY; // average month in ms

/** Parse a "YYYY-MM" string into the Date at the start of that month (UTC). */
function parseYearMonth(ym: string): Date {
  const [year, month] = ym.split("-").map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, 1));
}

/** Return the "YYYY-MM" string for a given Date (UTC). */
function toYearMonth(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Add N whole calendar months to a Date (UTC).
 * Day-of-month is preserved where possible; otherwise clamped to end-of-month.
 */
function addMonths(d: Date, n: number): Date {
  const result = new Date(d);
  result.setUTCMonth(result.getUTCMonth() + n);
  return result;
}

/**
 * Return the number of whole months between two dates.
 * Fractional months are truncated.
 */
function monthsBetween(earlier: Date, later: Date): number {
  const diffMs = later.getTime() - earlier.getTime();
  return Math.floor(diffMs / MS_PER_MONTH);
}

/**
 * True if a subscription was active during month N relative to its own
 * startDate (month 0 = the start month).
 *
 * A user is active in month N if their endDate is undefined (still active)
 * OR endDate >= startDate + N months.
 */
function isActiveInMonth(record: SubscriptionRecord, n: number): boolean {
  if (record.endDate === undefined) return true;
  const threshold = addMonths(record.startDate, n);
  return record.endDate >= threshold;
}

/**
 * True if a subscription was active during a specific calendar month given by
 * a "YYYY-MM" string.
 *
 * Active means: started before end of the month AND (no endDate OR endDate
 * after start of the month).
 */
function isActiveInCalendarMonth(
  record: SubscriptionRecord,
  monthStr: string
): boolean {
  const monthStart = parseYearMonth(monthStr);
  // End of month = start of next month
  const nextMonthStr = toYearMonth(
    new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1))
  );
  const monthEnd = parseYearMonth(nextMonthStr);

  // Started before end of this month
  if (record.startDate >= monthEnd) return false;

  // No endDate means still active
  if (record.endDate === undefined) return true;

  // endDate is after start of this month
  return record.endDate > monthStart;
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Build cohort metrics for a given cohort month.
 *
 * Filters subscriptions to those whose cohortMonth matches, then tracks
 * retention, churn, and revenue across up to maxMonths months.
 */
export function buildCohortMetrics(
  subscriptions: SubscriptionRecord[],
  cohortMonth: string,
  maxMonths = 12
): CohortMetrics {
  const cohort = subscriptions.filter((s) => s.cohortMonth === cohortMonth);
  const startingUsers = cohort.length;

  if (startingUsers === 0) {
    return {
      cohortMonth,
      startingUsers: 0,
      monthlyRetention: [100],
      cumulativeRevenue: [0],
      ltv: 0,
      avgMrr: 0,
      churned: [0],
      churnRate: [0],
    };
  }

  const monthlyRetention: number[] = [];
  const cumulativeRevenue: number[] = [];
  const churned: number[] = [];
  const churnRate: number[] = [];

  // Track how many months each user has been active (for cumulative revenue)
  // We accumulate revenue per user across months

  for (let n = 0; n <= maxMonths; n++) {
    const activeCount = cohort.filter((s) => isActiveInMonth(s, n)).length;
    const retentionPct = (activeCount / startingUsers) * 100;
    monthlyRetention.push(retentionPct);

    // Cumulative revenue per user up to month n:
    // sum across all users of (mrr * months_they_were_active up to n) / startingUsers
    let totalRevenueForCohort = 0;
    for (const user of cohort) {
      // Count how many months [0..n] this user was active
      let monthsActive = 0;
      for (let k = 0; k <= n; k++) {
        if (isActiveInMonth(user, k)) monthsActive++;
      }
      totalRevenueForCohort += (user.mrr * monthsActive) / 100;
    }
    cumulativeRevenue.push(Math.round(totalRevenueForCohort / startingUsers));

    // Churned this month
    if (n === 0) {
      churned.push(0);
      churnRate.push(0);
    } else {
      const prevActive = cohort.filter((s) => isActiveInMonth(s, n - 1)).length;
      const churnedThisMonth = prevActive - activeCount;
      churned.push(churnedThisMonth < 0 ? 0 : churnedThisMonth);
      churnRate.push(
        prevActive === 0 ? 0 : (churnedThisMonth < 0 ? 0 : churnedThisMonth) / prevActive
      );
    }
  }

  const avgMrr =
    startingUsers === 0
      ? 0
      : cohort.reduce((s, r) => s + r.mrr, 0) / startingUsers;

  // LTV projection: ltv = avgMrr * (1 / avgChurnRate)
  // avgChurnRate = mean of churnRate[1..]
  const churnRateSlice = churnRate.slice(1).filter((r) => r > 0);
  let projectedLtv: number;
  if (churnRateSlice.length === 0) {
    projectedLtv = avgMrr * 24; // fallback: 24 months
  } else {
    const avgChurnRate =
      churnRateSlice.reduce((s, r) => s + r, 0) / churnRateSlice.length;
    projectedLtv = avgChurnRate === 0 ? avgMrr * 24 : avgMrr / avgChurnRate;
  }

  return {
    cohortMonth,
    startingUsers,
    monthlyRetention,
    cumulativeRevenue,
    ltv: Math.round(projectedLtv),
    avgMrr: Math.round(avgMrr),
    churned,
    churnRate,
  };
}

/**
 * Compare multiple cohorts.
 * Builds CohortMetrics for each cohort month and returns them in order.
 */
export function compareCohorts(
  subscriptions: SubscriptionRecord[],
  cohortMonths: string[],
  maxMonths?: number
): CohortMetrics[] {
  return cohortMonths.map((m) =>
    buildCohortMetrics(subscriptions, m, maxMonths)
  );
}

/**
 * Lifetime value projection for an individual user.
 */
export function projectUserLtv(
  record: SubscriptionRecord,
  cohortChurnRate = 0.05,
  maxMonths = 24
): LtvProjection {
  const now = new Date();
  const endOrNow = record.endDate ?? now;

  // monthsActive = months from startDate to now (or endDate if churned)
  const monthsActive = Math.max(0, monthsBetween(record.startDate, endOrNow));

  // alreadyPaid = mrr * months active
  const alreadyPaid = record.mrr * monthsActive;

  // churnRisk: 0 if still active; min(1, daysSinceLastPayment / 90) if endDate set
  let churnRisk = 0;
  if (record.endDate !== undefined) {
    const daysSince =
      (now.getTime() - record.endDate.getTime()) / MS_PER_DAY;
    churnRisk = Math.min(1, daysSince / 90);
  }

  // projectedMonths: geometric series of survival probability
  // sum_{k=1}^{maxMonths} (1-churnRate)^k
  const survivalRate = 1 - cohortChurnRate;
  let remainingSurvivalMonths = 0;
  if (survivalRate < 1) {
    for (let k = 1; k <= maxMonths; k++) {
      remainingSurvivalMonths += Math.pow(survivalRate, k);
    }
  } else {
    // churnRate = 0: expect all maxMonths remaining
    remainingSurvivalMonths = maxMonths;
  }
  const projectedMonths = Math.round(remainingSurvivalMonths * 100) / 100;

  // projectedLtv = alreadyPaid + mrr * remaining survival months
  const projectedLtv = alreadyPaid + record.mrr * remainingSurvivalMonths;
  const remainingValue = projectedLtv - alreadyPaid;

  return {
    userId: record.userId,
    currentMrr: record.mrr,
    monthsActive,
    projectedMonths,
    projectedLtv: Math.round(projectedLtv),
    alreadyPaid: Math.round(alreadyPaid),
    remainingValue: Math.round(remainingValue),
    churnRisk,
    tier: record.tier,
  };
}

/**
 * Net Revenue Retention for a cohort between cohortStart and targetMonth.
 *
 * NRR = revenueAtTargetMonth / revenueAtCohortStart
 * Returns 0 if no revenue at cohort start.
 */
export function nrr(
  subscriptions: SubscriptionRecord[],
  cohortMonth: string,
  targetMonth: string
): number {
  const cohort = subscriptions.filter((s) => s.cohortMonth === cohortMonth);

  const startRevenue = cohort
    .filter((s) => isActiveInCalendarMonth(s, cohortMonth))
    .reduce((sum, s) => sum + s.mrr, 0);

  if (startRevenue === 0) return 0;

  const targetRevenue = cohort
    .filter((s) => isActiveInCalendarMonth(s, targetMonth))
    .reduce((sum, s) => sum + s.mrr, 0);

  return targetRevenue / startRevenue;
}

/**
 * Compare LTV and retention between two segments (by tier or channel).
 */
export function compareSegments(
  subscriptions: SubscriptionRecord[],
  segmentAKey: string,
  segmentBKey: string,
  segmentField: "tier" | "acquisitionChannel"
): SegmentComparison {
  const segA = subscriptions.filter((s) => s[segmentField] === segmentAKey);
  const segB = subscriptions.filter((s) => s[segmentField] === segmentBKey);

  // Average LTV per segment using default churn rate
  const avgLtvA =
    segA.length === 0
      ? 0
      : segA.reduce((sum, r) => sum + projectUserLtv(r).projectedLtv, 0) /
        segA.length;

  const avgLtvB =
    segB.length === 0
      ? 0
      : segB.reduce((sum, r) => sum + projectUserLtv(r).projectedLtv, 0) /
        segB.length;

  // Retention at month 3 and month 6
  const retentionAtMonth = (
    seg: SubscriptionRecord[],
    n: number
  ): number => {
    if (seg.length === 0) return 0;
    const active = seg.filter((s) => isActiveInMonth(s, n)).length;
    return (active / seg.length) * 100;
  };

  const retA3 = retentionAtMonth(segA, 3);
  const retB3 = retentionAtMonth(segB, 3);
  const retA6 = retentionAtMonth(segA, 6);
  const retB6 = retentionAtMonth(segB, 6);

  let winnerByLtv: "A" | "B" | "tie";
  if (avgLtvA > avgLtvB) {
    winnerByLtv = "A";
  } else if (avgLtvB > avgLtvA) {
    winnerByLtv = "B";
  } else {
    winnerByLtv = "tie";
  }

  return {
    segmentA: segmentAKey,
    segmentB: segmentBKey,
    avgLtvA: Math.round(avgLtvA),
    avgLtvB: Math.round(avgLtvB),
    retentionDiffMonth3: retA3 - retB3,
    retentionDiffMonth6: retA6 - retB6,
    winnerByLtv,
  };
}

/**
 * Payback period calculation.
 * paybackMonths = Math.ceil(cac / avgMrr)
 * isViable = paybackMonths <= 12
 */
export function paybackPeriod(cac: number, avgMrr: number): PaybackPeriod {
  const paybackMonths = avgMrr <= 0 ? Infinity : Math.ceil(cac / avgMrr);
  return {
    cac,
    avgMrr,
    paybackMonths,
    isViable: paybackMonths <= 12,
  };
}

/**
 * MRR growth rate month over month.
 * growthRate = (mrrAt(month2) - mrrAt(month1)) / mrrAt(month1)
 * Returns 0 if mrrAt(month1) = 0.
 */
export function mrrGrowthRate(
  subscriptions: SubscriptionRecord[],
  month1: string,
  month2: string
): number {
  const mrr1 = mrrAt(subscriptions, month1);
  const mrr2 = mrrAt(subscriptions, month2);
  if (mrr1 === 0) return 0;
  return (mrr2 - mrr1) / mrr1;
}

/**
 * Sum of mrr for users active during the given month.
 * Active: started before end of month AND (no endDate OR endDate after start
 * of month).
 */
export function mrrAt(
  subscriptions: SubscriptionRecord[],
  month: string
): number {
  return subscriptions
    .filter((s) => isActiveInCalendarMonth(s, month))
    .reduce((sum, s) => sum + s.mrr, 0);
}

/**
 * Quick annualized LTV from MRR and monthly churn rate.
 * LTV = mrr / monthlyChurnRate; returns Infinity if churnRate = 0.
 */
export function ltv(mrr: number, monthlyChurnRate: number): number {
  if (monthlyChurnRate === 0) return Infinity;
  return mrr / monthlyChurnRate;
}

/**
 * Cohort revenue heatmap data.
 * For each cohort, computes monthly revenue per user and retention.
 */
export function cohortRevenueHeatmap(
  subscriptions: SubscriptionRecord[],
  cohortMonths: string[],
  maxMonths = 6
): Array<{
  cohortMonth: string;
  revenueByMonth: number[];
  retentionByMonth: number[];
}> {
  return cohortMonths.map((cm) => {
    const cohort = subscriptions.filter((s) => s.cohortMonth === cm);
    const startingUsers = cohort.length;

    const revenueByMonth: number[] = [];
    const retentionByMonth: number[] = [];

    for (let n = 0; n <= maxMonths; n++) {
      const activeInMonth = cohort.filter((s) => isActiveInMonth(s, n));
      const monthRevenue =
        startingUsers === 0
          ? 0
          : activeInMonth.reduce((s, r) => s + r.mrr, 0) / startingUsers;
      revenueByMonth.push(Math.round(monthRevenue));

      const retentionPct =
        startingUsers === 0
          ? 0
          : (activeInMonth.length / startingUsers) * 100;
      retentionByMonth.push(retentionPct);
    }

    return { cohortMonth: cm, revenueByMonth, retentionByMonth };
  });
}

/**
 * Expansion MRR within a cohort.
 * Detects users with two records in the same cohort where second mrr > first.
 * expansionRevenue = sum of (new mrr - old mrr) for those users.
 */
export function expansionMrr(
  subscriptions: SubscriptionRecord[],
  cohortMonth: string
): { upgrades: number; expansionRevenue: number } {
  const cohort = subscriptions.filter((s) => s.cohortMonth === cohortMonth);

  // Group by userId
  const byUser = new Map<string, SubscriptionRecord[]>();
  for (const rec of cohort) {
    const existing = byUser.get(rec.userId) ?? [];
    existing.push(rec);
    byUser.set(rec.userId, existing);
  }

  let upgrades = 0;
  let expansionRevenue = 0;

  for (const records of byUser.values()) {
    if (records.length < 2) continue;
    // Sort by startDate ascending
    const sorted = [...records].sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime()
    );
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    if (last.mrr > first.mrr) {
      upgrades++;
      expansionRevenue += last.mrr - first.mrr;
    }
  }

  return { upgrades, expansionRevenue };
}

/**
 * Peak churn months: which months have the highest churn.
 * Groups ended subscriptions by the month of endDate.
 * Returns top N months by churnedUsers.
 */
export function peakChurnMonths(
  subscriptions: SubscriptionRecord[],
  n = 3
): Array<{ month: string; churnedUsers: number; churnRate: number }> {
  // Count active users per month (for churn rate denominator)
  const activeByMonth = new Map<string, number>();
  const churnedByMonth = new Map<string, number>();

  for (const rec of subscriptions) {
    if (rec.endDate !== undefined) {
      const cm = toYearMonth(rec.endDate);
      churnedByMonth.set(cm, (churnedByMonth.get(cm) ?? 0) + 1);
    }
  }

  // For each churn month, estimate prior month active count
  for (const [churnMonth] of churnedByMonth) {
    const d = parseYearMonth(churnMonth);
    // prior month
    const priorDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
    const priorMonth = toYearMonth(priorDate);
    const priorActive = subscriptions.filter((s) =>
      isActiveInCalendarMonth(s, priorMonth)
    ).length;
    activeByMonth.set(churnMonth, priorActive);
  }

  const results = Array.from(churnedByMonth.entries()).map(
    ([month, churnedUsers]) => {
      const priorActive = activeByMonth.get(month) ?? 0;
      const rate = priorActive === 0 ? 0 : churnedUsers / priorActive;
      return { month, churnedUsers, churnRate: rate };
    }
  );

  results.sort((a, b) => b.churnedUsers - a.churnedUsers);
  return results.slice(0, n);
}

/**
 * Conversion funnel: free → paid.
 * Counts users who started as 'free' and later got a paid record within
 * withinDays days of their free start.
 * Rate = converted / total_free_starts.
 */
export function freeToProConversionRate(
  subscriptions: SubscriptionRecord[],
  withinDays = 30
): number {
  const freeStarts = subscriptions.filter((s) => s.tier === "free");
  if (freeStarts.length === 0) return 0;

  const paidTiers = new Set(["pro", "elite", "apex"]);

  let converted = 0;
  for (const free of freeStarts) {
    const cutoff = new Date(
      free.startDate.getTime() + withinDays * MS_PER_DAY
    );
    const didConvert = subscriptions.some(
      (s) =>
        s.userId === free.userId &&
        paidTiers.has(s.tier) &&
        s.startDate > free.startDate &&
        s.startDate <= cutoff
    );
    if (didConvert) converted++;
  }

  return converted / freeStarts.length;
}

/**
 * Tier distribution by cohort.
 * For each tier, count active users in the cohort at month 0.
 * Returns e.g. { free: 50, pro: 30, elite: 20 }.
 */
export function tierDistributionByCohort(
  subscriptions: SubscriptionRecord[],
  cohortMonth: string
): Record<string, number> {
  const cohort = subscriptions.filter((s) => s.cohortMonth === cohortMonth);
  const dist: Record<string, number> = {};

  for (const rec of cohort) {
    if (isActiveInMonth(rec, 0)) {
      dist[rec.tier] = (dist[rec.tier] ?? 0) + 1;
    }
  }

  return dist;
}

/**
 * Average months to first upgrade.
 * For users who have both a 'free' record and a paid record, compute months
 * between startDates. Returns mean; null if no upgrades found.
 */
export function avgMonthsToUpgrade(
  subscriptions: SubscriptionRecord[]
): number | null {
  const freeByUser = new Map<string, Date>();
  const paidByUser = new Map<string, Date>();
  const paidTiers = new Set(["pro", "elite", "apex"]);

  for (const rec of subscriptions) {
    if (rec.tier === "free") {
      const existing = freeByUser.get(rec.userId);
      if (existing === undefined || rec.startDate < existing) {
        freeByUser.set(rec.userId, rec.startDate);
      }
    } else if (paidTiers.has(rec.tier)) {
      const existing = paidByUser.get(rec.userId);
      if (existing === undefined || rec.startDate < existing) {
        paidByUser.set(rec.userId, rec.startDate);
      }
    }
  }

  const diffs: number[] = [];
  for (const [userId, freeStart] of freeByUser) {
    const paidStart = paidByUser.get(userId);
    if (paidStart !== undefined && paidStart > freeStart) {
      const months = monthsBetween(freeStart, paidStart);
      diffs.push(months);
    }
  }

  if (diffs.length === 0) return null;
  return diffs.reduce((s, v) => s + v, 0) / diffs.length;
}
