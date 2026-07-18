import { describe, it, expect } from "vitest";
import { buildBestLines, formatAmerican, formatLine, type OddsRowForShop } from "./best-line";

const T0 = new Date("2026-06-15T18:00:00Z");
const T1 = new Date("2026-06-15T19:00:00Z");

function row(p: Partial<OddsRowForShop>): OddsRowForShop {
  return {
    bookmaker: "x",
    market: "H2H",
    fetchedAt: T1,
    homePrice: null,
    awayPrice: null,
    spread: null,
    homeSpreadPrice: null,
    awaySpreadPrice: null,
    total: null,
    overPrice: null,
    underPrice: null,
    ...p,
  };
}

describe("buildBestLines — moneyline", () => {
  const rows = [
    row({ bookmaker: "A", market: "H2H", homePrice: -110, awayPrice: -110 }),
    row({ bookmaker: "B", market: "H2H", homePrice: 105, awayPrice: -125 }),
    row({ bookmaker: "C", market: "H2H", homePrice: -120, awayPrice: 100 }),
  ];

  it("picks the longest payout (lowest implied prob) per side", () => {
    const best = buildBestLines(rows);
    expect(best.moneyline.home).toEqual({ bookmaker: "B", price: 105 });
    expect(best.moneyline.away).toEqual({ bookmaker: "C", price: 100 });
  });

  it("uses each book's LATEST row only — a stale quote never wins", () => {
    const withStale = [
      row({ bookmaker: "A", market: "H2H", homePrice: 200, fetchedAt: T0 }), // stale juicy line
      row({ bookmaker: "A", market: "H2H", homePrice: -110, fetchedAt: T1 }), // current
      row({ bookmaker: "B", market: "H2H", homePrice: 105, fetchedAt: T1 }),
    ];
    const best = buildBestLines(withStale);
    expect(best.moneyline.home).toEqual({ bookmaker: "B", price: 105 });
  });

  it("reports book count and freshest timestamp", () => {
    const best = buildBestLines(rows);
    expect(best.bookCount).toBe(3);
    expect(best.freshestFetchedAt).toBe(T1.toISOString());
  });
});

describe("buildBestLines — spread", () => {
  const rows = [
    row({ bookmaker: "A", market: "SPREADS", spread: -3, homeSpreadPrice: -110, awaySpreadPrice: -110 }),
    row({ bookmaker: "B", market: "SPREADS", spread: -2.5, homeSpreadPrice: -115, awaySpreadPrice: -105 }),
  ];

  it("home takes the most favorable home number; away takes the mirror", () => {
    const best = buildBestLines(rows);
    // home wants the larger home-perspective spread: -2.5 > -3
    expect(best.spread.home).toEqual({ bookmaker: "B", price: -115, line: -2.5 });
    // away wants the most points: home -3 → away +3 (book A)
    expect(best.spread.away).toEqual({ bookmaker: "A", price: -110, line: 3 });
  });

  it("breaks line ties by the better price", () => {
    const tied = [
      row({ bookmaker: "A", market: "SPREADS", spread: -3, homeSpreadPrice: -110 }),
      row({ bookmaker: "C", market: "SPREADS", spread: -3, homeSpreadPrice: -105 }),
    ];
    const best = buildBestLines(tied);
    expect(best.spread.home).toEqual({ bookmaker: "C", price: -105, line: -3 });
  });
});

describe("buildBestLines — total", () => {
  const rows = [
    row({ bookmaker: "A", market: "TOTALS", total: 45.5, overPrice: -110, underPrice: -110 }),
    row({ bookmaker: "B", market: "TOTALS", total: 46, overPrice: -105, underPrice: -115 }),
  ];

  it("over takes the lowest number; under takes the highest", () => {
    const best = buildBestLines(rows);
    expect(best.total.over).toEqual({ bookmaker: "A", price: -110, line: 45.5 });
    expect(best.total.under).toEqual({ bookmaker: "B", price: -115, line: 46 });
  });
});

describe("buildBestLines — empties + formatting", () => {
  it("returns nulls and zero books for no usable rows", () => {
    const best = buildBestLines([]);
    expect(best.moneyline.home).toBeNull();
    expect(best.bookCount).toBe(0);
    expect(best.freshestFetchedAt).toBeNull();
  });

  it("ignores zero/non-finite prices", () => {
    const best = buildBestLines([row({ bookmaker: "A", market: "H2H", homePrice: 0, awayPrice: -110 })]);
    expect(best.moneyline.home).toBeNull();
    expect(best.moneyline.away).toEqual({ bookmaker: "A", price: -110 });
  });

  it("quarantines unsupported prices and non-tradable points", () => {
    const best = buildBestLines([
      row({ bookmaker: "A", market: "H2H", homePrice: -7750 }),
      row({ bookmaker: "B", market: "SPREADS", spread: -3.2, homeSpreadPrice: -110 }),
      row({ bookmaker: "C", market: "TOTALS", total: 8.954545454545455, overPrice: -110 }),
    ]);
    expect(best.moneyline.home).toBeNull();
    expect(best.spread.home).toBeNull();
    expect(best.total.over).toBeNull();
    expect(best.bookCount).toBe(0);
  });

  it("supports quarter-point soccer offers when the sport does", () => {
    const best = buildBestLines([
      row({ bookmaker: "A", market: "SPREADS", spread: -0.25, homeSpreadPrice: -110 }),
    ], "MLS");
    expect(best.spread.home).toEqual({ bookmaker: "A", price: -110, line: -0.25 });
  });

  it("formats prices and lines for display", () => {
    expect(formatAmerican(150)).toBe("+150");
    expect(formatAmerican(-110)).toBe("-110");
    expect(formatLine(-3.5, "spread")).toBe("-3.5");
    expect(formatLine(3, "spread")).toBe("+3");
    expect(formatLine(45.5, "total")).toBe("45.5");
    expect(formatAmerican(-7750)).toBe("N/A");
    expect(formatLine(8.954545454545455, "total")).toBe("N/A");
  });
});
