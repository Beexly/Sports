/**
 * Effective public performance exposure — published && eligibility GREEN only.
 * Never invents metrics. LIVE_BOARD remains separate (odds kill switch).
 */

import { getReadinessGates } from "@sports/prediction-engine";
import { loadCalibrationOpsSurface } from "@/lib/ops/calibration-eligibility-durable";
import { loadPublicPerformancePolicy } from "@/lib/performance/public-performance-policy";
import { loadSettlementHealth, SETTLEMENT_DEFAULT_GRACE_HOURS } from "@/lib/performance/settlement-health";
import { db, isStubMode } from "@sports/db";

export interface EffectivePerformanceGate {
  readonly canExposePerformanceStats: boolean;
  readonly calibrationPublished: boolean;
  readonly eligibilityStatus: "GREEN" | "RED" | "UNKNOWN";
  readonly operatorHint: string;
}

export async function resolveEffectivePerformanceGate(): Promise<EffectivePerformanceGate> {
  const gates = getReadinessGates();
  if (isStubMode()) {
    return {
      canExposePerformanceStats: false,
      calibrationPublished: false,
      eligibilityStatus: "UNKNOWN",
      operatorHint: "Stub mode — performance claims dark.",
    };
  }

  try {
    const [policy, settlement] = await Promise.all([
      loadPublicPerformancePolicy(db, {
        canExposePerformanceStats: false,
        minSettledPicksForLearning: gates.minSettledPicksForLearning,
      }),
      loadSettlementHealth(db, { graceHours: SETTLEMENT_DEFAULT_GRACE_HOURS }).catch(() => null),
    ]);

    const cal = await loadCalibrationOpsSurface({
      canonicalSettled: policy.canonicalSettledCount,
      minSettledForLearning: gates.minSettledPicksForLearning,
      settlementHealthy: settlement?.health === "HEALTHY",
    });

    return {
      canExposePerformanceStats: cal.publish.canExposePerformanceStats,
      calibrationPublished: cal.publish.published,
      eligibilityStatus: cal.eligibility.status,
      operatorHint: cal.publish.operatorHint,
    };
  } catch {
    return {
      canExposePerformanceStats: false,
      calibrationPublished: false,
      eligibilityStatus: "UNKNOWN",
      operatorHint: "Eligibility load failed — performance claims stay dark.",
    };
  }
}
