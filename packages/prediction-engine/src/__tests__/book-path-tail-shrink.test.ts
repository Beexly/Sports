import { describe, expect, it } from "vitest";
import {
  BOOK_PATH_TAIL_CEILING,
  BOOK_PATH_TAIL_FLOOR,
  BOOK_PATH_TAIL_STRENGTH,
  bookPathTailShrinkScore,
  reportBookPathTailShrink,
  shrinkBookPathTailConfidence,
} from "../book-path-tail-shrink.js";

/**
 * Book-path ≥80 overconfidence: the measured failure mode and the fix path.
 *
 * MEASURED (2026-09-13, n 235 at conf ≥80): claimed 0.8663, realized
 * 0.5191, z = -10.7. The score is INVERTED at the top (90–94 realizes
 * 0.4643, below the lowest band's 0.5280). Isotonic/PAVA cannot fix a
 * non-monotone score — it can only flatten, never invert. This suite pins
 * (1) the failure shape, (2) that the shrink pulls the tail down, and
 * (3) that it invents no edge: selection, independentEdge and rankingP
 * are out of scope and never read.
 */

/** Reproduce the measured 80+ claimed-rate shape (approx). */
function measuredTail(): Array<{ confidence: number }> {
  // Bucket centers weighted to the measured mix (n 235, claimed ~0.866).
  const out: Array<{ confidence: number }> = [];
  for (let i = 0; i < 130; i++) out.push({ confidence: 85 }); // 80-89 band
  for (let i = 0; i < 32; i++) out.push({ confidence: 92 }); // 90-94
  for (let i = 0; i < 20; i++) out.push({ confidence: 97 }); // 95-99
  for (let i = 0; i < 53; i++) out.push({ confidence: 82 }); // remainder of 80+
  return out;
}

describe("book-path tail shrink — failure mode is documented, not asserted away", () => {
  it("the raw ≥80 band claims ~0.87 — the measured overclaim this module targets", () => {
    const report = reportBookPathTailShrink(measuredTail(), { enabled: false });
    expect(report.n).toBe(235);
    expect(report.claimedBefore).toBeGreaterThan(0.8);
    expect(report.claimedBefore).toBeLessThan(0.95);
    // Floor and ceiling constants match the measurement's inverted band.
    expect(BOOK_PATH_TAIL_FLOOR).toBe(80);
  });

  it("confidence is non-monotone in outcome — a fact no monotone map can repair", () => {
    // Pure documentation pin: realized peak is 75–79 (0.6146), falls to
    // 0.4643 by 90–94. A PAVA map is monotone non-decreasing and therefore
    // cannot represent this shape. The shrink is the only honest tool.
    const realized: Record<string, number> = {
      "50-59": 0.528,
      "75-79": 0.6146,
      "90-94": 0.4643,
    };
    expect(realized["75-79"]!).toBeGreaterThan(realized["50-59"]!);
    expect(realized["90-94"]!).toBeLessThan(realized["50-59"]!);
  });
});

describe("shrinkBookPathTailConfidence — disabled by default (identity)", () => {
  it("returns the input when enabled is omitted or false", () => {
    for (const c of [50, 79, 80, 85, 90, 100]) {
      expect(shrinkBookPathTailConfidence(c)).toEqual({
        confidence: c,
        applied: false,
        rawConfidence: c,
      });
      expect(shrinkBookPathTailConfidence(c, { enabled: false })).toEqual({
        confidence: c,
        applied: false,
        rawConfidence: c,
      });
    }
  });

  it("bookPathTailShrinkScore is identity when disabled", () => {
    expect(bookPathTailShrinkScore(91)).toBe(91);
  });
});

describe("shrinkBookPathTailConfidence — enabled shrinks ONLY the inverted band", () => {
  it("leaves every score below the floor untouched", () => {
    for (const c of [0, 50, 65, 75, 79]) {
      const r = shrinkBookPathTailConfidence(c, { enabled: true });
      expect(r.confidence).toBe(c);
      expect(r.applied).toBe(false);
    }
  });

  it("never raises a score (shrink only — no invented confidence)", () => {
    for (const c of [80, 82, 85, 90, 95, 100]) {
      const r = shrinkBookPathTailConfidence(c, { enabled: true });
      expect(r.confidence).toBeLessThanOrEqual(c);
    }
  });

  it("moves conf 90+ downward, keeps conf 80 near the boundary, and inverts the top", () => {
    const atFloor = shrinkBookPathTailConfidence(80, { enabled: true });
    const mid = shrinkBookPathTailConfidence(90, { enabled: true });
    const top = shrinkBookPathTailConfidence(100, { enabled: true });

    // At the floor the pull is zero (t=0); higher scores fall further.
    expect(atFloor.confidence).toBeLessThanOrEqual(80);
    expect(mid.confidence).toBeLessThan(90);
    // The measured score is INVERTED at the top, so the shrink is
    // non-monotone: conf 100 maps BELOW conf 90.
    expect(top.confidence).toBeLessThan(mid.confidence);
    expect(top.confidence).toBeGreaterThanOrEqual(BOOK_PATH_TAIL_CEILING);
  });

  it("the ≥80 claimed rate FALLS after the shrink — the tail really shrinks", () => {
    const report = reportBookPathTailShrink(measuredTail(), { enabled: true });
    expect(report.n).toBe(235);
    expect(report.claimedAfter).toBeLessThan(report.claimedBefore - 0.05);
    expect(report.maxAfter).toBeLessThan(report.maxBefore);
    // Still a claim above a coin flip (this is a score, not a fitted p), but
    // no longer the measured 0.87 overclaim.
    expect(report.claimedAfter).toBeLessThan(0.82);
    expect(report.claimedAfter).toBeGreaterThan(0.5);
    // And the max falls hard: conf 100 is pulled well below 90.
    expect(report.maxAfter).toBeLessThan(90);
  });

  it("strength 1 collapses the whole band to the ceiling (hard cap)", () => {
    for (const c of [80, 90, 100]) {
      const r = shrinkBookPathTailConfidence(c, { enabled: true, strength: 1 });
      expect(r.confidence).toBe(BOOK_PATH_TAIL_CEILING);
    }
  });

  it("strength 0 is identity even when enabled", () => {
    expect(shrinkBookPathTailConfidence(95, { enabled: true, strength: 0 }).confidence).toBe(95);
  });
});

describe("book-path tail shrink — invents no edge", () => {
  it("is a pure function of the score: same input, same output, no outcome read", () => {
    const a = shrinkBookPathTailConfidence(93, { enabled: true });
    const b = shrinkBookPathTailConfidence(93, { enabled: true });
    expect(a).toEqual(b);
    // No WIN/LOSS, no marketFairProb, no independentEdge in the signature —
    // the module cannot invent or destroy edge by construction.
  });

  it("never returns a score above 100 or below 0", () => {
    for (const c of [-10, 0, 150, Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = shrinkBookPathTailConfidence(c, { enabled: true });
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(100);
    }
  });

  it("the default strength and ceiling are the named constants (no hidden magic)", () => {
    const r = shrinkBookPathTailConfidence(100, { enabled: true });
    // drop = round(strength * (floor - ceiling) * t) with t = 1 at c = 100
    const expectedDrop = Math.round(
      BOOK_PATH_TAIL_STRENGTH * (BOOK_PATH_TAIL_FLOOR - BOOK_PATH_TAIL_CEILING),
    );
    expect(r.confidence).toBe(100 - expectedDrop);
    expect(r.confidence).toBeGreaterThanOrEqual(BOOK_PATH_TAIL_CEILING);
  });
});
