import { describe, it, expect } from "vitest";
import { askJarvis, JARVIS_QUESTIONS, JARVIS_INTENT_ORDER } from "@/lib/cockpit/ask-jarvis";
import { buildOwnerSummary, type BuildOwnerSummaryInput, type GatesForOwnerSummary } from "@/lib/cockpit/owner-summary";
import { synthesizeJarvis, type JarvisInput } from "@/lib/cockpit/jarvis";
import { evaluatePublicPerformancePolicy } from "@/lib/performance/public-performance-policy";

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
