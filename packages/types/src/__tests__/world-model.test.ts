import { describe, expect, it } from "vitest";
import {
  classifyRunPassBias,
  evaluateCoverageRequirement,
  evaluateFallbackChain,
  getAutonomousSystemHealth,
  getTrustUiState,
  isFeatureAllowedOnSurface,
  isFeaturePublicSafe,
  summarizeControlPlaneSnapshot,
  validateDecisionTrace,
  validatePlayCallSplit,
  validateSchemeTendencyProfile,
  type AutonomousSystemRun,
  type DomainCoverageSnapshot,
  type DecisionTrace,
  type FeatureProvenance,
  type IntelligenceCoverageRequirement,
  type PlayCallSplit,
  type SchemeTendencyProfile,
  type SourceFallbackChain,
} from "../index.js";

const baseFeature: FeatureProvenance = {
  featureKey: "market.lineMovement",
  sourceId: "odds-api",
  sourceName: "The Odds API",
  sourceTier: 2,
  sourceRunId: "run-1",
  retrievedAt: "2026-06-09T12:00:00.000Z",
  transformVersion: "line-movement-v1",
  freshnessStatus: "FRESH",
  activationState: "ACTIVE",
  legalState: "APPROVED_DERIVED_ONLY",
  confidence: 0.82,
  sampleSize: 8,
  allowedSurfaces: ["PUBLIC", "FREE", "PRO", "ELITE", "COCKPIT"],
  whyUsedOrBlocked: "Derived market movement context is active and fresh.",
};

const baseSplit: PlayCallSplit = {
  situation: "EARLY_DOWN_NEUTRAL",
  passRate: 0.54,
  rushRate: 0.46,
  sampleSize: 120,
  seasons: [2024, 2025],
  confidence: 0.77,
};

const baseSchemeProfile: SchemeTendencyProfile = {
  profileId: "scheme-kubiak-2024-2025",
  coachId: "coach-klint-kubiak",
  coachName: "Klint Kubiak",
  team: "SEA",
  side: "OFFENSE",
  role: "OFFENSIVE_COORDINATOR",
  seasonRange: [2024, 2025],
  primarySchemeFamily: "wide-zone/play-action",
  playCallerConfidence: 0.72,
  splits: [baseSplit],
  strengths: ["Efficient outside-zone sequencing"],
  weaknesses: ["Unproven current-roster translation"],
  source: baseFeature,
};

function traceWith(feature: FeatureProvenance, surface: DecisionTrace["surface"] = "PUBLIC"): DecisionTrace {
  return {
    decisionId: "decision-1",
    modelVersion: "gse-rd-2026-06",
    generatedAt: "2026-06-09T12:01:00.000Z",
    surface,
    features: [feature],
    hypothetical: false,
    summary: "Fixture decision trace.",
  };
}

describe("world-model trust helpers", () => {
  it("allows active fresh tier 1-4 features on public surfaces", () => {
    expect(isFeaturePublicSafe(baseFeature)).toBe(true);
    expect(isFeatureAllowedOnSurface(baseFeature, "PUBLIC")).toBe(true);
    expect(validateDecisionTrace(traceWith(baseFeature))).toEqual([]);
  });

  it("blocks stale features from public decision traces", () => {
    const staleFeature: FeatureProvenance = {
      ...baseFeature,
      freshnessStatus: "STALE",
      whyUsedOrBlocked: "The source exceeded its freshness TTL.",
    };

    expect(isFeaturePublicSafe(staleFeature)).toBe(false);
    expect(getTrustUiState(staleFeature)).toBe("STALE");
    expect(validateDecisionTrace(traceWith(staleFeature))).toContain(
      "market.lineMovement: not public safe on PUBLIC"
    );
  });

  it("keeps shadow features founder-only", () => {
    const shadowFeature: FeatureProvenance = {
      ...baseFeature,
      featureKey: "player.availabilityShadow",
      activationState: "SHADOW_ONLY",
      allowedSurfaces: ["FOUNDER", "COCKPIT"],
      whyUsedOrBlocked: "Player availability is still in shadow mode.",
    };

    expect(getTrustUiState(shadowFeature)).toBe("FOUNDER_ONLY");
    expect(validateDecisionTrace(traceWith(shadowFeature, "PUBLIC"))).toEqual([
      "player.availabilityShadow: not allowed on PUBLIC",
      "player.availabilityShadow: not public safe on PUBLIC",
    ]);
    expect(validateDecisionTrace(traceWith(shadowFeature, "COCKPIT"))).toEqual([]);
  });

  it("treats tier 5 and tier 6 as low trust for public surfaces", () => {
    const weakFeature: FeatureProvenance = {
      ...baseFeature,
      sourceTier: 5,
      sourceId: "community-chatter",
      sourceName: "Community chatter",
      whyUsedOrBlocked: "Weak signal only.",
    };

    expect(getTrustUiState(weakFeature)).toBe("LOW_TRUST");
    expect(isFeaturePublicSafe(weakFeature)).toBe(false);
  });
});

describe("world-model coach scheme helpers", () => {
  it("classifies run/pass bias with sample-size protection", () => {
    expect(
      classifyRunPassBias({
        ...baseSplit,
        passRate: 0.62,
        rushRate: 0.38,
      })
    ).toBe("PASS_HEAVY");

    expect(
      classifyRunPassBias({
        ...baseSplit,
        passRate: 0.4,
        rushRate: 0.6,
      })
    ).toBe("RUN_HEAVY");

    expect(classifyRunPassBias(baseSplit)).toBe("BALANCED");

    expect(
      classifyRunPassBias({
        ...baseSplit,
        sampleSize: 12,
      })
    ).toBe("INSUFFICIENT_SAMPLE");
  });

  it("validates play-call split rates and confidence bounds", () => {
    expect(validatePlayCallSplit(baseSplit)).toEqual([]);

    const errors = validatePlayCallSplit({
      ...baseSplit,
      passRate: 0.7,
      rushRate: 0.5,
      sampleSize: -1,
      confidence: 1.2,
    });

    expect(errors).toContain("EARLY_DOWN_NEUTRAL: passRate and rushRate must sum to 1");
    expect(errors).toContain("EARLY_DOWN_NEUTRAL: sampleSize cannot be negative");
    expect(errors).toContain("EARLY_DOWN_NEUTRAL: confidence must be between 0 and 1");
  });

  it("validates scheme tendency profiles before they can power product surfaces", () => {
    expect(validateSchemeTendencyProfile(baseSchemeProfile)).toEqual([]);

    expect(
      validateSchemeTendencyProfile({
        ...baseSchemeProfile,
        primarySchemeFamily: "",
        playCallerConfidence: 1.1,
        splits: [],
      })
    ).toEqual([
      "primarySchemeFamily is required",
      "playCallerConfidence must be between 0 and 1",
      "at least one play-call split is required",
    ]);
  });
});

describe("world-model autonomous control-plane helpers", () => {
  const nowIso = "2026-06-09T18:00:00.000Z";

  const fallbackChain: SourceFallbackChain = {
    chainId: "injury-primary-chain",
    domain: "INJURY",
    criticality: "P0",
    noDataPolicy: "WITHHOLD",
    steps: [
      {
        sourceId: "official-injury-feed",
        sourceName: "Official injury feed",
        mode: "PRIMARY",
        domains: ["INJURY"],
        legalState: "APPROVED",
        healthStatus: "UNAVAILABLE",
        activationState: "BLOCKED_STALE",
        confidence: 0.95,
        retrievedAt: null,
        freshnessTtlSec: 900,
      },
      {
        sourceId: "manual-team-report",
        sourceName: "Manual team report review",
        mode: "SECONDARY",
        domains: ["INJURY"],
        legalState: "REQUIRES_USER_EXPORT",
        healthStatus: "HEALTHY",
        activationState: "ACTIVE",
        confidence: 0.72,
        retrievedAt: "2026-06-09T17:55:00.000Z",
        freshnessTtlSec: 1800,
      },
    ],
  };

  const coverageRequirement: IntelligenceCoverageRequirement = {
    requirementId: "coverage-weather-wind",
    domain: "WIND",
    criticality: "P1",
    minActiveSources: 2,
    maxStalenessSec: 1800,
    allowedSurfaces: ["PRO", "ELITE", "COCKPIT"],
    description: "Outdoor NFL games need live wind coverage before weather adjustments publish.",
  };

  const coverageSnapshot: DomainCoverageSnapshot = {
    requirementId: "coverage-weather-wind",
    domain: "WIND",
    checkedAt: nowIso,
    activeSourceCount: 2,
    freshestRetrievedAt: "2026-06-09T17:50:00.000Z",
    staleSourceCount: 0,
    blockedSourceCount: 0,
    manualReviewOpen: false,
  };

  const healthyRun: AutonomousSystemRun = {
    systemId: "source-health-monitor",
    systemName: "Source Health Monitor",
    kind: "SOURCE_HEALTH_MONITOR",
    status: "HEALTHY",
    startedAt: "2026-06-09T17:58:00.000Z",
    completedAt: "2026-06-09T17:59:00.000Z",
    lastHeartbeatAt: "2026-06-09T17:59:30.000Z",
    checkedAt: nowIso,
    expectedCadenceSec: 300,
    consecutiveFailures: 0,
    maxAllowedFailures: 3,
    ownerSurface: "COCKPIT",
    canAutoRecover: true,
    telemetryTraceId: "trace-source-health-1",
    runbookUrl: "/docs/runbooks/source-health",
  };

  it("falls back to the first usable source and marks manual/export data non-public", () => {
    expect(evaluateFallbackChain(fallbackChain)).toMatchObject({
      status: "READY",
      activeSourceId: "manual-team-report",
      publicSafe: false,
    });
  });

  it("flags legal blocks when every source is unusable by policy", () => {
    const blocked = evaluateFallbackChain({
      ...fallbackChain,
      steps: fallbackChain.steps.map((step) => ({
        ...step,
        legalState: "REQUIRES_CONTRACT" as const,
        healthStatus: "HEALTHY" as const,
        activationState: "ACTIVE" as const,
      })),
    });

    expect(blocked.status).toBe("BLOCKED_LEGAL");
    expect(blocked.activeSourceId).toBeNull();
  });

  it("evaluates domain coverage freshness and active-source minimums", () => {
    expect(evaluateCoverageRequirement(coverageRequirement, coverageSnapshot, nowIso)).toMatchObject({
      state: "COVERED",
    });

    expect(
      evaluateCoverageRequirement(
        coverageRequirement,
        {
          ...coverageSnapshot,
          activeSourceCount: 1,
        },
        nowIso
      )
    ).toMatchObject({
      state: "BLIND_SPOT",
    });

    expect(
      evaluateCoverageRequirement(
        coverageRequirement,
        {
          ...coverageSnapshot,
          freshestRetrievedAt: "2026-06-09T16:00:00.000Z",
        },
        nowIso
      )
    ).toMatchObject({
      state: "DEGRADED",
    });
  });

  it("computes autonomous system health from cadence and failure state", () => {
    expect(getAutonomousSystemHealth(healthyRun, nowIso)).toBe("HEALTHY");

    expect(
      getAutonomousSystemHealth(
        {
          ...healthyRun,
          consecutiveFailures: 2,
        },
        nowIso
      )
    ).toBe("DEGRADED");

    expect(
      getAutonomousSystemHealth(
        {
          ...healthyRun,
          lastHeartbeatAt: "2026-06-09T17:00:00.000Z",
        },
        nowIso
      )
    ).toBe("STALE");
  });

  it("summarizes the control plane into operator-facing actions", () => {
    const summary = summarizeControlPlaneSnapshot({
      snapshotId: "control-plane-1",
      generatedAt: nowIso,
      systems: [
        healthyRun,
        {
          ...healthyRun,
          systemId: "pick-generation-worker",
          systemName: "Pick Generation Worker",
          kind: "PICK_GENERATION_WORKER",
          status: "HEALTHY",
          consecutiveFailures: 3,
        },
      ],
      coverage: [
        evaluateCoverageRequirement(coverageRequirement, coverageSnapshot, nowIso),
        {
          requirementId: "coverage-officials",
          domain: "OFFICIALS",
          state: "BLIND_SPOT",
          reason: "OFFICIALS: no source available",
        },
      ],
      fallbackChains: [evaluateFallbackChain(fallbackChain)],
    });

    expect(summary.overallStatus).toBe("FAILED");
    expect(summary.failedSystems).toBe(1);
    expect(summary.blindSpots).toBe(1);
    expect(summary.recommendedActions).toContain("Open failed autonomous-system runbooks.");
  });
});
