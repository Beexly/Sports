/**
 * Targeted coverage for the two pure helper functions exported from
 * lib/content-engine/types.ts:
 *
 *   - contentKindToDraftType: maps all 8 ContentKind values to the
 *     canonical ContentDraftType
 *   - draftTypeHasPolicyKind: returns true for the 8 policy-backed
 *     types, false for channel-shaped types (BLOG_POST, SOCIAL_DRAFT,
 *     NEWSLETTER_DRAFT, LINE_MOVEMENT_WATCH)
 *
 * These helpers are re-exported via @/lib/content-engine (the index).
 */

import { describe, it, expect } from "vitest";
import {
  contentKindToDraftType,
  draftTypeHasPolicyKind,
} from "@/lib/content-engine";

// ============================================================
// contentKindToDraftType — all 8 ContentKind → ContentDraftType mappings
// ============================================================

describe("contentKindToDraftType", () => {
  it("maps DAILY_BRIEF_DRAFT → DAILY_BRIEF", () => {
    expect(contentKindToDraftType("DAILY_BRIEF_DRAFT")).toBe("DAILY_BRIEF");
  });

  it("maps WEEKLY_RECAP → WEEKLY_RECAP", () => {
    expect(contentKindToDraftType("WEEKLY_RECAP")).toBe("WEEKLY_RECAP");
  });

  it("maps MATCHUP_PREVIEW → MATCHUP_PREVIEW", () => {
    expect(contentKindToDraftType("MATCHUP_PREVIEW")).toBe("MATCHUP_PREVIEW");
  });

  it("maps METHODOLOGY_EDUCATION → METHODOLOGY_EDUCATION", () => {
    expect(contentKindToDraftType("METHODOLOGY_EDUCATION")).toBe("METHODOLOGY_EDUCATION");
  });

  it("maps PROMOTION_ROUNDUP → PROMOTION_ROUNDUP", () => {
    expect(contentKindToDraftType("PROMOTION_ROUNDUP")).toBe("PROMOTION_ROUNDUP");
  });

  it("maps PERFORMANCE_TRANSPARENCY → PERFORMANCE_TRANSPARENCY", () => {
    expect(contentKindToDraftType("PERFORMANCE_TRANSPARENCY")).toBe("PERFORMANCE_TRANSPARENCY");
  });

  it("maps RESPONSIBLE_BETTING_EDUCATION → RESPONSIBLE_BETTING_EDUCATION", () => {
    expect(contentKindToDraftType("RESPONSIBLE_BETTING_EDUCATION")).toBe("RESPONSIBLE_BETTING_EDUCATION");
  });

  it("maps MODEL_CHANGE_NOTE → MODEL_ACCOUNTABILITY_NOTE", () => {
    expect(contentKindToDraftType("MODEL_CHANGE_NOTE")).toBe("MODEL_ACCOUNTABILITY_NOTE");
  });
});

// ============================================================
// draftTypeHasPolicyKind — policy-backed types return true
// ============================================================

describe("draftTypeHasPolicyKind — policy-backed types", () => {
  it("returns true for DAILY_BRIEF", () => {
    expect(draftTypeHasPolicyKind("DAILY_BRIEF")).toBe(true);
  });

  it("returns true for WEEKLY_RECAP", () => {
    expect(draftTypeHasPolicyKind("WEEKLY_RECAP")).toBe(true);
  });

  it("returns true for MATCHUP_PREVIEW", () => {
    expect(draftTypeHasPolicyKind("MATCHUP_PREVIEW")).toBe(true);
  });

  it("returns true for METHODOLOGY_EDUCATION", () => {
    expect(draftTypeHasPolicyKind("METHODOLOGY_EDUCATION")).toBe(true);
  });

  it("returns true for PROMOTION_ROUNDUP", () => {
    expect(draftTypeHasPolicyKind("PROMOTION_ROUNDUP")).toBe(true);
  });

  it("returns true for PERFORMANCE_TRANSPARENCY", () => {
    expect(draftTypeHasPolicyKind("PERFORMANCE_TRANSPARENCY")).toBe(true);
  });

  it("returns true for RESPONSIBLE_BETTING_EDUCATION", () => {
    expect(draftTypeHasPolicyKind("RESPONSIBLE_BETTING_EDUCATION")).toBe(true);
  });

  it("returns true for MODEL_ACCOUNTABILITY_NOTE", () => {
    expect(draftTypeHasPolicyKind("MODEL_ACCOUNTABILITY_NOTE")).toBe(true);
  });
});

// ============================================================
// draftTypeHasPolicyKind — channel-shaped types return false
// ============================================================

describe("draftTypeHasPolicyKind — channel-shaped types (no policy kind)", () => {
  it("returns false for BLOG_POST", () => {
    expect(draftTypeHasPolicyKind("BLOG_POST")).toBe(false);
  });

  it("returns false for SOCIAL_DRAFT", () => {
    expect(draftTypeHasPolicyKind("SOCIAL_DRAFT")).toBe(false);
  });

  it("returns false for NEWSLETTER_DRAFT", () => {
    expect(draftTypeHasPolicyKind("NEWSLETTER_DRAFT")).toBe(false);
  });

  it("returns false for LINE_MOVEMENT_WATCH", () => {
    expect(draftTypeHasPolicyKind("LINE_MOVEMENT_WATCH")).toBe(false);
  });
});
