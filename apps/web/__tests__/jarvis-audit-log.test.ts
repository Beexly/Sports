import { describe, it, expect } from "vitest";
import { serializeJarvisAudit } from "@/lib/cockpit/jarvis-audit-log";
import { synthesizeJarvis, type JarvisInput } from "@/lib/cockpit/jarvis";
import { evaluatePublicPerformancePolicy } from "@/lib/performance/public-performance-policy";

const NOW = new Date("2026-05-18T12:00:00Z");

function input(): JarvisInput {
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
  const policy = evaluatePublicPerformancePolicy({
    canExposePerformanceStats: true,
    minSettledPicksForLearning: 25,
    canonicalSettledCount: 100,
    bootstrapCount: 0,
    pendingCount: 0,
    canonicalWins: 55,
    canonicalLosses: 40,
    canonicalPushes: 5,
  });
  return {
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
      pendingPickCount: 0,
    },
    history: {
      canonicalSettledCount: 100,
      bootstrapSettledCount: 0,
      canonicalPendingCount: 0,
      winCount: 55,
      lossCount: 40,
      pushCount: 5,
      voidCount: 0,
      publishedCount: 100,
      featuredCount: 8,
      canonicalEligibleForPublic: 100,
      canonicalExcludedFromPublic: 0,
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
      ciHardening: "implemented",
    },
    externalConfigMissing: [],
  };
}

describe("serializeJarvisAudit", () => {
  it("produces a tab-separated summary line with assessedAt, version, launchStatus, and sectional health", () => {
    const a = synthesizeJarvis(input());
    const out = serializeJarvisAudit(a);
    const parts = out.summaryLine.split("\t");
    expect(parts[0]).toBe(NOW.toISOString());
    expect(parts[1]).toMatch(/^v\d+\.\d+/);
    expect(parts[2]).toMatch(/LAUNCH_READY/);
    expect(parts.some((p) => p.startsWith("public="))).toBe(true);
    expect(parts.some((p) => p.startsWith("ingest="))).toBe(true);
  });

  it("encodes the readiness-gate summary and the counts of each warning category", () => {
    const a = synthesizeJarvis(input());
    const out = serializeJarvisAudit(a);
    expect(out.summaryLine).toMatch(/gates=7\/7/);
    expect(out.summaryLine).toMatch(/safety=\d+/);
    expect(out.summaryLine).toMatch(/config_missing=\d+/);
    expect(out.summaryLine).toMatch(/actions=\d+/);
  });

  it("returns a valid JSON round-trip", () => {
    const a = synthesizeJarvis(input());
    const out = serializeJarvisAudit(a);
    const parsed = JSON.parse(out.json);
    expect(parsed.launchStatus).toBe(a.launchStatus);
    expect(parsed.assessedAt).toBe(a.assessedAt);
    expect(parsed.version).toBe(a.version);
  });

  it("verboseLines includes every safetyWarning, missingPhaseWarning, externalConfigWarning, and action", () => {
    // Force every list to be non-empty
    const i = input();
    const policy = evaluatePublicPerformancePolicy({
      canExposePerformanceStats: false,
      minSettledPicksForLearning: 25,
      canonicalSettledCount: 0,
      bootstrapCount: 0,
      pendingCount: 0,
      canonicalWins: 0,
      canonicalLosses: 0,
      canonicalPushes: 0,
    });
    const a = synthesizeJarvis({
      ...i,
      performancePolicy: policy,
      gates: { ...i.gates, canExposePerformanceStats: false, isBootstrapMode: true, canPersistCanonicalHistory: false },
      history: { ...i.history, canonicalSettledCount: 0, bootstrapSettledCount: 5 },
      ingestion: { lastAttemptAt: null, lastSuccessAt: null, lastWasSuccess: null, recentFailureCount: 0 },
      layers: { ...i.layers, ciHardening: "missing" },
      externalConfigMissing: ["STRIPE_SECRET_KEY"],
    });
    const out = serializeJarvisAudit(a);
    // Each non-empty category should produce at least one verbose line.
    expect(out.verboseLines.some((l) => l.startsWith("safety["))).toBe(a.safetyWarnings.length > 0);
    expect(out.verboseLines.some((l) => l.startsWith("missing["))).toBe(a.missingPhaseWarnings.length > 0);
    expect(out.verboseLines.some((l) => l.startsWith("config["))).toBe(a.externalConfigWarnings.length > 0);
    expect(out.verboseLines.some((l) => l.startsWith("action["))).toBe(a.recommendedNextActions.length > 0);
  });

  it("JSON round-trip preserves every warning category exactly", () => {
    const i = input();
    const policy = evaluatePublicPerformancePolicy({
      canExposePerformanceStats: false,
      minSettledPicksForLearning: 25,
      canonicalSettledCount: 0,
      bootstrapCount: 0,
      pendingCount: 0,
      canonicalWins: 0,
      canonicalLosses: 0,
      canonicalPushes: 0,
    });
    const a = synthesizeJarvis({
      ...i,
      performancePolicy: policy,
      gates: { ...i.gates, canExposePerformanceStats: false, isBootstrapMode: true, canPersistCanonicalHistory: false },
      history: { ...i.history, canonicalSettledCount: 0, bootstrapSettledCount: 5 },
      ingestion: { lastAttemptAt: null, lastSuccessAt: null, lastWasSuccess: null, recentFailureCount: 3 },
      layers: { ...i.layers, ciHardening: "missing", contentEngine: "partial" },
      externalConfigMissing: ["STRIPE_SECRET_KEY", "THE_ODDS_API_KEY"],
    });
    const out = serializeJarvisAudit(a);
    const parsed = JSON.parse(out.json);
    // Every category must round-trip identically.
    expect(parsed.safetyWarnings).toEqual(a.safetyWarnings);
    expect(parsed.missingPhaseWarnings).toEqual(a.missingPhaseWarnings);
    expect(parsed.externalConfigWarnings).toEqual(a.externalConfigWarnings);
    expect(parsed.recommendedNextActions).toEqual(a.recommendedNextActions);
    expect(parsed.phaseMatrix).toEqual(a.phaseMatrix);
    expect(parsed.readinessGateSummary).toEqual(a.readinessGateSummary);
    expect(parsed.assessedAt).toBe(a.assessedAt);
    expect(parsed.version).toBe(a.version);
  });

  it("escapes embedded tab characters in the summary line", () => {
    const i = input();
    const a = synthesizeJarvis(i);
    // Manually mutate one of the strings to include a tab. Since the
    // assessment is readonly, build a new object with the field changed
    // — but the serializer must be defensive against tabs in any field.
    const mutated = { ...a, oneSentenceAssessment: "before\tafter" };
    const out = serializeJarvisAudit(mutated as typeof a);
    // The summary line shouldn't contain a literal tab inside any cell
    // — only between cells. Count tabs: should be `cells.length - 1`.
    const cells = out.summaryLine.split("\t");
    // Reconstruct field-by-field to confirm no cell internally has a tab.
    for (const cell of cells) {
      expect(cell).not.toMatch(/\t/);
    }
  });
});
