import { describe, it, expect } from "vitest";
import { askJarvis, JARVIS_QUESTIONS, JARVIS_INTENT_ORDER } from "@/lib/cockpit/ask-jarvis";
import { buildOwnerSummary, type BuildOwnerSummaryInput, type GatesForOwnerSummary } from "@/lib/cockpit/owner-summary";
import { synthesizeJarvis, type JarvisInput } from "@/lib/cockpit/jarvis";
import { evaluatePublicPerformancePolicy } from "@/lib/performance/public-performance-policy";
import { CAPABILITY_REGISTRY } from "@/lib/jarvis/capability-registry";
import { buildMemoryStatus } from "@/lib/jarvis/intelligence-state";

const NOW = new Date("2026-05-18T12:00:00Z");

const GATES_OPEN: GatesForOwnerSummary = {
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
  const jarvisGates = {
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
    gates: jarvisGates,
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

function makeSummary(overrides: Partial<BuildOwnerSummaryInput> = {}) {
  return buildOwnerSummary({
    assessment: makeAssessment(),
    performancePolicy: makePolicy(),
    gates: GATES_OPEN,
    todayPickCount: 8,
    ...overrides,
  });
}

// ─── Structural tests ─────────────────────────────────────────────────────────

describe("askJarvis structural contract", () => {
  it("handles all registered intents without throwing", () => {
    const summary = makeSummary();
    for (const intent of JARVIS_INTENT_ORDER) {
      expect(() => askJarvis(intent, summary)).not.toThrow();
    }
  });

  it("returns the matching intent and question on every answer", () => {
    const summary = makeSummary();
    for (const intent of JARVIS_INTENT_ORDER) {
      const answer = askJarvis(intent, summary);
      expect(answer.intent).toBe(intent);
      expect(answer.question).toBe(JARVIS_QUESTIONS[intent]);
    }
  });

  it("every answer has a non-empty answer string", () => {
    const summary = makeSummary();
    for (const intent of JARVIS_INTENT_ORDER) {
      const answer = askJarvis(intent, summary);
      expect(answer.answer.length).toBeGreaterThan(0);
    }
  });

  it("confidence is always HIGH, MEDIUM, or LOW", () => {
    const summary = makeSummary();
    const valid = new Set(["HIGH", "MEDIUM", "LOW"]);
    for (const intent of JARVIS_INTENT_ORDER) {
      expect(valid.has(askJarvis(intent, summary).confidence)).toBe(true);
    }
  });
});

// ─── Picks intent ────────────────────────────────────────────────────────────

describe("askJarvis('picks')", () => {
  it("mentions today's pick count from summary state", () => {
    const summary = makeSummary({ todayPickCount: 12 });
    const answer = askJarvis("picks", summary);
    expect(answer.answer).toMatch(/12/);
  });

  it("indicates gate is closed when public picks gate is off", () => {
    const summary = makeSummary({ gates: GATES_PICKS_CLOSED, todayPickCount: 3 });
    const answer = askJarvis("picks", summary);
    expect(answer.answer.toLowerCase()).toMatch(/internal|gate|closed/);
  });

  it("does not invent pick counts not in the summary", () => {
    const summary = makeSummary({ todayPickCount: 0 });
    const answer = askJarvis("picks", summary);
    // Should not claim non-zero picks
    expect(answer.answer).not.toMatch(/[1-9]\d* pick[s]? (published|live)/i);
  });
});

// ─── Performance intent ───────────────────────────────────────────────────────

describe("askJarvis('performance')", () => {
  it("always references the 70% target, never claims it is achieved without data", () => {
    const summary = makeSummary();
    const answer = askJarvis("performance", summary);
    expect(answer.answer).toMatch(/70%/);
    // caveat must be present
    expect(answer.caveat).not.toBeNull();
    expect(answer.caveat?.length ?? 0).toBeGreaterThan(0);
  });

  it("says no/gated when performance gate is off", () => {
    const policy = makePolicy({ canExposePerformanceStats: false });
    const summary = makeSummary({ performancePolicy: policy });
    const answer = askJarvis("performance", summary);
    expect(answer.answer.toLowerCase()).toMatch(/no|gated|gate is/);
  });

  it("says no/gated when sample is insufficient", () => {
    const policy = makePolicy({
      canExposePerformanceStats: true,
      canonicalSettledCount: 5,
      canonicalWins: 3,
      canonicalLosses: 2,
    });
    const summary = makeSummary({ performancePolicy: policy });
    const answer = askJarvis("performance", summary);
    expect(answer.answer.toLowerCase()).toMatch(/not yet|too small|sample|gated/);
  });

  it("does not claim the 70% target as achieved in the answer text", () => {
    // Even when displaySafe, the answer shows the measured rate — not 70% as 'achieved'
    const policy = makePolicy({
      canExposePerformanceStats: true,
      canonicalSettledCount: 100,
      canonicalWins: 55,
      canonicalLosses: 40,
    });
    const summary = makeSummary({ performancePolicy: policy });
    const answer = askJarvis("performance", summary);
    // The answer may mention 70% as the target but must not say "achieved 70%"
    expect(answer.answer).not.toMatch(/achieved 70%|reached 70%/i);
  });

  it("supporting state always includes 'bootstrap excluded' and 'pending excluded'", () => {
    const summary = makeSummary();
    const answer = askJarvis("performance", summary);
    const supportText = answer.supportingState.join(" ").toLowerCase();
    expect(supportText).toMatch(/bootstrap/);
    expect(supportText).toMatch(/pending/);
  });

  it("does not falsely claim 'gated' with empty blockers when gate is open and the sample is all pushes", () => {
    // Gate open, canonical sample met (>= minimum), but every settled pick is a
    // PUSH → no win/loss outcomes → publicWinRate is null while displaySafe stays
    // true. This must not fall through to the "Performance display is gated.
    // Blockers: ." branch (empty blocker list = false 'gated' claim).
    const policy = makePolicy({
      canExposePerformanceStats: true,
      canonicalSettledCount: 100,
      canonicalWins: 0,
      canonicalLosses: 0,
      canonicalPushes: 100,
    });
    const summary = makeSummary({ performancePolicy: policy });

    // Precondition: the exact state the bug required.
    expect(summary.performance.displaySafe).toBe(true);
    expect(summary.performance.actualWinRate).toBeNull();
    expect(summary.performance.remainingToThreshold).toBe(0);
    expect(summary.performance.gateBlockers).toEqual([]);

    const answer = askJarvis("performance", summary);
    // Must NOT assert the display is gated when it is not.
    expect(answer.answer.toLowerCase()).not.toMatch(/display is gated/);
    // Must NOT emit an empty blockers list.
    expect(answer.answer).not.toMatch(/blockers:\s*\.?\s*$/i);
    // Honest state: acknowledge no win/loss outcomes yet.
    expect(answer.answer.toLowerCase()).toMatch(/win\/loss|pushes|no win rate|once picks settle/);
  });
});

// ─── Blocked intent ───────────────────────────────────────────────────────────

describe("askJarvis('blocked')", () => {
  it("reports no blockers when platform is stable", () => {
    const summary = makeSummary();
    const answer = askJarvis("blocked", summary);
    // If no critical items exist, says nothing is blocked
    if (summary.decisions.filter((d) => d.urgency === "CRITICAL").length === 0) {
      expect(answer.answer.toLowerCase()).toMatch(/nothing|no critical|stable/);
    }
  });

  it("surfacing blockers when safety warnings exist", () => {
    // Build an assessment with ingestion failures that trigger safety warnings
    const assessment = makeAssessment({
      ingestion: {
        lastAttemptAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000),
        lastSuccessAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000),
        lastWasSuccess: false,
        recentFailureCount: 5,
      },
    });
    const summary = makeSummary({ assessment });
    const answer = askJarvis("blocked", summary);
    if (summary.criticalWarnings.length > 0) {
      expect(answer.answer.toLowerCase()).toMatch(/warning|blocked|critical/);
    }
  });
});

// ─── Workers intent ───────────────────────────────────────────────────────────

describe("askJarvis('workers')", () => {
  it("never describes agents as autonomous", () => {
    const summary = makeSummary();
    const answer = askJarvis("workers", summary);
    const full = [answer.answer, ...answer.supportingState].join(" ").toLowerCase();
    expect(full).not.toMatch(/autonomous|self-acting|publishes automatically/);
  });

  it("mentions DRAFT_ONLY or draft constraint", () => {
    const summary = makeSummary();
    const answer = askJarvis("workers", summary);
    const full = [answer.answer, ...answer.supportingState, answer.caveat ?? ""].join(" ").toLowerCase();
    expect(full).toMatch(/draft|approval|human/);
  });
});

// ─── AI Ops intent ────────────────────────────────────────────────────────────

describe("askJarvis('ai-ops')", () => {
  it("says telemetry is not available — honest unavailable state", () => {
    const summary = makeSummary();
    const answer = askJarvis("ai-ops", summary);
    expect(answer.answer.toLowerCase()).toMatch(/not yet|unavailable|not instrumented/);
  });

  it("does not invent cost figures or token counts", () => {
    const summary = makeSummary();
    const answer = askJarvis("ai-ops", summary);
    const full = [answer.answer, ...answer.supportingState].join(" ");
    expect(full).not.toMatch(/\$\d+\.\d{2}|\d{3,},\d{3} tokens/);
  });

  it("includes model lane policy in supporting state", () => {
    const summary = makeSummary();
    const answer = askJarvis("ai-ops", summary);
    const supportText = answer.supportingState.join(" ").toLowerCase();
    expect(supportText).toMatch(/sonnet|opus|haiku|codex/i);
  });
});

// ─── Meeting intent ───────────────────────────────────────────────────────────

describe("askJarvis('meeting')", () => {
  it("never shares gated performance stats as public claims", () => {
    const policy = makePolicy({ canExposePerformanceStats: false });
    const summary = makeSummary({ performancePolicy: policy });
    const answer = askJarvis("meeting", summary);
    const full = [answer.answer, ...answer.supportingState].join(" ");
    // Should not expose a win rate when gated
    if (!summary.performance.displaySafe) {
      expect(full).not.toMatch(/win rate: \d+%/);
    }
  });

  it("caveat mentions not sharing 70% target as an achieved result", () => {
    const summary = makeSummary();
    const answer = askJarvis("meeting", summary);
    expect(answer.caveat?.toLowerCase()).toMatch(/70%|target|achieved|public/);
  });
});

// ─── JARVIS_QUESTIONS completeness ────────────────────────────────────────────

describe("JARVIS_QUESTIONS", () => {
  it("has a question string for every intent in JARVIS_INTENT_ORDER", () => {
    for (const intent of JARVIS_INTENT_ORDER) {
      expect(JARVIS_QUESTIONS[intent]).toBeTruthy();
      expect(JARVIS_QUESTIONS[intent].endsWith("?")).toBe(true);
    }
  });
});

// ─── Operator-assistant truth audit (2026-08-25) ─────────────────────────────
//
// These assert that the answers the operator actually reads are DERIVED from
// the registries they claim to summarize, not hand-written prose that drifts
// away from them. A hardcoded list cannot pass a test that reads the registry.
//
// Runtime assertions only: apps/web/tsconfig.json excludes __tests__, so a
// type-level check here would never be verified.

describe("askJarvis('what-is-not-wired') — derived from the capability registry", () => {
  const missing = CAPABILITY_REGISTRY.filter(
    (c) => c.status === "NOT_WIRED" || c.status === "DESIGNED"
  );

  it("names every NOT_WIRED / DESIGNED capability in the answer prose", () => {
    const answer = askJarvis("what-is-not-wired", makeSummary());
    for (const cap of missing) {
      expect(answer.answer).toContain(cap.name);
    }
  });

  it("names no capability the registry reports as wired (DRAFT_ONLY / MANUAL / ACTIVE)", () => {
    const answer = askJarvis("what-is-not-wired", makeSummary());
    const wired = CAPABILITY_REGISTRY.filter(
      (c) => c.status === "DRAFT_ONLY" || c.status === "MANUAL" || c.status === "ACTIVE"
    );
    for (const cap of wired) {
      expect(answer.answer).not.toContain(cap.name);
    }
  });

  it("does not describe Agent Orchestration or Market / Line Intelligence as non-functional while the registry rates them DRAFT_ONLY", () => {
    const answer = askJarvis("what-is-not-wired", makeSummary());
    const prose = answer.answer.toLowerCase();
    const orchestration = CAPABILITY_REGISTRY.find((c) => c.id === "agent-orchestration");
    const market = CAPABILITY_REGISTRY.find((c) => c.id === "market-line-intelligence");
    if (orchestration && orchestration.status !== "NOT_WIRED" && orchestration.status !== "DESIGNED") {
      expect(prose).not.toContain("agent orchestration");
    }
    if (market && market.status !== "NOT_WIRED" && market.status !== "DESIGNED") {
      expect(prose).not.toContain("market/clv intelligence");
    }
  });

  it("the count in the prose matches the number of capabilities it names", () => {
    const answer = askJarvis("what-is-not-wired", makeSummary());
    expect(answer.answer).toContain(
      `${missing.length} of ${CAPABILITY_REGISTRY.length} capabilities`
    );
    const named = CAPABILITY_REGISTRY.filter((c) => answer.answer.includes(c.name));
    expect(named.length).toBe(missing.length);
  });
});

describe("askJarvis('what-can-run') — human-triggered examples come from the registry", () => {
  const manual = CAPABILITY_REGISTRY.filter((c) => c.status === "MANUAL");

  it("names every MANUAL capability it counts", () => {
    const answer = askJarvis("what-can-run", makeSummary());
    for (const cap of manual) {
      expect(answer.answer).toContain(cap.name);
    }
  });

  it("does not cite settlement as human-triggered unless a MANUAL capability is named for it", () => {
    const answer = askJarvis("what-can-run", makeSummary());
    const settlementIsManual = manual.some((c) => c.name.toLowerCase().includes("settlement"));
    if (!settlementIsManual) {
      expect(answer.answer.toLowerCase()).not.toContain("settlement");
    }
  });

  it("the prose and the supporting MANUAL line agree", () => {
    const answer = askJarvis("what-can-run", makeSummary());
    const supportLine = answer.supportingState.find((s) => s.startsWith("Human-triggered (MANUAL):"));
    expect(supportLine).toBeDefined();
    for (const cap of manual) {
      expect(supportLine).toContain(cap.name);
      expect(answer.answer).toContain(cap.name);
    }
  });
});

describe("askJarvis('workers') — UNKNOWN is reported as unknown, not as failure", () => {
  function unknownStatusSummary() {
    const assessment = makeAssessment({
      ingestion: {
        lastAttemptAt: null,
        lastSuccessAt: null,
        lastWasSuccess: null,
        recentFailureCount: 0,
      },
      settlement: {
        lastSettlementAt: null,
        settledIn24h: 0,
        pendingPickCount: 0,
      },
    });
    return makeSummary({ assessment });
  }

  it("the fixture really produces UNKNOWN department statuses", () => {
    const summary = unknownStatusSummary();
    const ingestion = summary.departments.find((d) => d.id === "data-reliability");
    const settlement = summary.departments.find((d) => d.id === "settlement-results");
    expect(ingestion?.status).toBe("UNKNOWN");
    expect(settlement?.status).toBe("UNKNOWN");
  });

  it("does not assert that workers have issues when both statuses are UNKNOWN", () => {
    const answer = askJarvis("workers", unknownStatusSummary());
    expect(answer.answer.toLowerCase()).not.toContain("workers have issues");
  });

  it("reports LOW confidence when a key status is UNKNOWN", () => {
    const answer = askJarvis("workers", unknownStatusSummary());
    expect(answer.confidence).toBe("LOW");
  });

  it("still reports a real problem when one status is RED, even alongside an UNKNOWN", () => {
    const assessment = makeAssessment({
      ingestion: {
        lastAttemptAt: null,
        lastSuccessAt: null,
        lastWasSuccess: null,
        recentFailureCount: 0,
      },
      settlement: {
        lastSettlementAt: new Date(NOW.getTime() - 1000 * 60 * 60 * 24 * 5),
        settledIn24h: 0,
        pendingPickCount: 12,
      },
    });
    const answer = askJarvis("workers", makeSummary({ assessment }));
    expect(answer.answer.toLowerCase()).toContain("workers have issues");
  });

  it("keeps HIGH confidence and the healthy answer when both statuses are GREEN", () => {
    const answer = askJarvis("workers", makeSummary());
    const ingestion = makeSummary().departments.find((d) => d.id === "data-reliability");
    const settlement = makeSummary().departments.find((d) => d.id === "settlement-results");
    if (ingestion?.status === "GREEN" && settlement?.status === "GREEN") {
      expect(answer.confidence).toBe("HIGH");
      expect(answer.answer.toLowerCase()).toContain("running normally");
    }
  });
});

describe("askJarvis('what-is-memory-status') — derived from the memory status object", () => {
  it("states the memory truth string the status builder reports, verbatim", () => {
    const answer = askJarvis("what-is-memory-status", makeSummary());
    expect(answer.answer).toContain(buildMemoryStatus().truth);
  });

  it("names the store the status builder reports", () => {
    const answer = askJarvis("what-is-memory-status", makeSummary());
    expect(answer.answer).toContain(buildMemoryStatus().store);
  });

  it("still reports the not-wired posture today (buildMemoryStatus is not wired)", () => {
    const memory = buildMemoryStatus();
    expect(memory.wired).toBe(false);
    const answer = askJarvis("what-is-memory-status", makeSummary());
    expect(answer.answer).toMatch(/no persistent memory/i);
    expect(answer.supportingState.join("\n")).toContain("Memory wired: NO");
  });
});
