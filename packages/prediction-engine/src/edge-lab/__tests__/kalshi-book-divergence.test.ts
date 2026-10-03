import { describe, expect, it } from "vitest";
import { DEFAULT_KALSHI_BOOK_TAU, scanKalshiVsBooks } from "../kalshi-book-divergence.js";

const EVEN = { homeAmerican: -110, awayAmerican: -110 };

describe("scanKalshiVsBooks", () => {
  it("refuses a missing or inverted Kalshi book", () => {
    expect(scanKalshiVsBooks(null, [{ book: "dk", ...EVEN }]).ok).toBe(false);
    expect(scanKalshiVsBooks({ bid: 0.6, ask: 0.5 }, [{ book: "dk", ...EVEN }]).ok).toBe(false);
  });

  it("refuses a wide Kalshi spread (mention board)", () => {
    const r = scanKalshiVsBooks({ bid: 0.2, ask: 0.45 }, [{ book: "dk", ...EVEN }]);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected denied");
    expect(r.refuse).toBe("wide_spread");
  });

  it("does not flag an even book against a 50-cent Kalshi mid", () => {
    const r = scanKalshiVsBooks({ bid: 0.49, ask: 0.51 }, [
      { book: "dk", ...EVEN },
      { book: "fd", ...EVEN },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected scan");
    expect(r.flags).toEqual([]);
    expect(r.priced).toBe(false);
    expect(r.tau).toBe(DEFAULT_KALSHI_BOOK_TAU);
  });

  it("flags the named book whose Shin q sits ≥ tau below Kalshi (too long)", () => {
    const r = scanKalshiVsBooks(
      { bid: 0.58, ask: 0.6 },
      [
        { book: "dk", ...EVEN },
        { book: "long", homeAmerican: 200, awayAmerican: -240 },
      ],
      { tau: 0.03 },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected scan");
    expect(r.qKalshiHome).toBeCloseTo(0.59, 8);
    const long = r.flags.find((f) => f.book === "long");
    expect(long).toBeDefined();
    expect(long!.side).toBe("home");
    expect(long!.gap).toBeGreaterThanOrEqual(0.03);
  });
});
