import { describe, it, expect } from "vitest";
import {
  CONTENT_POLICIES,
  evaluateDraftReadiness,
  listContentKinds,
} from "@/lib/content/workflow";

describe("content workflow policy", () => {
  it("lists all content kinds", () => {
    const kinds = listContentKinds();
    expect(kinds.length).toBeGreaterThanOrEqual(8);
    expect(kinds).toContain("DAILY_BRIEF_DRAFT");
    expect(kinds).toContain("PROMOTION_ROUNDUP");
    expect(kinds).toContain("MODEL_CHANGE_NOTE");
  });

  it("PROMOTION_ROUNDUP requires disclosure + book promo terms", () => {
    const p = CONTENT_POLICIES.PROMOTION_ROUNDUP;
    expect(p.requiresPromotionDisclosure).toBe(true);
    expect(p.requiredCategories).toContain("BOOK_PROMO_TERMS");
  });

  it("PERFORMANCE_TRANSPARENCY requires performance gate", () => {
    expect(
      CONTENT_POLICIES.PERFORMANCE_TRANSPARENCY.requiresPerformanceGate
    ).toBe(true);
  });

  it("blocks draft missing required source categories", () => {
    const v = evaluateDraftReadiness({
      kind: "MATCHUP_PREVIEW",
      coveredCategories: ["ODDS"],
      performanceGateOn: false,
      contentBody: "preview",
      includesPromotion: false,
      includesRgNote: true,
    });
    expect(v.canApprove).toBe(false);
    expect(v.blockers.some((b) => b.includes("TEAM_SCHEDULE"))).toBe(true);
  });

  it("blocks performance content when gate is off", () => {
    const v = evaluateDraftReadiness({
      kind: "PERFORMANCE_TRANSPARENCY",
      coveredCategories: ["PERFORMANCE_SUMMARY"],
      performanceGateOn: false,
      contentBody: "post",
      includesPromotion: false,
      includesRgNote: true,
    });
    expect(v.canApprove).toBe(false);
    expect(
      v.blockers.some((b) => b.includes("PERFORMANCE_STATS_ENABLED"))
    ).toBe(true);
  });

  it("blocks promotion content without disclosure", () => {
    const v = evaluateDraftReadiness({
      kind: "PROMOTION_ROUNDUP",
      coveredCategories: ["BOOK_PROMO_TERMS", "PLATFORM_POLICY"],
      performanceGateOn: true,
      contentBody: "roundup",
      includesPromotion: false,
      includesRgNote: true,
    });
    expect(v.canApprove).toBe(false);
    expect(v.blockers.some((b) => b.toLowerCase().includes("disclosure"))).toBe(
      true
    );
  });

  it("blocks empty body", () => {
    const v = evaluateDraftReadiness({
      kind: "METHODOLOGY_EDUCATION",
      coveredCategories: ["PLATFORM_POLICY"],
      performanceGateOn: false,
      contentBody: "",
      includesPromotion: false,
      includesRgNote: false,
    });
    expect(v.canApprove).toBe(false);
    expect(v.blockers.some((b) => b.includes("empty"))).toBe(true);
  });

  it("approves a complete methodology post", () => {
    const v = evaluateDraftReadiness({
      kind: "METHODOLOGY_EDUCATION",
      coveredCategories: ["PLATFORM_POLICY"],
      performanceGateOn: false,
      contentBody: "How the model works.",
      includesPromotion: false,
      includesRgNote: false,
    });
    expect(v.canApprove).toBe(true);
    expect(v.blockers).toHaveLength(0);
  });

  it("requires RG note for content that includes a betting context", () => {
    const v = evaluateDraftReadiness({
      kind: "MATCHUP_PREVIEW",
      coveredCategories: ["ODDS", "TEAM_SCHEDULE", "TEAM_STATS"],
      performanceGateOn: false,
      contentBody: "preview",
      includesPromotion: false,
      includesRgNote: false,
    });
    expect(v.canApprove).toBe(false);
    expect(v.blockers.some((b) => b.includes("responsible-gambling"))).toBe(
      true
    );
  });

  it("approves a complete DAILY_BRIEF_DRAFT", () => {
    const v = evaluateDraftReadiness({
      kind: "DAILY_BRIEF_DRAFT",
      coveredCategories: ["ODDS", "TEAM_SCHEDULE"],
      performanceGateOn: false,
      contentBody: "Tonight's slate.",
      includesPromotion: false,
      includesRgNote: true,
    });
    expect(v.canApprove).toBe(true);
    expect(v.blockers).toHaveLength(0);
  });

  it("approves a MODEL_CHANGE_NOTE without RG requirement", () => {
    const v = evaluateDraftReadiness({
      kind: "MODEL_CHANGE_NOTE",
      coveredCategories: ["MODEL_SNAPSHOT", "PLATFORM_POLICY"],
      performanceGateOn: false,
      contentBody: "Model version bumped to v6.",
      includesPromotion: false,
      includesRgNote: false,
    });
    expect(v.canApprove).toBe(true);
    expect(v.blockers).toHaveLength(0);
  });

  it("approves RESPONSIBLE_BETTING_EDUCATION with RG note", () => {
    const v = evaluateDraftReadiness({
      kind: "RESPONSIBLE_BETTING_EDUCATION",
      coveredCategories: ["PLATFORM_POLICY"],
      performanceGateOn: false,
      contentBody: "Bet within your means.",
      includesPromotion: false,
      includesRgNote: true,
    });
    expect(v.canApprove).toBe(true);
    expect(v.blockers).toHaveLength(0);
  });

  it("approves WEEKLY_RECAP when performance gate is on", () => {
    const v = evaluateDraftReadiness({
      kind: "WEEKLY_RECAP",
      coveredCategories: ["PERFORMANCE_SUMMARY", "MODEL_SNAPSHOT"],
      performanceGateOn: true,
      contentBody: "This week's recap.",
      includesPromotion: false,
      includesRgNote: true,
    });
    expect(v.canApprove).toBe(true);
    expect(v.blockers).toHaveLength(0);
  });

  it("blocks whitespace-only body", () => {
    const v = evaluateDraftReadiness({
      kind: "METHODOLOGY_EDUCATION",
      coveredCategories: ["PLATFORM_POLICY"],
      performanceGateOn: false,
      contentBody: "   \t  ",
      includesPromotion: false,
      includesRgNote: false,
    });
    expect(v.canApprove).toBe(false);
    expect(v.blockers.some((b) => b.includes("empty"))).toBe(true);
  });
});
