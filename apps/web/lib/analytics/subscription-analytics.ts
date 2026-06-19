/**
 * Subscription analytics utilities — pure, zero dependencies.
 *
 * Subscription event analysis, cohort tracking, churn signal detection,
 * revenue metrics, and trial conversion analytics. All functions are
 * pure analytics only — no writes, no fabricated data.
 */

export type SubscriptionTier = "free" | "pro" | "elite";
export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "trialing"
  | "paused";
export type SubscriptionEvent =
  | "started"
  | "upgraded"
  | "downgraded"
  | "canceled"
  | "reactivated"
  | "trial_started"
  | "trial_converted"
  | "trial_expired"
  | "payment_failed"
  | "payment_recovered";

export interface SubscriptionRecord {
  readonly userId: string;
  readonly tier: SubscriptionTier;
  readonly status: SubscriptionStatus;
  readonly startedAt: number; // ms timestamp
  readonly canceledAt?: number;
  readonly trialEndsAt?: number;
  readonly mrr: number; // monthly recurring revenue in cents
}

export interface SubscriptionEventRecord {
  readonly userId: string;
  readonly event: SubscriptionEvent;
  readonly timestamp: number;
  readonly fromTier?: SubscriptionTier;
  readonly toTier?: SubscriptionTier;
  readonly mrr?: number;
}

export interface RevenueMetrics {
  readonly totalMrr: number; // cents
  readonly newMrr: number; // from new subscribers
  readonly expansionMrr: number; // from upgrades
  readonly contractionMrr: number; // from downgrades
  readonly churnMrr: number; // from cancellations
  readonly netNewMrr: number; // new + expansion - contraction - churn
  readonly nrr: number; // net revenue retention (ratio)
}

const MS_PER_DAY = 86_400_000;

/**
 * Returns true if the subscription is in a revenue-generating or trialing state.
 */
function isActiveSub(sub: SubscriptionRecord): boolean {
  return sub.status === "active" || sub.status === "trialing";
}

/**
 * Sum MRR of all active/trialing subscriptions (in cents).
 */
export function activeMrr(subs: readonly SubscriptionRecord[]): number {
  return subs.reduce(
    (sum, sub) => (isActiveSub(sub) ? sum + sub.mrr : sum),
    0
  );
}

/**
 * Count active/trialing subscriptions by tier.
 */
export function tierCounts(
  subs: readonly SubscriptionRecord[]
): Record<SubscriptionTier, number> {
  const counts: Record<SubscriptionTier, number> = {
    free: 0,
    pro: 0,
    elite: 0,
  };
  for (const sub of subs) {
    if (isActiveSub(sub)) {
      counts[sub.tier] += 1;
    }
  }
  return counts;
}

/**
 * trial_converted / trial_started (excluding trial_expired) — among users
 * who had a definitive outcome.
 * Returns null if no trials started.
 */
export function trialConversionRate(
  events: readonly SubscriptionEventRecord[]
): number | null {
  const started = new Set<string>();
  const converted = new Set<string>();
  const expired = new Set<string>();

  for (const e of events) {
    if (e.event === "trial_started") {
      started.add(e.userId);
    } else if (e.event === "trial_converted") {
      converted.add(e.userId);
    } else if (e.event === "trial_expired") {
      expired.add(e.userId);
    }
  }

  if (started.size === 0) return null;

  // Among users who had a definitive outcome (converted or expired)
  let definitiveCount = 0;
  let convertedCount = 0;
  for (const userId of started) {
    const didConvert = converted.has(userId);
    const didExpire = expired.has(userId);
    if (didConvert || didExpire) {
      definitiveCount += 1;
      if (didConvert) convertedCount += 1;
    }
  }

  if (definitiveCount === 0) return null;
  return convertedCount / definitiveCount;
}

/**
 * Fraction of subscriptions that canceled in the last periodDays.
 * canceledAt within last periodDays / total subscriptions.
 * Returns 0 if no subscriptions.
 */
export function churnRate(
  subs: readonly SubscriptionRecord[],
  periodDays: number
): number {
  if (subs.length === 0) return 0;
  const now = Date.now();
  const cutoff = now - periodDays * MS_PER_DAY;
  const churned = subs.filter(
    (sub) =>
      sub.status === "canceled" &&
      sub.canceledAt !== undefined &&
      sub.canceledAt >= cutoff
  ).length;
  return churned / subs.length;
}

/**
 * Count how many times each upgrade path occurred.
 * Key format: "{fromTier}→{toTier}"
 * Only "upgraded" events.
 */
export function upgradePaths(
  events: readonly SubscriptionEventRecord[]
): Record<string, number> {
  const paths: Record<string, number> = {};
  for (const e of events) {
    if (e.event === "upgraded" && e.fromTier && e.toTier) {
      const key = `${e.fromTier}→${e.toTier}`;
      paths[key] = (paths[key] ?? 0) + 1;
    }
  }
  return paths;
}

/**
 * Average duration in days for all subscriptions.
 * For active: now - startedAt; for canceled: canceledAt - startedAt.
 * Returns 0 if no subscriptions.
 */
export function avgSubscriptionDuration(
  subs: readonly SubscriptionRecord[],
  now: number
): number {
  if (subs.length === 0) return 0;
  const totalMs = subs.reduce((sum, sub) => {
    const end =
      sub.status === "canceled" && sub.canceledAt !== undefined
        ? sub.canceledAt
        : now;
    return sum + (end - sub.startedAt);
  }, 0);
  return totalMs / subs.length / MS_PER_DAY;
}

/**
 * Sum MRR per tier (active/trialing only, in cents).
 */
export function mrrByTier(
  subs: readonly SubscriptionRecord[]
): Record<SubscriptionTier, number> {
  const result: Record<SubscriptionTier, number> = {
    free: 0,
    pro: 0,
    elite: 0,
  };
  for (const sub of subs) {
    if (isActiveSub(sub)) {
      result[sub.tier] += sub.mrr;
    }
  }
  return result;
}

/**
 * payment_recovered / payment_failed.
 * Returns null if no payment failures.
 */
export function paymentRecoveryRate(
  events: readonly SubscriptionEventRecord[]
): number | null {
  let failed = 0;
  let recovered = 0;
  for (const e of events) {
    if (e.event === "payment_failed") failed += 1;
    else if (e.event === "payment_recovered") recovered += 1;
  }
  if (failed === 0) return null;
  return recovered / failed;
}

/**
 * Compute period revenue metrics.
 * - newMrr: MRR from "started" events in the period
 * - expansionMrr: MRR delta from "upgraded" events
 * - contractionMrr: MRR delta from "downgraded" events (flipped to positive)
 * - churnMrr: MRR from "canceled" subscriptions (use startSubs to find their MRR)
 * - totalMrr: activeMrr of endSubs
 * - nrr: (startMrr + expansion - contraction - churn) / startMrr
 * - netNewMrr: newMrr + expansionMrr - contractionMrr - churnMrr
 */
export function revenueMetrics(
  startSubs: readonly SubscriptionRecord[],
  endSubs: readonly SubscriptionRecord[],
  events: readonly SubscriptionEventRecord[]
): RevenueMetrics {
  const startMrr = activeMrr(startSubs);
  const totalMrr = activeMrr(endSubs);

  // Build a lookup of userId → mrr from startSubs
  const startMrrByUser = new Map<string, number>();
  for (const sub of startSubs) {
    if (isActiveSub(sub)) {
      startMrrByUser.set(sub.userId, sub.mrr);
    }
  }

  let newMrr = 0;
  let expansionMrr = 0;
  let contractionMrr = 0;
  let churnMrr = 0;

  for (const e of events) {
    if (e.event === "started" && e.mrr !== undefined) {
      newMrr += e.mrr;
    } else if (e.event === "upgraded" && e.mrr !== undefined) {
      // mrr on the event represents the new MRR; expansion is the delta
      // If we have a fromTier context, we approximate via event.mrr as delta
      expansionMrr += e.mrr;
    } else if (e.event === "downgraded" && e.mrr !== undefined) {
      // mrr on the event represents the contraction amount (positive)
      contractionMrr += e.mrr;
    } else if (e.event === "canceled") {
      // Look up what this user's MRR was at period start
      const userMrr = startMrrByUser.get(e.userId) ?? 0;
      churnMrr += userMrr;
    }
  }

  const netNewMrr = newMrr + expansionMrr - contractionMrr - churnMrr;
  const nrr =
    startMrr === 0
      ? NaN
      : (startMrr + expansionMrr - contractionMrr - churnMrr) / startMrr;

  return {
    totalMrr,
    newMrr,
    expansionMrr,
    contractionMrr,
    churnMrr,
    netNewMrr,
    nrr,
  };
}

/**
 * Identify at-risk subscriptions:
 * - past_due status
 * - trial ending within 7 days
 * - had payment_failed in last 30 days
 */
export function atRiskSubscriptions(
  subs: readonly SubscriptionRecord[],
  events: readonly SubscriptionEventRecord[],
  now: number
): SubscriptionRecord[] {
  const thirtyDaysAgo = now - 30 * MS_PER_DAY;
  const sevenDaysFromNow = now + 7 * MS_PER_DAY;

  // Collect users with recent payment failures
  const recentPaymentFailUsers = new Set<string>();
  for (const e of events) {
    if (e.event === "payment_failed" && e.timestamp >= thirtyDaysAgo) {
      recentPaymentFailUsers.add(e.userId);
    }
  }

  return subs.filter((sub) => {
    if (sub.status === "past_due") return true;
    if (
      sub.status === "trialing" &&
      sub.trialEndsAt !== undefined &&
      sub.trialEndsAt <= sevenDaysFromNow
    )
      return true;
    if (recentPaymentFailUsers.has(sub.userId)) return true;
    return false;
  });
}

/**
 * Days until trial ends.
 * null if not trialing or no trialEndsAt.
 * Negative if expired.
 */
export function trialDaysRemaining(
  sub: SubscriptionRecord,
  now: number
): number | null {
  if (sub.status !== "trialing" || sub.trialEndsAt === undefined) return null;
  return (sub.trialEndsAt - now) / MS_PER_DAY;
}

/**
 * Days since subscription started.
 */
export function subscriptionAge(sub: SubscriptionRecord, now: number): number {
  return (now - sub.startedAt) / MS_PER_DAY;
}

/**
 * Last n events for a user, sorted by timestamp descending.
 */
export function recentEvents(
  events: readonly SubscriptionEventRecord[],
  userId: string,
  n: number
): SubscriptionEventRecord[] {
  return events
    .filter((e) => e.userId === userId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, n);
}

/**
 * Count each event type; includes all event types with 0 for missing.
 */
export function eventCounts(
  events: readonly SubscriptionEventRecord[]
): Record<SubscriptionEvent, number> {
  const allEvents: SubscriptionEvent[] = [
    "started",
    "upgraded",
    "downgraded",
    "canceled",
    "reactivated",
    "trial_started",
    "trial_converted",
    "trial_expired",
    "payment_failed",
    "payment_recovered",
  ];

  const counts = Object.fromEntries(
    allEvents.map((e) => [e, 0])
  ) as Record<SubscriptionEvent, number>;

  for (const e of events) {
    counts[e.event] += 1;
  }

  return counts;
}

/**
 * What fraction of the original MRR is retained after months?
 * monthsLater: the same cohort's subscriptions at a later date.
 * Returns monthsLater active MRR / startMrr (returns 0 if startMrr=0).
 */
export function cohortMrrRetention(
  cohortSubs: readonly SubscriptionRecord[],
  monthsLater: readonly SubscriptionRecord[],
  startMrr: number
): number {
  if (startMrr === 0) return 0;
  const laterMrr = activeMrr(monthsLater);
  return laterMrr / startMrr;
}
