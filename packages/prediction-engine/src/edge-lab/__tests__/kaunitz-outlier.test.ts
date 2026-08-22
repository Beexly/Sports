import { describe, expect, it } from "vitest";
import {
  DEFAULT_KAUNITZ_TAU,
  KAUNITZ_METHOD_TAG,
  MIN_KAUNITZ_BOOKS,
  scanKaunitzOutliers,
} from "../kaunitz-outlier.js";

const EVEN = { homeAmerican: -110, awayAmerican: -110 };

describe("scanKaunitzOutliers", () => {
  it("refuses a two-book argument — that is not a field", () => {
    const r = scanKaunitzOutliers([
      { book: "a", ...EVEN },
      { book: "b", ...EVEN },
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected denied");
    expect(r.refuse).toBe("too_few_books");
    expect(MIN_KAUNITZ_BOOKS).toBe(3);
  });

  it("refuses empty input and a non-unit tau", () => {
    expect(scanKaunitzOutliers([]).ok).toBe(false);
    expect(scanKaunitzOutliers([{ book: "a", ...EVEN }], { tau: 0 }).ok).toBe(false);
    expect(scanKaunitzOutliers([{ book: "a", ...EVEN }], { tau: 1 }).ok).toBe(false);
  });

  it("drops one-sided quotes instead of inventing a Shin q", () => {
    const r = scanKaunitzOutliers([
      { book: "dk", ...EVEN },
      { book: "fd", ...EVEN },
      { book: "mgm", homeAmerican: -110, awayAmerican: Number.NaN },
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected denied");
    expect(r.refuse).toBe("too_few_books");
  });

  it("does not flag a tight even field — disagreement, not a longshot, is the signal", () => {
    const r = scanKaunitzOutliers([
      { book: "dk", ...EVEN },
      { book: "fd", ...EVEN },
      { book: "mgm", ...EVEN },
      { book: "czr", ...EVEN },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected scan");
    expect(r.flags).toEqual([]);
    expect(r.priced).toBe(false);
    expect(r.methodTag).toBe(KAUNITZ_METHOD_TAG);
    expect(r.qHomeConsensus).toBeCloseTo(0.5, 8);
    expect(r.tau).toBe(DEFAULT_KAUNITZ_TAU);
  });

  it("flags the named book whose Shin q sits ≥ tau below the median (price too long)", () => {
    // Four -110/-110 books (q≈0.5) plus a home dog at +200 / -240.
    // +200 home is raw 1/3; after Shin with -240 away it stays well under 0.47.
    const r = scanKaunitzOutliers(
      [
        { book: "dk", ...EVEN },
        { book: "fd", ...EVEN },
        { book: "mgm", ...EVEN },
        { book: "czr", ...EVEN },
        { book: "outlier", homeAmerican: 200, awayAmerican: -240 },
      ],
      { tau: 0.03 },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected scan");
    expect(r.bookCount).toBe(5);
    expect(r.flags.length).toBe(1);
    const f = r.flags[0]!;
    expect(f.book).toBe("outlier");
    expect(f.side).toBe("home");
    expect(f.gap).toBeGreaterThanOrEqual(0.03);
    expect(f.qBook).toBeLessThan(f.qConsensus);
    expect(f.qConsensus).toBeGreaterThan(0.45);
  });

  it("flags away when that is the too-long side", () => {
    const r = scanKaunitzOutliers(
      [
        { book: "dk", ...EVEN },
        { book: "fd", ...EVEN },
        { book: "mgm", ...EVEN },
        { book: "long-away", homeAmerican: -240, awayAmerican: 200 },
      ],
      { tau: 0.03 },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected scan");
    expect(r.flags.length).toBe(1);
    expect(r.flags[0]!.book).toBe("long-away");
    expect(r.flags[0]!.side).toBe("away");
  });

  it("does not flag a 1-point disagreement under tau=0.03", () => {
    const r = scanKaunitzOutliers(
      [
        { book: "a", homeAmerican: -115, awayAmerican: -105 },
        { book: "b", homeAmerican: -110, awayAmerican: -110 },
        { book: "c", homeAmerican: -105, awayAmerican: -115 },
      ],
      { tau: 0.03 },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected scan");
    expect(r.flags).toEqual([]);
  });
});
