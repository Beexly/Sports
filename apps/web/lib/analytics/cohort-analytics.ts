/**
 * Cohort analytics — pure TypeScript, zero npm dependencies.
 *
 * All functions are pure (no side effects, no I/O). Metrics are derived
 * from caller-supplied data only; no figures are fabricated.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CohortRow {
  /** e.g. "2024-01" */
  cohortId: string;
  /** 0 = acquisition period, 1 = period+1, etc. */
  period: number;
  users: number;
  retained: number;
}

export interface CohortMatrix {
  cohortIds: string[];
  periods: number[];
  /** retention[cohortIdx][periodIdx] = retention rate 0–1 */
  retention: number[][];
}

export interface SubscriberEvent {
  userId: string;
  timestamp: Date;
  type: "signup" | "upgrade" | "downgrade" | "churn" | "reactivate" | "purchase";
  tier?: "free" | "pro" | "elite";
  revenue?: number;
}

export interface LTVModel {
  avgMonthlyRevenue: number;
  avgMonthlyChurnRate: number;
  /** annual discount rate; default 0.1 */
  discountRate?: number;
}

export interface UserJourneyStep {
  step: string;
  users: number;
  dropoff: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

/** Median of a sorted or unsorted number array. Returns 0 for empty arrays. */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

/** Mean of an array. Returns 0 for empty arrays. */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ---------------------------------------------------------------------------
// Cohort building
// ---------------------------------------------------------------------------

/**
 * Build a CohortMatrix from a flat list of CohortRows.
 *
 * retention[cohortIdx][periodIdx] = row.retained / row.users for the matching
 * row; 0 if no row exists for that cohort + period combination.
 */
export function buildCohortMatrix(rows: CohortRow[]): CohortMatrix {
  // Collect unique cohort IDs and periods (preserve insertion order then sort)
  const cohortIdSet = new Map<string, number>();
  const periodSet = new Set<number>();

  for (const row of rows) {
    if (!cohortIdSet.has(row.cohortId)) {
      cohortIdSet.set(row.cohortId, cohortIdSet.size);
    }
    periodSet.add(row.period);
  }

  const cohortIds = [...cohortIdSet.keys()];
  const periods = [...periodSet].sort((a, b) => a - b);

  // Build index maps
  const cohortIndex = new Map<string, number>(
    cohortIds.map((id, i) => [id, i])
  );
  const periodIndex = new Map<number, number>(
    periods.map((p, i) => [p, i])
  );

  // Initialise matrix with zeros
  const retention: number[][] = Array.from({ length: cohortIds.length }, () =>
    new Array(periods.length).fill(0)
  );

  for (const row of rows) {
    const ci = cohortIndex.get(row.cohortId);
    const pi = periodIndex.get(row.period);
    if (ci === undefined || pi === undefined) continue;
    retention[ci]![pi] = row.users > 0 ? row.retained / row.users : 0;
  }

  return { cohortIds, periods, retention };
}

/**
 * Return the retention rate for a specific cohort at a given period.
 * Returns 0 if the cohort or period is not found in the matrix.
 */
export function cohortRetentionAt(
  matrix: CohortMatrix,
  cohortId: string,
  period: number
): number {
  const ci = matrix.cohortIds.indexOf(cohortId);
  const pi = matrix.periods.indexOf(period);
  if (ci === -1 || pi === -1) return 0;
  return matrix.retention[ci]?.[pi] ?? 0;
}

/**
 * Mean retention rate across all cohorts for each period.
 * Returns an array aligned with matrix.periods.
 */
export function avgRetentionByPeriod(matrix: CohortMatrix): number[] {
  return matrix.periods.map((_, pi) => {
    const vals = matrix.retention.map((row) => row[pi] ?? 0);
    return mean(vals);
  });
}

/**
 * Cohort ID with the highest retention at the given period.
 * Returns "" if the matrix has no cohorts.
 */
export function bestCohort(matrix: CohortMatrix, atPeriod: number): string {
  if (matrix.cohortIds.length === 0) return "";
  const pi = matrix.periods.indexOf(atPeriod);
  if (pi === -1) return "";

  let best = matrix.cohortIds[0]!;
  let bestRate = matrix.retention[0]![pi]!;

  for (let i = 1; i < matrix.cohortIds.length; i++) {
    const rate = matrix.retention[i]![pi]!;
    if (rate > bestRate) {
      bestRate = rate;
      best = matrix.cohortIds[i]!;
    }
  }
  return best;
}

/**
 * Cohort ID with the lowest retention at the given period.
 * Returns "" if the matrix has no cohorts.
 */
export function worstCohort(matrix: CohortMatrix, atPeriod: number): string {
  if (matrix.cohortIds.length === 0) return "";
  const pi = matrix.periods.indexOf(atPeriod);
  if (pi === -1) return "";

  let worst = matrix.cohortIds[0]!;
  let worstRate = matrix.retention[0]![pi]!;

  for (let i = 1; i < matrix.cohortIds.length; i++) {
    const rate = matrix.retention[i]![pi]!;
    if (rate < worstRate) {
      worstRate = rate;
      worst = matrix.cohortIds[i]!;
    }
  }
  return worst;
}

/**
 * Retention values at a given period, in cohort order, for charting.
 * Returns 0 for any cohort that doesn't have data at this period.
 */
export function retentionTrend(
  matrix: CohortMatrix,
  period: number
): number[] {
  const pi = matrix.periods.indexOf(period);
  if (pi === -1) return matrix.cohortIds.map(() => 0);
  return matrix.retention.map((row) => row[pi] ?? 0);
}

/**
 * Cumulative retention from a per-period retention rate array.
 *
 * cumRetention[0] = 1 (baseline: 100% at period 0)
 * cumRetention[k] = retentionByPeriod[0] * retentionByPeriod[1] * … * retentionByPeriod[k]
 */
export function cumulativeRetention(retentionByPeriod: number[]): number[] {
  const result: number[] = [1];
  let product = 1;
  for (const r of retentionByPeriod) {
    product *= r;
    result.push(product);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Churn and retention
// ---------------------------------------------------------------------------

/** Churn rate = lost / activeStart */
export function churnRate(activeStart: number, lost: number): number {
  if (activeStart === 0) return 0;
  return lost / activeStart;
}

/** Retention rate = 1 - churn */
export function retentionRate(churn: number): number {
  return 1 - churn;
}

/**
 * Convert annual churn to equivalent monthly churn.
 * monthlyChurn = 1 - (1 - annualChurn)^(1/12)
 */
export function monthlyChurnFromAnnual(annualChurn: number): number {
  return 1 - Math.pow(1 - annualChurn, 1 / 12);
}

/**
 * Convert monthly churn to equivalent annual churn.
 * annualChurn = 1 - (1 - monthlyChurn)^12
 */
export function annualChurnFromMonthly(monthlyChurn: number): number {
  return 1 - Math.pow(1 - monthlyChurn, 12);
}

/**
 * Survival curve over time.
 *
 * users[0] = initialUsers
 * users[t] = users[t-1] × (1 - monthlyChurn)
 * Length = months + 1.
 */
export function survivalCurve(
  initialUsers: number,
  monthlyChurn: number,
  months: number
): number[] {
  const curve: number[] = [initialUsers];
  for (let t = 1; t <= months; t++) {
    curve.push(curve[t - 1]! * (1 - monthlyChurn));
  }
  return curve;
}

/**
 * Half-life: months until 50% of the original cohort is still retained.
 * halfLife = -ln(0.5) / (-ln(1 - monthlyChurn))
 */
export function halfLife(monthlyChurn: number): number {
  if (monthlyChurn <= 0) return Infinity;
  if (monthlyChurn >= 1) return 0;
  return -Math.log(0.5) / -Math.log(1 - monthlyChurn);
}

/**
 * Expected lifespan of a subscriber in months.
 * lifespan = 1 / monthlyChurn
 */
export function expectedLifespan(monthlyChurn: number): number {
  if (monthlyChurn <= 0) return Infinity;
  return 1 / monthlyChurn;
}

// ---------------------------------------------------------------------------
// LTV calculations
// ---------------------------------------------------------------------------

/**
 * Basic (infinite-horizon) LTV.
 * LTV = avgRevenue / churnRate
 */
export function basicLTV(avgRevenue: number, churnRate: number): number {
  if (churnRate <= 0) return Infinity;
  return avgRevenue / churnRate;
}

/**
 * Discounted LTV using present-value of future revenue.
 *
 * PV = Σ_{t=1..periods} avgMonthly × (1-churn)^t / (1+monthlyDiscount)^t
 *
 * Default periods = 60 months.
 * discountRate is annual; converted to monthly via (1+annual)^(1/12) - 1.
 */
export function discountedLTV(model: LTVModel, periods = 60): number {
  const { avgMonthlyRevenue, avgMonthlyChurnRate, discountRate = 0.1 } = model;
  const monthlyDiscount = Math.pow(1 + discountRate, 1 / 12) - 1;
  let pv = 0;
  for (let t = 1; t <= periods; t++) {
    const survivalProb = Math.pow(1 - avgMonthlyChurnRate, t);
    const discountFactor = Math.pow(1 + monthlyDiscount, t);
    pv += (avgMonthlyRevenue * survivalProb) / discountFactor;
  }
  return pv;
}

/**
 * LTV per cohort: area under the retention curve × avgRevenue.
 *
 * For each cohort, sums retention rates across periods to approximate the
 * expected number of periods a subscriber stays, then multiplies by avgRevenue.
 *
 * Returns a map of cohortId → estimated LTV.
 */
export function ltvByCohort(
  cohortRows: CohortRow[],
  avgRevenue: number
): Record<string, number> {
  const matrix = buildCohortMatrix(cohortRows);
  const result: Record<string, number> = {};

  for (let ci = 0; ci < matrix.cohortIds.length; ci++) {
    const id = matrix.cohortIds[ci]!;
    // Area under retention curve = sum of retention rates across all periods
    const area = matrix.retention[ci]!.reduce((s, v) => s + v, 0);
    result[id] = area * avgRevenue;
  }

  return result;
}

/**
 * Months to recover CAC.
 *
 * Simulates cumulative revenue (revenue × survival fraction each month).
 * Returns the first month where cumulative >= CAC, capped at 120 if never
 * reached.
 */
export function paybackPeriod(
  cacPerUser: number,
  avgMonthlyRevenue: number,
  monthlyChurnRate: number
): number {
  if (avgMonthlyRevenue <= 0) return 120;
  let cumulative = 0;
  let retained = 1; // fraction
  for (let m = 1; m <= 120; m++) {
    cumulative += avgMonthlyRevenue * retained;
    if (cumulative >= cacPerUser) return m;
    retained *= 1 - monthlyChurnRate;
  }
  return 120;
}

/** LTV/CAC ratio */
export function ltvCacRatio(ltv: number, cac: number): number {
  if (cac === 0) return Infinity;
  return ltv / cac;
}

/**
 * Realized revenue per user, grouped by the tier at their last event.
 *
 * Sums the `revenue` field from all events per user, then groups them by
 * the `tier` on their last-timestamp event.
 *
 * Returns a map of tier → total realized revenue across all users in that tier.
 */
export function ltvByTier(
  events: SubscriberEvent[],
  avgRevenue: Record<"free" | "pro" | "elite", number>
): Record<string, number> {
  // Build per-user: total revenue and last-seen tier
  const userRevenue = new Map<string, number>();
  const userLastEvent = new Map<string, SubscriberEvent>();

  for (const evt of events) {
    const prev = userRevenue.get(evt.userId) ?? 0;
    userRevenue.set(evt.userId, prev + (evt.revenue ?? 0));

    const last = userLastEvent.get(evt.userId);
    if (last === undefined || evt.timestamp >= last.timestamp) {
      userLastEvent.set(evt.userId, evt);
    }
  }

  // Group by tier; fall back to avgRevenue when no revenue recorded
  const result: Record<string, number> = { free: 0, pro: 0, elite: 0 };

  for (const [userId, lastEvt] of userLastEvent) {
    const tier = lastEvt.tier ?? "free";
    const realized = userRevenue.get(userId) ?? 0;
    // Use realized revenue if available, otherwise avgRevenue lookup
    const effective = realized > 0 ? realized : avgRevenue[tier as "free" | "pro" | "elite"];
    result[tier] = (result[tier] ?? 0) + effective;
  }

  return result;
}

// ---------------------------------------------------------------------------
// MRR analytics
// ---------------------------------------------------------------------------

/** Total MRR across all subscriber tiers. */
export function mrr(
  activeSubscribers: { count: number; monthlyRevenue: number }[]
): number {
  return activeSubscribers.reduce((s, t) => s + t.count * t.monthlyRevenue, 0);
}

/** New MRR from new subscribers. */
export function newMRR(newSubscribers: number, avgRevenue: number): number {
  return newSubscribers * avgRevenue;
}

/** Expansion MRR from upgrades: sum of (toRevenue - fromRevenue). */
export function expansionMRR(
  upgrades: { fromRevenue: number; toRevenue: number }[]
): number {
  return upgrades.reduce((s, u) => s + (u.toRevenue - u.fromRevenue), 0);
}

/** Contraction MRR from downgrades: sum of (fromRevenue - toRevenue). */
export function contractionMRR(
  downgrades: { fromRevenue: number; toRevenue: number }[]
): number {
  return downgrades.reduce((s, d) => s + (d.fromRevenue - d.toRevenue), 0);
}

/** Churned MRR: sum of monthly revenue for churned subscribers. */
export function churnedMRR(churned: { monthlyRevenue: number }[]): number {
  return churned.reduce((s, c) => s + c.monthlyRevenue, 0);
}

/**
 * Net MRR growth = new + expansion - contraction - churned.
 */
export function netMRRGrowth(
  newMrr: number,
  expansion: number,
  contraction: number,
  churned: number
): number {
  return newMrr + expansion - contraction - churned;
}

/**
 * MRR growth rate = (current - previous) / previous.
 * Returns 0 if previous is 0.
 */
export function mrrGrowthRate(
  currentMrr: number,
  previousMrr: number
): number {
  if (previousMrr === 0) return 0;
  return (currentMrr - previousMrr) / previousMrr;
}

/** Annual Run Rate = MRR × 12. */
export function annualRunRate(mrrValue: number): number {
  return mrrValue * 12;
}

// ---------------------------------------------------------------------------
// Subscription funnel
// ---------------------------------------------------------------------------

/**
 * Build an ordered user journey from events.
 *
 * Steps (in order):
 *   signup → free_active → upgrade_attempt → pro_subscriber → elite_subscriber
 *
 * Users are counted at each step based on event presence. Dropoff is the
 * number of users who did not proceed to the next step.
 */
export function buildJourney(events: SubscriberEvent[]): UserJourneyStep[] {
  const signupUsers = new Set<string>();
  const freeActiveUsers = new Set<string>();
  const upgradeAttemptUsers = new Set<string>();
  const proUsers = new Set<string>();
  const eliteUsers = new Set<string>();

  for (const evt of events) {
    if (evt.type === "signup") {
      signupUsers.add(evt.userId);
    }
    if (evt.tier === "free" || evt.type === "signup") {
      freeActiveUsers.add(evt.userId);
    }
    if (evt.type === "upgrade") {
      upgradeAttemptUsers.add(evt.userId);
    }
    if (evt.type === "upgrade" && evt.tier === "pro") {
      proUsers.add(evt.userId);
    }
    if (evt.type === "upgrade" && evt.tier === "elite") {
      eliteUsers.add(evt.userId);
    }
  }

  // Users who reached elite also count as pro (if they went through upgrade)
  for (const uid of eliteUsers) {
    proUsers.add(uid);
  }

  const stepCounts = [
    signupUsers.size,
    freeActiveUsers.size,
    upgradeAttemptUsers.size,
    proUsers.size,
    eliteUsers.size,
  ];

  const stepNames = [
    "signup",
    "free_active",
    "upgrade_attempt",
    "pro_subscriber",
    "elite_subscriber",
  ];

  return stepNames.map((step, i) => {
    const users = stepCounts[i]!;
    const nextUsers = i < stepCounts.length - 1 ? stepCounts[i + 1]! : users;
    const dropoff = Math.max(0, users - nextUsers);
    return { step, users, dropoff };
  });
}

/**
 * Fraction of users who signed up and later upgraded to pro.
 */
export function signupToProConversion(events: SubscriberEvent[]): number {
  const signups = new Set<string>();
  const pros = new Set<string>();

  for (const evt of events) {
    if (evt.type === "signup") signups.add(evt.userId);
    if (evt.type === "upgrade" && (evt.tier === "pro" || evt.tier === "elite")) {
      pros.add(evt.userId);
    }
  }

  if (signups.size === 0) return 0;
  const converted = [...pros].filter((uid) => signups.has(uid)).length;
  return converted / signups.size;
}

/**
 * Fraction of pro users who later reached elite.
 */
export function proToEliteConversion(events: SubscriberEvent[]): number {
  const proUsers = new Set<string>();
  const eliteUsers = new Set<string>();

  for (const evt of events) {
    if (evt.type === "upgrade" && (evt.tier === "pro" || evt.tier === "elite")) {
      proUsers.add(evt.userId);
    }
    if (evt.type === "upgrade" && evt.tier === "elite") {
      eliteUsers.add(evt.userId);
    }
  }

  if (proUsers.size === 0) return 0;
  const converted = [...eliteUsers].filter((uid) => proUsers.has(uid)).length;
  return converted / proUsers.size;
}

/**
 * Median days from a fromType event to a toType event, per user.
 * Only includes users who experienced both event types.
 */
export function timeToConvert(
  events: SubscriberEvent[],
  fromType: string,
  toType: string
): number {
  // Collect earliest fromType timestamp per user
  const fromTime = new Map<string, Date>();
  const toTime = new Map<string, Date>();

  for (const evt of events) {
    if (evt.type === fromType) {
      const existing = fromTime.get(evt.userId);
      if (!existing || evt.timestamp < existing) {
        fromTime.set(evt.userId, evt.timestamp);
      }
    }
    if (evt.type === toType) {
      const existing = toTime.get(evt.userId);
      if (!existing || evt.timestamp < existing) {
        toTime.set(evt.userId, evt.timestamp);
      }
    }
  }

  const diffs: number[] = [];
  for (const [userId, from] of fromTime) {
    const to = toTime.get(userId);
    if (to && to > from) {
      diffs.push((to.getTime() - from.getTime()) / MS_PER_DAY);
    }
  }

  return median(diffs);
}

/**
 * Dropoff rate at each step transition.
 * dropoff[i] = steps[i].dropoff / steps[i].users
 */
export function conversionFunnelDropoff(steps: UserJourneyStep[]): number[] {
  return steps.map((s) => (s.users === 0 ? 0 : s.dropoff / s.users));
}

// ---------------------------------------------------------------------------
// Segmentation
// ---------------------------------------------------------------------------

/**
 * Segment users by days since their signup event:
 *   new      ≤ 30 days
 *   growing  31–90 days
 *   mature   91–365 days
 *   at_risk  > 365 days AND has a recent churn or downgrade event
 *
 * Users who don't fit at_risk criteria but are >365 days are still in mature.
 */
export function segmentByTenure(
  events: SubscriberEvent[],
  now: Date
): { new: string[]; growing: string[]; mature: string[]; at_risk: string[] } {
  // Earliest signup per user
  const signupDate = new Map<string, Date>();
  const recentNegative = new Set<string>();

  for (const evt of events) {
    if (evt.type === "signup") {
      const existing = signupDate.get(evt.userId);
      if (!existing || evt.timestamp < existing) {
        signupDate.set(evt.userId, evt.timestamp);
      }
    }
    if (evt.type === "churn" || evt.type === "downgrade") {
      recentNegative.add(evt.userId);
    }
  }

  const segments = {
    new: [] as string[],
    growing: [] as string[],
    mature: [] as string[],
    at_risk: [] as string[],
  };

  for (const [userId, signup] of signupDate) {
    const daysSince = (now.getTime() - signup.getTime()) / MS_PER_DAY;
    if (daysSince <= 30) {
      segments.new.push(userId);
    } else if (daysSince <= 90) {
      segments.growing.push(userId);
    } else if (daysSince <= 365) {
      segments.mature.push(userId);
    } else {
      // > 365 days
      if (recentNegative.has(userId)) {
        segments.at_risk.push(userId);
      } else {
        segments.mature.push(userId);
      }
    }
  }

  return segments;
}

/**
 * Users whose total realized revenue (sum of event.revenue) meets or exceeds
 * the given threshold. Default threshold: 200.
 */
export function highValueUsers(
  events: SubscriberEvent[],
  revenueThreshold = 200
): string[] {
  const userRevenue = new Map<string, number>();

  for (const evt of events) {
    if (evt.revenue !== undefined) {
      userRevenue.set(evt.userId, (userRevenue.get(evt.userId) ?? 0) + evt.revenue);
    }
  }

  return [...userRevenue.entries()]
    .filter(([, rev]) => rev >= revenueThreshold)
    .map(([uid]) => uid);
}

/**
 * Users whose last event was more than inactiveDays ago.
 * Default: 60 days.
 */
export function atRiskUsers(
  events: SubscriberEvent[],
  inactiveDays = 60
): string[] {
  const lastEventDate = new Map<string, Date>();

  for (const evt of events) {
    const existing = lastEventDate.get(evt.userId);
    if (!existing || evt.timestamp > existing) {
      lastEventDate.set(evt.userId, evt.timestamp);
    }
  }

  const cutoff = new Date(Date.now() - inactiveDays * MS_PER_DAY);

  return [...lastEventDate.entries()]
    .filter(([, last]) => last < cutoff)
    .map(([uid]) => uid);
}

/**
 * Reactivation rate = reactivated / churned.
 */
export function reactivationRate(
  reactivated: number,
  churned: number
): number {
  if (churned === 0) return 0;
  return reactivated / churned;
}
