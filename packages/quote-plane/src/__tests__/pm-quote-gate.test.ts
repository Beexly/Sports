import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_SPREAD,
  gateLastTradeOnly,
  gatePmTwoWay,
  normalizePmBoard,
  PM_MID_METHOD_TAG,
} from "../pm-quote-gate";
import { createKalshiTradeProvider, midFromKalshiOrderbook } from "../providers/kalshi-trade-api";

describe("gatePmTwoWay", () => {
  it("returns the midpoint of a two-way book inside the spread cap", () => {
    const g = gatePmTwoWay({ bid: 0.48, ask: 0.5 });
    expect(g.usable).toBe(true);
    expect(g.q).toBeCloseTo(0.49, 12);
    expect(g.spread).toBeCloseTo(0.02, 12);
    expect(g.refuse).toBeNull();
    expect(g.methodTag).toBe(PM_MID_METHOD_TAG);
  });

  it("refuses one-sided books (never bid-only, never ask-only)", () => {
    expect(gatePmTwoWay({ bid: 0.48, ask: null }).refuse).toBe("missing_two_way");
    expect(gatePmTwoWay({ bid: null, ask: 0.52 }).refuse).toBe("missing_two_way");
    expect(gatePmTwoWay({ bid: 0.48, ask: null }).usable).toBe(false);
    expect(gatePmTwoWay({ bid: 0.48, ask: null }).q).toBeNull();
  });

  it("refuses a last-trade print as priced q", () => {
    const g = gateLastTradeOnly(0.61);
    expect(g.usable).toBe(false);
    expect(g.refuse).toBe("last_trade_only");
    expect(g.q).toBeNull();
  });

  it("refuses a wide spread (entertainment/mention boards)", () => {
    const g = gatePmTwoWay({ bid: 0.2, ask: 0.45 }, { maxSpread: DEFAULT_MAX_SPREAD });
    expect(g.usable).toBe(false);
    expect(g.refuse).toBe("wide_spread");
  });

  it("refuses an inverted book", () => {
    expect(gatePmTwoWay({ bid: 0.6, ask: 0.55 }).refuse).toBe("inverted_book");
  });

  it("normalizes an N-way overround board to a probability vector", () => {
    const p = normalizePmBoard([0.155, 0.075, 0.075, 0.725]);
    expect(p).not.toBeNull();
    expect(p!.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 12);
    expect(p![0]).toBeCloseTo(0.155 / 1.03, 8);
    expect(normalizePmBoard([0.5])).toBeNull();
  });
});

describe("Kalshi orderbook — fail closed without two-way mid", () => {
  it("still parses a linked yes/no book", () => {
    const m = midFromKalshiOrderbook({
      yes: [
        [0.48, 100],
        [0.47, 50],
      ],
      no: [[0.5, 80]],
    });
    expect(m).not.toBeNull();
    expect(m!.mid).toBeCloseTo(0.49);
  });

  it("returns no quotes for a one-sided book", async () => {
    const p = createKalshiTradeProvider({
      fixtures: { "NFL-ONE": { yes: [[0.55, 10]], no: [] } },
    });
    const lines = await p.fetchQuotes({
      sport: "NFL",
      eventId: "NFL-ONE",
      market: "binary_pm",
    });
    expect(lines).toHaveLength(0);
  });

  it("tags usable quotes as prediction_market mid v2, not a sportsbook", async () => {
    const p = createKalshiTradeProvider({
      fixtures: {
        "NFL-DEMO": {
          yes: [[0.55, 10]],
          no: [[0.44, 10]],
        },
      },
    });
    const lines = await p.fetchQuotes({
      sport: "NFL",
      eventId: "NFL-DEMO",
      market: "binary_pm",
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]!.sourceKind).toBe("prediction_market");
    expect(lines[0]!.methodTag).toBe(PM_MID_METHOD_TAG);
    expect(lines[0]!.q).toBeGreaterThan(0.5);
  });
});
