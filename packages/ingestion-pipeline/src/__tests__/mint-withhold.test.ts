import { describe, expect, it, vi } from "vitest";
import {
  bookPricedMintWithholdReason,
  isNflPreseasonKickoff,
  logMintWithhold,
} from "../mint-withhold.js";

/**
 * C-353 — mint withhold pure helpers.
 *
 * WITHHOLD-ONLY: these predicates can only refuse a candidate. They never
 * create, reorder, or re-price. Each refusal is one structured log line.
 */

describe("bookPricedMintWithholdReason", () => {
  const base = {
    sportKey: "americanfootball_nfl",
    pickType: "SPREAD",
    bookmakerCount: 4,
    isNflPreseasonGame: false,
  };

  it("withholds NFL preseason on every market", () => {
    for (const pickType of ["SPREAD", "TOTAL", "MONEYLINE"]) {
      expect(
        bookPricedMintWithholdReason({ ...base, pickType, isNflPreseasonGame: true }),
      ).toBe("nfl_preseason");
    }
  });

  it("withholds MLB SPREAD and TOTAL but lets MLB MONEYLINE through (calibration lane)", () => {
    expect(
      bookPricedMintWithholdReason({ ...base, sportKey: "baseball_mlb", pickType: "SPREAD" }),
    ).toBe("mlb_spread");
    expect(
      bookPricedMintWithholdReason({ ...base, sportKey: "baseball_mlb", pickType: "TOTAL" }),
    ).toBe("mlb_total");
    expect(
      bookPricedMintWithholdReason({ ...base, sportKey: "baseball_mlb", pickType: "MONEYLINE" }),
    ).toBeNull();
  });

  it("withholds soccer MONEYLINE on every soccer key", () => {
    for (const sportKey of ["soccer_usa_mls", "soccer_epl", "SOCCER_UEFA_CL"]) {
      expect(
        bookPricedMintWithholdReason({ ...base, sportKey, pickType: "MONEYLINE" }),
      ).toBe("soccer_moneyline");
    }
  });

  it("does not withhold soccer SPREAD/TOTAL (draw is not a special outcome there)", () => {
    expect(
      bookPricedMintWithholdReason({
        ...base,
        sportKey: "soccer_usa_mls",
        pickType: "SPREAD",
      }),
    ).toBeNull();
    expect(
      bookPricedMintWithholdReason({
        ...base,
        sportKey: "soccer_usa_mls",
        pickType: "TOTAL",
      }),
    ).toBeNull();
  });

  it("withholds a 0-book book-priced candidate", () => {
    expect(
      bookPricedMintWithholdReason({ ...base, bookmakerCount: 0 }),
    ).toBe("zero_books");
  });

  it("lets a regular-season NFL spread with books through", () => {
    expect(bookPricedMintWithholdReason(base)).toBeNull();
  });
});

describe("isNflPreseasonKickoff", () => {
  it("is true for NFL July/August UTC kickoffs", () => {
    expect(isNflPreseasonKickoff("americanfootball_nfl", new Date("2027-08-15T16:00:00Z"))).toBe(true);
    expect(isNflPreseasonKickoff("americanfootball_nfl", new Date("2027-07-01T00:00:00Z"))).toBe(true);
  });

  it("is false for NFL September+ and for non-NFL sports in August", () => {
    expect(isNflPreseasonKickoff("americanfootball_nfl", new Date("2026-09-07T16:00:00Z"))).toBe(false);
    expect(isNflPreseasonKickoff("baseball_mlb", new Date("2027-08-15T16:00:00Z"))).toBe(false);
  });
});

describe("logMintWithhold", () => {
  it("emits one structured line: withheld: reason=… gameId=… pickType=…", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    logMintWithhold("[ingestion]", "mlb_spread", "game-1", "SPREAD");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "[ingestion] withheld: reason=mlb_spread gameId=game-1 pickType=SPREAD",
    );
    warn.mockRestore();
  });
});
