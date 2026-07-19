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

  it("MONEYLINE: dispersion of home implied probability across books (default side = home)", () => {
    // -150 → 0.6, +150 → 0.4 ; dispersion = 0.2
    const odds = [
      row({ market: "H2H", homePrice: -150 }),
      row({ market: "H2H", homePrice: 150 }),
    ];
    const d = bookLineDispersion("MONEYLINE", odds);
    expect(d).not.toBeNull();
    expect(d!).toBeCloseTo(0.2, 10);
  });

  it("MONEYLINE: measures the PUBLISHED side — away dispersion uses away prices, not home", () => {
    // Books AGREE exactly on the home price (both -150 → 0.6) but DISAGREE on the
    // away price. American odds carry vig, so home/away are NOT complementary: the
    // home side shows 0 dispersion while the away side shows real disagreement.
    // A home-hardcoded implementation would persist 0 for an away-ML pick here.
    const odds = [
      row({ market: "H2H", homePrice: -150, awayPrice: 130 }),
      row({ market: "H2H", homePrice: -150, awayPrice: 110 }),
    ];
    // home: both -150 → 0.6 → dispersion exactly 0
    expect(bookLineDispersion("MONEYLINE", odds, "home")).toBe(0);
    // away: +130 → 100/230, +110 → 100/210 → real dispersion > 0
    const away = bookLineDispersion("MONEYLINE", odds, "away");
    expect(away).not.toBeNull();
    expect(away!).toBeGreaterThan(0);
    expect(away!).toBeCloseTo(100 / 210 - 100 / 230, 10);
  });

  it("MONEYLINE: < 2 books quoting a side → null for THAT side (per-side null semantics)", () => {
    // Two H2H rows, but only ONE carries an away price. The away side has a single
    // valid quote → null; the home side has two quotes → a real value (here 0).
    const odds = [
      row({ market: "H2H", homePrice: -150, awayPrice: 130 }),
      row({ market: "H2H", homePrice: -150 }), // no away price → skipped for away
    ];
    expect(bookLineDispersion("MONEYLINE", odds, "away")).toBeNull(); // only 1 away quote
    expect(bookLineDispersion("MONEYLINE", odds, "home")).toBe(0); // 2 home quotes, agree
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
