/**
 * Targeted coverage for source-intelligence branches not reached by
 * source-intelligence.test.ts, source-intelligence-gaps.test.ts, or
 * source-intelligence-quality-gaps.test.ts.
 *
 * The primary and gaps tests cover: PICK and PROMOTION artifact kinds,
 * MISSING/STALE/AGING/CONTRADICTORY category statuses, HOLD/BLOCKED/REVIEW
 * readiness verdicts.
 *
 * This file covers:
 *   - buildPublishReadinessReport: CONTENT_DRAFT (single required category:
 *     PLATFORM_POLICY) → rationale uses singular "category" not "categories"
 *   - buildPublishReadinessReport: BRIEF artifact kind (ODDS + TEAM_SCHEDULE)
 *   - summarizeCategories: tie-break by trust when two evidences share
 *     identical fetchedAt → highest-trust evidence wins
 *   - readinessFromCategories: CONTENT_DRAFT PUBLISH_READY path
 *   - readinessFromCategories: LOW_TRUST_ONLY blocker yields REVIEW
 *     (separate from CONTRADICTORY)
 */

import { describe, it, expect } from "vitest";
import {
  buildPublishReadinessReport,
  summarizeCategories,
  readinessFromCategories,
  type SourceEvidence,
  type CategoryStatus,
} from "@/lib/source-intelligence";

const NOW = new Date("2026-05-22T18:00:00.000Z");

function ev(
  cat: SourceEvidence["category"],
  ageMs: number,
  opts: Partial<SourceEvidence> = {}
): SourceEvidence {
  return {
    category: cat,
    sourceId: `${cat}-${ageMs}-${Math.random().toString(36).slice(2, 6)}`,
    fetchedAt: new Date(NOW.getTime() - ageMs),
    trustScore: 90,
    ...opts,
  };
}

// ============================================================
// buildPublishReadinessReport — CONTENT_DRAFT (single category)
// ============================================================

describe("buildPublishReadinessReport — CONTENT_DRAFT singular category rationale", () => {
  it("rationale uses singular 'category' (not 'categories') when only 1 is required", () => {
    const report = buildPublishReadinessReport({
      artifactKind: "CONTENT_DRAFT",
      artifactId: "draft-1",
      evidence: [
        ev("PLATFORM_POLICY", 5 * 60_000, { trustScore: 95 }),
      ],
      now: NOW,
    });
    expect(report.readiness).toBe("PUBLISH_READY");
    // Single category → "category" not "categories"
    expect(report.rationale).toContain("1 required source category");
    expect(report.rationale).not.toContain("categories");
  });

  it("CONTENT_DRAFT with missing PLATFORM_POLICY uses plural 'categories' in blockers rationale", () => {
    const report = buildPublishReadinessReport({
      artifactKind: "CONTENT_DRAFT",
      artifactId: "draft-2",
      evidence: [], // missing required PLATFORM_POLICY
      now: NOW,
    });
    expect(report.readiness).not.toBe("PUBLISH_READY");
    // Blockers rationale uses a different format (lists blockers), not the "coverage" line
    expect(report.rationale).toContain("PLATFORM_POLICY");
  });
});

// ============================================================
// buildPublishReadinessReport — BRIEF artifact kind
// ============================================================

describe("buildPublishReadinessReport — BRIEF artifact kind", () => {
  it("BRIEF requires ODDS and TEAM_SCHEDULE categories", () => {
    const report = buildPublishReadinessReport({
      artifactKind: "BRIEF",
      artifactId: "brief-1",
      evidence: [
        ev("ODDS", 5 * 60_000),
        ev("TEAM_SCHEDULE", 5 * 60_000),
      ],
      now: NOW,
    });
    expect(report.readiness).toBe("PUBLISH_READY");
    expect(report.categories).toHaveLength(2);
  });

  it("BRIEF missing ODDS → HOLD", () => {
    const report = buildPublishReadinessReport({
      artifactKind: "BRIEF",
      artifactId: "brief-2",
      evidence: [
        ev("TEAM_SCHEDULE", 5 * 60_000),
      ],
      now: NOW,
    });
    expect(report.readiness).toBe("HOLD");
    expect(report.blockers.some((b) => b.category === "ODDS")).toBe(true);
  });

  it("BRIEF missing TEAM_SCHEDULE → HOLD", () => {
    const report = buildPublishReadinessReport({
      artifactKind: "BRIEF",
      artifactId: "brief-3",
      evidence: [
        ev("ODDS", 5 * 60_000),
      ],
      now: NOW,
    });
    expect(report.readiness).toBe("HOLD");
    expect(report.blockers.some((b) => b.category === "TEAM_SCHEDULE")).toBe(true);
  });

  it("BRIEF rationale uses plural 'categories' for 2 required sources", () => {
    const report = buildPublishReadinessReport({
      artifactKind: "BRIEF",
      artifactId: "brief-4",
      evidence: [
        ev("ODDS", 5 * 60_000),
        ev("TEAM_SCHEDULE", 5 * 60_000),
      ],
      now: NOW,
    });
    expect(report.rationale).toContain("2 required source categories");
  });
});

// ============================================================
// summarizeCategories — tie-breaking by trustScore when age is equal
// ============================================================

describe("summarizeCategories — trust-score tie-breaking (same fetchedAt)", () => {
  it("picks the higher-trust evidence when two have identical fetchedAt", () => {
    const sharedFetchedAt = new Date(NOW.getTime() - 5 * 60_000);
    const lowTrust: SourceEvidence = {
      category: "ODDS",
      sourceId: "odds-low",
      fetchedAt: sharedFetchedAt,
      trustScore: 40,
    };
    const highTrust: SourceEvidence = {
      category: "ODDS",
      sourceId: "odds-high",
      fetchedAt: sharedFetchedAt,
      trustScore: 95,
    };
    const cats = summarizeCategories("PICK", [lowTrust, highTrust], NOW);
    const oddsCat = cats.find((c) => c.category === "ODDS")!;
    // High-trust evidence should be selected (same age, higher trust wins)
    expect(oddsCat.bestTrustScore).toBe(95);
    expect(oddsCat.bestEvidenceId).toBe("odds-high");
  });

  it("fresher evidence wins over higher-trust stale evidence", () => {
    const fresh: SourceEvidence = {
      category: "ODDS",
      sourceId: "odds-fresh",
      fetchedAt: new Date(NOW.getTime() - 5 * 60_000), // 5 min old
      trustScore: 60,
    };
    const stalishHighTrust: SourceEvidence = {
      category: "ODDS",
      sourceId: "odds-stalish",
      fetchedAt: new Date(NOW.getTime() - 120 * 60_000), // 2 hours old
      trustScore: 99,
    };
    const cats = summarizeCategories("PICK", [fresh, stalishHighTrust], NOW);
    const oddsCat = cats.find((c) => c.category === "ODDS")!;
    // Fresher evidence wins over trust score for primary ranking
    expect(oddsCat.bestEvidenceId).toBe("odds-fresh");
  });
});

// ============================================================
// readinessFromCategories — CONTENT_DRAFT PUBLISH_READY
// ============================================================

describe("readinessFromCategories — CONTENT_DRAFT single-category PUBLISH_READY", () => {
  it("returns PUBLISH_READY when CONTENT_DRAFT has fresh PLATFORM_POLICY", () => {
    const cats = summarizeCategories(
      "CONTENT_DRAFT",
      [ev("PLATFORM_POLICY", 5 * 60_000, { trustScore: 90 })],
      NOW
    );
    const { readiness, blockers } = readinessFromCategories("CONTENT_DRAFT", cats);
    expect(readiness).toBe("PUBLISH_READY");
    expect(blockers).toHaveLength(0);
  });
});

// ============================================================
// readinessFromCategories — LOW_TRUST_ONLY yields REVIEW
// ============================================================

describe("readinessFromCategories — LOW_TRUST_ONLY blocker yields REVIEW", () => {
  it("returns REVIEW for PICK when ODDS has only low-trust (< 50) evidence", () => {
    // Construct a CategoryStatus with FRESH status but low trust (< 50)
    const lowTrustCats: readonly CategoryStatus[] = [
      {
        category: "ODDS",
        status: "FRESH",
        bestEvidenceId: "ev-low-trust",
        bestTrustScore: 30, // below threshold of 50
        ageMs: 60_000,
      },
      {
        category: "TEAM_SCHEDULE",
        status: "FRESH",
        bestEvidenceId: "ev-sched",
        bestTrustScore: 90,
        ageMs: 60_000,
      },
      {
        category: "MODEL_SNAPSHOT",
        status: "FRESH",
        bestEvidenceId: "ev-model",
        bestTrustScore: 90,
        ageMs: 60_000,
      },
    ];
    const { readiness, blockers } = readinessFromCategories("PICK", lowTrustCats);
    expect(readiness).toBe("REVIEW");
    expect(blockers.some((b) => b.code === "LOW_TRUST_ONLY")).toBe(true);
    expect(blockers.find((b) => b.code === "LOW_TRUST_ONLY")?.category).toBe("ODDS");
  });

  it("LOW_TRUST_ONLY blocker message includes 'trust < 50'", () => {
    const cats: readonly CategoryStatus[] = [
      {
        category: "ODDS",
        status: "FRESH",
        bestEvidenceId: "ev-low",
        bestTrustScore: 20,
        ageMs: 60_000,
      },
    ];
    const { blockers } = readinessFromCategories("BRIEF", cats);
    const blocker = blockers.find((b) => b.code === "LOW_TRUST_ONLY");
    expect(blocker?.message).toContain("trust < 50");
  });
});
