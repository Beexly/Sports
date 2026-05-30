/**
 * Targeted coverage for computeNextAction branches and safeVisibility cases
 * not reached by content-engine.test.ts or content-engine-readiness-gaps.test.ts.
 *
 * The primary test covers: READY_FOR_REVIEW, NEEDS_PERFORMANCE_GATE, BLOCKED,
 * INTERNAL_ONLY (MODEL_ACCOUNTABILITY_NOTE), NEEDS_SOURCE statuses — but does
 * NOT verify their nextRecommendedAction strings explicitly. The gaps test covers
 * NEEDS_AFFILIATE_DISCLOSURE, NEEDS_RESPONSIBLE_GAMING, NEEDS_COMPLIANCE, and
 * INTERNAL_ONLY (LINE_MOVEMENT_WATCH) nextRecommendedAction strings.
 *
 * This file covers the remaining nextRecommendedAction branches:
 *   - BLOCKED → "Resolve banned-phrase / hard-blocker findings..."
 *   - NEEDS_SOURCE → "Attach a verified source for each missing source type."
 *   - READY_FOR_REVIEW → "Route to AVA..."
 *   - INTERNAL_ONLY + MODEL_ACCOUNTABILITY_NOTE → special keep-INTERNAL message
 *
 * And safeVisibility branches not yet tested:
 *   - BLOCKED → "INTERNAL"
 *   - NEEDS_SOURCE → "INTERNAL"
 *   - READY_FOR_REVIEW → draft.visibility (PUBLIC when draft is PUBLIC)
 *   - NEEDS_AFFILIATE_DISCLOSURE → draft.visibility (not forced INTERNAL)
 *   - NEEDS_RESPONSIBLE_GAMING → draft.visibility (not forced INTERNAL)
 *
 * NOTE: NEEDS_PERFORMANCE_GATE readiness is structurally unreachable via
 * evaluateContentReadiness — when performanceGateOn=false and a PERFORMANCE
 * source is present, source-coverage.ts flags coverage as BLOCKED before the
 * perfStatus branch is reached in readiness.ts. The nextRecommendedAction
 * string for that branch cannot be exercised through the public API.
 */

import { describe, it, expect } from "vitest";
import {
  evaluateContentReadiness,
  type ContentDraftRecord,
  type ContentSourceRecord,
} from "@/lib/content-engine";

const NOW = new Date();

function makeSource(
  type: ContentSourceRecord["sourceType"],
  partial: Partial<ContentSourceRecord> = {}
): ContentSourceRecord {
  return {
    sourceType: type,
    sourceLabel: `${type} source`,
    sourceStatus: "FRESH",
    trustLevel: "PLATFORM",
    fetchedAt: NOW,
    sourceUrl: null,
    notes: null,
    ...partial,
  };
}

function makeDraft(
  partial: Partial<ContentDraftRecord> & { contentType: ContentDraftRecord["contentType"] }
): ContentDraftRecord {
  return {
    title: "Test draft",
    slug: "test-draft",
    status: "DRAFT",
    visibility: "PUBLIC",
    relatedPickIds: [],
    relatedPromotionIds: [],
    relatedBriefIds: [],
    sourceCoverageStatus: "COVERED",
    complianceStatus: "CLEAR",
    responsibleGamingIncluded: true,
    affiliateDisclosureIncluded: false,
    performanceGateStatus: "NOT_APPLICABLE",
    bannedPhraseScanClean: true,
    draftBody: "A valid draft body with no violations.",
    excerpt: null,
    generatedBy: "test",
    sources: [],
    ...partial,
  } as ContentDraftRecord;
}

// ============================================================
// nextRecommendedAction — BLOCKED
// ============================================================

describe("computeNextAction — BLOCKED", () => {
  it("nextRecommendedAction includes 'banned-phrase' for BLOCKED readiness", () => {
    const draft = makeDraft({
      contentType: "DAILY_BRIEF",
      // banned phrase triggers BLOCKED
      draftBody: "Tonight's lock pick is guaranteed.",
      responsibleGamingIncluded: true,
      sources: [
        makeSource("ODDS"),
        makeSource("DAILY_BRIEF"),
      ],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    expect(report.readiness).toBe("BLOCKED");
    expect(report.nextRecommendedAction).toContain("banned-phrase");
  });

  it("safeVisibility is INTERNAL when readiness is BLOCKED", () => {
    const draft = makeDraft({
      contentType: "DAILY_BRIEF",
      draftBody: "Tonight's lock pick is guaranteed.",
      responsibleGamingIncluded: true,
      visibility: "PUBLIC",
      sources: [makeSource("ODDS"), makeSource("DAILY_BRIEF")],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    expect(report.safeVisibility).toBe("INTERNAL");
  });
});

// ============================================================
// nextRecommendedAction — NEEDS_SOURCE
// ============================================================

describe("computeNextAction — NEEDS_SOURCE", () => {
  it("nextRecommendedAction includes 'verified source' for NEEDS_SOURCE readiness", () => {
    const draft = makeDraft({
      contentType: "DAILY_BRIEF",
      draftBody: "Tonight's slate. Bet responsibly.",
      responsibleGamingIncluded: true,
      sources: [], // no sources → NEEDS_SOURCE
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    expect(report.readiness).toBe("NEEDS_SOURCE");
    expect(report.nextRecommendedAction).toContain("verified source");
  });

  it("safeVisibility is INTERNAL when readiness is NEEDS_SOURCE", () => {
    const draft = makeDraft({
      contentType: "DAILY_BRIEF",
      draftBody: "Tonight's slate. Bet responsibly.",
      responsibleGamingIncluded: true,
      visibility: "PUBLIC",
      sources: [],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    expect(report.safeVisibility).toBe("INTERNAL");
  });
});

// ============================================================
// safeVisibility — NEEDS_AFFILIATE_DISCLOSURE and NEEDS_RESPONSIBLE_GAMING
// (these are NOT in the INTERNAL condition list — safeVisibility = draft.visibility)
// ============================================================

describe("safeVisibility — NEEDS_AFFILIATE_DISCLOSURE uses draft.visibility (not INTERNAL)", () => {
  it("safeVisibility is draft.visibility (PUBLIC) when readiness is NEEDS_AFFILIATE_DISCLOSURE", () => {
    const draft = makeDraft({
      contentType: "PROMOTION_ROUNDUP",
      draftBody: "Check out these promotions. Bet responsibly.",
      responsibleGamingIncluded: true,
      affiliateDisclosureIncluded: false, // triggers NEEDS_AFFILIATE_DISCLOSURE
      visibility: "PUBLIC",
      sources: [
        makeSource("PROMOTION_TERMS", {
          trustLevel: "AUTHORITATIVE",
          sourceUrl: "https://example.com/terms",
        }),
        makeSource("RESPONSIBLE_GAMING", { trustLevel: "AUTHORITATIVE" }),
      ],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    expect(report.readiness).toBe("NEEDS_AFFILIATE_DISCLOSURE");
    expect(report.safeVisibility).toBe("PUBLIC");
  });
});

describe("safeVisibility — NEEDS_RESPONSIBLE_GAMING uses draft.visibility (not INTERNAL)", () => {
  it("safeVisibility is draft.visibility (PUBLIC) when readiness is NEEDS_RESPONSIBLE_GAMING", () => {
    const draft = makeDraft({
      contentType: "DAILY_BRIEF",
      draftBody: "Tonight's slate.",
      responsibleGamingIncluded: false, // triggers NEEDS_RESPONSIBLE_GAMING
      visibility: "PUBLIC",
      sources: [makeSource("ODDS"), makeSource("DAILY_BRIEF")],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    expect(report.readiness).toBe("NEEDS_RESPONSIBLE_GAMING");
    expect(report.safeVisibility).toBe("PUBLIC");
  });
});

// ============================================================
// nextRecommendedAction — READY_FOR_REVIEW
// ============================================================

describe("computeNextAction — READY_FOR_REVIEW", () => {
  it("nextRecommendedAction includes 'AVA' for READY_FOR_REVIEW readiness", () => {
    const draft = makeDraft({
      contentType: "METHODOLOGY_EDUCATION",
      draftBody: "The model reads factor data. No recommendation is implied.",
      responsibleGamingIncluded: false,
      sources: [
        makeSource("METHODOLOGY", { trustLevel: "PLATFORM" }),
      ],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    expect(report.readiness).toBe("READY_FOR_REVIEW");
    expect(report.nextRecommendedAction).toContain("AVA");
  });

  it("safeVisibility is draft.visibility (PUBLIC) when readiness is READY_FOR_REVIEW", () => {
    const draft = makeDraft({
      contentType: "METHODOLOGY_EDUCATION",
      draftBody: "The model reads factor data. No recommendation is implied.",
      responsibleGamingIncluded: false,
      visibility: "PUBLIC",
      sources: [
        makeSource("METHODOLOGY", { trustLevel: "PLATFORM" }),
      ],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    expect(report.readiness).toBe("READY_FOR_REVIEW");
    expect(report.safeVisibility).toBe("PUBLIC");
  });
});

// ============================================================
// nextRecommendedAction — INTERNAL_ONLY with MODEL_ACCOUNTABILITY_NOTE
// ============================================================

describe("computeNextAction — INTERNAL_ONLY with MODEL_ACCOUNTABILITY_NOTE", () => {
  it("has a specific keep-INTERNAL message that mentions 'operator decision'", () => {
    const draft = makeDraft({
      contentType: "MODEL_ACCOUNTABILITY_NOTE",
      draftBody: "Open calibration proposal. Version v5.1.0 is pending review.",
      responsibleGamingIncluded: false,
      sources: [
        makeSource("CALIBRATION", { trustLevel: "AUTHORITATIVE" }),
        makeSource("METHODOLOGY"),
      ],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    expect(report.readiness).toBe("INTERNAL_ONLY");
    expect(report.nextRecommendedAction).toContain("operator decision");
    expect(report.nextRecommendedAction).not.toContain("public-safe variant");
  });

  it("uses generic INTERNAL message for other INTERNAL_ONLY types (LINE_MOVEMENT_WATCH)", () => {
    const draft = makeDraft({
      contentType: "LINE_MOVEMENT_WATCH",
      draftBody: "The line moved 2.5 points. Bet responsibly.",
      responsibleGamingIncluded: true,
      sources: [makeSource("ODDS")],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    expect(report.readiness).toBe("INTERNAL_ONLY");
    expect(report.nextRecommendedAction).toContain("public-safe variant");
    expect(report.nextRecommendedAction).not.toContain("operator decision");
  });
});
