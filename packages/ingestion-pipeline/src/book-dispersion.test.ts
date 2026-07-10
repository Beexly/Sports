import { describe, it, expect } from "vitest";
import { bookLineDispersion, type BookOddsRow } from "./book-dispersion.js";

function row(over: Partial<BookOddsRow>): BookOddsRow {
  return { market: "SPREADS", ...over };
}

describe("bookLineDispersion", () => {
  it("SPREAD: max minus min of the point lines across books", () => {
    const odds = [
      row({ market: "SPREADS", spread: -3 }),
      row({ market: "SPREADS", spread: -3.5 }),
      row({ market: "SPREADS", spread: -2.5 }),
    ];
    expect(bookLineDispersion("SPREAD", odds)).toBeCloseTo(1.0, 10); // -2.5 - (-3.5)
  });

  it("TOTAL: max minus min of the total point lines", () => {
    const odds = [
      row({ market: "TOTALS", total: 8.5 }),
      row({ market: "TOTALS", total: 9 }),
      row({ market: "TOTALS", total: 8 }),
    ];
    expect(bookLineDispersion("TOTAL", odds)).toBeCloseTo(1.0, 10); // 9 - 8
  });

  it("MONEYLINE: dispersion of home implied probability across books", () => {
    // -150 → 0.6, +150 → 0.4 ; dispersion = 0.2
    const odds = [
      row({ market: "H2H", homePrice: -150 }),
      row({ market: "H2H", homePrice: 150 }),
    ];
    const d = bookLineDispersion("MONEYLINE", odds);
    expect(d).not.toBeNull();
    expect(d!).toBeCloseTo(0.2, 10);
  });

  it("returns null when only one book quotes the kind (no disagreement to measure)", () => {
    expect(bookLineDispersion("SPREAD", [row({ market: "SPREADS", spread: -3 })])).toBeNull();
    expect(bookLineDispersion("TOTAL", [row({ market: "TOTALS", total: 9 })])).toBeNull();
  });

  it("returns null when no book quotes the pick's kind", () => {
    const totalsOnly = [row({ market: "TOTALS", total: 9 }), row({ market: "TOTALS", total: 8.5 })];
    expect(bookLineDispersion("SPREAD", totalsOnly)).toBeNull();
  });

  it("ignores rows of other markets and non-numeric lines", () => {
    const mixed = [
      row({ market: "SPREADS", spread: -3 }),
      row({ market: "SPREADS", spread: -4 }),
      row({ market: "TOTALS", total: 9 }), // ignored for SPREAD
      row({ market: "SPREADS", spread: null }), // ignored
      row({ market: "H2H", homePrice: -110 }), // ignored for SPREAD
    ];
    expect(bookLineDispersion("SPREAD", mixed)).toBeCloseTo(1.0, 10); // -3 - (-4)
  });

  it("MONEYLINE skips a meaningless 0 American price", () => {
    const odds = [
      row({ market: "H2H", homePrice: 0 }), // skipped
      row({ market: "H2H", homePrice: -110 }),
    ];
    // only one valid quote left → null
    expect(bookLineDispersion("MONEYLINE", odds)).toBeNull();
  });

  it("dispersion is zero (not null) when two books agree exactly", () => {
    const odds = [row({ market: "SPREADS", spread: -3 }), row({ market: "SPREADS", spread: -3 })];
    expect(bookLineDispersion("SPREAD", odds)).toBe(0);
  });
});
