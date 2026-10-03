import { describe, expect, it } from "vitest";
import {
  scanForBannedPhrases,
  scanForNumericPerformanceClaims,
  scanPublicCopyForClaims,
} from "@/lib/trust-claims";

// public-number-audit-2026-07-16, finding #6: the banned-phrase scanner is a
// fixed WORD list and never sees a number, so "our picks hit 71% last month"
// sailed through untouched — no banned word appears anywhere in it. These
// tests pin the numeric-performance-claim detector added to close that gap.

describe("scanForNumericPerformanceClaims — true positives", () => {
  it("flags a percentage next to a performance word ('hit 71%')", () => {
    const hits = scanForNumericPerformanceClaims("our picks hit 71% last month");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.claimId === "numeric.performance-percent")).toBe(true);
  });

  it("flags a win-loss ATS record ('went 12-3 ATS')", () => {
    const hits = scanForNumericPerformanceClaims("our NFL side went 12-3 ATS this season");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.claimId === "numeric.performance-record")).toBe(true);
    expect(hits[0]!.snippet).toContain("12-3 ATS");
  });

  it("flags a plain W-L record label ('45-30 record')", () => {
    const hits = scanForNumericPerformanceClaims("closed the year on a 45-30 record");
    expect(hits.some((h) => h.claimId === "numeric.performance-record")).toBe(true);
  });

  it("flags a units profit claim ('+81u')", () => {
    const hits = scanForNumericPerformanceClaims("up +81u across the full slate");
    expect(hits.some((h) => h.claimId === "numeric.performance-units")).toBe(true);
  });

  it("flags a spelled-out units profit claim ('+14 units')", () => {
    const hits = scanForNumericPerformanceClaims("we're up +14 units on the month");
    expect(hits.some((h) => h.claimId === "numeric.performance-units")).toBe(true);
  });

  it("flags an explicit ROI claim ('ROI of 14%')", () => {
    const hits = scanForNumericPerformanceClaims("posting an ROI of 14% since January");
    expect(hits.some((h) => h.claimId === "numeric.performance-roi")).toBe(true);
  });

  it("flags a percentage described with 'accuracy' / 'success' / 'cover' / 'return'", () => {
    expect(
      scanForNumericPerformanceClaims("94% accuracy on totals").some(
        (h) => h.claimId === "numeric.performance-percent"
      )
    ).toBe(true);
    expect(
      scanForNumericPerformanceClaims("a 68% success rate over the slate").some(
        (h) => h.claimId === "numeric.performance-percent"
      )
    ).toBe(true);
    expect(
      scanForNumericPerformanceClaims("covers the spread 61% of the time").some(
        (h) => h.claimId === "numeric.performance-percent"
      )
    ).toBe(true);
    expect(
      scanForNumericPerformanceClaims("a 22% return for subscribers").some(
        (h) => h.claimId === "numeric.performance-percent"
      )
    ).toBe(true);
  });

  it("carries a reviewable snippet and line number", () => {
    const hits = scanForNumericPerformanceClaims("intro line\nour picks hit 71% last month\nclosing line");
    expect(hits.length).toBeGreaterThan(0);
    const hit = hits.find((h) => h.claimId === "numeric.performance-percent")!;
    expect(hit.line).toBe(2);
    expect(hit.snippet).toContain("71%");
  });
});

describe("scanForNumericPerformanceClaims — true negatives (must NOT flag)", () => {
  it("does not flag American odds ('-110 price')", () => {
    expect(scanForNumericPerformanceClaims("locked in at a -110 price")).toEqual([]);
  });

  it("does not flag American odds ('closed at +150')", () => {
    expect(scanForNumericPerformanceClaims("the underdog closed at +150")).toEqual([]);
  });

  it("does not flag a bare statistic unrelated to performance ('30% of snaps')", () => {
    expect(scanForNumericPerformanceClaims("he played 30% of snaps in the slot")).toEqual([]);
  });

  it("does not flag a plain date ('since 2019')", () => {
    expect(scanForNumericPerformanceClaims("tracking this market since 2019")).toEqual([]);
  });

  it("does not flag a percentage near an unrelated word ('40% coverage')", () => {
    expect(scanForNumericPerformanceClaims("bookmaker data coverage sits at 40% today")).toEqual([]);
  });

  it("does not flag 'window' via a stem match on 'win'", () => {
    expect(
      scanForNumericPerformanceClaims("paid plans include a 7-day refund window, capped at 25% of the annual price")
    ).toEqual([]);
  });

  it("does not flag a negative unit figure ('-3u', a loss, not a profit claim)", () => {
    expect(scanForNumericPerformanceClaims("down -3u on the week")).toEqual([]);
  });

  it("does not flag ordinary prose with no percentage, record, or units marker", () => {
    expect(
      scanForNumericPerformanceClaims(
        "Our model favors the Chiefs based on bookmaker consensus. Sports betting involves risk."
      )
    ).toEqual([]);
  });
});

describe("scanPublicCopyForClaims — union of both scanners", () => {
  it("still catches the original fixed banned-phrase list", () => {
    const hits = scanPublicCopyForClaims("This is a guaranteed winner, a total lock.");
    expect(hits.some((h) => h.claimId === "banned.guaranteed-outcome")).toBe(true);
  });

  it("catches a numeric claim the fixed list alone would miss", () => {
    const text = "our picks hit 71% last month";
    expect(scanForBannedPhrases(text)).toEqual([]); // the gap this closes
    expect(scanPublicCopyForClaims(text).length).toBeGreaterThan(0);
  });

  it("returns nothing for genuinely clean copy", () => {
    expect(
      scanPublicCopyForClaims("Line moved on Thursday; we weight recent form and score every matchup.")
    ).toEqual([]);
  });

  it("does not mutate scanForBannedPhrases' own behavior (extend, don't break)", () => {
    // Same clean-text and dirty-text assertions the pre-existing trust-claims
    // suite pins for scanForBannedPhrases must still hold verbatim.
    expect(
      scanForBannedPhrases("Our model favors the Chiefs based on bookmaker consensus. Sports betting involves risk.")
    ).toEqual([]);
    expect(scanForBannedPhrases("This is a lock.").length).toBeGreaterThan(0);
  });
});
