import { describe, expect, it } from "vitest";
import { guardPublicJournalBody, guardPublicJournalTitle } from "@/lib/journal/public-guard";
import { scanForBannedPhrases } from "@/lib/trust-claims";

describe("guardPublicJournalBody", () => {
  it("passes clean markdown through unchanged", () => {
    const clean = [
      "# Week 12 Notes",
      "",
      "The model leaned toward the home side after the line moved on Thursday.",
      "We weight recent form and market depth, then score every available matchup.",
    ].join("\n");

    const result = guardPublicJournalBody(clean);

    expect(result.safe).toBe(true);
    expect(result.body).toBe(clean);
    // sanity: the clean fixture really is clean
    expect(scanForBannedPhrases(clean)).toHaveLength(0);
  });

  it("fails safe when a banned phrase is present", () => {
    const dirty = [
      "# Week 13 Notes",
      "",
      "This one is a guaranteed profit — basically a sure thing, you can't lose.",
    ].join("\n");

    // confirm the fixture actually trips the scanner
    expect(scanForBannedPhrases(dirty).length).toBeGreaterThan(0);

    const result = guardPublicJournalBody(dirty);

    expect(result.safe).toBe(false);
    // the returned body must NOT contain the banned language
    expect(result.body).not.toContain("guaranteed profit");
    expect(result.body).not.toContain("sure thing");
    expect(result.body).not.toContain("can't lose");
    // and the placeholder itself must re-scan to ZERO hits
    expect(scanForBannedPhrases(result.body)).toHaveLength(0);
  });

  it("uses a calm, on-brand placeholder", () => {
    const dirty = "guaranteed profit every week";
    const result = guardPublicJournalBody(dirty);

    expect(result.safe).toBe(false);
    expect(result.body).toBe(
      "This Journal entry is being re-reviewed before publication and is temporarily unavailable."
    );
  });

  it("catches a banned phrase split across a soft newline (editor line-wrap)", () => {
    // The only banned content is "sure thing", hard-wrapped across a newline the
    // way an editor wraps a long line. scanForBannedPhrases tests each physical
    // line independently, so the raw scan misses the split — but markdown renders
    // the soft wrap as one continuous claim, so the guard must collapse the wrap
    // and catch it.
    const wrapped = [
      "# Week 14 Notes",
      "",
      "Tonight the model leans hard, so this is basically a sure",
      "thing for the home side.",
    ].join("\n");

    // the gap being closed: the raw line-by-line scan does NOT see "sure thing"…
    expect(scanForBannedPhrases(wrapped)).toHaveLength(0);
    // …but the same phrase on a single line IS banned.
    expect(scanForBannedPhrases("basically a sure thing for").length).toBeGreaterThan(0);

    const result = guardPublicJournalBody(wrapped);
    expect(result.safe).toBe(false);
    expect(result.body).toBe(
      "This Journal entry is being re-reviewed before publication and is temporarily unavailable."
    );
  });

  it("preserves paragraph breaks — does not merge across a blank line", () => {
    // Two innocuous words that only form a banned phrase if a PARAGRAPH break were
    // collapsed. Real paragraph breaks are visible separation, so the guard must
    // NOT join them (avoids over-blocking legitimate content).
    const twoParagraphs = ["...for a home side that looks sure.", "", "Thing is, the line moved."].join("\n");
    expect(guardPublicJournalBody(twoParagraphs).safe).toBe(true);
  });

  // gse-red-team, LB-006 investigation (this session): a numeric performance
  // claim ("closed 12-3 ATS, a 71% cover rate") contains no banned WORD, only
  // numbers, so the old scanForBannedPhrases-only guard let it through
  // unredacted -- mirrors apps/web/__tests__/blog-public-guard.test.ts's
  // identical regression for the blog guard. CLAUDE.md rule #2: no fabricated
  // stats reaching a public surface.
  describe("numeric performance claims (no banned word, only numbers)", () => {
    it("the fixture contains no banned word, only a numeric claim", () => {
      const dirty = "The model closed 12-3 ATS this cycle, a 71% cover rate, and is up +14 units on the season.";
      expect(scanForBannedPhrases(dirty)).toHaveLength(0);
    });

    it("fails safe on a numeric-claim body (percent + record + units, no banned word)", () => {
      const dirty = "The model closed 12-3 ATS this cycle, a 71% cover rate, and is up +14 units on the season.";
      const result = guardPublicJournalBody(dirty);

      expect(result.safe).toBe(false);
      expect(result.body).not.toContain("71%");
      expect(result.body).not.toContain("12-3 ATS");
      expect(result.body).not.toContain("+14 units");
      expect(result.body).toBe(
        "This Journal entry is being re-reviewed before publication and is temporarily unavailable."
      );
    });

    it("guardPublicJournalTitle also catches a numeric-claim title", () => {
      const dirtyTitle = "Week 12 Recap: 71% Cover Rate and Climbing";
      expect(scanForBannedPhrases(dirtyTitle)).toHaveLength(0);

      const guarded = guardPublicJournalTitle(dirtyTitle);
      expect(guarded).not.toContain("71%");
      expect(guarded).toBe("Model Journal entry");
    });

    it("still passes clean prose with an unrelated number through unchanged", () => {
      // A bare number with no performance word nearby must not over-trigger.
      const clean = "The model considered 30% of available snaps before locking the line.";
      const result = guardPublicJournalBody(clean);
      expect(result.safe).toBe(true);
      expect(result.body).toBe(clean);
    });
  });
});
