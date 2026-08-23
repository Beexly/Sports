import { describe, expect, it } from "vitest";
import {
  createKalshiTradeProvider,
  midFromKalshiOrderbook,
  KALSHI_PROVIDER_META,
} from "../providers/kalshi-trade-api";

describe("Kalshi trade API provider", () => {
  it("parses linked yes/no books to mid", () => {
    const m = midFromKalshiOrderbook({
      yes: [
        [0.48, 100],
        [0.47, 50],
      ],
      no: [[0.5, 80]],
    });
    expect(m).not.toBeNull();
    expect(m!.bid).toBeCloseTo(0.48);
    expect(m!.ask).toBeCloseTo(0.5);
    expect(m!.mid).toBeCloseTo(0.49);
  });

  it("accepts cent-scale prices", () => {
    const m = midFromKalshiOrderbook({
      yes: [[48, 10]],
      no: [[50, 10]],
    });
    expect(m!.mid).toBeGreaterThan(0.4);
    expect(m!.mid).toBeLessThan(0.6);
  });

  it("fetches offline fixtures without API key", async () => {
    const p = createKalshiTradeProvider({
      fixtures: {
        "NFL-DEMO": {
          yes: [[0.55, 10]],
          no: [[0.44, 10]],
        },
      },
    });
    expect(p.requiresApiKey).toBe(false);
    expect(KALSHI_PROVIDER_META.oddsApiRequired).toBe(false);
    const lines = await p.fetchQuotes({
      sport: "NFL",
      eventId: "NFL-DEMO",
      market: "binary_pm",
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]!.q).toBeGreaterThan(0.5);
    expect(lines[0]!.sourceId).toBe("kalshi.trade_api");
    expect(lines[0]!.sourceKind).toBe("prediction_market");
  });
});
