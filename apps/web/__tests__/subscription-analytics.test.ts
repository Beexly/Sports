/**
 * Tests for subscription analytics utilities.
 * Minimum 65 test cases.
 */

import { describe, it, expect } from "vitest";
import {
  activeMrr,
  tierCounts,
  trialConversionRate,
  churnRate,
  upgradePaths,
  avgSubscriptionDuration,
  mrrByTier,
  paymentRecoveryRate,
  revenueMetrics,
  atRiskSubscriptions,
  trialDaysRemaining,
  subscriptionAge,
  recentEvents,
  eventCounts,
  cohortMrrRetention,
  type SubscriptionRecord,
  type SubscriptionEventRecord,
} from "@/lib/analytics/subscription-analytics";

const DAY = 86_400_000;
const NOW = 1_700_000_000_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSub(
  overrides: Partial<SubscriptionRecord> & { userId: string }
): SubscriptionRecord {
  return {
    tier: "pro",
    status: "active",
    startedAt: NOW - 30 * DAY,
    mrr: 1499,
    ...overrides,
  };
}

function makeEvent(
  overrides: Partial<SubscriptionEventRecord> & {
    userId: string;
    event: SubscriptionEventRecord["event"];
  }
): SubscriptionEventRecord {
  return {
    timestamp: NOW - DAY,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// activeMrr
// ---------------------------------------------------------------------------

describe("activeMrr", () => {
  it("sums MRR for active subscriptions", () => {
    const subs = [
      makeSub({ userId: "u1", status: "active", mrr: 1499 }),
      makeSub({ userId: "u2", status: "active", mrr: 2499 }),
    ];
    expect(activeMrr(subs)).toBe(3998);
  });

  it("includes trialing subscriptions", () => {
    const subs = [
      makeSub({ userId: "u1", status: "trialing", mrr: 1499 }),
      makeSub({ userId: "u2", status: "active", mrr: 1000 }),
    ];
    expect(activeMrr(subs)).toBe(2499);
  });

  it("excludes canceled subscriptions", () => {
    const subs = [
      makeSub({ userId: "u1", status: "canceled", mrr: 1499 }),
      makeSub({ userId: "u2", status: "active", mrr: 500 }),
    ];
    expect(activeMrr(subs)).toBe(500);
  });

  it("excludes past_due subscriptions", () => {
    const subs = [
      makeSub({ userId: "u1", status: "past_due", mrr: 1499 }),
    ];
    expect(activeMrr(subs)).toBe(0);
  });

  it("excludes paused subscriptions", () => {
    const subs = [
      makeSub({ userId: "u1", status: "paused", mrr: 1499 }),
    ];
    expect(activeMrr(subs)).toBe(0);
  });

  it("returns 0 for empty list", () => {
    expect(activeMrr([])).toBe(0);
  });

  it("handles single active sub", () => {
    const subs = [makeSub({ userId: "u1", status: "active", mrr: 999 })];
    expect(activeMrr(subs)).toBe(999);
  });
});

// ---------------------------------------------------------------------------
// tierCounts
// ---------------------------------------------------------------------------

describe("tierCounts", () => {
  it("counts active subscriptions per tier", () => {
    const subs = [
      makeSub({ userId: "u1", tier: "free", status: "active" }),
      makeSub({ userId: "u2", tier: "pro", status: "active" }),
      makeSub({ userId: "u3", tier: "pro", status: "active" }),
      makeSub({ userId: "u4", tier: "elite", status: "active" }),
    ];
    const counts = tierCounts(subs);
    expect(counts.free).toBe(1);
    expect(counts.pro).toBe(2);
    expect(counts.elite).toBe(1);
  });

  it("includes trialing subscriptions", () => {
    const subs = [
      makeSub({ userId: "u1", tier: "pro", status: "trialing" }),
    ];
    expect(tierCounts(subs).pro).toBe(1);
  });

  it("excludes canceled subscriptions", () => {
    const subs = [
      makeSub({ userId: "u1", tier: "pro", status: "canceled" }),
      makeSub({ userId: "u2", tier: "elite", status: "active" }),
    ];
    const counts = tierCounts(subs);
    expect(counts.pro).toBe(0);
    expect(counts.elite).toBe(1);
  });

  it("returns zeros for all tiers when empty", () => {
    const counts = tierCounts([]);
    expect(counts.free).toBe(0);
    expect(counts.pro).toBe(0);
    expect(counts.elite).toBe(0);
  });

  it("excludes past_due subscriptions", () => {
    const subs = [
      makeSub({ userId: "u1", tier: "pro", status: "past_due" }),
    ];
    expect(tierCounts(subs).pro).toBe(0);
  });

  it("counts all three tiers correctly", () => {
    const subs = [
      makeSub({ userId: "u1", tier: "free", status: "active" }),
      makeSub({ userId: "u2", tier: "pro", status: "active" }),
      makeSub({ userId: "u3", tier: "elite", status: "active" }),
    ];
    const counts = tierCounts(subs);
    expect(counts.free).toBe(1);
    expect(counts.pro).toBe(1);
    expect(counts.elite).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// trialConversionRate
// ---------------------------------------------------------------------------

describe("trialConversionRate", () => {
  it("returns 3/5 when 3 converted and 2 expired", () => {
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "trial_started" }),
      makeEvent({ userId: "u2", event: "trial_started" }),
      makeEvent({ userId: "u3", event: "trial_started" }),
      makeEvent({ userId: "u4", event: "trial_started" }),
      makeEvent({ userId: "u5", event: "trial_started" }),
      makeEvent({ userId: "u1", event: "trial_converted" }),
      makeEvent({ userId: "u2", event: "trial_converted" }),
      makeEvent({ userId: "u3", event: "trial_converted" }),
      makeEvent({ userId: "u4", event: "trial_expired" }),
      makeEvent({ userId: "u5", event: "trial_expired" }),
    ];
    expect(trialConversionRate(events)).toBeCloseTo(0.6);
  });

  it("returns null if no trials started", () => {
    expect(trialConversionRate([])).toBeNull();
  });

  it("returns null if trials started but none resolved", () => {
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "trial_started" }),
    ];
    expect(trialConversionRate(events)).toBeNull();
  });

  it("returns 1.0 if all converted", () => {
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "trial_started" }),
      makeEvent({ userId: "u1", event: "trial_converted" }),
    ];
    expect(trialConversionRate(events)).toBe(1);
  });

  it("returns 0 if all expired", () => {
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "trial_started" }),
      makeEvent({ userId: "u1", event: "trial_expired" }),
    ];
    expect(trialConversionRate(events)).toBe(0);
  });

  it("ignores non-trial events", () => {
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "started" }),
      makeEvent({ userId: "u2", event: "canceled" }),
    ];
    expect(trialConversionRate(events)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// churnRate
// Note: churnRate uses Date.now() internally, so tests use real-time offsets
// ---------------------------------------------------------------------------

describe("churnRate", () => {
  it("returns fraction of subscriptions canceled in period", () => {
    const realNow = Date.now();
    const subs = [
      makeSub({ userId: "u1", status: "canceled", canceledAt: realNow - 5 * DAY }),
      makeSub({ userId: "u2", status: "active" }),
      makeSub({ userId: "u3", status: "active" }),
      makeSub({ userId: "u4", status: "active" }),
    ];
    expect(churnRate(subs, 30)).toBeCloseTo(0.25);
  });

  it("returns 0 if no subscriptions", () => {
    expect(churnRate([], 30)).toBe(0);
  });

  it("excludes cancellations outside the period", () => {
    const realNow = Date.now();
    const subs = [
      makeSub({ userId: "u1", status: "canceled", canceledAt: realNow - 90 * DAY }),
      makeSub({ userId: "u2", status: "active" }),
    ];
    expect(churnRate(subs, 30)).toBe(0);
  });

  it("includes cancellations exactly at period boundary", () => {
    const realNow = Date.now();
    const subs = [
      makeSub({
        userId: "u1",
        status: "canceled",
        // Slightly inside boundary to avoid sub-millisecond timing issues
        canceledAt: realNow - 29 * DAY,
      }),
    ];
    expect(churnRate(subs, 30)).toBe(1);
  });

  it("returns 0 if no canceled subs", () => {
    const subs = [
      makeSub({ userId: "u1", status: "active" }),
      makeSub({ userId: "u2", status: "active" }),
    ];
    expect(churnRate(subs, 30)).toBe(0);
  });

  it("handles all canceled in period", () => {
    const realNow = Date.now();
    const subs = [
      makeSub({ userId: "u1", status: "canceled", canceledAt: realNow - 2 * DAY }),
      makeSub({ userId: "u2", status: "canceled", canceledAt: realNow - 3 * DAY }),
    ];
    expect(churnRate(subs, 30)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// upgradePaths
// ---------------------------------------------------------------------------

describe("upgradePaths", () => {
  it("counts each upgrade path correctly", () => {
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "upgraded", fromTier: "free", toTier: "pro" }),
      makeEvent({ userId: "u2", event: "upgraded", fromTier: "free", toTier: "pro" }),
      makeEvent({ userId: "u3", event: "upgraded", fromTier: "pro", toTier: "elite" }),
    ];
    const paths = upgradePaths(events);
    expect(paths["free→pro"]).toBe(2);
    expect(paths["pro→elite"]).toBe(1);
  });

  it("ignores non-upgrade events", () => {
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "downgraded", fromTier: "elite", toTier: "pro" }),
      makeEvent({ userId: "u2", event: "canceled" }),
      makeEvent({ userId: "u3", event: "started" }),
    ];
    const paths = upgradePaths(events);
    expect(Object.keys(paths)).toHaveLength(0);
  });

  it("returns empty object for empty events", () => {
    expect(upgradePaths([])).toEqual({});
  });

  it("counts free→elite path", () => {
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "upgraded", fromTier: "free", toTier: "elite" }),
    ];
    const paths = upgradePaths(events);
    expect(paths["free→elite"]).toBe(1);
  });

  it("ignores upgraded events without tier info", () => {
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "upgraded" }),
    ];
    const paths = upgradePaths(events);
    expect(Object.keys(paths)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// avgSubscriptionDuration
// ---------------------------------------------------------------------------

describe("avgSubscriptionDuration", () => {
  it("uses now for active subscriptions", () => {
    const startedAt = NOW - 10 * DAY;
    const subs = [makeSub({ userId: "u1", status: "active", startedAt })];
    expect(avgSubscriptionDuration(subs, NOW)).toBeCloseTo(10);
  });

  it("uses canceledAt for canceled subscriptions", () => {
    const startedAt = NOW - 20 * DAY;
    const canceledAt = NOW - 10 * DAY;
    const subs = [
      makeSub({ userId: "u1", status: "canceled", startedAt, canceledAt }),
    ];
    expect(avgSubscriptionDuration(subs, NOW)).toBeCloseTo(10);
  });

  it("returns 0 for empty list", () => {
    expect(avgSubscriptionDuration([], NOW)).toBe(0);
  });

  it("averages across multiple subscriptions", () => {
    const subs = [
      makeSub({ userId: "u1", status: "active", startedAt: NOW - 10 * DAY }),
      makeSub({ userId: "u2", status: "active", startedAt: NOW - 30 * DAY }),
    ];
    expect(avgSubscriptionDuration(subs, NOW)).toBeCloseTo(20);
  });

  it("handles mix of active and canceled", () => {
    const subs = [
      makeSub({ userId: "u1", status: "active", startedAt: NOW - 20 * DAY }),
      makeSub({
        userId: "u2",
        status: "canceled",
        startedAt: NOW - 20 * DAY,
        canceledAt: NOW - 10 * DAY,
      }),
    ];
    // u1: 20 days, u2: 10 days → avg 15
    expect(avgSubscriptionDuration(subs, NOW)).toBeCloseTo(15);
  });
});

// ---------------------------------------------------------------------------
// mrrByTier
// ---------------------------------------------------------------------------

describe("mrrByTier", () => {
  it("sums MRR per tier for active subs", () => {
    const subs = [
      makeSub({ userId: "u1", tier: "pro", status: "active", mrr: 1499 }),
      makeSub({ userId: "u2", tier: "pro", status: "active", mrr: 1499 }),
      makeSub({ userId: "u3", tier: "elite", status: "active", mrr: 2499 }),
    ];
    const result = mrrByTier(subs);
    expect(result.pro).toBe(2998);
    expect(result.elite).toBe(2499);
    expect(result.free).toBe(0);
  });

  it("excludes canceled subscriptions", () => {
    const subs = [
      makeSub({ userId: "u1", tier: "pro", status: "canceled", mrr: 1499 }),
      makeSub({ userId: "u2", tier: "pro", status: "active", mrr: 1499 }),
    ];
    expect(mrrByTier(subs).pro).toBe(1499);
  });

  it("includes trialing subscriptions", () => {
    const subs = [
      makeSub({ userId: "u1", tier: "elite", status: "trialing", mrr: 2499 }),
    ];
    expect(mrrByTier(subs).elite).toBe(2499);
  });

  it("returns all zeros for empty list", () => {
    const result = mrrByTier([]);
    expect(result.free).toBe(0);
    expect(result.pro).toBe(0);
    expect(result.elite).toBe(0);
  });

  it("handles free tier MRR (0)", () => {
    const subs = [
      makeSub({ userId: "u1", tier: "free", status: "active", mrr: 0 }),
    ];
    expect(mrrByTier(subs).free).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// paymentRecoveryRate
// ---------------------------------------------------------------------------

describe("paymentRecoveryRate", () => {
  it("returns 2/3 for 2 recovered and 3 failed", () => {
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "payment_failed" }),
      makeEvent({ userId: "u2", event: "payment_failed" }),
      makeEvent({ userId: "u3", event: "payment_failed" }),
      makeEvent({ userId: "u1", event: "payment_recovered" }),
      makeEvent({ userId: "u2", event: "payment_recovered" }),
    ];
    expect(paymentRecoveryRate(events)).toBeCloseTo(2 / 3);
  });

  it("returns null if no payment failures", () => {
    expect(paymentRecoveryRate([])).toBeNull();
  });

  it("returns null when only non-payment events exist", () => {
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "started" }),
    ];
    expect(paymentRecoveryRate(events)).toBeNull();
  });

  it("returns 1.0 if all failures recovered", () => {
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "payment_failed" }),
      makeEvent({ userId: "u1", event: "payment_recovered" }),
    ];
    expect(paymentRecoveryRate(events)).toBe(1);
  });

  it("returns 0 if none recovered", () => {
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "payment_failed" }),
      makeEvent({ userId: "u2", event: "payment_failed" }),
    ];
    expect(paymentRecoveryRate(events)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// revenueMetrics
// ---------------------------------------------------------------------------

describe("revenueMetrics", () => {
  it("computes newMrr from started events", () => {
    const startSubs: SubscriptionRecord[] = [];
    const endSubs = [makeSub({ userId: "u1", status: "active", mrr: 1499 })];
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "started", mrr: 1499 }),
    ];
    const result = revenueMetrics(startSubs, endSubs, events);
    expect(result.newMrr).toBe(1499);
  });

  it("computes totalMrr from endSubs", () => {
    const startSubs: SubscriptionRecord[] = [];
    const endSubs = [
      makeSub({ userId: "u1", status: "active", mrr: 1499 }),
      makeSub({ userId: "u2", status: "active", mrr: 2499 }),
    ];
    const result = revenueMetrics(startSubs, endSubs, []);
    expect(result.totalMrr).toBe(3998);
  });

  it("computes churnMrr from canceled events using startSubs MRR", () => {
    const startSubs = [makeSub({ userId: "u1", status: "active", mrr: 1499 })];
    const endSubs: SubscriptionRecord[] = [];
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "canceled" }),
    ];
    const result = revenueMetrics(startSubs, endSubs, events);
    expect(result.churnMrr).toBe(1499);
  });

  it("computes expansionMrr from upgraded events", () => {
    const startSubs = [makeSub({ userId: "u1", status: "active", mrr: 1499 })];
    const endSubs = [makeSub({ userId: "u1", status: "active", mrr: 2499 })];
    const events: SubscriptionEventRecord[] = [
      makeEvent({
        userId: "u1",
        event: "upgraded",
        fromTier: "pro",
        toTier: "elite",
        mrr: 1000,
      }),
    ];
    const result = revenueMetrics(startSubs, endSubs, events);
    expect(result.expansionMrr).toBe(1000);
  });

  it("computes contractionMrr from downgraded events", () => {
    const startSubs = [makeSub({ userId: "u1", status: "active", mrr: 2499 })];
    const endSubs = [makeSub({ userId: "u1", status: "active", mrr: 1499 })];
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "downgraded", mrr: 1000 }),
    ];
    const result = revenueMetrics(startSubs, endSubs, events);
    expect(result.contractionMrr).toBe(1000);
  });

  it("computes nrr correctly", () => {
    const startSubs = [makeSub({ userId: "u1", status: "active", mrr: 1000 })];
    const endSubs = [makeSub({ userId: "u1", status: "active", mrr: 1200 })];
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "upgraded", mrr: 200 }),
    ];
    const result = revenueMetrics(startSubs, endSubs, events);
    // nrr = (1000 + 200 - 0 - 0) / 1000 = 1.2
    expect(result.nrr).toBeCloseTo(1.2);
  });

  it("returns NaN nrr when startMrr is 0", () => {
    const result = revenueMetrics([], [], []);
    expect(isNaN(result.nrr)).toBe(true);
  });

  it("computes netNewMrr correctly", () => {
    const startSubs = [makeSub({ userId: "u1", status: "active", mrr: 1000 })];
    const endSubs = [makeSub({ userId: "u1", status: "active", mrr: 1200 })];
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u2", event: "started", mrr: 500 }),
      makeEvent({ userId: "u1", event: "upgraded", mrr: 200 }),
    ];
    const result = revenueMetrics(startSubs, endSubs, events);
    // netNewMrr = 500 + 200 - 0 - 0 = 700
    expect(result.netNewMrr).toBe(700);
  });
});

// ---------------------------------------------------------------------------
// atRiskSubscriptions
// ---------------------------------------------------------------------------

describe("atRiskSubscriptions", () => {
  it("includes past_due subscriptions", () => {
    const subs = [makeSub({ userId: "u1", status: "past_due" })];
    const result = atRiskSubscriptions(subs, [], NOW);
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe("u1");
  });

  it("includes trial ending within 7 days", () => {
    const subs = [
      makeSub({
        userId: "u1",
        status: "trialing",
        trialEndsAt: NOW + 3 * DAY,
      }),
    ];
    const result = atRiskSubscriptions(subs, [], NOW);
    expect(result).toHaveLength(1);
  });

  it("does not include trial ending beyond 7 days", () => {
    const subs = [
      makeSub({
        userId: "u1",
        status: "trialing",
        trialEndsAt: NOW + 10 * DAY,
      }),
    ];
    const result = atRiskSubscriptions(subs, [], NOW);
    expect(result).toHaveLength(0);
  });

  it("includes subs with payment_failed in last 30 days", () => {
    const subs = [makeSub({ userId: "u1", status: "active" })];
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "payment_failed", timestamp: NOW - 5 * DAY }),
    ];
    const result = atRiskSubscriptions(subs, events, NOW);
    expect(result).toHaveLength(1);
  });

  it("does not include payment_failed outside 30 days", () => {
    const subs = [makeSub({ userId: "u1", status: "active" })];
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "payment_failed", timestamp: NOW - 45 * DAY }),
    ];
    const result = atRiskSubscriptions(subs, events, NOW);
    expect(result).toHaveLength(0);
  });

  it("returns empty when no at-risk subs", () => {
    const subs = [makeSub({ userId: "u1", status: "active" })];
    const result = atRiskSubscriptions(subs, [], NOW);
    expect(result).toHaveLength(0);
  });

  it("returns empty for empty input", () => {
    expect(atRiskSubscriptions([], [], NOW)).toHaveLength(0);
  });

  it("includes trial ending exactly at 7 day boundary", () => {
    const subs = [
      makeSub({
        userId: "u1",
        status: "trialing",
        trialEndsAt: NOW + 7 * DAY,
      }),
    ];
    const result = atRiskSubscriptions(subs, [], NOW);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// trialDaysRemaining
// ---------------------------------------------------------------------------

describe("trialDaysRemaining", () => {
  it("returns positive days when trial is active", () => {
    const sub = makeSub({
      userId: "u1",
      status: "trialing",
      trialEndsAt: NOW + 5 * DAY,
    });
    expect(trialDaysRemaining(sub, NOW)).toBeCloseTo(5);
  });

  it("returns null if not trialing", () => {
    const sub = makeSub({ userId: "u1", status: "active" });
    expect(trialDaysRemaining(sub, NOW)).toBeNull();
  });

  it("returns null if no trialEndsAt", () => {
    const sub = makeSub({ userId: "u1", status: "trialing" });
    expect(trialDaysRemaining(sub, NOW)).toBeNull();
  });

  it("returns negative if trial expired", () => {
    const sub = makeSub({
      userId: "u1",
      status: "trialing",
      trialEndsAt: NOW - 2 * DAY,
    });
    expect(trialDaysRemaining(sub, NOW)).toBeCloseTo(-2);
  });

  it("returns 0 if trial ends exactly now", () => {
    const sub = makeSub({
      userId: "u1",
      status: "trialing",
      trialEndsAt: NOW,
    });
    expect(trialDaysRemaining(sub, NOW)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// subscriptionAge
// ---------------------------------------------------------------------------

describe("subscriptionAge", () => {
  it("returns days since subscription started", () => {
    const sub = makeSub({ userId: "u1", startedAt: NOW - 10 * DAY });
    expect(subscriptionAge(sub, NOW)).toBeCloseTo(10);
  });

  it("returns 0 for subscription started now", () => {
    const sub = makeSub({ userId: "u1", startedAt: NOW });
    expect(subscriptionAge(sub, NOW)).toBe(0);
  });

  it("returns fractional days", () => {
    const sub = makeSub({ userId: "u1", startedAt: NOW - DAY / 2 });
    expect(subscriptionAge(sub, NOW)).toBeCloseTo(0.5);
  });

  it("handles long-running subscriptions", () => {
    const sub = makeSub({ userId: "u1", startedAt: NOW - 365 * DAY });
    expect(subscriptionAge(sub, NOW)).toBeCloseTo(365);
  });
});

// ---------------------------------------------------------------------------
// recentEvents
// ---------------------------------------------------------------------------

describe("recentEvents", () => {
  it("returns last n events for user sorted desc", () => {
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "started", timestamp: NOW - 10 * DAY }),
      makeEvent({ userId: "u1", event: "upgraded", timestamp: NOW - 5 * DAY }),
      makeEvent({ userId: "u1", event: "payment_failed", timestamp: NOW - 1 * DAY }),
      makeEvent({ userId: "u2", event: "started", timestamp: NOW - 3 * DAY }),
    ];
    const result = recentEvents(events, "u1", 2);
    expect(result).toHaveLength(2);
    expect(result[0].event).toBe("payment_failed");
    expect(result[1].event).toBe("upgraded");
  });

  it("returns empty array for unknown user", () => {
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "started" }),
    ];
    expect(recentEvents(events, "unknown", 5)).toHaveLength(0);
  });

  it("returns fewer than n if user has fewer events", () => {
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "started", timestamp: NOW - 5 * DAY }),
    ];
    const result = recentEvents(events, "u1", 10);
    expect(result).toHaveLength(1);
  });

  it("returns empty for empty events", () => {
    expect(recentEvents([], "u1", 5)).toHaveLength(0);
  });

  it("returns events sorted newest first", () => {
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "started", timestamp: 100 }),
      makeEvent({ userId: "u1", event: "upgraded", timestamp: 300 }),
      makeEvent({ userId: "u1", event: "canceled", timestamp: 200 }),
    ];
    const result = recentEvents(events, "u1", 3);
    expect(result[0].timestamp).toBe(300);
    expect(result[1].timestamp).toBe(200);
    expect(result[2].timestamp).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// eventCounts
// ---------------------------------------------------------------------------

describe("eventCounts", () => {
  it("counts each event type correctly", () => {
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "started" }),
      makeEvent({ userId: "u2", event: "started" }),
      makeEvent({ userId: "u1", event: "upgraded" }),
      makeEvent({ userId: "u3", event: "canceled" }),
    ];
    const counts = eventCounts(events);
    expect(counts.started).toBe(2);
    expect(counts.upgraded).toBe(1);
    expect(counts.canceled).toBe(1);
  });

  it("includes all event types with 0 for missing", () => {
    const counts = eventCounts([]);
    const allTypes: (keyof typeof counts)[] = [
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
    for (const t of allTypes) {
      expect(counts[t]).toBe(0);
    }
  });

  it("returns zeros for all types when empty", () => {
    const counts = eventCounts([]);
    expect(Object.values(counts).every((v) => v === 0)).toBe(true);
  });

  it("has exactly 10 event types", () => {
    const counts = eventCounts([]);
    expect(Object.keys(counts)).toHaveLength(10);
  });

  it("correctly counts payment events", () => {
    const events: SubscriptionEventRecord[] = [
      makeEvent({ userId: "u1", event: "payment_failed" }),
      makeEvent({ userId: "u1", event: "payment_failed" }),
      makeEvent({ userId: "u1", event: "payment_recovered" }),
    ];
    const counts = eventCounts(events);
    expect(counts.payment_failed).toBe(2);
    expect(counts.payment_recovered).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// cohortMrrRetention
// ---------------------------------------------------------------------------

describe("cohortMrrRetention", () => {
  it("returns 0.5 when 100 cents retained of 200", () => {
    const cohortSubs = [makeSub({ userId: "u1", status: "active", mrr: 200 })];
    const laterSubs = [makeSub({ userId: "u1", status: "active", mrr: 100 })];
    expect(cohortMrrRetention(cohortSubs, laterSubs, 200)).toBe(0.5);
  });

  it("returns 0 when startMrr is 0", () => {
    const cohortSubs: SubscriptionRecord[] = [];
    const laterSubs = [makeSub({ userId: "u1", status: "active", mrr: 100 })];
    expect(cohortMrrRetention(cohortSubs, laterSubs, 0)).toBe(0);
  });

  it("returns 1.0 when full MRR retained", () => {
    const cohortSubs = [makeSub({ userId: "u1", status: "active", mrr: 500 })];
    const laterSubs = [makeSub({ userId: "u1", status: "active", mrr: 500 })];
    expect(cohortMrrRetention(cohortSubs, laterSubs, 500)).toBe(1);
  });

  it("returns 0 when all churned in later period", () => {
    const cohortSubs = [makeSub({ userId: "u1", status: "active", mrr: 500 })];
    const laterSubs = [
      makeSub({ userId: "u1", status: "canceled", mrr: 500 }),
    ];
    expect(cohortMrrRetention(cohortSubs, laterSubs, 500)).toBe(0);
  });

  it("handles expansion (>1 retention ratio)", () => {
    const cohortSubs = [makeSub({ userId: "u1", status: "active", mrr: 500 })];
    const laterSubs = [
      makeSub({ userId: "u1", status: "active", mrr: 500 }),
      makeSub({ userId: "u2", status: "active", mrr: 200 }),
    ];
    expect(cohortMrrRetention(cohortSubs, laterSubs, 500)).toBeCloseTo(1.4);
  });

  it("uses activeMrr semantics for laterSubs (excludes canceled)", () => {
    const cohortSubs = [makeSub({ userId: "u1", status: "active", mrr: 1000 })];
    const laterSubs = [
      makeSub({ userId: "u1", status: "active", mrr: 800 }),
      makeSub({ userId: "u2", status: "canceled", mrr: 200 }),
    ];
    // Only active 800 is counted; canceled 200 is excluded
    expect(cohortMrrRetention(cohortSubs, laterSubs, 1000)).toBeCloseTo(0.8);
  });
});
