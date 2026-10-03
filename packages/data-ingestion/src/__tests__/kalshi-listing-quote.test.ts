import { describe, expect, it } from "vitest";
import {
  gateKalshiLastOrCandle,
  gateKalshiListing,
  kalshiPriceToUnit,
  yesAskFromNoBid,
} from "../kalshi-listing-quote.js";

describe("kalshiPriceToUnit", () => {
  it("maps cents 20 to 0.20 and leaves unit prices alone", () => {
    expect(kalshiPriceToUnit(20)).toBeCloseTo(0.2, 12);
    expect(kalshiPriceToUnit("20")).toBeCloseTo(0.2, 12);
    expect(kalshiPriceToUnit(0.37)).toBeCloseTo(0.37, 12);
    expect(kalshiPriceToUnit("0.37")).toBeCloseTo(0.37, 12);
    expect(kalshiPriceToUnit(null)).toBeNull();
  });
});

describe("gateKalshiListing — two-way, never last", () => {
  it("mids yes_bid / yes_ask in dollars", () => {
    const g = gateKalshiListing({ yesBid: "0.36", yesAsk: "0.38", status: "open" });
    expect(g.usable).toBe(true);
    expect(g.q).toBeCloseTo(0.37, 12);
    expect(g.source).toBe("yes_bid_ask");
  });

  it("reconstructs YES ask from NO bid (sports-skills listing shape, cents)", () => {
    // yes_bid=40¢, no_bid=58¢ → yes_ask = 1 - 0.58 = 0.42, mid = 0.41
    const g = gateKalshiListing({ yesBid: 40, noBid: 58, status: "open" });
    expect(g.usable).toBe(true);
    expect(g.source).toBe("yes_bid_no_bid_complement");
    expect(g.ask).toBeCloseTo(yesAskFromNoBid(0.58), 12);
    expect(g.q).toBeCloseTo((0.4 + 0.42) / 2, 12);
  });

  it("refuses last_price as implied probability (the skill's default)", () => {
    const g = gateKalshiListing({ last: 20 });
    expect(g.usable).toBe(false);
    expect(g.refuse).toBe("last_trade_only");
    expect(g.q).toBeNull();
  });

  it("refuses one-sided bid even when last is present", () => {
    const g = gateKalshiListing({ yesBid: "0.40", yesAsk: "0", last: "0.38" });
    expect(g.usable).toBe(false);
    expect(g.refuse).toBe("last_trade_only");
  });

  it("refuses settled listings and wide spreads", () => {
    expect(gateKalshiListing({ yesBid: 36, yesAsk: 38, status: "settled" }).refuse).toBe("not_live");
    const wide = gateKalshiListing({ yesBid: 0.2, yesAsk: 0.45, status: "open" });
    expect(wide.refuse).toBe("wide_spread");
  });
});

describe("gateKalshiLastOrCandle", () => {
  it("always refuses candlestick close / trade tape as q", () => {
    expect(gateKalshiLastOrCandle(55).refuse).toBe("last_trade_only");
    expect(gateKalshiLastOrCandle("0.55").usable).toBe(false);
  });
});
