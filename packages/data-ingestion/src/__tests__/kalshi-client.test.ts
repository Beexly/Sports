import { afterEach, describe, expect, it, vi } from "vitest";
import {
  KalshiClient,
  KalshiError,
  toKalshiEventTicker,
  impliedYesProbability,
  devigTwoSided,
  toIndependentFairValue,
} from "../kalshi-client.js";
import type { KalshiFairValue } from "../kalshi-client.js";

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("toKalshiEventTicker", () => {
  it("builds KX<LEAGUE>GAME-<YYMMMDD><AWAY><HOME> (verified live grammar)", () => {
    expect(
      toKalshiEventTicker({ league: "NBA", dateUtc: "2026-06-03", awayAbbr: "NYK", homeAbbr: "SAS" }),
    ).toBe("KXNBAGAME-26JUN03NYKSAS");
  });

  it("interprets the date in UTC and upper-cases abbreviations", () => {
    expect(
      toKalshiEventTicker({ league: "MLB", dateUtc: "2026-06-03T20:05:00Z", awayAbbr: "ath", homeAbbr: "chc" }),
    ).toBe("KXMLBGAME-26JUN03ATHCHC");
  });

  it("throws KalshiError on an invalid date", () => {
    expect(() =>
      toKalshiEventTicker({ league: "NFL", dateUtc: "not-a-date", awayAbbr: "A", homeAbbr: "B" }),
    ).toThrow(KalshiError);
  });
});

describe("impliedYesProbability", () => {
  it("uses the bid/ask mid when both are present", () => {
    expect(impliedYesProbability({ ticker: "x", yes_bid_dollars: "0.36", yes_ask_dollars: "0.37" })).toBeCloseTo(0.365, 6);
  });

  it("falls back to last price when there is no two-sided quote", () => {
    expect(impliedYesProbability({ ticker: "x", last_price_dollars: "0.42" })).toBeCloseTo(0.42, 6);
  });

  it("returns null when the market is unquoted", () => {
    expect(impliedYesProbability({ ticker: "x" })).toBeNull();
    expect(impliedYesProbability({ ticker: "x", yes_bid_dollars: "0", yes_ask_dollars: "0", last_price_dollars: "0" })).toBeNull();
  });

  it("does NOT fabricate a half-price mid from a one-sided quote (only a genuine two-sided book mids)", () => {
    // Only a bid, explicit zero ask: (0.40 + 0) / 2 = 0.20 would halve the only real
    // price. Must NOT mid — fall through to null when there is no last trade.
    expect(impliedYesProbability({ ticker: "x", yes_bid_dollars: "0.40", yes_ask_dollars: "0" })).toBeNull();
    // Symmetric one-sided ask.
    expect(impliedYesProbability({ ticker: "x", yes_bid_dollars: "0", yes_ask_dollars: "0.55" })).toBeNull();
    // With a last trade present, a one-sided quote falls back to the honest last price, not the mid.
    expect(
      impliedYesProbability({ ticker: "x", yes_bid_dollars: "0.40", yes_ask_dollars: "0", last_price_dollars: "0.38" }),
    ).toBeCloseTo(0.38, 6);
  });
});

describe("devigTwoSided", () => {
  it("normalises the two sides to sum to 1 and reports the overround", () => {
    const { fairA, fairB, overround } = devigTwoSided(0.365, 0.635);
    expect(overround).toBeCloseTo(1.0, 6);
    expect(fairA! + fairB!).toBeCloseTo(1.0, 6);
    expect(fairA).toBeCloseTo(0.365, 6);
  });

  it("removes a positive overround (exchange-style ~0.5%)", () => {
    const { fairA, fairB, overround } = devigTwoSided(0.39, 0.62);
    expect(overround).toBeCloseTo(1.01, 6);
    expect(fairA! + fairB!).toBeCloseTo(1.0, 6);
    expect(fairA).toBeLessThan(0.39); // shrunk by the de-vig
  });

  it("returns null fair values when a side is unpriced", () => {
    expect(devigTwoSided(0.4, null).fairA).toBeNull();
  });
});

describe("KalshiClient.getFairValue", () => {
  const FROZEN = new Date("2026-06-03T18:30:00.000Z");
  const client = new KalshiClient({ now: () => FROZEN });

  function wireHappyPath() {
    return vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/markets?event_ticker=")) {
        return jsonResponse({
          markets: [
            { ticker: "KXNBAGAME-26JUN03NYKSAS-NYK", yes_sub_title: "New York" },
            { ticker: "KXNBAGAME-26JUN03NYKSAS-SAS", yes_sub_title: "San Antonio" },
          ],
        });
      }
      if (url.endsWith("-NYK")) {
        return jsonResponse({ market: { ticker: "KXNBAGAME-26JUN03NYKSAS-NYK", yes_sub_title: "New York", status: "active", yes_bid_dollars: "0.36", yes_ask_dollars: "0.37" } });
      }
      if (url.endsWith("-SAS")) {
        return jsonResponse({ market: { ticker: "KXNBAGAME-26JUN03NYKSAS-SAS", yes_sub_title: "San Antonio", status: "active", yes_bid_dollars: "0.63", yes_ask_dollars: "0.64" } });
      }
      throw new Error(`unexpected url ${url}`);
    });
  }

  it("maps a game to a de-vigged two-sided fair-value snapshot", async () => {
    wireHappyPath();
    const fv = await client.getFairValue({ league: "NBA", dateUtc: "2026-06-03", awayAbbr: "NYK", homeAbbr: "SAS" });

    expect(fv.eventTicker).toBe("KXNBAGAME-26JUN03NYKSAS");
    expect(fv.capturedAt).toBe("2026-06-03T18:30:00.000Z");
    expect(fv.sides).toHaveLength(2);

    const nyk = fv.sides.find((s) => s.team === "New York")!;
    const sas = fv.sides.find((s) => s.team === "San Antonio")!;
    expect(nyk.rawImpliedProb).toBeCloseTo(0.365, 6);
    expect(sas.rawImpliedProb).toBeCloseTo(0.635, 6);
    // de-vigged sides sum to exactly 1
    expect(nyk.fairProb! + sas.fairProb!).toBeCloseTo(1.0, 6);
    expect(fv.overround).toBeCloseTo(1.0, 6);
  });

  it("never requests an order/portfolio endpoint — only public market reads", async () => {
    const spy = wireHappyPath();
    await client.getFairValue({ league: "NBA", dateUtc: "2026-06-03", awayAbbr: "NYK", homeAbbr: "SAS" });
    for (const call of spy.mock.calls) {
      const url = String(call[0]);
      expect(url).not.toMatch(/portfolio|order/i);
      expect(url).toMatch(/\/markets/);
    }
  });

  it("yields null fair values for an unquoted (no-coverage) market rather than throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/markets?event_ticker=")) {
        return jsonResponse({ markets: [
          { ticker: "KXNBAGAME-26JUN03NYKSAS-NYK", yes_sub_title: "New York" },
          { ticker: "KXNBAGAME-26JUN03NYKSAS-SAS", yes_sub_title: "San Antonio" },
        ] });
      }
      return jsonResponse({ market: { ticker: url.split("/").pop() } }); // no price fields
    });

    const fv = await client.getFairValue({ league: "NBA", dateUtc: "2026-06-03", awayAbbr: "NYK", homeAbbr: "SAS" });
    expect(fv.sides.every((s) => s.fairProb === null)).toBe(true);
  });

  it("yields null fair values for a closed/settled market even when a stale bid/ask/last remains (no stale data served as fresh)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/markets?event_ticker=")) {
        return jsonResponse({ markets: [
          { ticker: "KXNBAGAME-26JUN03NYKSAS-NYK", yes_sub_title: "New York" },
          { ticker: "KXNBAGAME-26JUN03NYKSAS-SAS", yes_sub_title: "San Antonio" },
        ] });
      }
      if (url.endsWith("-NYK")) {
        // Settled market that still carries a residual full-price quote/last.
        return jsonResponse({ market: { ticker: "KXNBAGAME-26JUN03NYKSAS-NYK", yes_sub_title: "New York", status: "settled", yes_bid_dollars: "0.99", yes_ask_dollars: "1.00", last_price_dollars: "1.00" } });
      }
      return jsonResponse({ market: { ticker: "KXNBAGAME-26JUN03NYKSAS-SAS", yes_sub_title: "San Antonio", status: "closed", yes_bid_dollars: "0.00", yes_ask_dollars: "0.01", last_price_dollars: "0.00" } });
    });

    const fv = await client.getFairValue({ league: "NBA", dateUtc: "2026-06-03", awayAbbr: "NYK", homeAbbr: "SAS" });
    // A non-live market must produce no implied prob, no fair prob, and no overround.
    expect(fv.sides.every((s) => s.rawImpliedProb === null)).toBe(true);
    expect(fv.sides.every((s) => s.fairProb === null)).toBe(true);
    expect(fv.overround).toBeNull();
  });

  it("surfaces a typed KalshiError when a 200 response carries a non-JSON body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>not json</html>", { status: 200, headers: { "Content-Type": "text/html" } }),
    );
    await expect(client.getEventMarkets("KXNBAGAME-26JUN03NYKSAS")).rejects.toBeInstanceOf(KalshiError);
  });

  it("passes an abort signal so a call can never hang forever", async () => {
    const spy = wireHappyPath();
    await client.getFairValue({ league: "NBA", dateUtc: "2026-06-03", awayAbbr: "NYK", homeAbbr: "SAS" });
    expect(spy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("wraps a timeout as KalshiError(408)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      const err = new Error("timed out");
      err.name = "TimeoutError";
      throw err;
    });
    await expect(
      client.getFairValue({ league: "NBA", dateUtc: "2026-06-03", awayAbbr: "NYK", homeAbbr: "SAS" }),
    ).rejects.toMatchObject({ name: "KalshiError", status: 408 });
  });

  it("retries 5xx before succeeding", async () => {
    const delays: number[] = [];
    const retrying = new KalshiClient({
      now: () => FROZEN,
      baseDelayMs: 100,
      maxRetries: 2,
      jitterRatio: 0,
      random: () => 0,
      sleep: async (ms) => { delays.push(ms); },
    });
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("upstream", { status: 503 }))
      .mockResolvedValue(jsonResponse({ markets: [] }));

    const fv = await retrying.getEventMarkets("KXNBAGAME-26JUN03NYKSAS");
    expect(fv).toEqual([]);
    expect(delays.length).toBeGreaterThanOrEqual(1);
  });
});

describe("toIndependentFairValue — bridge into the engine's independent fair value", () => {
  const fv: KalshiFairValue = {
    eventTicker: "KXNBAGAME-26JUN03NYKSAS",
    capturedAt: "2026-06-03T18:00:00.000Z",
    overround: 1.0,
    sides: [
      { team: "New York", ticker: "KXNBAGAME-26JUN03NYKSAS-NYK", rawImpliedProb: 0.365, fairProb: 0.365 },
      { team: "San Antonio", ticker: "KXNBAGAME-26JUN03NYKSAS-SAS", rawImpliedProb: 0.635, fairProb: 0.635 },
    ],
  };

  it("resolves home/away from the YES-side ticker suffix (no fuzzy name matching)", () => {
    // SAS is home, NYK is away (ticker grammar <AWAY><HOME>).
    const out = toIndependentFairValue(fv, "SAS", "NYK");
    expect(out.source).toBe("kalshi");
    expect(out.homeFairProb).toBeCloseTo(0.635, 5);
    expect(out.awayFairProb).toBeCloseTo(0.365, 5);
    expect(out.capturedAt).toBe("2026-06-03T18:00:00.000Z");
  });

  it("is case-insensitive on abbreviations", () => {
    const out = toIndependentFairValue(fv, "sas", "nyk");
    expect(out.homeFairProb).toBeCloseTo(0.635, 5);
    expect(out.awayFairProb).toBeCloseTo(0.365, 5);
  });

  it("yields null for a side with no Kalshi quote (thin/absent market), never a guess", () => {
    const thin: KalshiFairValue = {
      ...fv,
      sides: [
        { team: "New York", ticker: "KXNBAGAME-26JUN03NYKSAS-NYK", rawImpliedProb: null, fairProb: null },
        { team: "San Antonio", ticker: "KXNBAGAME-26JUN03NYKSAS-SAS", rawImpliedProb: 0.6, fairProb: 0.6 },
      ],
    };
    const out = toIndependentFairValue(thin, "SAS", "NYK");
    expect(out.homeFairProb).toBeCloseTo(0.6, 5);
    expect(out.awayFairProb).toBeNull();
  });

  it("returns nulls when the abbreviations don't match any side (no coverage)", () => {
    const out = toIndependentFairValue(fv, "BOS", "LAL");
    expect(out.homeFairProb).toBeNull();
    expect(out.awayFairProb).toBeNull();
  });
});
