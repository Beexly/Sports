import { describe, expect, it, vi } from "vitest";
import {
  KALSHI_LINE_SERIES,
  PredExonKalshiCatalog,
  createGalaxySecondBook,
  kalshiH2hBookmaker,
  parseKalshiSpreadLine,
  parseKalshiTotalLine,
  predexonTwoWay,
  probToAmerican,
} from "../galaxy-kalshi-book.js";
import { KALSHI_SERIES } from "../kalshi-series.js";
import type { KalshiFairValue } from "../kalshi-client.js";
import { PredExonClient, type PredExonKalshiMarket } from "../predexon-client.js";

const ENV = { PREDEXON_INGEST: "true", PREDEXON_API_KEY: "test-not-a-real-key" };
const CAPTURED = new Date("2026-09-13T15:00:00.000Z");

function fv(overrides: Partial<KalshiFairValue> = {}): KalshiFairValue {
  return {
    eventTicker: "KXNFLGAME-26SEP14PITBUF",
    capturedAt: "2026-09-04T15:00:00.000Z",
    overround: 1.02,
    sides: [
      { team: "Buffalo", ticker: "KXNFLGAME-26SEP14PITBUF-BUF", rawImpliedProb: 0.6, fairProb: 0.588 },
      { team: "Pittsburgh", ticker: "KXNFLGAME-26SEP14PITBUF-PIT", rawImpliedProb: 0.42, fairProb: 0.412 },
    ],
    ...overrides,
  };
}

function market(overrides: Partial<PredExonKalshiMarket> & Pick<PredExonKalshiMarket, "ticker" | "event_ticker">): PredExonKalshiMarket {
  return {
    title: "",
    yes_subtitle: "",
    status: "open",
    last_price: null,
    strike_type: null,
    floor_strike: null,
    cap_strike: null,
    close_time: null,
    outcomes: [],
    ...overrides,
  };
}

function twoWay(yesBid: number, yesAsk: number) {
  return [
    { label: "Yes", bid: yesBid, ask: yesAsk },
    { label: "No", bid: 1 - yesAsk, ask: 1 - yesBid },
  ];
}

/** Fixture catalog: PredExon list-markets keyed by series_ticker. */
function catalogFetch(bySeries: Record<string, PredExonKalshiMarket[]>) {
  const calls: URL[] = [];
  const fetchImpl = vi.fn(async (url: string) => {
    const u = new URL(url);
    calls.push(u);
    const series = u.searchParams.get("series_ticker") ?? "";
    const markets = bySeries[series] ?? [];
    return new Response(JSON.stringify({ markets, pagination: { has_more: false, pagination_key: null } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  return { fetchImpl, calls };
}

const GAME = {
  sportKey: "americanfootball_nfl",
  commenceTime: "2026-09-14T17:00:00.000Z",
  homeAbbr: "BUF",
  awayAbbr: "PIT",
  homeTeam: "Buffalo Bills",
  awayTeam: "Pittsburgh Steelers",
};

const NFL_FIXTURE: Record<string, PredExonKalshiMarket[]> = {
  KXNFLGAME: [
    // Same team, NEXT week's game, listed first: only the event ticker match
    // keeps it out of this matchup (its quote would otherwise be found first).
    market({ ticker: "KXNFLGAME-26SEP21BUFMIA-BUF", event_ticker: "KXNFLGAME-26SEP21BUFMIA", yes_subtitle: "Buffalo", outcomes: twoWay(0.29, 0.31) }),
    market({ ticker: "KXNFLGAME-26SEP14PITBUF-BUF", event_ticker: "KXNFLGAME-26SEP14PITBUF", yes_subtitle: "Buffalo", outcomes: twoWay(0.59, 0.61) }),
    market({ ticker: "KXNFLGAME-26SEP14PITBUF-PIT", event_ticker: "KXNFLGAME-26SEP14PITBUF", yes_subtitle: "Pittsburgh", outcomes: twoWay(0.41, 0.43) }),
    // Another game on the slate: must never leak into this matchup.
    market({ ticker: "KXNFLGAME-26SEP14KCLAC-KC", event_ticker: "KXNFLGAME-26SEP14KCLAC", yes_subtitle: "Kansas City", outcomes: twoWay(0.7, 0.72) }),
  ],
  KXNFLSPREAD: [
    market({ ticker: "KXNFLSPREAD-26SEP21BUFMIA-BUF1", event_ticker: "KXNFLSPREAD-26SEP21BUFMIA", title: "Buffalo wins by over 1.5 points?", strike_type: "greater", floor_strike: 1.5, outcomes: twoWay(0.50, 0.50) }),
    market({ ticker: "KXNFLSPREAD-26SEP14PITBUF-BUF3", event_ticker: "KXNFLSPREAD-26SEP14PITBUF", title: "Buffalo wins by over 3.5 points?", strike_type: "greater", floor_strike: 3.5, outcomes: twoWay(0.49, 0.51) }),
    market({ ticker: "KXNFLSPREAD-26SEP14PITBUF-BUF7", event_ticker: "KXNFLSPREAD-26SEP14PITBUF", title: "Buffalo wins by over 7.5 points?", strike_type: "greater", floor_strike: 7.5, outcomes: twoWay(0.29, 0.31) }),
    market({ ticker: "KXNFLSPREAD-26SEP14PITBUF-PIT3", event_ticker: "KXNFLSPREAD-26SEP14PITBUF", title: "Pittsburgh wins by over 3.5 points?", strike_type: "greater", floor_strike: 3.5, outcomes: twoWay(0.19, 0.21) }),
  ],
  KXNFLTOTAL: [
    market({ ticker: "KXNFLTOTAL-26SEP14PITBUF-41", event_ticker: "KXNFLTOTAL-26SEP14PITBUF", title: "Total points scored over 41.5?", strike_type: "greater", floor_strike: 41.5, outcomes: twoWay(0.62, 0.64) }),
    market({ ticker: "KXNFLTOTAL-26SEP14PITBUF-44", event_ticker: "KXNFLTOTAL-26SEP14PITBUF", title: "Total points scored over 44.5?", strike_type: "greater", floor_strike: 44.5, outcomes: twoWay(0.47, 0.49) }),
  ],
};

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
    const book = kalshiH2hBookmaker({ fairValue: fv(), homeAbbr: "BUF", awayAbbr: "PIT", homeTeam: "Buffalo Bills", awayTeam: "Pittsburgh Steelers" });
    expect(book?.key).toBe("kalshi");
    expect(book?.last_update).toBe("2026-09-04T15:00:00.000Z");
    const h2h = book?.markets.find((m) => m.key === "h2h");
    expect(h2h?.outcomes.find((o) => o.name === "Buffalo Bills")?.price).toBe(-150);
    expect(h2h?.outcomes.find((o) => o.name === "Pittsburgh Steelers")?.price).toBe(138);
  });

  it("returns null when either side lacks a live two-way quote (never invents)", () => {
    const oneSided = fv({
      sides: [
        { team: "Buffalo", ticker: "KXNFLGAME-26SEP14PITBUF-BUF", rawImpliedProb: 0.6, fairProb: null },
        { team: "Pittsburgh", ticker: "KXNFLGAME-26SEP14PITBUF-PIT", rawImpliedProb: null, fairProb: null },
      ],
    });
    expect(kalshiH2hBookmaker({ fairValue: oneSided, homeAbbr: "BUF", awayAbbr: "PIT", homeTeam: "Buffalo Bills", awayTeam: "Pittsburgh Steelers" })).toBeNull();
  });

  it("returns null when abbreviations do not resolve to ticker tails (honest miss)", () => {
    expect(kalshiH2hBookmaker({ fairValue: fv(), homeAbbr: "WSH", awayAbbr: "PIT", homeTeam: "Washington Commanders", awayTeam: "Pittsburgh Steelers" })).toBeNull();
  });
});

describe("predexonTwoWay", () => {
  it("takes the YES bid/ask mid and the NO side's own mid; never last_price", () => {
    const q = predexonTwoWay(market({ ticker: "T-BUF", event_ticker: "T", last_price: 0.9, outcomes: twoWay(0.59, 0.61) }));
    expect(q?.yes).toBeCloseTo(0.6, 6);
    expect(q?.no).toBeCloseTo(0.4, 6);
  });

  it("refuses a market with only a last trade print, a one-sided book, or a non-live status", () => {
    expect(predexonTwoWay(market({ ticker: "T-BUF", event_ticker: "T", last_price: 0.6, outcomes: [{ label: "Yes", bid: null, ask: null }] }))).toBeNull();
    expect(predexonTwoWay(market({ ticker: "T-BUF", event_ticker: "T", outcomes: [{ label: "Yes", bid: 0.59, ask: null }] }))).toBeNull();
    expect(predexonTwoWay(market({ ticker: "T-BUF", event_ticker: "T", status: "closed", outcomes: twoWay(0.59, 0.61) }))).toBeNull();
    expect(predexonTwoWay(market({ ticker: "T-BUF", event_ticker: "T", outcomes: [] }))).toBeNull();
  });
});

describe("parseKalshiSpreadLine / parseKalshiTotalLine", () => {
  it("resolves the YES team from the ticker tail and the line from floor_strike", () => {
    expect(parseKalshiSpreadLine(NFL_FIXTURE.KXNFLSPREAD![1]!, "BUF", "PIT")).toEqual({ side: "home", line: 3.5 });
    expect(parseKalshiSpreadLine(NFL_FIXTURE.KXNFLSPREAD![3]!, "BUF", "PIT")).toEqual({ side: "away", line: 3.5 });
  });

  it("falls back to the 'by over N' wording and applies Kalshi's strict-greater rule to integer strikes", () => {
    const worded = market({ ticker: "KXNFLSPREAD-26SEP14PITBUF-X", event_ticker: "KXNFLSPREAD-26SEP14PITBUF", yes_subtitle: "PIT", title: "Pittsburgh wins by more than 3 points?", strike_type: "greater" });
    expect(parseKalshiSpreadLine(worded, "BUF", "PIT")).toEqual({ side: "away", line: 3.5 });
    const inclusive = market({ ...worded, strike_type: "greater_or_equal" });
    expect(parseKalshiSpreadLine(inclusive, "BUF", "PIT")).toEqual({ side: "away", line: 2.5 });
    expect(parseKalshiTotalLine(market({ ticker: "KXNFLTOTAL-26SEP14PITBUF-45", event_ticker: "E", title: "Total points over 45?", strike_type: "greater" }))).toBe(45.5);
    expect(parseKalshiTotalLine(NFL_FIXTURE.KXNFLTOTAL![1]!)).toBe(44.5);
  });

  it("returns null when the team or the line cannot be read (never guessed)", () => {
    // Both abbreviations, no way to tell the YES side.
    expect(parseKalshiSpreadLine(market({ ticker: "KXNFLSPREAD-26SEP14PITBUF-X", event_ticker: "E", title: "BUF vs PIT", floor_strike: 3.5 }), "BUF", "PIT")).toBeNull();
    // Team known, line missing.
    expect(parseKalshiSpreadLine(market({ ticker: "KXNFLSPREAD-26SEP14PITBUF-BUF", event_ticker: "E", title: "Buffalo covers?" }), "BUF", "PIT")).toBeNull();
    expect(parseKalshiTotalLine(market({ ticker: "KXNFLTOTAL-26SEP14PITBUF-X", event_ticker: "E", title: "Total points?" }))).toBeNull();
  });
});

describe("KALSHI_LINE_SERIES", () => {
  it("pins the NFL spread/total series to the strings kalshi-series.ts declares", () => {
    expect(KALSHI_SERIES.nfl).toContain(KALSHI_LINE_SERIES.NFL!.spread);
    expect(KALSHI_SERIES.nfl).toContain(KALSHI_LINE_SERIES.NFL!.total);
    expect(KALSHI_LINE_SERIES.NFL).toEqual({ spread: "KXNFLSPREAD", total: "KXNFLTOTAL" });
  });
});

describe("PredExonKalshiCatalog (Kalshi via PredExon, never the Kalshi API)", () => {
  function catalog(bySeries: Record<string, PredExonKalshiMarket[]>, env: Record<string, string> = ENV) {
    const { fetchImpl, calls } = catalogFetch(bySeries);
    const client = new PredExonClient(env, fetchImpl as unknown as typeof fetch);
    const cat = new PredExonKalshiCatalog(client, { now: () => CAPTURED, interRequestMs: 0 });
    return { cat, fetchImpl, calls };
  }

  it("builds an NFL book with H2H, SPREAD (main line) and TOTAL (main line) from the catalog, at the catalog's capture time", async () => {
    const { cat, calls } = catalog(NFL_FIXTURE);
    const book = await cat.bookmakerFor(GAME);
    expect(book?.key).toBe("kalshi");
    expect(book?.last_update).toBe(CAPTURED.toISOString());
    expect(book?.markets.map((m) => m.key)).toEqual(["h2h", "spreads", "totals"]);

    const h2h = book!.markets[0]!;
    expect(h2h.outcomes.find((o) => o.name === "Buffalo Bills")?.price).toBe(-150);
    expect(h2h.outcomes.find((o) => o.name === "Pittsburgh Steelers")?.price).toBe(138);

    // Main line = YES mid closest to 0.5: BUF -3.5 (0.50), not BUF -7.5 or PIT -3.5.
    const spreads = book!.markets[1]!;
    expect(spreads.outcomes.find((o) => o.name === "Buffalo Bills")).toMatchObject({ point: -3.5, price: -100 });
    expect(spreads.outcomes.find((o) => o.name === "Pittsburgh Steelers")).toMatchObject({ point: 3.5, price: -100 });

    const totals = book!.markets[2]!;
    expect(totals.outcomes.find((o) => o.name === "Over")).toMatchObject({ point: 44.5, price: 108 });
    expect(totals.outcomes.find((o) => o.name === "Under")).toMatchObject({ point: 44.5, price: -108 });

    // Every request went to PredExon by series ticker, never to Kalshi.
    expect(calls.every((u) => u.hostname === "api.predexon.com")).toBe(true);
    expect(calls.map((u) => u.searchParams.get("series_ticker"))).toEqual(["KXNFLGAME", "KXNFLSPREAD", "KXNFLTOTAL"]);
    expect(calls.every((u) => u.searchParams.get("status") === "open")).toBe(true);
  });

  it("loads each series ONCE per catalog instance, however many games ask (per-cycle cache, 1 rps tier)", async () => {
    const { cat, fetchImpl } = catalog(NFL_FIXTURE);
    await cat.bookmakerFor(GAME);
    await cat.bookmakerFor({ ...GAME, homeAbbr: "LAC", awayAbbr: "KC", homeTeam: "Los Angeles Chargers", awayTeam: "Kansas City Chiefs" });
    await cat.bookmakerFor(GAME);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("paces catalog requests for the 1 rps free tier", async () => {
    const { fetchImpl } = catalogFetch(NFL_FIXTURE);
    const client = new PredExonClient(ENV, fetchImpl as unknown as typeof fetch);
    const sleep = vi.fn(async () => {});
    const cat = new PredExonKalshiCatalog(client, { now: () => CAPTURED, sleep });
    await cat.bookmakerFor(GAME);
    // Three requests: the first is immediate, the next two wait.
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1100);
  });

  it("follows pagination_key up to maxPages and stops when has_more is false", async () => {
    const pages = [
      { markets: [NFL_FIXTURE.KXNFLGAME![1]!], pagination: { has_more: true, pagination_key: "p2" } },
      { markets: [NFL_FIXTURE.KXNFLGAME![2]!], pagination: { has_more: false, pagination_key: null } },
    ];
    let i = 0;
    const fetchImpl = vi.fn(async (_url: string) => new Response(JSON.stringify(pages[i++]), { status: 200, headers: { "content-type": "application/json" } }));
    const client = new PredExonClient(ENV, fetchImpl as unknown as typeof fetch);
    const cat = new PredExonKalshiCatalog(client, { now: () => CAPTURED, interRequestMs: 0 });
    const series = await cat.series("KXNFLGAME");
    expect(series.markets).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(new URL(String(fetchImpl.mock.calls[1]![0])).searchParams.get("pagination_key")).toBe("p2");
  });

  it("H2H-only when the line series carry no readable live market; null when even the moneyline is missing", async () => {
    const { cat } = catalog({ KXNFLGAME: NFL_FIXTURE.KXNFLGAME! });
    const book = await cat.bookmakerFor(GAME);
    expect(book?.markets.map((m) => m.key)).toEqual(["h2h"]);

    const { cat: empty } = catalog({});
    expect(await empty.bookmakerFor(GAME)).toBeNull();

    // One moneyline leg unquoted → no H2H; the spread/total still stand on their own quotes.
    const oneLeg = { ...NFL_FIXTURE, KXNFLGAME: [NFL_FIXTURE.KXNFLGAME![1]!] };
    const { cat: partial } = catalog(oneLeg);
    expect((await partial.bookmakerFor(GAME))?.markets.map((m) => m.key)).toEqual(["spreads", "totals"]);
  });

  it("returns null (no network) while PREDEXON_INGEST is off, and for an unmapped sport", async () => {
    const { cat, fetchImpl } = catalog(NFL_FIXTURE, { PREDEXON_API_KEY: "test-not-a-real-key" });
    expect(await cat.bookmakerFor(GAME)).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
    const { cat: nfl, fetchImpl: f2 } = catalog(NFL_FIXTURE);
    expect(await nfl.bookmakerFor({ ...GAME, sportKey: "cricket_ipl" })).toBeNull();
    expect(f2).not.toHaveBeenCalled();
  });

  it("caches a failed series load so a 429 is not retried per event", async () => {
    const fetchImpl = vi.fn(async () => new Response("rate limited", { status: 429 }));
    const client = new PredExonClient(ENV, fetchImpl as unknown as typeof fetch);
    const cat = new PredExonKalshiCatalog(client, { now: () => CAPTURED, interRequestMs: 0 });
    await expect(cat.bookmakerFor(GAME)).rejects.toThrow(/429/);
    await expect(cat.bookmakerFor(GAME)).rejects.toThrow(/429/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("createGalaxySecondBook (default OFF — founder flips PREDEXON_INGEST + PREDEXON_API_KEY, ledger F-34)", () => {
  it("is undefined unless ingest is on AND a key is present", () => {
    expect(createGalaxySecondBook({})).toBeUndefined();
    expect(createGalaxySecondBook({ PREDEXON_INGEST: "true" })).toBeUndefined();
    expect(createGalaxySecondBook({ PREDEXON_API_KEY: "test-not-a-real-key" })).toBeUndefined();
    expect(createGalaxySecondBook(ENV)).toBeInstanceOf(PredExonKalshiCatalog);
  });
});
