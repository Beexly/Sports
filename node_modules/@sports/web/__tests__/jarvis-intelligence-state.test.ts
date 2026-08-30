import { describe, it, expect } from "vitest";
import {
  buildIntelligenceState,
  buildCapabilityStats,
  buildMemoryStatus,
  getOperatingLoop,
  type OperatingPhase,
} from "@/lib/jarvis/intelligence-state";
import { CAPABILITY_REGISTRY } from "@/lib/jarvis/capability-registry";
import { AGENT_COUNCIL } from "@/lib/jarvis/agent-council";
import { askJarvis } from "@/lib/cockpit/ask-jarvis";
import {
  buildOwnerSummary,
  type BuildOwnerSummaryInput,
  type GatesForOwnerSummary,
} from "@/lib/cockpit/owner-summary";
import { synthesizeJarvis, type JarvisInput } from "@/lib/cockpit/jarvis";
import { evaluatePublicPerformancePolicy } from "@/lib/performance/public-performance-policy";

/**
 * Intelligence state contract.
 *
 * buildIntelligenceState composes live operational truth (OwnerSummary) with
 * static architecture truth (capability registry + agent council + operating
 * loop + memory protocol). These tests pin the honesty invariants: memory is
 * not wired, REMEMBER/IMPROVE phases are not wired, and the architecture
 * intents of Ask Jarvis report those facts truthfully.
 */

const NOW = new Date("2026-05-18T12:00:00Z");

const GATES_OPEN: GatesForOwnerSummary = {
  canExposePublicPicks: true,
  isBootstrapMode: false,
  minSettledPicksForLearning: 25,
};

function makePolicy() {
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
  });
}

function makeAssessment() {
  const input: JarvisInput = {
    now: NOW,
    gates: {
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
    },
    performancePolicy: makePolicy(),
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
  };
  return synthesizeJarvis(input);
}

function makeSummary(overrides: Partial<BuildOwnerSummaryInput> = {}) {
  return buildOwnerSummary({
    assessment: makeAssessment(),
    performancePolicy: makePolicy(),
    gates: GATES_OPEN,
    todayPickCount: 8,
    ...overrides,
  });
}

// ─── Composition ──────────────────────────────────────────────────────────────

describe("buildIntelligenceState", () => {
  it("composes summary, registries, loop, and memory into one state", () => {
    const summary = makeSummary();
    const state = buildIntelligenceState(summary);
    expect(state.summary).toBe(summary);
    expect(state.capabilities).toBe(CAPABILITY_REGISTRY);
    expect(state.council).toBe(AGENT_COUNCIL);
    expect(state.operatingLoop.length).toBe(8);
    expect(state.memory.wired).toBe(false);
  });

  it("mirrors the summary's assessedAt — state is only as fresh as the summary", () => {
    const summary = makeSummary();
    const state = buildIntelligenceState(summary);
    expect(state.assessedAt).toBe(summary.assessedAt);
  });

  it("is serializable (no functions, no Dates)", () => {
    const state = buildIntelligenceState(makeSummary());
    expect(() => JSON.stringify(state)).not.toThrow();
  });
});

describe("capability stats", () => {
  it("status counts partition the registry and report zero ACTIVE", () => {
    const stats = buildCapabilityStats();
    expect(stats.total).toBe(CAPABILITY_REGISTRY.length);
    expect(
      stats.active + stats.draftOnly + stats.manual + stats.designed + stats.notWired
    ).toBe(stats.total);
    expect(stats.active).toBe(0);
  });

  it("wiring score is bounded and labeled", () => {
    const stats = buildCapabilityStats();
    expect(stats.wiringScore).toBeGreaterThanOrEqual(0);
    expect(stats.wiringScore).toBeLessThanOrEqual(100);
    expect(stats.wiringLabel.length).toBeGreaterThan(0);
  });
});

// ─── Operating loop honesty ───────────────────────────────────────────────────

describe("operating loop", () => {
  const EXPECTED_ORDER: readonly OperatingPhase[] = [
    "SENSE",
    "INTERPRET",
    "DECIDE",
    "EXPLAIN",
    "ACT_SAFELY",
    "REMEMBER",
    "AUDIT",
    "IMPROVE",
  ];

  it("covers all eight phases in operating order", () => {
    expect(getOperatingLoop().map((p) => p.phase)).toEqual(EXPECTED_ORDER);
  });

  it("REMEMBER and IMPROVE are honestly NOT_WIRED", () => {
    const loop = getOperatingLoop();
    expect(loop.find((p) => p.phase === "REMEMBER")?.status).toBe("NOT_WIRED");
    expect(loop.find((p) => p.phase === "IMPROVE")?.status).toBe("NOT_WIRED");
  });

  it("ACT_SAFELY is at most PARTIAL — there is no autonomous execution path", () => {
    const act = getOperatingLoop().find((p) => p.phase === "ACT_SAFELY");
    expect(act?.status).not.toBe("WIRED");
  });

  it("every phase carries a truth statement", () => {
    for (const p of getOperatingLoop()) {
      expect(p.truth.length, p.phase).toBeGreaterThan(0);
    }
  });
});

// ─── Memory honesty ───────────────────────────────────────────────────────────

describe("memory status", () => {
  it("memory is not wired and says so", () => {
    const memory = buildMemoryStatus();
    expect(memory.wired).toBe(false);
    expect(memory.truth).toMatch(/no persistent memory/i);
  });

  it("write path is gated OFF by default — independent of, and as honest as, read-wired status", () => {
    const memory = buildMemoryStatus();
    expect(memory.writePath).toBe("WIRED_GATED_OFF");
    expect(memory.writePathTruth).toMatch(/gated OFF/i);
  });

  it("lists the five version-controlled protocol docs", () => {
    const memory = buildMemoryStatus();
    expect(memory.protocolDocs.length).toBe(5);
    for (const doc of memory.protocolDocs) {
      expect(doc).toMatch(/^docs\/ai\/jarvis\/JARVIS_[A-Z_]+\.md$/);
    }
  });
});

// ─── Architecture intents answer truthfully from this state ──────────────────

describe("ask-jarvis architecture intents", () => {
  it("'what-is-wired' reports the wiring score and zero autonomy", () => {
    const answer = askJarvis("what-is-wired", makeSummary());
    expect(answer.answer).toMatch(/none autonomous/i);
    expect(answer.answer).toMatch(/\d+\/100/);
  });

  it("'what-can-run' is honest that nothing runs autonomously", () => {
    const answer = askJarvis("what-can-run", makeSummary());
    expect(answer.answer).toMatch(/nothing runs autonomously/i);
  });

  it("'what-is-memory-status' reports memory as absent, never recalled", () => {
    const answer = askJarvis("what-is-memory-status", makeSummary());
    expect(answer.answer).toMatch(/no persistent memory/i);
    expect(answer.supportingState.join("\n")).toMatch(/Memory wired: NO/);
  });

  it("'which-agent-owns-this' lists every council seat", () => {
    const answer = askJarvis("which-agent-owns-this", makeSummary());
    expect(answer.supportingState.length).toBe(AGENT_COUNCIL.length);
  });

  it("'what-is-not-wired' surfaces the designed-but-missing capabilities", () => {
    const answer = askJarvis("what-is-not-wired", makeSummary());
    const missing = CAPABILITY_REGISTRY.filter(
      (c) => c.status === "NOT_WIRED" || c.status === "DESIGNED"
    );
    expect(answer.supportingState.length).toBe(missing.length);
  });

  it("'what-should-we-build-next' ranks MANUAL capabilities first", () => {
    const answer = askJarvis("what-should-we-build-next", makeSummary());
    expect(answer.supportingState[0]).toMatch(/^\[MANUAL\]/);
  });
});
