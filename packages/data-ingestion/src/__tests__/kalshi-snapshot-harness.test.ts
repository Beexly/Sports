/**
 * Kalshi listing snapshot harness — T-Q3.
 *
 * Verifies the 429 backoff contract for the Kalshi fair-value snapshot path:
 *   - 429 → one retry → success (backoff applied between attempts)
 *   - 429 → one retry → still 429 → STOP (KalshiError, no further requests)
 *   - never last_price as q (trade print refused, two-way mid only)
 *
 * All network calls are mocked — NO live hits against Kalshi.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  KalshiClient,
  KalshiError,
  impliedYesProbability,
} from "../kalshi-client.js";
import { gateKalshiListing } from "../kalshi-listing-quote.js";

const FROZEN = new Date("2026-06-03T18:30:00.000Z");

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** A Kalshi market listing row with full two-way quotes (no last_price needed). */
const LIVE_MARKET = {
  ticker: "KXNBAGAME-26JUN03NYKSAS-NYK",
  yes_sub_title: "New York",
  status: "active",
  yes_bid_dollars: "0.36",
  yes_ask_dollars: "0.37",
  no_bid_dollars: "0.63",
  last_price_dollars: "0.365",
};

/** A market that ONLY has a last_price (settled/unquoted) — must be refused. */
const LAST_PRICE_ONLY_MARKET = {
  ticker: "KXNBAGAME-26JUN03NYKSAS-NYK",
  yes_sub_title: "New York",
  status: "active",
  last_price_dollars: "0.36",
};

/** The standard event-ticker market listing response. */
function eventMarketsResponse() {
  return jsonResponse({
    markets: [
      { ticker: "KXNBAGAME-26JUN03NYKSAS-NYK", yes_sub_title: "New York" },
      { ticker: "KXNBAGAME-26JUN03NYKSAS-SAS", yes_sub_title: "San Antonio" },
    ],
  });
}

/** Per-market detail response with a live two-way quote. */
function marketDetailResponse(ticker: string, market: Record<string, unknown> = LIVE_MARKET) {
  return jsonResponse({ market: { ticker, ...market } });
}

describe("Kalshi snapshot harness — 429 backoff contract", () => {
  it("429 → one retry → success: backoff applied, snapshot still returned", async () => {
    const delays: number[] = [];
    const client = new KalshiClient({
      now: () => FROZEN,
      baseDelayMs: 100,
      maxDelayMs: 500,
      maxRetries: 1, // T-Q3: "one retry → stop"
      jitterRatio: 0,
      random: () => 0,
      sleep: async (ms: number) => { delays.push(ms); },
      skipSeriesSearch: true, // test only the constructed path
    });

    vi.spyOn(globalThis, "fetch")
      // First call: 429 → client backs off
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
      // Second call (retry): market listing succeeds
      .mockResolvedValueOnce(eventMarketsResponse())
      .mockResolvedValueOnce(
        marketDetailResponse("KXNBAGAME-26JUN03NYKSAS-NYK"),
      )
      .mockResolvedValueOnce(
        marketDetailResponse("KXNBAGAME-26JUN03NYKSAS-SAS", {
          ticker: "KXNBAGAME-26JUN03NYKSAS-SAS",
          yes_sub_title: "San Antonio",
          status: "active",
          yes_bid_dollars: "0.63",
          yes_ask_dollars: "0.64",
          no_bid_dollars: "0.36",
          last_price_dollars: "0.635",
        }),
      );

    const fv = await client.getFairValue({
      league: "NBA",
      dateUtc: FROZEN.toISOString(),
      awayAbbr: "NYK",
      homeAbbr: "SAS",
    });

    // Snapshot returned successfully after one retry
    expect(fv.sides).toHaveLength(2);
    expect(fv.sides[0].fairProb).toBeCloseTo(0.365, 6);
    expect(fv.sides[1].fairProb).toBeCloseTo(0.635, 6);

    // Exactly one backoff occurred (429 on attempt 0 → sleep → retry on attempt 1)
    expect(delays).toHaveLength(1);
    expect(delays[0]).toBe(100); // baseDelayMs * 2^0, jitter = 0
  });

  it("429 → one retry → still 429 → STOP: throws KalshiError, no further requests", async () => {
    const delays: number[] = [];
    const client = new KalshiClient({
      now: () => FROZEN,
      baseDelayMs: 50,
      maxRetries: 1, // T-Q3: "one retry → stop"
      jitterRatio: 0,
      random: () => 0,
      sleep: async (ms: number) => { delays.push(ms); },
      skipSeriesSearch: true,
    });

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("rate limited", { status: 429 }));

    // Should throw after exhausting retries (1 initial + 1 retry = 2 total requests)
    await expect(
      client.getFairValue({
        league: "NBA",
        dateUtc: FROZEN.toISOString(),
        awayAbbr: "NYK",
        homeAbbr: "SAS",
      }),
    ).rejects.toMatchObject({
      name: "KalshiError",
      status: 429,
    });

    // Exactly 2 fetch calls: initial + one retry. No hammering.
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // One backoff sleep between them
    expect(delays).toHaveLength(1);
    expect(delays[0]).toBe(50);
  });

  it("never serves last_price as q — trade print is refused", async () => {
    // gateKalshiListing must refuse a listing that only has last_price
    const quote = gateKalshiListing({ last: "0.36" });
    expect(quote.usable).toBe(false);
    expect(quote.refuse).toBe("last_trade_only");
    expect(quote.q).toBeNull();

    // impliedYesProbability routes through the gate — last_price alone yields null
    const prob = impliedYesProbability(LAST_PRICE_ONLY_MARKET);
    expect(prob).toBeNull();

    // A two-sided live quote is accepted (yes_bid+yes_ask present)
    const liveQuote = gateKalshiListing({
      yesBid: "0.36",
      yesAsk: "0.37",
      status: "active",
    });
    expect(liveQuote.usable).toBe(true);
    expect(liveQuote.q).toBeCloseTo(0.365, 12);
  });

  it("429 backoff uses exponential delay: attempt 0 → 100ms, attempt 1 → 200ms", async () => {
    const delays: number[] = [];
    const client = new KalshiClient({
      now: () => FROZEN,
      baseDelayMs: 100,
      maxRetries: 2,
      jitterRatio: 0,
      random: () => 0,
      sleep: async (ms: number) => { delays.push(ms); },
      skipSeriesSearch: true,
    });

    // Both attempts get 429 → exhaust retries → throw
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("slow down", { status: 429 }))
      .mockResolvedValueOnce(new Response("still slow", { status: 429 }))
      .mockResolvedValueOnce(new Response("still slow", { status: 429 }));

    await expect(
      client.getFairValue({
        league: "NBA",
        dateUtc: FROZEN.toISOString(),
        awayAbbr: "NYK",
        homeAbbr: "SAS",
      }),
    ).rejects.toMatchObject({ name: "KalshiError", status: 429 });

    // Exponential backoff: 100 * 2^0 = 100, 100 * 2^1 = 200
    expect(delays).toEqual([100, 200]);
  });
});
