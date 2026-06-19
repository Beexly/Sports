/**
 * Galaxy Dynasty — owner/admin metrics (bible Phase 7).
 *
 * Aggregates live-ops health for the owner dashboard. Best-effort: every query is
 * guarded so the dashboard renders zeros (not a crash) in DB-stub mode. Credit
 * REDEMPTION is structurally zero — the Credit Constitution has no cash-out path
 * (§4.2), so "liability" here is purely the outstanding in-world balance.
 */

import { db } from "@sports/db";

export interface GalaxyMetrics {
  readonly profilesTotal: number;
  readonly profilesOnboarded: number;
  readonly activeLast24h: number;
  readonly creditsIssued: number;
  readonly creditsRedeemed: number; // always 0 by design
  readonly creditLiability: number; // outstanding balances
  readonly signalChecks: number;
  readonly avgCalibration: number | null;
  readonly questCompletions: number;
  readonly bossAttempts: number;
  readonly bossClears: number;
  readonly merchUnlocks: number;
  readonly crews: number;
  readonly subscriptionsByTier: Record<string, number>;
  readonly higgsfieldAssetsGenerated: number; // 0 this build (briefs only)
  readonly stubMode: boolean;
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function getGalaxyMetrics(): Promise<GalaxyMetrics> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    profilesTotal,
    profilesOnboarded,
    activeLast24h,
    creditAgg,
    liabilityAgg,
    signalChecks,
    calibAgg,
    questCompletions,
    bossAttemptsAgg,
    bossClears,
    merchUnlocks,
    crews,
    proSubs,
    eliteSubs,
  ] = await Promise.all([
    safe(() => db.galaxyProfile.count(), 0),
    safe(() => db.galaxyProfile.count({ where: { onboardedAt: { not: null } } }), 0),
    safe(() => db.signalCheckAttempt.count({ where: { createdAt: { gte: since } } }), 0),
    safe(() => db.galaxyCreditLedgerEntry.aggregate({ _sum: { amount: true } }), { _sum: { amount: 0 } } as { _sum: { amount: number | null } }),
    safe(() => db.galaxyProfile.aggregate({ _sum: { creditsBalance: true } }), { _sum: { creditsBalance: 0 } } as { _sum: { creditsBalance: number | null } }),
    safe(() => db.signalCheckAttempt.count(), 0),
    safe(() => db.signalCheckAttempt.aggregate({ _avg: { calibrationScore: true } }), { _avg: { calibrationScore: null } } as { _avg: { calibrationScore: number | null } }),
    safe(() => db.galaxyQuestCompletion.count(), 0),
    safe(() => db.bossProgress.aggregate({ _sum: { attempts: true } }), { _sum: { attempts: 0 } } as { _sum: { attempts: number | null } }),
    safe(() => db.bossProgress.count({ where: { cleared: true } }), 0),
    safe(() => db.merchEntitlement.count(), 0),
    safe(() => db.crew.count(), 0),
    safe(() => db.subscription.count({ where: { tier: "PRO" } }), 0),
    safe(() => db.subscription.count({ where: { tier: "ELITE" } }), 0),
  ]);

  const subscriptionsByTier: Record<string, number> = {};
  if (proSubs > 0) subscriptionsByTier["PRO"] = proSubs;
  if (eliteSubs > 0) subscriptionsByTier["ELITE"] = eliteSubs;

  return {
    profilesTotal,
    profilesOnboarded,
    activeLast24h,
    creditsIssued: creditAgg._sum.amount ?? 0,
    creditsRedeemed: 0,
    creditLiability: liabilityAgg._sum.creditsBalance ?? 0,
    signalChecks,
    avgCalibration:
      calibAgg._avg.calibrationScore != null ? Math.round(calibAgg._avg.calibrationScore) : null,
    questCompletions,
    bossAttempts: bossAttemptsAgg._sum.attempts ?? 0,
    bossClears,
    merchUnlocks,
    crews,
    subscriptionsByTier,
    higgsfieldAssetsGenerated: 0,
    stubMode: profilesTotal === 0 && signalChecks === 0,
  };
}
