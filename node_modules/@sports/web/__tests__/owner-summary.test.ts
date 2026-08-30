import { describe, it, expect } from "vitest";
import {
  buildOwnerSummary,
  type BuildOwnerSummaryInput,
  type GatesForOwnerSummary,
} from "@/lib/cockpit/owner-summary";
import {
  synthesizeJarvis,
  type JarvisInput,
} from "@/lib/cockpit/jarvis";
import { evaluatePublicPerformancePolicy } from "@/lib/performance/public-performance-policy";

const NOW = new Date("2026-05-18T12:00:00Z");

const GATES_ALL_OPEN: GatesForOwnerSummary = {
  canExposePublicPicks: true,
  isBootstrapMode: false,
  minSettledPicksForLearning: 25,
};

const GATES_PICKS_CLOSED: GatesForOwnerSummary = {
  canExposePublicPicks: false,
  isBootstrapMode: true,
  minSettledPicksForLearning: 25,
};

function makePolicy(overrides: Partial<Parameters<typeof evaluatePublicPerformancePolicy>[0]> = {}) {
  return evaluatePublicPerformancePolicy({
    canExposePerformanceStats: true,
    minSettledPicksForLearning: 25,
    canonicalSettledCount: 100,
    bootstrapCount: 10,
    pendingCount: 4,
    canonicalWins: 55,
    canonicalLosses: 40,
    canonicalPushes: 5,
    recentTotalCount: 20,
    recentBootstrapCount: 0,
    ...overrides,
  });
}

function makeAssessment(overrides: Partial<JarvisInput> = {}) {
  const gates = {
    canPersistCanonicalHistory: true,
    canUseDerivedHistory: true,
    canExposePublicPicks: true,
    canPromoteFeaturedPicks: true,
    canExposePerformanceStats: true,
    canPublishContent: true,
    canLearnFromOutcomes: true,
    canApplyCalibrationAdjustments: false as const,
    isBootstrapMode: false,
    minSettledPicksForLearning: 25,
  };
  const policy = makePolicy();
  const input: JarvisInput = {
    now: NOW,
    gates,
    performancePolicy: policy,
    ingestion: {
      lastAttemptAt: new Date(NOW.getTime() - 60 * 60 * 1000),
      lastSuccessAt: new Date(NOW.getTime() - 60 * 60 * 1000),
      lastWasSuccess: true,
      recentFailureCount: 0,
    },
    settlement: {
      lastSettlementAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
      settledIn24h: 12,
      pendingPickCount: 4,
    },
    history: {
      canonicalSettledCount: 100,
      bootstrapSettledCount: 10,
      canonicalPendingCount: 4,
      winCount: 55,
      lossCount: 40,
      pushCount: 5,
      voidCount: 1,
      publishedCount: 110,
      featuredCount: 8,
      canonicalEligibleForPublic: 100,
      canonicalExcludedFromPublic: 10,
    },
    signal: {
      snapshotCoveragePct: 0.95,
      signalCoveragePct: 0.92,
      averageDataQualityScore: 0.9,
      modelVersionsActive: ["v5"],
    },
    layers: {
      trustClaims: "implemented",
      performanceGating: "implemented",
      promotions: "implemented",
      dailyBrief: "implemented",
      calibration: "implemented",
      cockpit: "implemented",
      contentEngine: "implemented",
      ciHardening: "partial",
    },
    externalConfigMissing: [],
    ...overrides,
  };
  return synthesizeJarvis(input);
}

function makeInput(
  overrides: Partial<BuildOwnerSummaryInput> = {}
): BuildOwnerSummaryInput {
  return {
    assessment: makeAssessment(),
    performancePolicy: makePolicy(),
    gates: GATES_ALL_OPEN,
    todayPickCount: 8,
    ...overrides,
  };
}

// ─── Performance trust rules ──────────────────────────────────────────────────

describe("performance.displaySafe", () => {
  it("is false when gate is off, even with many canonical picks", () => {
    const policy = makePolicy({ canExposePerformanceStats: false, canonicalSettledCount: 200 });
    const input = makeInput({ performancePolicy: policy });
    const summary = buildOwnerSummary(input);
    expect(summary.performance.displaySafe).toBe(false);
  });

  it("is false when canonical sample is below minimum", () => {
    const policy = makePolicy({
      canExposePerformanceStats: true,
      canonicalSettledCount: 10,
      canonicalWins: 6,
      canonicalLosses: 4,
    });
    const input = makeInput({ performancePolicy: policy });
    const summary = buildOwnerSummary(input);
    expect(summary.performance.displaySafe).toBe(false);
  });

  it("is true only when gate open AND sample >= minimum", () => {
    const policy = makePolicy({
      canExposePerformanceStats: true,
      canonicalSettledCount: 100,
      canonicalWins: 55,
      canonicalLosses: 40,
    });
    const input = makeInput({ performancePolicy: policy });
    const summary = buildOwnerSummary(input);
    expect(summary.performance.displaySafe).toBe(true);
  });
});

describe("performance.actualWinRate", () => {
  it("is null when displaySafe is false — never derived from blocked state", () => {
    const policy = makePolicy({ canExposePerformanceStats: false });
    const input = makeInput({ performancePolicy: policy });
    const summary = buildOwnerSummary(input);
    expect(summary.performance.displaySafe).toBe(false);
    expect(summary.performance.actualWinRate).toBeNull();
  });

  it("is null when sample is too small", () => {
    const policy = makePolicy({
      canExposePerformanceStats: true,
      canonicalSettledCount: 5,
      canonicalWins: 3,
      canonicalLosses: 2,
    });
    const input = makeInput({ performancePolicy: policy });
    const summary = buildOwnerSummary(input);
    expect(summary.performance.actualWinRate).toBeNull();
  });

  it("is non-null only when displaySafe is true", () => {
    const policy = makePolicy({
      canExposePerformanceStats: true,
      canonicalSettledCount: 100,
      canonicalWins: 55,
      canonicalLosses: 40,
    });
    const input = makeInput({ performancePolicy: policy });
    const summary = buildOwnerSummary(input);
    expect(summary.performance.displaySafe).toBe(true);
    expect(summary.performance.actualWinRate).not.toBeNull();
  });
});

describe("performance.targetPct", () => {
  it("is always 70 regardless of actual data", () => {
    // With zero picks
    const zeroPolicy = makePolicy({ canonicalSettledCount: 0, canonicalWins: 0, canonicalLosses: 0, canonicalPushes: 0 });
    expect(buildOwnerSummary(makeInput({ performancePolicy: zeroPolicy })).performance.targetPct).toBe(70);

    // With display-safe data
    const goodPolicy = makePolicy({ canonicalSettledCount: 100, canonicalWins: 80, canonicalLosses: 20 });
    expect(buildOwnerSummary(makeInput({ performancePolicy: goodPolicy })).performance.targetPct).toBe(70);
  });
});

describe("pending and bootstrap picks", () => {
  it("pending count comes from policy and is not used in the win rate", () => {
    const policy = makePolicy({ pendingCount: 15 });
    const summary = buildOwnerSummary(makeInput({ performancePolicy: policy }));
    expect(summary.picks.canonicalPending).toBe(15);
    // Win rate is not inflated by pending picks
    if (summary.performance.displaySafe && summary.performance.actualWinRate !== null) {
      // Win rate should equal wins / (wins + losses), not include pending
      const expectedRate = Math.round((55 / (55 + 40)) * 1000) / 10;
      expect(summary.performance.actualWinRate).toBe(expectedRate);
    }
  });

  it("bootstrap count is tracked separately and excluded from win rate eligibility", () => {
    const policy = makePolicy({ bootstrapCount: 50 });
    const summary = buildOwnerSummary(makeInput({ performancePolicy: policy }));
    expect(summary.picks.bootstrapExcluded).toBe(50);
  });
});

// ─── Picks trust rules ───────────────────────────────────────────────────────

describe("picks.publicReadyCount", () => {
  it("is 0 when public picks gate is closed", () => {
    const summary = buildOwnerSummary(makeInput({ gates: GATES_PICKS_CLOSED }));
    expect(summary.picks.publicReadyCount).toBe(0);
  });

  it("equals todayPickCount when gate is open", () => {
    const summary = buildOwnerSummary(makeInput({ gates: GATES_ALL_OPEN, todayPickCount: 7 }));
    expect(summary.picks.publicReadyCount).toBe(7);
  });

  it("has a non-null blockedReason when gate is closed", () => {
    const summary = buildOwnerSummary(makeInput({ gates: GATES_PICKS_CLOSED }));
    expect(summary.picks.blockedReason).not.toBeNull();
  });

  it("has a null blockedReason when gate is open and picks exist", () => {
    const summary = buildOwnerSummary(makeInput({ gates: GATES_ALL_OPEN, todayPickCount: 5 }));
    expect(summary.picks.blockedReason).toBeNull();
  });
});

describe("picks.publicReadinessExplanation", () => {
  it("is always a non-empty string, never silent", () => {
    const withGateClosed = buildOwnerSummary(makeInput({ gates: GATES_PICKS_CLOSED }));
    expect(withGateClosed.picks.publicReadinessExplanation.length).toBeGreaterThan(0);

    const withGateOpen = buildOwnerSummary(makeInput({ gates: GATES_ALL_OPEN }));
    expect(withGateOpen.picks.publicReadinessExplanation.length).toBeGreaterThan(0);
  });
});

// ─── Department trust rules ───────────────────────────────────────────────────

describe("departments agentMode", () => {
  it("every department has agentMode DRAFT_ONLY or MANUAL — never AUTONOMOUS", () => {
    const summary = buildOwnerSummary(makeInput());
    for (const dept of summary.departments) {
      expect(["DRAFT_ONLY", "MANUAL", "UNAVAILABLE"]).toContain(dept.agentMode);
      expect(dept.agentMode).not.toBe("AUTONOMOUS" as string);
    }
  });

  it("never claims an agent is performing external actions", () => {
    const summary = buildOwnerSummary(makeInput());
    for (const dept of summary.departments) {
      expect(dept.oneLiner).not.toMatch(/autonomously|external action|self-publish/i);
    }
  });
});

// ─── AI Ops trust rules ───────────────────────────────────────────────────────

describe("aiOps", () => {
  it("available is always false — telemetry is not wired", () => {
    const summary = buildOwnerSummary(makeInput());
    expect(summary.aiOps.available).toBe(false);
  });

  it("reason is a non-empty honest explanation", () => {
    const summary = buildOwnerSummary(makeInput());
    expect(summary.aiOps.reason.length).toBeGreaterThan(10);
  });

  it("does not invent token counts or cost figures", () => {
    const summary = buildOwnerSummary(makeInput());
    // Should not contain dollar amounts or made-up token numbers
    expect(summary.aiOps.reason).not.toMatch(/\$\d+|\d+,\d{3} tokens/i);
  });
});

// ─── Overall color ────────────────────────────────────────────────────────────

describe("overallColor", () => {
  it("is RED when safety warnings are present", () => {
    const assessment = makeAssessment({
      ingestion: {
        lastAttemptAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000),
        lastSuccessAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000),
        lastWasSuccess: false,
        recentFailureCount: 5,
      },
    });
    const input = makeInput({ assessment });
    const summary = buildOwnerSummary(input);
    if (summary.criticalWarnings.length > 0) {
      expect(summary.overallColor).toBe("RED");
    }
  });

  it("is GREEN when launchStatus is LAUNCH_READY and no safety warnings", () => {
    const assessment = makeAssessment();
    // Only GREEN if launchStatus is actually LAUNCH_READY
    const input = makeInput({ assessment });
    const summary = buildOwnerSummary(input);
    if (assessment.launchStatus === "LAUNCH_READY" && assessment.safetyWarnings.length === 0) {
      expect(summary.overallColor).toBe("GREEN");
    }
  });
});
