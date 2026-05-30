/**
 * Targeted coverage for evaluateContentReadiness branches not reached by
 * content-engine.test.ts.
 *
 * The primary test covers: READY_FOR_REVIEW (methodology), NEEDS_PERFORMANCE_GATE,
 * BLOCKED (banned phrase), INTERNAL_ONLY (MODEL_ACCOUNTABILITY_NOTE), NEEDS_SOURCE.
 *
 * This file covers: NEEDS_AFFILIATE_DISCLOSURE (PROMOTION_ROUNDUP without
 * disclosure but with valid sources), NEEDS_RESPONSIBLE_GAMING (DAILY_BRIEF
 * without RG line but with sources), NEEDS_COMPLIANCE (REVIEW_REQUIRED
 * compliance with empty body), computeNextAction for each missing branch,
 * INTERNAL_ONLY with LINE_MOVEMENT_WATCH (different hint), formatDraftForReview
 * summary fallbacks (no excerpt → first body line; empty body → "(no body)").
 */

import { describe, it, expect } from "vitest";
import {
  evaluateContentReadiness,
  formatDraftForReview,
  type ContentDraftRecord,
  type ContentSourceRecord,
} from "@/lib/content-engine";

const fresh = new Date();

function makeSource(
  type: ContentSourceRecord["sourceType"],
  partial: Partial<ContentSourceRecord> = {}
): ContentSourceRecord {
  return {
    sourceType: type,
    sourceLabel: `${type} source`,
    sourceStatus: "FRESH",
    trustLevel: "PLATFORM",
    fetchedAt: fresh,
    sourceUrl: null,
    notes: null,
    ...partial,
  };
}

function makeDraft(
  partial: Partial<ContentDraftRecord> & {
    contentType: ContentDraftRecord["contentType"];
  }
): ContentDraftRecord {
  return {
    title: "Test draft",
    slug: "test-draft",
    status: "DRAFT",
    visibility: "INTERNAL",
    relatedPickIds: [],
    relatedPromotionIds: [],
    relatedBriefIds: [],
    sourceCoverageStatus: "NEEDS_SOURCE",
    complianceStatus: "REVIEW_REQUIRED",
    responsibleGamingIncluded: false,
    affiliateDisclosureIncluded: false,
    performanceGateStatus: "NOT_APPLICABLE",
    bannedPhraseScanClean: true,
    draftBody: "Body content here.",
    excerpt: null,
    generatedBy: "test",
    sources: [],
    ...partial,
  } as ContentDraftRecord;
}

// ============================================================
// NEEDS_AFFILIATE_DISCLOSURE
// ============================================================

describe("evaluateContentReadiness — NEEDS_AFFILIATE_DISCLOSURE", () => {
  it("returns NEEDS_AFFILIATE_DISCLOSURE for PROMOTION_ROUNDUP with valid sources but no disclosure", () => {
    const draft = makeDraft({
      contentType: "PROMOTION_ROUNDUP",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: true,
      sources: [
        makeSource("PROMOTION_TERMS", {
          trustLevel: "AUTHORITATIVE",
          sourceUrl: "https://promo.example.com/terms",
        }),
        makeSource("RESPONSIBLE_GAMING"),
      ],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    expect(report.readiness).toBe("NEEDS_AFFILIATE_DISCLOSURE");
  });

  it("nextRecommendedAction for NEEDS_AFFILIATE_DISCLOSURE mentions affiliate-disclosure block", () => {
    const draft = makeDraft({
      contentType: "PROMOTION_ROUNDUP",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: true,
      sources: [
        makeSource("PROMOTION_TERMS", {
          trustLevel: "AUTHORITATIVE",
          sourceUrl: "https://promo.example.com/terms",
        }),
        makeSource("RESPONSIBLE_GAMING"),
      ],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    expect(report.nextRecommendedAction).toContain("affiliate-disclosure");
  });
});

// ============================================================
// NEEDS_RESPONSIBLE_GAMING
// ============================================================

describe("evaluateContentReadiness — NEEDS_RESPONSIBLE_GAMING", () => {
  it("returns NEEDS_RESPONSIBLE_GAMING for DAILY_BRIEF with sources but without RG line", () => {
    const draft = makeDraft({
      contentType: "DAILY_BRIEF",
      responsibleGamingIncluded: false,
      affiliateDisclosureIncluded: false,
      sources: [
        makeSource("ODDS"),
        makeSource("DAILY_BRIEF"),
      ],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    expect(report.readiness).toBe("NEEDS_RESPONSIBLE_GAMING");
  });

  it("nextRecommendedAction for NEEDS_RESPONSIBLE_GAMING mentions responsible-gambling line", () => {
    const draft = makeDraft({
      contentType: "DAILY_BRIEF",
      responsibleGamingIncluded: false,
      affiliateDisclosureIncluded: false,
      sources: [
        makeSource("ODDS"),
        makeSource("DAILY_BRIEF"),
      ],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    expect(report.nextRecommendedAction).toContain("responsible-gambling");
  });
});

// ============================================================
// NEEDS_COMPLIANCE (compliance.status === REVIEW_REQUIRED)
// ============================================================

describe("evaluateContentReadiness — NEEDS_COMPLIANCE", () => {
  it("returns NEEDS_COMPLIANCE when DAILY_BRIEF has empty body (empty body blocker → REVIEW_REQUIRED)", () => {
    const draft = makeDraft({
      contentType: "DAILY_BRIEF",
      responsibleGamingIncluded: true,
      affiliateDisclosureIncluded: false,
      draftBody: "",
      sources: [
        makeSource("ODDS"),
        makeSource("DAILY_BRIEF"),
      ],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    expect(report.readiness).toBe("NEEDS_COMPLIANCE");
  });

  it("nextRecommendedAction for NEEDS_COMPLIANCE mentions compliance review", () => {
    const draft = makeDraft({
      contentType: "DAILY_BRIEF",
      responsibleGamingIncluded: true,
      affiliateDisclosureIncluded: false,
      draftBody: "",
      sources: [
        makeSource("ODDS"),
        makeSource("DAILY_BRIEF"),
      ],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    expect(report.nextRecommendedAction).toContain("compliance");
  });

  it("safeVisibility is INTERNAL when readiness is NEEDS_COMPLIANCE", () => {
    const draft = makeDraft({
      contentType: "DAILY_BRIEF",
      responsibleGamingIncluded: true,
      draftBody: "",
      visibility: "PUBLIC",
      sources: [
        makeSource("ODDS"),
        makeSource("DAILY_BRIEF"),
      ],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    expect(report.readiness).toBe("NEEDS_COMPLIANCE");
    expect(report.safeVisibility).toBe("INTERNAL");
  });
});

// ============================================================
// INTERNAL_ONLY with LINE_MOVEMENT_WATCH (non-MODEL_ACCOUNTABILITY_NOTE)
// ============================================================

describe("evaluateContentReadiness — INTERNAL_ONLY for LINE_MOVEMENT_WATCH", () => {
  it("returns INTERNAL_ONLY for LINE_MOVEMENT_WATCH even when sources and RG are present", () => {
    const draft = makeDraft({
      contentType: "LINE_MOVEMENT_WATCH",
      responsibleGamingIncluded: true,
      affiliateDisclosureIncluded: false,
      sources: [makeSource("ODDS")],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    expect(report.readiness).toBe("INTERNAL_ONLY");
  });

  it("nextRecommendedAction for LINE_MOVEMENT_WATCH INTERNAL_ONLY uses generic internal hint", () => {
    const draft = makeDraft({
      contentType: "LINE_MOVEMENT_WATCH",
      responsibleGamingIncluded: true,
      sources: [makeSource("ODDS")],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    // Generic hint — different from MODEL_ACCOUNTABILITY_NOTE's calibration-specific hint
    expect(report.nextRecommendedAction).not.toContain("calibration");
    expect(report.nextRecommendedAction).toContain("INTERNAL");
  });
});

// ============================================================
// formatDraftForReview — summary fallbacks
// ============================================================

describe("formatDraftForReview — summary from body (no excerpt)", () => {
  it("uses the first non-empty body line when excerpt is null", () => {
    const draft = makeDraft({
      contentType: "METHODOLOGY_EDUCATION",
      excerpt: null,
      draftBody: "First body line.\nSecond line.",
      sources: [makeSource("METHODOLOGY")],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    const formatted = formatDraftForReview(draft, report);
    expect(formatted.summary).toBe("First body line.");
  });

  it("uses the first non-empty body line when excerpt is whitespace", () => {
    const draft = makeDraft({
      contentType: "METHODOLOGY_EDUCATION",
      excerpt: "   ",
      draftBody: "\nActual first line.",
      sources: [makeSource("METHODOLOGY")],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    const formatted = formatDraftForReview(draft, report);
    expect(formatted.summary).toBe("Actual first line.");
  });
});

describe("formatDraftForReview — summary fallback to '(no body)'", () => {
  it("returns '(no body)' when both excerpt and draftBody are empty", () => {
    const draft = makeDraft({
      contentType: "METHODOLOGY_EDUCATION",
      excerpt: null,
      draftBody: "",
      sources: [makeSource("METHODOLOGY")],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    const formatted = formatDraftForReview(draft, report);
    expect(formatted.summary).toBe("(no body)");
  });
});

describe("formatDraftForReview — uses excerpt when present", () => {
  it("prefers excerpt over body when excerpt has content", () => {
    const draft = makeDraft({
      contentType: "METHODOLOGY_EDUCATION",
      excerpt: "This is the excerpt.",
      draftBody: "This is the body.",
      sources: [makeSource("METHODOLOGY")],
    });
    const report = evaluateContentReadiness({ draft, performanceGateOn: true });
    const formatted = formatDraftForReview(draft, report);
    expect(formatted.summary).toBe("This is the excerpt.");
  });
});
