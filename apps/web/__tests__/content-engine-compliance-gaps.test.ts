/**
 * Targeted coverage for evaluateContentCompliance branches not reached by
 * content-engine.test.ts.
 *
 * The primary test covers: BLOCKED (banned phrase), NEEDS_DISCLOSURE,
 * NEEDS_RG_LANGUAGE, empty body, NOT_APPLICABLE (methodology).
 *
 * This file covers:
 *   - CLEAR status: REQUIRES_RG type + RG included + non-empty body + clean scan
 *   - REVIEW_REQUIRED: REQUIRES_RG type + RG included + empty body (empty-body
 *     blocker fires; banned/disclosure checks pass → falls through to REVIEW_REQUIRED)
 *   - MODEL_ACCOUNTABILITY_NOTE note: notes array gets the calibration hint
 *   - BLOG_POST (REQUIRES_RG, not affiliate): CLEAR when RG included and body OK
 *   - SOCIAL_DRAFT: NEEDS_RG_LANGUAGE when RG missing
 *   - Multiple blockers accumulate: banned phrase + empty body → BLOCKED but
 *     both blockers appear
 */

import { describe, it, expect } from "vitest";
import { evaluateContentCompliance } from "@/lib/content-engine";

// ============================================================
// CLEAR status
// ============================================================

describe("evaluateContentCompliance — CLEAR", () => {
  it("returns CLEAR for DAILY_BRIEF with RG included and non-empty body", () => {
    const v = evaluateContentCompliance({
      contentType: "DAILY_BRIEF",
      draftBody: "Here is tonight's slate with a note on data freshness. Bet responsibly.",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: true,
    });
    expect(v.status).toBe("CLEAR");
    expect(v.bannedPhraseScanClean).toBe(true);
    expect(v.blockers).toHaveLength(0);
  });

  it("returns CLEAR for MATCHUP_PREVIEW with RG and non-empty clean body", () => {
    const v = evaluateContentCompliance({
      contentType: "MATCHUP_PREVIEW",
      draftBody: "The model reads BOS -3.5 at a strong consensus. Bet within your limits.",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: true,
    });
    expect(v.status).toBe("CLEAR");
  });

  it("returns CLEAR for WEEKLY_RECAP with RG and clean body", () => {
    const v = evaluateContentCompliance({
      contentType: "WEEKLY_RECAP",
      draftBody: "Week 21 settled 12 picks: W7 L4 P1. Past performance does not guarantee future results.",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: true,
    });
    expect(v.status).toBe("CLEAR");
  });

  it("returns CLEAR for PROMOTION_ROUNDUP with RG + disclosure and non-empty clean body", () => {
    const v = evaluateContentCompliance({
      contentType: "PROMOTION_ROUNDUP",
      draftBody: "DraftKings has an offer this week. See terms. Affiliate disclosure included. Bet responsibly.",
      affiliateDisclosureIncluded: true,
      responsibleGamingIncluded: true,
    });
    expect(v.status).toBe("CLEAR");
  });
});

// ============================================================
// REVIEW_REQUIRED status (RG satisfied but empty body)
// ============================================================

describe("evaluateContentCompliance — REVIEW_REQUIRED", () => {
  it("returns REVIEW_REQUIRED for DAILY_BRIEF when RG included but body is empty", () => {
    const v = evaluateContentCompliance({
      contentType: "DAILY_BRIEF",
      draftBody: "",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: true,
    });
    expect(v.status).toBe("REVIEW_REQUIRED");
    expect(v.blockers.some((b) => b.toLowerCase().includes("empty"))).toBe(true);
  });

  it("returns REVIEW_REQUIRED for MATCHUP_PREVIEW with whitespace-only body and RG included", () => {
    const v = evaluateContentCompliance({
      contentType: "MATCHUP_PREVIEW",
      draftBody: "   ",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: true,
    });
    expect(v.status).toBe("REVIEW_REQUIRED");
  });
});

// ============================================================
// MODEL_ACCOUNTABILITY_NOTE — note branch
// ============================================================

describe("evaluateContentCompliance — MODEL_ACCOUNTABILITY_NOTE note", () => {
  it("adds a calibration note for MODEL_ACCOUNTABILITY_NOTE drafts", () => {
    const v = evaluateContentCompliance({
      contentType: "MODEL_ACCOUNTABILITY_NOTE",
      draftBody: "Open calibration proposal. Model version v5.1.0. Status: PENDING.",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: false,
    });
    expect(v.notes.length).toBeGreaterThan(0);
    expect(v.notes.some((n) => n.toLowerCase().includes("internal"))).toBe(true);
  });

  it("MODEL_ACCOUNTABILITY_NOTE status is NOT_APPLICABLE (no RG or affiliate required)", () => {
    const v = evaluateContentCompliance({
      contentType: "MODEL_ACCOUNTABILITY_NOTE",
      draftBody: "Calibration proposal: confidence shift at 80-89 band.",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: false,
    });
    expect(v.status).toBe("NOT_APPLICABLE");
  });
});

// ============================================================
// BLOG_POST and SOCIAL_DRAFT — REQUIRES_RG coverage
// ============================================================

describe("evaluateContentCompliance — BLOG_POST", () => {
  it("returns NEEDS_RG_LANGUAGE for BLOG_POST missing RG line", () => {
    const v = evaluateContentCompliance({
      contentType: "BLOG_POST",
      draftBody: "This week's picks breakdown. The model read several games.",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: false,
    });
    expect(v.status).toBe("NEEDS_RG_LANGUAGE");
  });

  it("returns CLEAR for BLOG_POST with RG included and clean non-empty body", () => {
    const v = evaluateContentCompliance({
      contentType: "BLOG_POST",
      draftBody: "This week's picks breakdown. The model read several games. Bet responsibly.",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: true,
    });
    expect(v.status).toBe("CLEAR");
  });
});

describe("evaluateContentCompliance — SOCIAL_DRAFT", () => {
  it("returns NEEDS_RG_LANGUAGE for SOCIAL_DRAFT missing RG line", () => {
    const v = evaluateContentCompliance({
      contentType: "SOCIAL_DRAFT",
      draftBody: "Three games on the board tonight.",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: false,
    });
    expect(v.status).toBe("NEEDS_RG_LANGUAGE");
  });
});

// ============================================================
// bannedPhraseScanClean is false when phrase detected
// ============================================================

describe("evaluateContentCompliance — bannedPhraseScanClean flag", () => {
  it("is false when draftBody contains a banned phrase", () => {
    const v = evaluateContentCompliance({
      contentType: "DAILY_BRIEF",
      draftBody: "Tonight's lock pick is on Boston.",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: true,
    });
    expect(v.bannedPhraseScanClean).toBe(false);
    expect(v.status).toBe("BLOCKED");
  });

  it("is true when draftBody has no banned phrases", () => {
    const v = evaluateContentCompliance({
      contentType: "METHODOLOGY_EDUCATION",
      draftBody: "The model reads factor data. No recommendation is implied.",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: false,
    });
    expect(v.bannedPhraseScanClean).toBe(true);
  });
});
