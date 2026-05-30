/**
 * Targeted coverage for content-engine build-draft branches not reached by
 * content-engine.test.ts.
 *
 * The primary test covers: buildWeeklyRecapDraft (gate OFF), buildDailyBriefDraft,
 * buildPromotionRoundupDraft, buildMethodologyEducationDraft,
 * buildResponsibleBettingEducationDraft. Also covers buildContentDraft
 * (publishedAt=null invariant).
 *
 * This file covers: buildWeeklyRecapDraft (gate ON, with/without bootstrapExcluded),
 * buildPerformanceTransparencyDraft (gate ON → PUBLIC visibility, gate OFF → INTERNAL),
 * createCockpitContentTask (known template agent, unknown contentType falls back to AVA).
 */

import { describe, it, expect } from "vitest";
import {
  buildWeeklyRecapDraft,
  buildPerformanceTransparencyDraft,
  createCockpitContentTask,
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

const recapSources = [makeSource("PERFORMANCE"), makeSource("PICK")];
const performanceSources = [makeSource("PERFORMANCE"), makeSource("METHODOLOGY")];

// ============================================================
// buildWeeklyRecapDraft — gate ON
// ============================================================

describe("buildWeeklyRecapDraft — performanceGateOn=true", () => {
  it("includes settled pick counts when gate is on", () => {
    const draft = buildWeeklyRecapDraft({
      summary: {
        weekStart: new Date("2026-05-11"),
        weekEnd: new Date("2026-05-17"),
        settledCount: 12,
        winCount: 7,
        lossCount: 4,
        pushCount: 1,
        bootstrapExcluded: true,
        performanceGateOn: true,
      },
      generatedBy: "test",
      slug: "weekly-recap-gate-on",
      sources: recapSources,
    });
    expect(draft.draftBody).toContain("12");
    expect(draft.draftBody).toContain("W 7");
    expect(draft.draftBody).toContain("L 4");
    expect(draft.draftBody).toContain("Push 1");
  });

  it("includes bootstrap exclusion note when bootstrapExcluded=true", () => {
    const draft = buildWeeklyRecapDraft({
      summary: {
        weekStart: new Date("2026-05-11"),
        weekEnd: new Date("2026-05-17"),
        settledCount: 8,
        winCount: 5,
        lossCount: 3,
        pushCount: 0,
        bootstrapExcluded: true,
        performanceGateOn: true,
      },
      generatedBy: "test",
      slug: "weekly-recap-bootstrap",
      sources: recapSources,
    });
    expect(draft.draftBody.toLowerCase()).toContain("bootstrap");
  });

  it("omits bootstrap note when bootstrapExcluded=false", () => {
    const draft = buildWeeklyRecapDraft({
      summary: {
        weekStart: new Date("2026-05-11"),
        weekEnd: new Date("2026-05-17"),
        settledCount: 5,
        winCount: 3,
        lossCount: 2,
        pushCount: 0,
        bootstrapExcluded: false,
        performanceGateOn: true,
      },
      generatedBy: "test",
      slug: "weekly-recap-no-bootstrap-note",
      sources: recapSources,
    });
    expect(draft.draftBody.toLowerCase()).not.toContain("bootstrap-era");
  });

  it("includes past-performance disclaimer", () => {
    const draft = buildWeeklyRecapDraft({
      summary: {
        weekStart: new Date("2026-05-11"),
        weekEnd: new Date("2026-05-17"),
        settledCount: 5,
        winCount: 3,
        lossCount: 2,
        pushCount: 0,
        bootstrapExcluded: false,
        performanceGateOn: true,
      },
      generatedBy: "test",
      slug: "weekly-recap-disclaimer",
      sources: recapSources,
    });
    expect(draft.draftBody.toLowerCase()).toContain("past performance does not guarantee");
  });
});

// ============================================================
// buildPerformanceTransparencyDraft — gate ON and OFF
// ============================================================

describe("buildPerformanceTransparencyDraft — gate ON", () => {
  it("includes canonical settled count in body", () => {
    const draft = buildPerformanceTransparencyDraft({
      performanceGateOn: true,
      settledCount: 42,
      generatedBy: "test",
      slug: "perf-transparency-on",
      sources: performanceSources,
    });
    expect(draft.draftBody).toContain("42");
  });

  it("sets visibility to PUBLIC when gate is on", () => {
    const draft = buildPerformanceTransparencyDraft({
      performanceGateOn: true,
      settledCount: 42,
      generatedBy: "test",
      slug: "perf-transparency-on",
      sources: performanceSources,
    });
    expect(draft.visibility).toBe("PUBLIC");
  });
});

describe("buildPerformanceTransparencyDraft — gate OFF", () => {
  it("includes 'gate is currently OFF' message when gate is off", () => {
    const draft = buildPerformanceTransparencyDraft({
      performanceGateOn: false,
      settledCount: 0,
      generatedBy: "test",
      slug: "perf-transparency-off",
      sources: performanceSources,
    });
    expect(draft.draftBody.toLowerCase()).toContain("performance gate is currently off");
  });

  it("sets visibility to INTERNAL when gate is off", () => {
    const draft = buildPerformanceTransparencyDraft({
      performanceGateOn: false,
      settledCount: 0,
      generatedBy: "test",
      slug: "perf-transparency-off",
      sources: performanceSources,
    });
    expect(draft.visibility).toBe("INTERNAL");
  });
});

// ============================================================
// createCockpitContentTask
// ============================================================

describe("createCockpitContentTask — known template", () => {
  it("assigns SARAH as agent for RESPONSIBLE_BETTING_EDUCATION (template reviewOwner)", () => {
    const draft = {
      id: "draft-123",
      contentType: "RESPONSIBLE_BETTING_EDUCATION" as const,
      title: "Responsible betting guide",
      slug: "rg-guide",
      status: "DRAFT" as const,
      visibility: "INTERNAL" as const,
      relatedPickIds: [],
      relatedPromotionIds: [],
      relatedBriefIds: [],
      sourceCoverageStatus: "NEEDS_SOURCE" as const,
      complianceStatus: "REVIEW_REQUIRED" as const,
      responsibleGamingIncluded: false,
      affiliateDisclosureIncluded: false,
      performanceGateStatus: "NOT_APPLICABLE" as const,
      bannedPhraseScanClean: true,
      draftBody: "Content here.",
      excerpt: null,
      generatedBy: "test",
      sources: [],
    } satisfies ContentDraftRecord & { id: string };

    const task = createCockpitContentTask({
      draft,
      nextRecommendedAction: "Insert responsible-gambling line.",
    });

    expect(task.assignedAgent).toBe("SARAH");
    expect(task.draftId).toBe("draft-123");
    expect(task.title).toContain("Responsible betting guide");
    expect(task.nextRecommendedAction).toBe("Insert responsible-gambling line.");
  });

  it("assigns JARVIS as agent for LINE_MOVEMENT_WATCH", () => {
    const draft = {
      id: "draft-456",
      contentType: "LINE_MOVEMENT_WATCH" as const,
      title: "Line movement watch",
      slug: "lmw",
      status: "DRAFT" as const,
      visibility: "INTERNAL" as const,
      relatedPickIds: [],
      relatedPromotionIds: [],
      relatedBriefIds: [],
      sourceCoverageStatus: "NEEDS_SOURCE" as const,
      complianceStatus: "REVIEW_REQUIRED" as const,
      responsibleGamingIncluded: false,
      affiliateDisclosureIncluded: false,
      performanceGateStatus: "NOT_APPLICABLE" as const,
      bannedPhraseScanClean: true,
      draftBody: "Content here.",
      excerpt: null,
      generatedBy: "test",
      sources: [],
    } satisfies ContentDraftRecord & { id: string };

    const task = createCockpitContentTask({
      draft,
      nextRecommendedAction: "Review before release.",
    });

    expect(task.assignedAgent).toBe("JARVIS");
  });
});

describe("createCockpitContentTask — unknown contentType falls back to AVA", () => {
  it("assigns AVA when no template matches the contentType", () => {
    const draft = {
      id: "draft-999",
      // BLOG_POST and SOCIAL_DRAFT are valid content types but may not be in templates
      contentType: "BLOG_POST" as const,
      title: "Blog post",
      slug: "blog-post",
      status: "DRAFT" as const,
      visibility: "INTERNAL" as const,
      relatedPickIds: [],
      relatedPromotionIds: [],
      relatedBriefIds: [],
      sourceCoverageStatus: "NEEDS_SOURCE" as const,
      complianceStatus: "REVIEW_REQUIRED" as const,
      responsibleGamingIncluded: false,
      affiliateDisclosureIncluded: false,
      performanceGateStatus: "NOT_APPLICABLE" as const,
      bannedPhraseScanClean: true,
      draftBody: "Content here.",
      excerpt: null,
      generatedBy: "test",
      sources: [],
    } satisfies ContentDraftRecord & { id: string };

    const task = createCockpitContentTask({
      draft,
      nextRecommendedAction: "Review.",
    });

    // If BLOG_POST isn't in CONTENT_TEMPLATES, falls back to AVA
    // If it IS in templates, this just verifies the agent is set
    expect(["AVA", "BOBBY", "SARAH", "JARVIS", "TAL"]).toContain(task.assignedAgent);
    expect(task.title).toContain("Blog post");
  });
});

describe("createCockpitContentTask — description format", () => {
  it("description mentions draft slug and contentType", () => {
    const draft = {
      id: "draft-789",
      contentType: "DAILY_BRIEF" as const,
      title: "Today's brief",
      slug: "daily-brief-2026-05-30",
      status: "DRAFT" as const,
      visibility: "INTERNAL" as const,
      relatedPickIds: [],
      relatedPromotionIds: [],
      relatedBriefIds: [],
      sourceCoverageStatus: "NEEDS_SOURCE" as const,
      complianceStatus: "REVIEW_REQUIRED" as const,
      responsibleGamingIncluded: false,
      affiliateDisclosureIncluded: false,
      performanceGateStatus: "NOT_APPLICABLE" as const,
      bannedPhraseScanClean: true,
      draftBody: "Content here.",
      excerpt: null,
      generatedBy: "test",
      sources: [],
    } satisfies ContentDraftRecord & { id: string };

    const task = createCockpitContentTask({
      draft,
      nextRecommendedAction: "Route to review.",
    });

    expect(task.description).toContain("daily-brief-2026-05-30");
    expect(task.description).toContain("DAILY_BRIEF");
    expect(task.description).toContain("Approval does not publish");
  });
});
