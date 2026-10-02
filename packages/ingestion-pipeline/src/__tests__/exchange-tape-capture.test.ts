import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PredExonClient } from "@sports/data-ingestion";
import {
  captureExchangeTapeIfEnabled,
  createExchangeTapeClient,
  isExchangeTapeEnabled,
  KALSHI_PREDEXON_BOOK,
  EXCHANGE_TAPE_SOURCE,
  EXCHANGE_TAPE_NFL_SERIES,
  EXCHANGE_TAPE_DROPPED_FIELDS,
  EXCHANGE_TAPE_CATALOG_ABSENT_FIELDS,
} from "../exchange-tape-capture.js";

/**
 * C-396 exchange tape (D18a).
 *
 * Pins:
 *   - double gate closed → zero fetch, zero db
 *   - open → markets for KXNFLSPREAD/TOTAL/GAME, paced ≤1 rps, trades pulled
 *   - odds_line_snapshots rows under book kalshi-predexon with PredExon
 *     native 0–1 mid price
 *   - never /v2/data/ticks (paid)
 *   - volume/taker_side named as dropped in evidence (no schema column)
 */

const ENV = {
  PREDEXON_INGEST: "true",
  PREDEXON_API_KEY: "test-not-a-real-key",
  LINE_ARCHIVE_ENABLED: "true",
};

const GAME = {
  id: "game_nfl_1",
  homeTeamName: "Buffalo Bills",
  awayTeamName: "New England Patriots",
  // 2026-09-21 NFL Sunday — date fragment 26SEP21
  commenceTime: "2026-09-21T17:00:00.000Z",
};

function marketBody(ticker: string, eventTicker: string, extra: Record<string, unknown> = {}) {
  return {
    ticker,
    event_ticker: eventTicker,
    title: "Example",
    yes_subtitle: "BUF",
    status: "open",
    last_price: 0.48,
    floor_strike: 3,
    strike_type: "greater",
    outcomes: [
      { label: "Yes", bid: 0.47, ask: 0.49 },
      { label: "No", bid: 0.5, ask: 0.53 },
    ],
    volume: 1200,
    dollar_volume: 58000,
    open_interest: 400,
    dollar_open_interest: 19000,
    ...extra,
  };
}

function okJson(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

/** Route PredExon free endpoints; records every URL. */
function tapeFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === "/v2/kalshi/markets") {
      const series = url.searchParams.get("series_ticker");
      if (series === "KXNFLGAME") {
        return okJson({
          markets: [
            marketBody("KXNFLGAME-26SEP21BUFNE-BUF", "KXNFLGAME-26SEP21BUFNE"),
            // Unrelated event — must not match this game.
            marketBody("KXNFLGAME-26SEP21KCDEN-KC", "KXNFLGAME-26SEP21KCDEN", {
              volume: 10,
            }),
          ],
          pagination: { has_more: false },
        });
      }
      if (series === "KXNFLSPREAD") {
        return okJson({
          markets: [
            marketBody("KXNFLSPREAD-26SEP21BUFNE-BUF3", "KXNFLSPREAD-26SEP21BUFNE", {
              yes_subtitle: "BUF by 3.5 or more",
            }),
          ],
          pagination: { has_more: false },
        });
      }
      if (series === "KXNFLTOTAL") {
        return okJson({
          markets: [
            marketBody("KXNFLTOTAL-26SEP21BUFNE-O445", "KXNFLTOTAL-26SEP21BUFNE", {
              yes_subtitle: "Over 44.5",
              floor_strike: 44,
              last_price: 0.52,
              outcomes: [
                { label: "Yes", bid: 0.51, ask: 0.53 },
                { label: "No", bid: 0.46, ask: 0.48 },
              ],
            }),
          ],
          pagination: { has_more: false },
        });
      }
      return okJson({ markets: [], pagination: { has_more: false } });
    }
    if (url.pathname === "/v2/kalshi/trades") {
      return okJson({
        trades: [
          {
            trade_id: "t1",
            ticker: "KXNFLGAME-26SEP21BUFNE-BUF",
            count: 5,
            yes_price: 0.48,
            no_price: 0.52,
            taker_side: "yes",
            created_time: 1_790_000_000,
          },
          {
            trade_id: "t2",
            ticker: "KXNFLSPREAD-26SEP21BUFNE-BUF3",
            count: 2,
            yes_price: 0.47,
            no_price: 0.53,
            taker_side: "no",
            created_time: 1_790_000_010,
          },
        ],
        pagination: { has_more: false },
      });
    }
    return new Response("not found", { status: 404 });
  });
}

function mockDb() {
  return {
    oddsLineSnapshot: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      update: vi.fn(),
    },
  };
}

const originalEnv = {
  LINE_ARCHIVE_ENABLED: process.env["LINE_ARCHIVE_ENABLED"],
  PREDEXON_INGEST: process.env["PREDEXON_INGEST"],
  PREDEXON_API_KEY: process.env["PREDEXON_API_KEY"],
};

beforeEach(() => {
  process.env["LINE_ARCHIVE_ENABLED"] = "true";
  process.env["PREDEXON_INGEST"] = "true";
  process.env["PREDEXON_API_KEY"] = "test-not-a-real-key";
});

afterEach(() => {
  for (const [k, v] of Object.entries(originalEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  vi.restoreAllMocks();
});

describe("C-396 exchange tape capture", () => {
  it("no-ops with zero network/DB when the write gate is closed", async () => {
    const fetchImpl = tapeFetch();
    const client = new PredExonClient(ENV, fetchImpl as unknown as typeof fetch);
    const db = mockDb();
    const result = await captureExchangeTapeIfEnabled({
      db,
      games: [GAME],
      capturedAt: new Date("2026-09-21T16:00:00.000Z"),
      client,
      env: { PREDEXON_INGEST: "true", PREDEXON_API_KEY: "k" }, // LINE_ARCHIVE off
      interRequestMs: 0,
      sleep: async () => {},
    });
    expect(result.enabled).toBe(false);
    expect(result.persisted).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(db.oddsLineSnapshot.createMany).not.toHaveBeenCalled();
  });

  it("captures every open KXNFL market for a matched game under kalshi-predexon and names dropped fields", async () => {
    const fetchImpl = tapeFetch();
    const env = ENV;
    const client = new PredExonClient(env, fetchImpl as unknown as typeof fetch);
    const db = mockDb();
    db.oddsLineSnapshot.createMany.mockImplementation(async (args: { data: unknown[] }) => ({
      count: args.data.length,
    }));

    const capturedAt = new Date("2026-09-21T16:00:00.000Z");
    const result = await captureExchangeTapeIfEnabled({
      db,
      games: [GAME],
      capturedAt,
      client,
      interRequestMs: 0,
      sleep: async () => {},
      env,
    });

    const urls = fetchImpl.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("/v2/kalshi/markets") && u.includes("KXNFLGAME"))).toBe(true);
    expect(urls.some((u) => u.includes("/v2/kalshi/markets") && u.includes("KXNFLSPREAD"))).toBe(true);
    expect(urls.some((u) => u.includes("/v2/kalshi/markets") && u.includes("KXNFLTOTAL"))).toBe(true);
    expect(urls.some((u) => u.includes("/v2/kalshi/trades"))).toBe(true);
    // D15: never paid tick-history.
    expect(urls.every((u) => !u.includes("/v2/data/ticks"))).toBe(true);
    expect(urls.every((u) => !u.includes("/data/ticks"))).toBe(true);

    expect(result.enabled).toBe(true);
    expect(result.error).toBeUndefined();
    // 3 matched markets (GAME-BUF, SPREAD-BUF3, TOTAL-O445); KC/DEN unmatched.
    expect(result.marketsMatched).toBe(3);
    expect(result.tradesSeen).toBe(2);
    expect(result.persisted).toBe(3);
    expect(result.gamesArchived).toBe(1);

    const created = db.oddsLineSnapshot.createMany.mock.calls[0]?.[0] as {
      data: Array<Record<string, unknown>>;
    };
    expect(created.data).toHaveLength(3);
    for (const row of created.data) {
      expect(row["book"]).toBe(KALSHI_PREDEXON_BOOK);
      expect(row["source"]).toBe(EXCHANGE_TAPE_SOURCE);
      expect(row["gameId"]).toBe(GAME.id);
      expect(row["capturedAt"]).toEqual(capturedAt);
      // PredExon native dollars 0–1 mid, never invented American odds.
      expect(typeof row["price"]).toBe("number");
      expect(row["price"] as number).toBeGreaterThan(0);
      expect(row["price"] as number).toBeLessThan(1);
    }
    const markets = created.data.map((r) => String(r["market"]));
    expect(markets.some((m) => m.startsWith("MONEYLINE|KXNFLGAME"))).toBe(true);
    expect(markets.some((m) => m.startsWith("SPREAD|KXNFLSPREAD"))).toBe(true);
    expect(markets.some((m) => m.startsWith("TOTAL|KXNFLTOTAL"))).toBe(true);
    // Spread line: integer strike 3 + "greater" → 3.5.
    const spread = created.data.find((r) => String(r["market"]).startsWith("SPREAD|"));
    expect(spread?.["line"]).toBe(3.5);
    expect(spread?.["side"]).toBe("home");
    const total = created.data.find((r) => String(r["market"]).startsWith("TOTAL|"));
    expect(total?.["line"]).toBe(44.5);
    expect(total?.["side"]).toBe("over");

    // Evidence: schema has no column for volume / taker_side — named, not migrated.
    expect(result.droppedFields).toEqual(EXCHANGE_TAPE_DROPPED_FIELDS);
    expect(result.droppedFields).toContain("volume");
    expect(result.droppedFields).toContain("trades.taker_side");
    expect(result.catalogAbsentFields).toEqual(EXCHANGE_TAPE_CATALOG_ABSENT_FIELDS);
    for (const row of created.data) {
      expect(row).not.toHaveProperty("volume");
      expect(row).not.toHaveProperty("taker_side");
    }
  });

  it("lists PredExon trades on the free plane only and builds no client when the read gate is shut", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      okJson({
        trades: [
          {
            trade_id: "t1",
            ticker: "KXNFLGAME-26SEP21BUFNE-BUF",
            count: 1,
            yes_price: 0.5,
            no_price: 0.5,
            taker_side: "yes",
            created_time: 1,
          },
        ],
        pagination: { has_more: false },
      }),
    );
    const client = new PredExonClient(ENV, fetchImpl as unknown as typeof fetch);
    const page = await client.listKalshiTrades({
      eventTicker: "KXNFLGAME-26SEP21BUFNE",
      startTime: 1,
      endTime: 2,
    });
    expect(page?.trades).toHaveLength(1);
    expect(page?.trades[0]?.taker_side).toBe("yes");
    const url = String(fetchImpl.mock.calls[0]?.[0]);
    expect(url).toContain("/v2/kalshi/trades");
    expect(url).not.toContain("/v2/data/ticks");
    expect(url).toContain("event_ticker=KXNFLGAME-26SEP21BUFNE");

    expect(createExchangeTapeClient({})).toBeNull();
    expect(isExchangeTapeEnabled({})).toBe(false);
    expect(EXCHANGE_TAPE_NFL_SERIES).toEqual(["KXNFLSPREAD", "KXNFLTOTAL", "KXNFLGAME"]);
  });
});
