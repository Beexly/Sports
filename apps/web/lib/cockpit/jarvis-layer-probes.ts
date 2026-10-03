/**
 * Live layer status probes for Jarvis phase matrix.
 * Pure: evidence in → JarvisLayerStatuses out. No hard-coded "all implemented".
 */

import type { JarvisLayerStatuses, JarvisPhaseStatus } from "@/lib/cockpit/jarvis";

export type LayerProbeEvidence = {
  readonly trustClaimsWired: boolean;
  readonly performanceGatingWired: boolean;
  readonly promotionsWired: boolean;
  readonly dailyBriefHasRows: boolean | null; // null = unknown (no DB)
  readonly calibrationAdjustmentsEnabled: boolean;
  readonly canLearnFromOutcomes: boolean;
  readonly cockpitWired: boolean;
  readonly contentEngineDraftOnly: boolean;
  readonly contentAutoPublishBlocked: boolean;
  readonly ciGuardrailsPresent: boolean;
  readonly freeMultiSourceCriticalGaps: number;
  readonly neonDualUrlConfigured: boolean;
  readonly stubMode: boolean;
};

function phase(
  implemented: boolean,
  partial = false,
  blocked = false,
  missing = false,
): JarvisPhaseStatus {
  if (blocked) return "blocked_external";
  if (missing) return "missing";
  if (implemented && !partial) return "implemented";
  if (partial || implemented) return "partial";
  return "unknown";
}

/**
 * Probe phase layers from real evidence (gates, env, DB counts, multi-source).
 */
export function probeJarvisLayers(e: LayerProbeEvidence): JarvisLayerStatuses {
  return {
    trustClaims: phase(e.trustClaimsWired),
    performanceGating: phase(e.performanceGatingWired),
    promotions: phase(e.promotionsWired),
    dailyBrief:
      e.dailyBriefHasRows === null
        ? "unknown"
        : e.dailyBriefHasRows
          ? "implemented"
          : "partial",
    calibration: e.calibrationAdjustmentsEnabled
      ? e.canLearnFromOutcomes
        ? "implemented"
        : "partial"
      : "partial", // calibrated path exists but gate off = partial (honest)
    cockpit: phase(e.cockpitWired, e.stubMode),
    contentEngine: phase(
      e.contentEngineDraftOnly && e.contentAutoPublishBlocked,
      !e.contentAutoPublishBlocked,
    ),
    ciHardening: phase(e.ciGuardrailsPresent, !e.neonDualUrlConfigured || e.freeMultiSourceCriticalGaps > 0),
  };
}
