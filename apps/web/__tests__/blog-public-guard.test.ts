import { describe, expect, it } from "vitest";
import { guardPublicContent, guardPublicExcerpt } from "@/lib/blog/public-guard";
import { scanForBannedPhrases, scanPublicCopyForClaims } from "@/lib/trust-claims";

describe("blog public guard", () => {
  it("passes clean excerpt and content through unchanged", () => {
    const excerpt = "A line-movement read on Sunday's slate, tied back to the live board.";
    const content = [
      "We scored every available matchup against the bookmakers that had a market.",
      "The home side firmed up after Thursday's report; we weight that, then publish.",
    ].join("\n\n");

    expect(scanForBannedPhrases(excerpt)).toHaveLength(0);
    expect(scanForBannedPhrases(content)).toHaveLength(0);

    expect(guardPublicExcerpt(excerpt)).toBe(excerpt);
    expect(guardPublicContent(content)).toBe(content);
  });

  it("fails safe on a banned-phrase excerpt", () => {
    const dirty = "A guaranteed profit play — basically a sure thing.";
    expect(scanForBannedPhrases(dirty).length).toBeGreaterThan(0);

    const guarded = guardPublicExcerpt(dirty);

    expect(guarded).toBe("This post is being re-reviewed before publication.");
    expect(guarded).not.toContain("guaranteed profit");
    expect(guarded).not.toContain("sure thing");
    // the placeholder must re-scan clean
    expect(scanForBannedPhrases(guarded)).toHaveLength(0);
  });

  it("fails safe on banned-phrase content", () => {
    const dirty = [
      "# The Lock of the Week",
      "",
      "This is a guaranteed profit, risk-free, you can't lose.",
    ].join("\n");
    expect(scanForBannedPhrases(dirty).length).toBeGreaterThan(0);

    const guarded = guardPublicContent(dirty);

    expect(guarded).toBe(
      "This analysis is temporarily unavailable while it is re-reviewed."
    );
    expect(guarded).not.toContain("guaranteed profit");
    expect(guarded).not.toContain("risk-free");
    expect(guarded).not.toContain("can't lose");
    // the placeholder must re-scan clean
    expect(scanForBannedPhrases(guarded)).toHaveLength(0);
  });

  // public-number-audit-2026-07-16, finding #6: a numeric performance claim
  // ("our picks hit 71% last month") has no banned WORD in it at all, so the
  // fixed phrase list alone lets it through. The guard must now also fail
  // safe on this shape of claim.
  describe("numeric performance claims (no banned word, only numbers)", () => {
    it("the fixture contains no banned word, only a numeric claim", () => {
      const dirty = "Our picks hit 71% last month, and we're up +81u on the season.";
      expect(scanForBannedPhrases(dirty)).toHaveLength(0); // the gap this closes
      expect(scanPublicCopyForClaims(dirty).length).toBeGreaterThan(0);
    });

    it("fails safe on a numeric-claim excerpt", () => {
      const dirty = "Our picks hit 71% last month.";
      const guarded = guardPublicExcerpt(dirty);
      expect(guarded).toBe("This post is being re-reviewed before publication.");
      expect(guarded).not.toContain("71%");
    });

    it("fails safe on numeric-claim content (an ATS record buried in prose)", () => {
      const dirty = [
        "# Week in review",
        "",
        "The model went 12-3 ATS across the slate, no gimmicks.",
      ].join("\n");
      const guarded = guardPublicContent(dirty);
      expect(guarded).toBe("This analysis is temporarily unavailable while it is re-reviewed.");
      expect(guarded).not.toContain("12-3 ATS");
    });

    it("still passes clean copy with an unrelated percentage through unchanged", () => {
      const clean = "He played 30% of snaps in the slot before leaving with an injury.";
      expect(scanPublicCopyForClaims(clean)).toHaveLength(0);
      expect(guardPublicExcerpt(clean)).toBe(clean);
      expect(guardPublicContent(clean)).toBe(clean);
    });

    it("still passes clean copy mentioning American odds through unchanged", () => {
      const clean = "The line closed at -110 on both sides after opening at +150.";
      expect(scanPublicCopyForClaims(clean)).toHaveLength(0);
      expect(guardPublicExcerpt(clean)).toBe(clean);
    });
  });
});
