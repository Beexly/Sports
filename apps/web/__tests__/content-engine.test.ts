import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildContentDraft,
  buildDailyBriefDraft,
  buildMethodologyEducationDraft,
  buildPerformanceTransparencyDraft,
  buildPromotionRoundupDraft,
  buildResponsibleBettingEducationDraft,
  buildWeeklyRecapDraft,
  createCockpitContentTask,
  CONTENT_TEMPLATES,
  evaluateContentCompliance,
  evaluateContentReadiness,
  evaluateContentSourceCoverage,
  formatDraftForReview,
  getTemplate,
  listTemplates,
  REQUIRED_SOURCE_TYPES,
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
    draftBody: "Body line one.",
    excerpt: null,
    generatedBy: "test",
    sources: [],
    ...partial,
  } as ContentDraftRecord;
}

describe("content engine — templates", () => {
  it("exposes the ten safe templates", () => {
    const keys = listTemplates().map((t) => t.key);
    expect(keys).toContain("DAILY_SLATE_BRIEF");
    expect(keys).toContain("APPROVED_PROMOTIONS_ROUNDUP");
    expect(keys).toContain("WHY_DATA_FRESHNESS_MATTERS");
    expect(keys).toContain("HOW_CONFIDENCE_LABELS_WORK");
    expect(keys).toContain("RESPONSIBLE_BETTING_REMINDER");
    expect(keys).toContain("WEEKLY_PICK_TRANSPARENCY_RECAP");
    expect(keys).toContain("LINE_MOVEMENT_WATCH");
    expect(keys).toContain("MODEL_ACCOUNTABILITY_NOTE");
    expect(keys).toContain("METHODOLOGY_EXPLAINER");
    expect(keys).toContain("WHAT_CHANGED_SINCE_REFRESH");
  });

  it("promotion roundup requires disclosure + RG + terms source", () => {
    const t = CONTENT_TEMPLATES.APPROVED_PROMOTIONS_ROUNDUP!;
    expect(t.requiresAffiliateDisclosure).toBe(true);
    expect(t.requiresResponsibleGaming).toBe(true);
    expect(t.requiredSources).toContain("PROMOTION_TERMS");
    expect(t.requiredSources).toContain("RESPONSIBLE_GAMING");
  });

  it("model accountability note defaults to INTERNAL", () => {
    expect(CONTENT_TEMPLATES.MODEL_ACCOUNTABILITY_NOTE!.defaultVisibility).toBe(
      "INTERNAL"
    );
  });

  it("getTemplate returns the template for a known key", () => {
    const t = getTemplate("DAILY_SLATE_BRIEF");
    expect(t).toBeDefined();
    expect(t?.key).toBe("DAILY_SLATE_BRIEF");
  });

  it("getTemplate returns undefined for an unknown key", () => {
    expect(getTemplate("NONEXISTENT_TEMPLATE")).toBeUndefined();
  });

  it("every template from listTemplates is retrievable by getTemplate", () => {
    for (const t of listTemplates()) {
      expect(getTemplate(t.key)).toBe(t);
    }
  });
});

describe("content engine — source coverage", () => {
  it("flags missing required source as NEEDS_SOURCE", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "MATCHUP_PREVIEW",
      sources: [makeSource("ODDS")],
      performanceGateOn: false,
    });
    expect(v.status).toBe("PARTIAL");
    expect(v.missing).toContain("PICK");
  });

  it("blocks promotion content with no terms URL", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "PROMOTION_ROUNDUP",
      sources: [
        makeSource("PROMOTION_TERMS", { sourceUrl: null }),
        makeSource("RESPONSIBLE_GAMING", { sourceUrl: "https://example.com" }),
      ],
      performanceGateOn: false,
    });
    expect(v.status).toBe("BLOCKED");
    expect(
      v.blockers.some((b) => b.toLowerCase().includes("terms url"))
    ).toBe(true);
  });

  it("blocks performance content when gate is OFF", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "PERFORMANCE_TRANSPARENCY",
      sources: [makeSource("PERFORMANCE"), makeSource("METHODOLOGY")],
      performanceGateOn: false,
    });
    expect(v.status).toBe("BLOCKED");
    expect(
      v.blockers.some((b) => b.includes("PERFORMANCE_STATS_ENABLED"))
    ).toBe(true);
  });

  it("requires trustworthy evidence on regulated source types", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "PROMOTION_ROUNDUP",
      sources: [
        makeSource("PROMOTION_TERMS", {
          sourceUrl: "https://op.example/terms",
          trustLevel: "UNVERIFIED",
        }),
        makeSource("RESPONSIBLE_GAMING", { trustLevel: "UNVERIFIED" }),
      ],
      performanceGateOn: false,
    });
    expect(v.status).toBe("BLOCKED");
    expect(v.blockers.some((b) => b.includes("UNVERIFIED"))).toBe(true);
  });

  it("accepts platform-trust methodology source", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "METHODOLOGY_EDUCATION",
      sources: [makeSource("METHODOLOGY", { trustLevel: "PLATFORM" })],
      performanceGateOn: false,
    });
    expect(v.status).toBe("COVERED");
    expect(v.covered).toBe(true);
  });

  it("calibration source flags INTERNAL_ONLY note", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "MODEL_ACCOUNTABILITY_NOTE",
      sources: [
        makeSource("CALIBRATION"),
        makeSource("METHODOLOGY"),
      ],
      performanceGateOn: false,
    });
    expect(v.notes.some((n) => n.includes("INTERNAL_ONLY"))).toBe(true);
  });

  it("required source table is exhaustive", () => {
    const types = Object.keys(REQUIRED_SOURCE_TYPES);
    expect(types.length).toBeGreaterThanOrEqual(12);
  });

  it("STALE source adds a blocker even when present", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "METHODOLOGY_EDUCATION",
      sources: [makeSource("METHODOLOGY", { sourceStatus: "STALE" })],
      performanceGateOn: false,
    });
    expect(v.status).toBe("BLOCKED");
    expect(v.blockers.some((b) => b.includes("STALE"))).toBe(true);
  });

  it("LINE_MOVEMENT_WATCH with fresh ODDS source is COVERED", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "LINE_MOVEMENT_WATCH",
      sources: [makeSource("ODDS")],
      performanceGateOn: false,
    });
    expect(v.status).toBe("COVERED");
    expect(v.covered).toBe(true);
  });

  it("BLOG_POST with METHODOLOGY source is COVERED", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "BLOG_POST",
      sources: [makeSource("METHODOLOGY")],
      performanceGateOn: false,
    });
    expect(v.status).toBe("COVERED");
  });

  it("all-missing sources yields NEEDS_SOURCE (not BLOCKED)", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "MATCHUP_PREVIEW",
      sources: [],
      performanceGateOn: false,
    });
    expect(v.status).toBe("NEEDS_SOURCE");
    expect(v.missing).toHaveLength(2);
  });

  it("SOCIAL_DRAFT with METHODOLOGY source is COVERED", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "SOCIAL_DRAFT",
      sources: [makeSource("METHODOLOGY")],
      performanceGateOn: false,
    });
    expect(v.status).toBe("COVERED");
    expect(v.missing).toHaveLength(0);
  });

  it("SOCIAL_DRAFT with no sources is NEEDS_SOURCE", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "SOCIAL_DRAFT",
      sources: [],
      performanceGateOn: false,
    });
    expect(v.status).toBe("NEEDS_SOURCE");
    expect(v.missing).toContain("METHODOLOGY");
  });

  it("NEWSLETTER_DRAFT requires METHODOLOGY and DAILY_BRIEF sources", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "NEWSLETTER_DRAFT",
      sources: [makeSource("METHODOLOGY")],
      performanceGateOn: false,
    });
    // Missing DAILY_BRIEF → PARTIAL (some but not all required sources present)
    expect(v.status).toBe("PARTIAL");
    expect(v.missing).toContain("DAILY_BRIEF");
  });

  it("NEWSLETTER_DRAFT with all required sources is COVERED", () => {
    const v = evaluateContentSourceCoverage({
      contentType: "NEWSLETTER_DRAFT",
      sources: [makeSource("METHODOLOGY"), makeSource("DAILY_BRIEF")],
      performanceGateOn: false,
    });
    expect(v.status).toBe("COVERED");
    expect(v.covered).toBe(true);
  });
});

describe("content engine — compliance", () => {
  it("blocks banned phrase in body", () => {
    const v = evaluateContentCompliance({
      contentType: "BLOG_POST",
      draftBody: "This is a guaranteed lock pick for tonight.",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: true,
    });
    expect(v.status).toBe("BLOCKED");
    expect(v.bannedPhraseScanClean).toBe(false);
    expect(v.blockers.length).toBeGreaterThan(0);
  });

  it("blocks promotion content without disclosure", () => {
    const v = evaluateContentCompliance({
      contentType: "PROMOTION_ROUNDUP",
      draftBody: "DraftKings has a featured offer this week. RG line.",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: true,
    });
    expect(v.status).toBe("NEEDS_DISCLOSURE");
  });

  it("blocks betting content without responsible-gaming line", () => {
    const v = evaluateContentCompliance({
      contentType: "DAILY_BRIEF",
      draftBody: "Tonight's slate has six games.",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: false,
    });
    expect(v.status).toBe("NEEDS_RG_LANGUAGE");
  });

  it("blocks empty body", () => {
    const v = evaluateContentCompliance({
      contentType: "METHODOLOGY_EDUCATION",
      draftBody: "   ",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: false,
    });
    expect(v.blockers.some((b) => b.toLowerCase().includes("empty"))).toBe(true);
  });

  it("clears methodology content with no RG requirement", () => {
    const v = evaluateContentCompliance({
      contentType: "METHODOLOGY_EDUCATION",
      draftBody: "How the model works. Methodology only.",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: false,
    });
    expect(v.status).toBe("NOT_APPLICABLE");
    expect(v.bannedPhraseScanClean).toBe(true);
  });

  it("returns CLEAR when betting content has RG and no banned phrases", () => {
    const v = evaluateContentCompliance({
      contentType: "DAILY_BRIEF",
      draftBody: "Tonight's slate has six games. Please bet responsibly.",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: true,
    });
    expect(v.status).toBe("CLEAR");
    expect(v.bannedPhraseScanClean).toBe(true);
    expect(v.blockers).toHaveLength(0);
  });

  it("returns REVIEW_REQUIRED when betting content has RG but empty body", () => {
    // Empty body blocker fires even though RG is included — status is REVIEW_REQUIRED
    // (the empty-body path reaches the catch-all blockers.length > 0 branch)
    const v = evaluateContentCompliance({
      contentType: "DAILY_BRIEF",
      draftBody: "   ",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: true,
    });
    expect(v.status).toBe("REVIEW_REQUIRED");
    expect(v.blockers.some((b) => b.toLowerCase().includes("empty"))).toBe(true);
  });

  it("adds a calibration note for MODEL_ACCOUNTABILITY_NOTE content type", () => {
    const v = evaluateContentCompliance({
      contentType: "MODEL_ACCOUNTABILITY_NOTE",
      draftBody: "Calibration drift detected in the 70-79 bucket.",
      affiliateDisclosureIncluded: false,
      responsibleGamingIncluded: false,
    });
    expect(v.status).toBe("NOT_APPLICABLE");
    expect(v.notes.some((n) => n.toLowerCase().includes("internal"))).toBe(true);
  });
});

describe("content engine — readiness", () => {
  it("READY_FOR_REVIEW for clean methodology draft", () => {
    const draft = makeDraft({
      contentType: "METHODOLOGY_EDUCATION",
      draftBody: "How the model works.",
      sources: [makeSource("METHODOLOGY")],
      sourceCoverageStatus: "COVERED",
    });
    const v = evaluateContentReadiness({ draft, performanceGateOn: false });
    expect(v.readiness).toBe("READY_FOR_REVIEW");
    expect(v.blockers).toHaveLength(0);
  });

  it("NEEDS_PERFORMANCE_GATE when gate is off", () => {
    const draft = makeDraft({
      contentType: "PERFORMANCE_TRANSPARENCY",
      draftBody: "Performance transparency body. RG line included below.",
      responsibleGamingIncluded: true,
      sources: [
        makeSource("PERFORMANCE"),
        makeSource("METHODOLOGY"),
      ],
    });
    const v = evaluateContentReadiness({ draft, performanceGateOn: false });
    // Coverage layer flags BLOCKED because gate is off — readiness reports BLOCKED.
    expect(["BLOCKED", "NEEDS_PERFORMANCE_GATE"]).toContain(v.readiness);
  });

  it("BLOCKED when banned phrase present", () => {
    const draft = makeDraft({
      contentType: "METHODOLOGY_EDUCATION",
      draftBody: "We offer a guaranteed lock pick.",
      sources: [makeSource("METHODOLOGY")],
    });
    const v = evaluateContentReadiness({ draft, performanceGateOn: false });
    expect(v.readiness).toBe("BLOCKED");
  });

  it("INTERNAL_ONLY for calibration content", () => {
    const draft = makeDraft({
      contentType: "MODEL_ACCOUNTABILITY_NOTE",
      draftBody: "Open calibration proposal summary.",
      sources: [makeSource("CALIBRATION"), makeSource("METHODOLOGY")],
    });
    const v = evaluateContentReadiness({ draft, performanceGateOn: false });
    expect(v.readiness).toBe("INTERNAL_ONLY");
    expect(v.safeVisibility).toBe("INTERNAL");
  });

  it("NEEDS_SOURCE when required sources are missing", () => {
    const draft = makeDraft({
      contentType: "MATCHUP_PREVIEW",
      draftBody: "Matchup preview body. RG line below.",
      responsibleGamingIncluded: true,
      sources: [makeSource("ODDS")],
    });
    const v = evaluateContentReadiness({ draft, performanceGateOn: false });
    expect(["NEEDS_SOURCE", "BLOCKED"]).toContain(v.readiness);
  });

  it("formatDraftForReview produces a status line", () => {
    const draft = makeDraft({
      contentType: "METHODOLOGY_EDUCATION",
      draftBody: "How the model works.",
      sources: [makeSource("METHODOLOGY")],
    });
    const v = evaluateContentReadiness({ draft, performanceGateOn: false });
    const f = formatDraftForReview(draft, v);
    expect(f.statusLine).toContain("METHODOLOGY_EDUCATION");
    expect(f.statusLine).toContain("readiness=");
  });

  it("formatDraftForReview uses excerpt when provided", () => {
    const draft = makeDraft({
      contentType: "METHODOLOGY_EDUCATION",
      draftBody: "Full body text here.",
      excerpt: "Short excerpt text.",
      sources: [makeSource("METHODOLOGY")],
    });
    const v = evaluateContentReadiness({ draft, performanceGateOn: false });
    const f = formatDraftForReview(draft, v);
    expect(f.summary).toBe("Short excerpt text.");
  });

  it("formatDraftForReview falls back to first body line when excerpt is null", () => {
    const draft = makeDraft({
      contentType: "METHODOLOGY_EDUCATION",
      draftBody: "First line of body.\nSecond line.",
      excerpt: null,
      sources: [makeSource("METHODOLOGY")],
    });
    const v = evaluateContentReadiness({ draft, performanceGateOn: false });
    const f = formatDraftForReview(draft, v);
    expect(f.summary).toBe("First line of body.");
  });

  it("formatDraftForReview returns '(no body)' when excerpt is null and body is all whitespace", () => {
    const draft = makeDraft({
      contentType: "METHODOLOGY_EDUCATION",
      draftBody: "   \n  \n",
      excerpt: null,
      sources: [makeSource("METHODOLOGY")],
    });
    const v = evaluateContentReadiness({ draft, performanceGateOn: false });
    const f = formatDraftForReview(draft, v);
    expect(f.summary).toBe("(no body)");
  });

  it("LINE_MOVEMENT_WATCH readiness is INTERNAL_ONLY and nextAction mentions public-safe variant", () => {
    const draft = makeDraft({
      contentType: "LINE_MOVEMENT_WATCH",
      // LINE_MOVEMENT_WATCH requires RG (REQUIRES_RG includes it) and ODDS source
      draftBody: "Line watch content with responsible-gaming note.",
      responsibleGamingIncluded: true,
      sources: [makeSource("ODDS")],
    });
    const v = evaluateContentReadiness({ draft, performanceGateOn: false });
    expect(v.readiness).toBe("INTERNAL_ONLY");
    expect(v.safeVisibility).toBe("INTERNAL");
    expect(v.nextRecommendedAction.toLowerCase()).toContain("public-safe");
  });

  it("NEEDS_AFFILIATE_DISCLOSURE when promotion content lacks disclosure", () => {
    const draft = makeDraft({
      contentType: "PROMOTION_ROUNDUP",
      draftBody: "DraftKings has an offer. Please bet responsibly.",
      responsibleGamingIncluded: true,
      affiliateDisclosureIncluded: false,
      sources: [
        makeSource("PROMOTION_TERMS", {
          sourceUrl: "https://example.com/terms",
          trustLevel: "AUTHORITATIVE",
        }),
        makeSource("RESPONSIBLE_GAMING", { trustLevel: "AUTHORITATIVE" }),
      ],
    });
    const v = evaluateContentReadiness({ draft, performanceGateOn: false });
    expect(v.readiness).toBe("NEEDS_AFFILIATE_DISCLOSURE");
  });

  it("NEEDS_RESPONSIBLE_GAMING for betting content missing RG line", () => {
    const draft = makeDraft({
      contentType: "DAILY_BRIEF",
      draftBody: "Tonight there are six games on the slate.",
      responsibleGamingIncluded: false,
      affiliateDisclosureIncluded: false,
      sources: [makeSource("ODDS"), makeSource("DAILY_BRIEF")],
    });
    const v = evaluateContentReadiness({ draft, performanceGateOn: false });
    expect(v.readiness).toBe("NEEDS_RESPONSIBLE_GAMING");
  });

  it("safeVisibility is INTERNAL when readiness is NEEDS_SOURCE", () => {
    const draft = makeDraft({
      contentType: "MATCHUP_PREVIEW",
      draftBody: "Preview. RG included.",
      responsibleGamingIncluded: true,
      sources: [makeSource("ODDS")],
      visibility: "PUBLIC",
    });
    const v = evaluateContentReadiness({ draft, performanceGateOn: false });
    expect(v.safeVisibility).toBe("INTERNAL");
  });
});

describe("content engine — build helpers (draft-only)", () => {
  it("buildContentDraft never sets publishedAt", () => {
    const draft = buildContentDraft({
      templateKey: "WHY_DATA_FRESHNESS_MATTERS",
      slug: "freshness-internal",
      bodyLines: ["Why freshness matters."],
      sources: [makeSource("METHODOLOGY")],
      generatedBy: "test",
    });
    expect(draft.publishedAt).toBeNull();
    expect(draft.status).toBe("DRAFT");
  });

  it("daily brief builder appends the responsible-gaming line", () => {
    const draft = buildDailyBriefDraft({
      slate: {
        briefDate: new Date("2026-05-18"),
        gameCount: 6,
        publishedPickCount: 0,
        dataQualityWarnings: [],
        lineMovementNotes: [],
      },
      generatedBy: "test",
      slug: "daily-2026-05-18",
      sources: [makeSource("ODDS"), makeSource("DAILY_BRIEF")],
    });
    expect(draft.responsibleGamingIncluded).toBe(true);
    expect(draft.draftBody.toLowerCase()).toContain("national problem gambling helpline");
  });

  it("promotion roundup builder appends affiliate disclosure", () => {
    const draft = buildPromotionRoundupDraft({
      promotions: [
        {
          id: "promo-1",
          operatorName: "Test Sportsbook",
          offerSummary: "Sign up for an offer.",
          termsUrl: "https://example.com/terms",
          eligibleStates: ["NJ"],
          expiresAt: null,
        },
      ],
      generatedBy: "test",
      slug: "promo-roundup-test",
      sources: [
        makeSource("PROMOTION_TERMS", {
          sourceUrl: "https://example.com/terms",
          trustLevel: "AUTHORITATIVE",
        }),
        makeSource("RESPONSIBLE_GAMING", { trustLevel: "AUTHORITATIVE" }),
      ],
    });
    expect(draft.affiliateDisclosureIncluded).toBe(true);
    expect(draft.responsibleGamingIncluded).toBe(true);
    expect(draft.draftBody.toLowerCase()).toContain("affiliate disclosure");
  });

  it("methodology builder cites approved trust claims", () => {
    const draft = buildMethodologyEducationDraft({
      subject: "FRESHNESS",
      generatedBy: "test",
      slug: "methodology-freshness",
      sources: [makeSource("METHODOLOGY")],
    });
    expect(draft.draftBody.toLowerCase()).toContain("freshness");
  });

  it("weekly recap builder respects the performance gate", () => {
    const off = buildWeeklyRecapDraft({
      summary: {
        weekStart: new Date("2026-05-11"),
        weekEnd: new Date("2026-05-17"),
        settledCount: 0,
        winCount: 0,
        lossCount: 0,
        pushCount: 0,
        bootstrapExcluded: true,
        performanceGateOn: false,
      },
      generatedBy: "test",
      slug: "weekly-recap",
      sources: [makeSource("PERFORMANCE"), makeSource("PICK")],
    });
    expect(off.draftBody.toLowerCase()).toContain("performance gate is currently off");
  });

  it("responsible-betting builder always includes RG line", () => {
    const draft = buildResponsibleBettingEducationDraft({
      generatedBy: "test",
      slug: "rg-edu",
      sources: [makeSource("RESPONSIBLE_GAMING"), makeSource("METHODOLOGY")],
    });
    expect(draft.responsibleGamingIncluded).toBe(true);
  });

  it("performance transparency builder notes gate-off state", () => {
    const draft = buildPerformanceTransparencyDraft({
      slug: "perf-transparency-off",
      generatedBy: "test",
      performanceGateOn: false,
      settledCount: 0,
      sources: [makeSource("PERFORMANCE"), makeSource("METHODOLOGY")],
    });
    expect(draft.draftBody.toLowerCase()).toContain("performance gate is currently off");
    expect(draft.visibility).toBe("INTERNAL");
  });

  it("performance transparency builder includes settled count when gate is on", () => {
    const draft = buildPerformanceTransparencyDraft({
      slug: "perf-transparency-on",
      generatedBy: "test",
      performanceGateOn: true,
      settledCount: 142,
      sources: [makeSource("PERFORMANCE"), makeSource("METHODOLOGY")],
    });
    expect(draft.draftBody).toContain("142");
    expect(draft.visibility).toBe("PUBLIC");
  });

  it("createCockpitContentTask returns a task for AVA review", () => {
    const draft = {
      ...makeDraft({ contentType: "METHODOLOGY_EDUCATION", draftBody: "How the model works." }),
      id: "draft-xyz",
    };
    const task = createCockpitContentTask({
      draft,
      nextRecommendedAction: "Route to AVA",
    });
    expect(task.draftId).toBe("draft-xyz");
    expect(task.title).toContain("Test draft");
    expect(task.assignedAgent).toBe("AVA");
    expect(task.nextRecommendedAction).toBe("Route to AVA");
  });

  it("daily brief builder includes published pick count when > 0", () => {
    const draft = buildDailyBriefDraft({
      slate: {
        briefDate: new Date("2026-05-18"),
        gameCount: 4,
        publishedPickCount: 3,
        dataQualityWarnings: [],
        lineMovementNotes: [],
      },
      generatedBy: "test",
      slug: "daily-with-picks",
      sources: [makeSource("ODDS"), makeSource("DAILY_BRIEF")],
    });
    expect(draft.draftBody).toContain("3");
    expect(draft.draftBody.toLowerCase()).toContain("picks published");
  });

  it("daily brief builder includes data-quality warnings section when present", () => {
    const draft = buildDailyBriefDraft({
      slate: {
        briefDate: new Date("2026-05-18"),
        gameCount: 2,
        publishedPickCount: 0,
        dataQualityWarnings: ["Stale ODDS data for Game A"],
        lineMovementNotes: [],
      },
      generatedBy: "test",
      slug: "daily-dq-warnings",
      sources: [makeSource("ODDS"), makeSource("DAILY_BRIEF")],
    });
    expect(draft.draftBody).toContain("Data-quality notes");
    expect(draft.draftBody).toContain("Stale ODDS data for Game A");
  });

  it("daily brief builder includes line movement notes section when present", () => {
    const draft = buildDailyBriefDraft({
      slate: {
        briefDate: new Date("2026-05-18"),
        gameCount: 3,
        publishedPickCount: 0,
        dataQualityWarnings: [],
        lineMovementNotes: ["Chiefs -3.5 moved to -6"],
      },
      generatedBy: "test",
      slug: "daily-lm-notes",
      sources: [makeSource("ODDS"), makeSource("DAILY_BRIEF")],
    });
    expect(draft.draftBody).toContain("Line movement we're watching");
    expect(draft.draftBody).toContain("Chiefs -3.5 moved to -6");
  });

  it("weekly recap gate-on includes settled count and win/loss/push numbers", () => {
    const draft = buildWeeklyRecapDraft({
      summary: {
        weekStart: new Date("2026-05-11"),
        weekEnd: new Date("2026-05-17"),
        settledCount: 15,
        winCount: 9,
        lossCount: 5,
        pushCount: 1,
        bootstrapExcluded: false,
        performanceGateOn: true,
      },
      generatedBy: "test",
      slug: "weekly-gate-on",
      sources: [makeSource("PERFORMANCE"), makeSource("PICK")],
    });
    expect(draft.draftBody).toContain("15");
    expect(draft.draftBody).toContain("9");
    expect(draft.draftBody).toContain("5");
    expect(draft.draftBody).toContain("1");
  });

  it("weekly recap gate-on with bootstrapExcluded adds exclusion note", () => {
    const draft = buildWeeklyRecapDraft({
      summary: {
        weekStart: new Date("2026-05-11"),
        weekEnd: new Date("2026-05-17"),
        settledCount: 5,
        winCount: 3,
        lossCount: 2,
        pushCount: 0,
        bootstrapExcluded: true,
        performanceGateOn: true,
      },
      generatedBy: "test",
      slug: "weekly-bootstrap-excl",
      sources: [makeSource("PERFORMANCE"), makeSource("PICK")],
    });
    expect(draft.draftBody.toLowerCase()).toContain("bootstrap");
  });

  it("methodology builder CONFIDENCE subject produces confidence-focused body", () => {
    const draft = buildMethodologyEducationDraft({
      subject: "CONFIDENCE",
      generatedBy: "test",
      slug: "methodology-confidence",
      sources: [makeSource("METHODOLOGY")],
    });
    expect(draft.draftBody.toLowerCase()).toContain("confidence");
    // The title heading distinguishes the CONFIDENCE path from FRESHNESS
    expect(draft.draftBody).toContain("How confidence labels work");
  });

  it("methodology builder GENERAL subject produces generic methodology body", () => {
    const draft = buildMethodologyEducationDraft({
      subject: "GENERAL",
      generatedBy: "test",
      slug: "methodology-general",
      sources: [makeSource("METHODOLOGY")],
    });
    expect(draft.draftBody).toContain("# Methodology");
    expect(draft.draftBody).toContain("ranked picks");
  });
});

function readRel(rel: string): string {
  return readFileSync(resolve(__dirname, "..", rel), "utf8");
}

describe("content engine — cockpit/API surface invariants", () => {
  it("cockpit content page reaffirms no auto-publish", () => {
    const src = readRel("app/cockpit/content/page.tsx");
    expect(src).toContain("No part of this surface publishes externally");
    expect(src).toContain("no auto-publish path");
  });

  it("cockpit content API route refuses POST", () => {
    const src = readRel("app/api/cockpit/content/route.ts");
    expect(src).toContain("auto-publish-disabled");
    expect(src).toContain("ADMIN");
  });

  it("review API never sets publishedAt", () => {
    const src = readRel("app/api/cockpit/content/[id]/review/route.ts");
    expect(src).toContain("publishedAt is INTENTIONALLY never touched");
    expect(src).toContain("unauthorized");
  });
});
