import { describe, expect, it } from "vitest";
import { kalshiH2hBookmaker, probToAmerican } from "../galaxy-kalshi-book.js";
import type { KalshiFairValue } from "../kalshi-client.js";

function fv(overrides: Partial<KalshiFairValue> = {}): KalshiFairValue {
  return {
    eventTicker: "KXNFLGAME-26SEP04PITBUF",
    capturedAt: "2026-09-04T15:00:00.000Z",
    overround: 1.02,
    sides: [
      { team: "Buffalo", ticker: "KXNFLGAME-26SEP04PITBUF-BUF", rawImpliedProb: 0.6, fairProb: 0.588 },
      { team: "Pittsburgh", ticker: "KXNFLGAME-26SEP04PITBUF-PIT", rawImpliedProb: 0.42, fairProb: 0.412 },
    ],
    ...overrides,
  };
}

describe("probToAmerican", () => {
  it("maps favorites negative and dogs positive, |price| >= 100", () => {
    expect(probToAmerican(0.6)).toBe(-150);
    expect(probToAmerican(0.42)).toBe(138);
    expect(probToAmerican(0.5)).toBe(-100);
  });

  it("never emits a price for a degenerate probability", () => {
    expect(probToAmerican(0)).toBeNull();
    expect(probToAmerican(1)).toBeNull();
    expect(probToAmerican(Number.NaN)).toBeNull();
  });
});

describe("kalshiH2hBookmaker", () => {
  it("builds a real two-sided H2H book with full team names and the exchange timestamp", () => {
    const book = kalshiH2hBookmaker({
      fairValue: fv(),
      homeAbbr: "BUF",
      awayAbbr: "PIT",
      homeTeam: "Buffalo Bills",
      awayTeam: "Pittsburgh Steelers",
    });
    expect(book?.key).toBe("kalshi");
    expect(book?.last_update).toBe("2026-09-04T15:00:00.000Z");
    const h2h = book?.markets.find((m) => m.key === "h2h");
    const home = h2h?.outcomes.find((o) => o.name === "Buffalo Bills");
    const away = h2h?.outcomes.find((o) => o.name === "Pittsburgh Steelers");
    expect(home?.price).toBe(-150);
    expect(away?.price).toBe(138);
  });

  it("returns null when either side lacks a live two-way quote (never invents)", () => {
    const oneSided = fv({
      sides: [
        { team: "Buffalo", ticker: "KXNFLGAME-26SEP04PITBUF-BUF", rawImpliedProb: 0.6, fairProb: null },
        { team: "Pittsburgh", ticker: "KXNFLGAME-26SEP04PITBUF-PIT", rawImpliedProb: null, fairProb: null },
      ],
    });
    expect(
      kalshiH2hBookmaker({
        fairValue: oneSided,
        homeAbbr: "BUF",
        awayAbbr: "PIT",
        homeTeam: "Buffalo Bills",
        awayTeam: "Pittsburgh Steelers",
      }),
    ).toBeNull();
  });

  it("returns null when abbreviations do not resolve to ticker tails (honest miss)", () => {
    expect(
      kalshiH2hBookmaker({
        fairValue: fv(),
        homeAbbr: "WSH",
        awayAbbr: "PIT",
        homeTeam: "Washington Commanders",
        awayTeam: "Pittsburgh Steelers",
      }),
    ).toBeNull();
  });
});
