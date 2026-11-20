import { describe, expect, it } from "vitest";
import {
  planAutonomyCycle,
  type AutonomyObservation,
} from "@/lib/autonomy/operating-kernel";
import { probePregameCadenceObservation } from "@/lib/autonomy/pregame-cadence-probe";
import { probeStorefrontAndCloudHealth } from "@/lib/autonomy/storefront-and-cloud-probe";

function baseObs(over: Partial<AutonomyObservation> = {}): AutonomyObservation {
  return {
    observedAt: "2026-11-20T05:00:00.000Z",
    deploymentSha: "testsha",
    databaseOk: true,
    ingestionOk: true,
    ingestionAgeMinutes: 15,
    freeSpineAgeMinutes: 15,
    settlementBand: "HEALTHY",
    settlementOverdue: 0,
    settlementCommenced: 40,
    topRcaCause: null,
    rcaHeadline: null,
    stpAutoEligible: 0,
    stpExceptions: 0,
    burnDraining: true,
    liveBoardEnabled: false,
    publicPicksEnabled: false,
    performanceStatsEnabled: false,
    publishLedgerEnabled: false,
    draftOnly: true,
    boardSuppressed: true,
    openPicks: 0,
    canonicalSettled: 120,
    minSettledForLearning: 100,
    compoundFabricAgeMinutes: 10,
    gsiRuleInDoctrineHeld: true,
    ...over,
  };
}

describe("pregame-cadence-probe and storefront-and-cloud-probe (pure)", () => {
  it("detects Friday Noon CT Sunday lock window and Thursday T-90m window accurately", () => {
    // 2026-11-20 12:15 CST = 18:15 UTC
    const friNoon = probePregameCadenceObservation({
      now: new Date("2026-11-20T18:15:00Z"),
      env: {},
    });
    expect(friNoon.friNoonSundayLockDue).toBe(true);
    expect(friNoon.wedNoonTnfLockDue).toBe(false);

    // 2026-11-19 18:00 CST = 2026-11-20T00:00:00Z
    const thuT90 = probePregameCadenceObservation({
      now: new Date("2026-11-20T00:00:00Z"),
      env: {},
    });
    expect(thuT90.t90mInactivesAdjustmentDue).toBe(true);
    expect(thuT90.activeSlot).toBe("TNF");
  });

  it("emits all 4 owner-only advisories with autonomousSafe=false and never flips gates", () => {
    const sc = probeStorefrontAndCloudHealth({
      now: new Date("2026-11-20T18:00:00Z"),
      env: {
        GSE_CLOUD_CRON_DRIFT: "true",
        GSE_CLOUD_CRON_DRIFT_DETAIL: "Hermes cron failed 3 jobs",
      },
    });
    expect(sc.whopApiKeyPresent).toBe(false);
    expect(sc.whopPaidCheckoutGapCount).toBe(3);
    expect(sc.nousFreePromoExpiringOrExpired).toBe(true);
    expect(sc.imminentFilingDeadlines.length).toBeGreaterThanOrEqual(1);

    const plan = planAutonomyCycle(baseObs({ storefrontAndCloud: sc }));
    const ownerKinds = new Set(plan.ownerQueue.map((a) => a.kind));
    const autoKinds = new Set(plan.autonomousQueue.map((a) => a.kind));

    for (const kind of [
      "ALERT_STOREFRONT_CHECKOUT_GAP",
      "ALERT_AI_GATEWAY_OR_FREE_LANE_CLIFF",
      "ALERT_CLOUD_CREDIT_OR_CRON_DRIFT",
      "ALERT_FILING_DEADLINE_IMMINENT",
    ] as const) {
      expect(ownerKinds.has(kind)).toBe(true);
      expect(autoKinds.has(kind)).toBe(false);
      const act = plan.ownerQueue.find((a) => a.kind === kind)!;
      expect(act.requiresOwner).toBe(true);
      expect(act.autonomousSafe).toBe(false);
    }
    expect(plan.introspection.refuseDefaultHeld).toBe(true);
  });
});
