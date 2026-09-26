/**
 * Market-start skew guard must fail CLOSED on an unparseable occurrence time.
 *
 * `Date.parse("garbage")` is NaN, and EVERY comparison against NaN is false —
 * so `delta > MAX_MARKET_START_SKEW_MS` was false for a NaN delta and the 12h
 * guard ADMITTED the record it exists to reject. The resulting NaN `score` then
 * latched the argmax `best`: once `best.score` is NaN, `candidate > best.score`
 * is false for every later candidate, so a single unparseable timestamp could
 * bind a game to the wrong event entirely.
 *
 * These tests feed an UNPARSEABLE occurrence_datetime (the only input that
 * distinguishes the broken code from the fixed code — a valid-but-too-far
 * timestamp is rejected either way and proves nothing).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { KalshiClient } from "../kalshi-client.js";

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Commence instant the game really starts (16:10 ET === 23:10 UTC 2026-08-12). */
const GAME = {
  league: "MLB",
  dateUtc: "2026-08-12T23:10:00Z",
  awayAbbr: "MIL",
  homeAbbr: "SD",
} as const;

const RIGHT_EVENT = "KXMLBGAME-26AUG121610MILSD"; // 23:10Z — the real game
const WRONG_EVENT = "KXMLBGAME-26AUG121540MILSD"; // 19:40Z — an earlier game

function legs(eventTicker: string, occurrence: string | undefined) {
  return [
    {
      ticker: `${eventTicker}-MIL`,
      event_ticker: eventTicker,
      yes_sub_title: "Milwaukee",
      status: "active",
      ...(occurrence === undefined ? {} : { occurrence_datetime: occurrence }),
      yes_bid_dollars: "0.58",
      yes_ask_dollars: "0.60",
    },
    {
      ticker: `${eventTicker}-SD`,
      event_ticker: eventTicker,
      yes_sub_title: "San Diego",
      status: "active",
      ...(occurrence === undefined ? {} : { occurrence_datetime: occurrence }),
      yes_bid_dollars: "0.40",
      yes_ask_dollars: "0.42",
    },
  ];
}

function mockSeries(markets: readonly unknown[]): void {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("series_ticker=KXMLBGAME")) return jsonResponse({ markets });
    throw new Error(`unexpected url ${url}`);
  });
}

describe("findEventTickerBySeries — NaN skew guard fails CLOSED", () => {
  it("REJECTS a candidate whose occurrence_datetime is unparseable", async () => {
    const client = new KalshiClient();
    // Only candidate on the wire; its occurrence time cannot be parsed at all.
    mockSeries(legs(RIGHT_EVENT, "not-a-timestamp"));

    const found = await client.findEventTickerBySeries(GAME);

    // An unverifiable start time must not attach. Fail CLOSED, not open.
    expect(found).toBeNull();
  });

  it("still ACCEPTS the same candidate when its occurrence_datetime is valid (guard not over-tightened)", async () => {
    const client = new KalshiClient();
    mockSeries(legs(RIGHT_EVENT, "2026-08-12T23:10:00Z"));

    const found = await client.findEventTickerBySeries(GAME);

    expect(found).toBe(RIGHT_EVENT);
  });

  it("still REJECTS a parseable occurrence beyond the 12h skew window", async () => {
    const client = new KalshiClient();
    // +13h from commence — outside MAX_MARKET_START_SKEW_MS.
    mockSeries(legs(RIGHT_EVENT, "2026-08-13T12:10:00Z"));

    const found = await client.findEventTickerBySeries(GAME);

    expect(found).toBeNull();
  });

  it("does NOT latch the argmax: a NaN-derived first candidate must not block a later, better one", async () => {
    const client = new KalshiClient();
    // WRONG_EVENT is seen FIRST and carries an unparseable occurrence time.
    // RIGHT_EVENT follows with an occurrence that matches commence exactly.
    // Broken code: WRONG_EVENT scores NaN, becomes `best`, and every later
    // `score > best.score` is false — so the wrong event wins.
    mockSeries([
      ...legs(WRONG_EVENT, "not-a-timestamp"),
      ...legs(RIGHT_EVENT, "2026-08-12T23:10:00Z"),
    ]);

    // Guard the premise: the poisoned value really is unparseable, so the
    // failure below is the NaN latch and not an incidental ordering quirk.
    expect(Number.isNaN(Date.parse("not-a-timestamp"))).toBe(true);

    const found = await client.findEventTickerBySeries(GAME);

    expect(found).toBe(RIGHT_EVENT);
  });
});
