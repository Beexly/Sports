import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PredExonClient,
  PredExonError,
  isPredExonIngestEnabled,
  PREDEXON_KEY_HEADER,
} from "../predexon-client.js";
import { assertIngestible, getSource, isIngestible } from "../source-registry.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PredExon / dump registry", () => {
  it("clears PredExon with caution and blocks HF Kalshi dumps + ConvoKit DK/FD reddit", () => {
    expect(getSource("predexon")?.verdict).toBe("use-with-caution");
    expect(isIngestible("predexon")).toBe(true);
    expect(assertIngestible("predexon").baseUrl).toBe("https://api.predexon.com");
    expect(isIngestible("huggingface-kalshi-api-dump")).toBe(false);
    expect(() => assertIngestible("huggingface-kalshi-api-dump")).toThrow(/Refusing to ingest/);
    expect(isIngestible("convokit-sportsbook-reddit")).toBe(false);
    expect(() => assertIngestible("convokit-sportsbook-reddit")).toThrow(/Refusing to ingest/);
  });
});

describe("PredExon client fail-closed", () => {
  it("is off by default and does not fetch", async () => {
    expect(isPredExonIngestEnabled({})).toBe(false);
    const fetchImpl = vi.fn();
    const client = new PredExonClient({}, fetchImpl as unknown as typeof fetch);
    expect(await client.listKalshiMarkets({ search: "nfl" })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("throws without a key and still does not fetch", async () => {
    const fetchImpl = vi.fn();
    const client = new PredExonClient({ PREDEXON_INGEST: "1" }, fetchImpl as unknown as typeof fetch);
    await expect(client.listKalshiMarkets()).rejects.toThrow(PredExonError);
    await expect(client.listKalshiMarkets()).rejects.toThrow(/PREDEXON_API_KEY/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("calls /v2/kalshi/markets with x-api-key when ingest is on", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          markets: [
            {
              ticker: "KXNFLGAME-26AUG21AAA",
              event_ticker: "KXNFLGAME-26AUG21",
              title: "Example",
              status: "open",
              last_price: 0.42,
            },
          ],
          pagination: { has_more: false, pagination_key: null, limit: 20, count: 1 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const client = new PredExonClient(
      { PREDEXON_INGEST: "1", PREDEXON_API_KEY: "test-not-a-real-key" },
      fetchImpl as unknown as typeof fetch,
    );
    const page = await client.listKalshiMarkets({ search: "nfl", status: "open", limit: 20 });
    expect(page?.markets).toHaveLength(1);
    expect(page?.markets[0]?.last_price).toBe(0.42);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const url = String(fetchImpl.mock.calls[0]?.[0]);
    expect(url).toContain("https://api.predexon.com/v2/kalshi/markets");
    expect(url).toContain("search=nfl");
    const init = fetchImpl.mock.calls[0]?.[1] as { headers?: Record<string, string> };
    expect(PREDEXON_KEY_HEADER).toBe(["x", "api-key"].join("-"));
    expect(init.headers?.[PREDEXON_KEY_HEADER]).toBe("test-not-a-real-key");
  });
});

describe("PredExon market selection — series_ticker, not search", () => {
  const ENV = { PREDEXON_INGEST: "true", PREDEXON_API_KEY: "test-not-a-real-key" };

  function okFetch() {
    return vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ markets: [], pagination: { has_more: false } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  }

  function urlOf(fetchImpl: ReturnType<typeof okFetch>): URL {
    return new URL(fetchImpl.mock.calls[0]![0] as string);
  }

  it("sends series_ticker so a sport is selected by series, not by title text", async () => {
    const fetchImpl = okFetch();
    const client = new PredExonClient(ENV, fetchImpl as unknown as typeof fetch);
    await client.listKalshiMarkets({ seriesTicker: "KXNFLGAME", status: "open" });

    const url = urlOf(fetchImpl);
    expect(url.searchParams.get("series_ticker")).toBe("KXNFLGAME");
    expect(url.searchParams.get("status")).toBe("open");
    // Selecting by series must NOT smuggle in a title search: live API returns
    // inflation contracts for search=nfl and zero rows for search=KXNFLGAME.
    expect(url.searchParams.get("search")).toBeNull();
  });

  it("supports event_ticker and ticker for single-game / single-side lookups", async () => {
    const fetchImpl = okFetch();
    const client = new PredExonClient(ENV, fetchImpl as unknown as typeof fetch);
    await client.listKalshiMarkets({
      eventTicker: "KXMLBGAME-26AUG212210CHCSEA",
      ticker: "KXMLBGAME-26AUG212210CHCSEA-CHC",
    });

    const url = urlOf(fetchImpl);
    expect(url.searchParams.get("event_ticker")).toBe("KXMLBGAME-26AUG212210CHCSEA");
    expect(url.searchParams.get("ticker")).toBe("KXMLBGAME-26AUG212210CHCSEA-CHC");
  });

  it("omits every selector we were not asked for", async () => {
    const fetchImpl = okFetch();
    const client = new PredExonClient(ENV, fetchImpl as unknown as typeof fetch);
    await client.listKalshiMarkets({});

    const url = urlOf(fetchImpl);
    for (const p of ["series_ticker", "event_ticker", "ticker", "search", "status"]) {
      expect(url.searchParams.get(p), `${p} should be absent`).toBeNull();
    }
    expect(url.searchParams.get("limit")).toBe("20");
  });
});

describe("PredExon series constants match what the live catalog serves", () => {
  it("reuses KALSHI_GAME_SERIES — no second, drifting source of series tickers", async () => {
    const { KALSHI_GAME_SERIES } = await import("../kalshi-series.js");
    // Verified live 2026-08-22: series_ticker=KXNFLGAME and =KXMLBGAME each
    // returned open per-game two-sided markets for that day's slate. If anyone
    // renames these constants, the PredExon path silently returns nothing —
    // so pin the exact strings that were confirmed against the vendor.
    expect(KALSHI_GAME_SERIES.nfl).toContain("KXNFLGAME");
    expect(KALSHI_GAME_SERIES.mlb).toContain("KXMLBGAME");
  });
});
