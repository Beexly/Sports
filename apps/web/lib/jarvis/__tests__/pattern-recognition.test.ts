import { describe, it, expect } from "vitest";
import {
  detectPatterns,
  rankPatternsByUrgency,
  shouldSurfacePattern,
  buildPatternMemory,
  summarizePatternsForOwner,
  type ObservedPattern,
} from "../pattern-recognition";
import type { OwnerSummary } from "../../cockpit/owner-summary";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeSnapshot(overrides: Partial<OwnerSummary> = {}): OwnerSummary {
  return {
    overallColor: "GREEN",
    oneLiner: "Platform GREEN.",
    picks: {
      today: 3,
      isPublicGateOpen: true,
      publicReadyCount: 3,
      blockedReason: null,
      canonicalPending: 1,
      canonicalSettled: 10,
      bootstrapExcluded: 0,
      totalInSystem: 11,
      publicReadinessExplanation: "",
    },
    performance: {
      targetPct: 70,
      actualWinRate: null,
      canonicalSampleSize: 10,
      minimumRequired: 100,
      remainingToThreshold: 90,
      isGateOpen: false,
      displaySafe: false,
      gateBlockers: [],
      smallSampleWarning: true,
      record: "7-3",
    },
    departments: [],
    decisions: [],
    criticalWarnings: [],
    advisoryWarnings: [],
    aiOps: {
      available: false,
      reason: "Not wired",
      modelLanePolicy: [],
      toInstrumentNext: [],
      ccusageNote: "",
    },
    assessedAt: new Date().toISOString(),
    jarvisVersion: "v2-test",
    ...overrides,
  };
}

function makePattern(overrides: Partial<ObservedPattern> = {}): ObservedPattern {
  return {
    id: "test_pattern_1",
    type: "RECURRING_BLOCKER",
    description: "Gate has been closed.",
    firstObservedAt: new Date().toISOString(),
    lastObservedAt: new Date().toISOString(),
    occurrenceCount: 2,
    severity: "MEDIUM",
    recommendation: "Open the gate.",
    autoProposedImprovement: false,
    requiresOwnerAwareness: true,
    ...overrides,
  };
}

// ─── detectPatterns ───────────────────────────────────────────────────────────

describe("detectPatterns", () => {
  it("returns empty array for a single snapshot (needs ≥2)", () => {
    const single = [makeSnapshot()];
    expect(detectPatterns(single)).toHaveLength(0);
  });

  it("returns empty array for an empty history", () => {
    expect(detectPatterns([])).toHaveLength(0);
  });

  it("detects RECURRING_BLOCKER when gate is closed in 2+ snapshots", () => {
    const snapshots = [
      makeSnapshot({ picks: { ...makeSnapshot().picks, isPublicGateOpen: false } }),
      makeSnapshot({ picks: { ...makeSnapshot().picks, isPublicGateOpen: false } }),
    ];
    const patterns = detectPatterns(snapshots);
    const blocker = patterns.find((p) => p.type === "RECURRING_BLOCKER");
    expect(blocker).toBeDefined();
    expect(blocker?.occurrenceCount).toBeGreaterThanOrEqual(2);
  });

  it("detects DECISION_BACKLOG when decisions grow across snapshots", () => {
    const snapshots = [
      makeSnapshot({ decisions: [] }),
      makeSnapshot({ decisions: [{ urgency: "HIGH", description: "Decide something", link: null }] }),
    ];
    const patterns = detectPatterns(snapshots);
    const backlog = patterns.find((p) => p.type === "DECISION_BACKLOG");
    expect(backlog).toBeDefined();
  });

  it("returns only ObservedPattern objects with required fields", () => {
    const snapshots = [
      makeSnapshot({ criticalWarnings: ["Something critical"] }),
      makeSnapshot({ criticalWarnings: ["Something critical"] }),
    ];
    const patterns = detectPatterns(snapshots);
    for (const p of patterns) {
      expect(p.id).toBeTruthy();
      expect(p.type).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.severity).toMatch(/^(LOW|MEDIUM|HIGH|CRITICAL)$/);
      expect(p.recommendation).toBeTruthy();
      expect(typeof p.occurrenceCount).toBe("number");
    }
  });
});

// ─── rankPatternsByUrgency ────────────────────────────────────────────────────

describe("rankPatternsByUrgency", () => {
  it("sorts CRITICAL before HIGH before MEDIUM before LOW", () => {
    const patterns: ObservedPattern[] = [
      makePattern({ id: "low", severity: "LOW" }),
      makePattern({ id: "critical", severity: "CRITICAL" }),
      makePattern({ id: "medium", severity: "MEDIUM" }),
      makePattern({ id: "high", severity: "HIGH" }),
    ];
    const ranked = rankPatternsByUrgency(patterns);
    expect(ranked[0]?.severity).toBe("CRITICAL");
    expect(ranked[1]?.severity).toBe("HIGH");
    expect(ranked[2]?.severity).toBe("MEDIUM");
    expect(ranked[3]?.severity).toBe("LOW");
  });

  it("returns same length as input", () => {
    const patterns = [
      makePattern({ id: "p1", severity: "HIGH" }),
      makePattern({ id: "p2", severity: "LOW" }),
    ];
    expect(rankPatternsByUrgency(patterns)).toHaveLength(2);
  });

  it("does NOT mutate the original array", () => {
    const patterns: ObservedPattern[] = [
      makePattern({ id: "low", severity: "LOW" }),
      makePattern({ id: "critical", severity: "CRITICAL" }),
    ];
    const original = [...patterns];
    rankPatternsByUrgency(patterns);
    expect(patterns[0]?.severity).toBe(original[0]?.severity);
  });

  it("handles empty array", () => {
    expect(rankPatternsByUrgency([])).toHaveLength(0);
  });
});

// ─── shouldSurfacePattern ─────────────────────────────────────────────────────

describe("shouldSurfacePattern", () => {
  it("returns true for a pattern not yet surfaced", () => {
    const pattern = makePattern({ id: "new_pattern" });
    expect(shouldSurfacePattern(pattern, [])).toBe(true);
  });

  it("returns false for an already-surfaced pattern id", () => {
    const pattern = makePattern({ id: "already_surfaced" });
    expect(shouldSurfacePattern(pattern, ["already_surfaced"])).toBe(false);
  });

  it("returns true when surfaced list has other ids but not this one", () => {
    const pattern = makePattern({ id: "fresh" });
    expect(shouldSurfacePattern(pattern, ["other_id", "another_id"])).toBe(true);
  });
});

// ─── buildPatternMemory ───────────────────────────────────────────────────────

describe("buildPatternMemory", () => {
  it("returns a ScribeEntry of type PATTERN", () => {
    const patterns = [makePattern()];
    const entry = buildPatternMemory(patterns);
    expect(entry.type).toBe("PATTERN");
  });

  it("has a non-empty id, title, createdAt, and vaultPath", () => {
    const entry = buildPatternMemory([makePattern()]);
    expect(entry.id).toBeTruthy();
    expect(entry.title).toBeTruthy();
    expect(entry.createdAt).toBeTruthy();
    expect(entry.vaultPath).toBeTruthy();
    expect(() => new Date(entry.createdAt).toISOString()).not.toThrow();
  });

  it("body mentions 'No recurring patterns' when empty", () => {
    const entry = buildPatternMemory([]);
    expect(entry.body).toContain("No recurring patterns");
  });

  it("includes pattern type tags for non-empty patterns", () => {
    const pattern = makePattern({ id: "p1", type: "RECURRING_BLOCKER" });
    const entry = buildPatternMemory([pattern]);
    expect(entry.tags).toContain("recurring-blocker");
  });

  it("body includes pattern severity and recommendation for non-empty input", () => {
    const pattern = makePattern({
      severity: "HIGH",
      recommendation: "Fix the blocker immediately.",
    });
    const entry = buildPatternMemory([pattern]);
    expect(entry.body).toContain("HIGH");
    expect(entry.body).toContain("Fix the blocker immediately.");
  });
});

// ─── summarizePatternsForOwner ────────────────────────────────────────────────

describe("summarizePatternsForOwner", () => {
  it("returns 'No recurring patterns' for empty input", () => {
    const result = summarizePatternsForOwner([]);
    expect(result).toContain("No recurring patterns");
  });

  it("returns a numbered list for non-empty patterns", () => {
    const patterns = [makePattern({ id: "p1", severity: "HIGH" })];
    const result = summarizePatternsForOwner(patterns);
    expect(result).toContain("1.");
  });

  it("shows at most 3 items even with more patterns", () => {
    const patterns = Array.from({ length: 6 }, (_, i) =>
      makePattern({ id: `p${i}`, severity: "MEDIUM" }),
    );
    const result = summarizePatternsForOwner(patterns);
    const lineCount = result.split("\n").filter((l) => /^\s+\d+\./.test(l)).length;
    expect(lineCount).toBeLessThanOrEqual(3);
  });

  it("includes severity label in summary", () => {
    const pattern = makePattern({ severity: "CRITICAL", description: "Something critical." });
    const result = summarizePatternsForOwner([pattern]);
    expect(result).toContain("CRITICAL");
  });
});
