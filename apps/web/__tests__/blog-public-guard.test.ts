import { describe, expect, it } from "vitest";
import { guardPublicContent, guardPublicExcerpt } from "@/lib/blog/public-guard";
import { scanForBannedPhrases } from "@/lib/trust-claims";

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
});
