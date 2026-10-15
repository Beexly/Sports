import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OddsApiEvent } from "@sports/types";
import {
  createJsonlLineArchiveStore,
  ESPN_LINE_ARCHIVE_SOURCE,
  type JsonlFileSystem,
} from "../line-archiver/espn-line-archive.js";
import {
  extractProductPrices,
  runEspnProductPriceArchiver,
  runEspnProductPriceArchiverIfEnabled,
  PRODUCT_MARKET_ALT_SPREAD,
  PRODUCT_MARKET_ALT_TOTAL,
  PRODUCT_PRICE_BOOK,
  PRODUCT_SOURCE_CORE_ODDS,
  PRODUCT_SOURCE_SUMMARY_PICKCENTER,
  type EspnProductPriceArchiverDeps,
  type ProductPricePayloads,
} from "../line-archiver/espn-product-prices.js";

/**
 * espn-product-prices — the SPEC-B product-price extension of the line
 * archiver. These tests pin:
 *   - extraction over TONIGHT'S REAL keyless payloads (ESPN core-API
 *     provider detail + summary pickcenter for event 401872995, SEA@DEN,
 *     captured live 2026-10-15 ~17:57Z; links/logos elided, every
 *     odds-bearing field verbatim): NO alternate ladder exists in them,
 *     so extraction yields zero rows and both classes report unexposed —
 *     the GAP is evidence, re-derived every run, not an assumption
 *   - extraction over a synthetic ladder in the ESPN/DK outcome idiom
 *     ({ name, price, point } under an alternate-named key): valid rungs
 *     become rows; rungs identical to the featured row (same side, line
 *     AND price — the main line inside the ladder) are dropped by the
 *     duplicate guard, which derives the featured context from the same
 *     payload
 *   - the side-form ladder idiom ({ home: {line, price}, away: {...} })
 *     and strict validation: a malformed half drops alone, an
 *     unresolvable side and a non-object entry drop and count
 *   - the runner: additive rows land through the featured leg's JSONL
 *     store with the exact featured key order, phase OPEN then INTERIM
 *     per (gameId, market); a no-ladder slate persists nothing and names
 *     both classes in `gaps`; unresolved games and per-event payload
 *     failures are counted/recorded, never silent, never fatal
 *   - the hard gate: IfEnabled with the flag unset invokes NO dep
 */

const NOW = new Date("2026-10-15T15:00:00.000Z");
const ORIGINAL_ENV = process.env["LINE_ARCHIVE_ENABLED"];

beforeEach(() => {
  delete process.env["LINE_ARCHIVE_ENABLED"];
});

afterEach(() => {
  if (ORIGINAL_ENV === undefined) delete process.env["LINE_ARCHIVE_ENABLED"];
  else process.env["LINE_ARCHIVE_ENABLED"] = ORIGINAL_ENV;
});

const CTX = { homeTeam: "Denver Broncos", awayTeam: "Seattle Seahawks" };

/**
 * Tonight's real ESPN core-API provider detail for 401872995 (DraftKings,
 * provider 100) — captured live 2026-10-15. $ref/link/logo fields elided;
 * every odds-bearing field verbatim. It carries the main line only:
 * open + current for spread / moneyline / total, NO alternate ladder.
 */
const CORE_DETAIL_TONIGHT = {
  details: "SEA -2.5",
  overUnder: 40.5,
  spread: 2.5,
  overOdds: -115.0,
  underOdds: -105.0,
  awayTeamOdds: {
    favorite: true,
    underdog: false,
    moneyLine: -142,
    spreadOdds: -112.0,
    open: {
      favorite: true,
      pointSpread: { alternateDisplayValue: "-2.5", american: "-2.5" },
      spread: { value: 1.95, displayValue: "20/21", alternateDisplayValue: "-105", decimal: 1.95, fraction: "20/21", american: "-105" },
      moneyLine: { value: 1.76, displayValue: "10/13", alternateDisplayValue: "-130", decimal: 1.76, fraction: "10/13", american: "-130" },
    },
    current: {
      pointSpread: { alternateDisplayValue: "-2.5", american: "-2.5" },
      spread: { value: 1.89, displayValue: "25/28", alternateDisplayValue: "-112", decimal: 1.89, fraction: "25/28", american: "-112" },
      moneyLine: { value: 1.7, displayValue: "50/71", alternateDisplayValue: "-142", decimal: 1.7, fraction: "50/71", american: "-142" },
    },
  },
  homeTeamOdds: {
    favorite: false,
    underdog: true,
    moneyLine: 120,
    spreadOdds: -108.0,
    open: {
      favorite: false,
      pointSpread: { alternateDisplayValue: "+2.5", american: "+2.5" },
      spread: { value: 1.86, displayValue: "20/23", alternateDisplayValue: "-115", decimal: 1.86, fraction: "20/23", american: "-115" },
      moneyLine: { value: 2.1, displayValue: "11/10", alternateDisplayValue: "+110", decimal: 2.1, fraction: "11/10", american: "+110" },
    },
    current: {
      pointSpread: { alternateDisplayValue: "+2.5", american: "+2.5" },
      spread: { value: 1.92, displayValue: "25/27", alternateDisplayValue: "-108", decimal: 1.92, fraction: "25/27", american: "-108" },
      moneyLine: { value: 2.2, displayValue: "6/5", alternateDisplayValue: "+120", decimal: 2.2, fraction: "6/5", american: "+120" },
    },
  },
  current: {
    total: { alternateDisplayValue: "40.5", american: "40.5" },
    over: { value: 1.86, displayValue: "20/23", alternateDisplayValue: "-115", decimal: 1.86, fraction: "20/23", american: "-115" },
    under: { value: 1.95, displayValue: "20/21", alternateDisplayValue: "-105", decimal: 1.95, fraction: "20/21", american: "-105" },
  },
};

/**
 * Tonight's real ESPN summary pickcenter entry for 401872995 — captured
 * live 2026-10-15. Links elided (they enumerate only Moneyline /
 * Point Spread / Total bet types); odds-bearing fields verbatim.
 */
const PICKCENTER_TONIGHT = {
  provider: { id: "100", name: "DraftKings", priority: 1 },
  details: "SEA -2.5",
  overUnder: 40.5,
  spread: 2.5,
  overOdds: -115.0,
  underOdds: -105.0,
  awayTeamOdds: {
    favorite: true,
    underdog: false,
    moneyLine: -142,
    spreadOdds: -112.0,
    teamId: "26",
    favoriteAtOpen: true,
  },
  homeTeamOdds: {
    favorite: false,
    underdog: true,
    moneyLine: 120,
    spreadOdds: -108.0,
    teamId: "7",
    favoriteAtOpen: false,
  },
};

function tonightPayloads(): ProductPricePayloads {
  return {
    coreProviderDetails: [CORE_DETAIL_TONIGHT],
    summaryPickcenter: [PICKCENTER_TONIGHT],
    sourcesChecked: [PRODUCT_SOURCE_CORE_ODDS, PRODUCT_SOURCE_SUMMARY_PICKCENTER],
  };
}

describe("extractProductPrices — tonight's real keyless payloads", () => {
  it("finds no ladder: zero rows, both classes unexposed, nothing dropped", () => {
    const x = extractProductPrices(tonightPayloads(), CTX);
    expect(x.rows).toEqual([]);
    expect(x.laddersFound).toBe(0);
    expect(x.entriesDropped).toBe(0);
    expect(x.featuredRungsDropped).toBe(0);
    expect(x.altSpreadExposed).toBe(false);
    expect(x.altTotalExposed).toBe(false);
  });

  it("does not mistake the featured line's alternateDisplayValue fields for a ladder", () => {
    // The core detail is dense with `alternateDisplayValue` strings —
    // display formatting of the SAME price, never an array of rungs.
    const x = extractProductPrices(
      { coreProviderDetails: [CORE_DETAIL_TONIGHT], summaryPickcenter: [], sourcesChecked: [] },
      CTX,
    );
    expect(x.laddersFound).toBe(0);
    expect(x.rows).toEqual([]);
  });
});

describe("extractProductPrices — synthetic ladders", () => {
  it("extracts outcome-form rungs and drops the featured rungs among them", () => {
    const detailWithLadder = {
      ...CORE_DETAIL_TONIGHT,
      alternateSpread: {
        lines: [
          { name: "Denver Broncos", price: -155, point: 6.5 },
          { name: "Seattle Seahawks", price: 130, point: -6.5 },
          { name: "Denver Broncos", price: -108, point: 2.5 }, // featured rung
          { name: "Seattle Seahawks", price: -112, point: -2.5 }, // featured rung
        ],
      },
      alternateTotal: {
        lines: [
          { name: "Over", price: -105, point: 44.5 },
          { name: "Under", price: -115, point: 44.5 },
          { name: "Over", price: -115, point: 40.5 }, // featured rung
        ],
      },
    };
    const x = extractProductPrices(
      { coreProviderDetails: [detailWithLadder], summaryPickcenter: [], sourcesChecked: [] },
      CTX,
    );
    expect(x.laddersFound).toBe(2);
    expect(x.featuredRungsDropped).toBe(3);
    expect(x.entriesDropped).toBe(0);
    expect(x.altSpreadExposed).toBe(true);
    expect(x.altTotalExposed).toBe(true);
    expect(x.rows).toEqual([
      { market: PRODUCT_MARKET_ALT_SPREAD, side: "home", price: -155, line: 6.5 },
      { market: PRODUCT_MARKET_ALT_SPREAD, side: "away", price: 130, line: -6.5 },
      { market: PRODUCT_MARKET_ALT_TOTAL, side: "over", price: -105, line: 44.5 },
      { market: PRODUCT_MARKET_ALT_TOTAL, side: "under", price: -115, line: 44.5 },
    ]);
  });

  it("extracts side-form rungs; malformed halves and entries drop and count", () => {
    const payload = {
      alternateTotals: [
        { over: { line: 37.5, price: -110 }, under: { line: 37.5, price: -110 } },
        { over: { line: 47.5, price: "even" }, under: { line: 47.5, price: -110 } },
        { name: "Nobody", price: -110, point: 41.5 },
        "garbage",
      ],
    };
    const x = extractProductPrices(
      { coreProviderDetails: [payload], summaryPickcenter: [], sourcesChecked: [] },
      CTX,
    );
    expect(x.rows).toEqual([
      { market: PRODUCT_MARKET_ALT_TOTAL, side: "over", price: -110, line: 37.5 },
      { market: PRODUCT_MARKET_ALT_TOTAL, side: "under", price: -110, line: 37.5 },
      { market: PRODUCT_MARKET_ALT_TOTAL, side: "under", price: -110, line: 47.5 },
    ]);
    expect(x.entriesDropped).toBe(3); // bad over half + unresolvable side + non-object
    expect(x.altTotalExposed).toBe(true);
    expect(x.altSpreadExposed).toBe(false);
  });

  it("ignores alternate-named arrays whose market cannot be named", () => {
    const x = extractProductPrices(
      {
        coreProviderDetails: [
          { alternates: [{ name: "Over", price: -110, point: 44.5 }] },
        ],
        summaryPickcenter: [],
        sourcesChecked: [],
      },
      CTX,
    );
    expect(x.laddersFound).toBe(0);
    expect(x.rows).toEqual([]);
  });
});

// ── runner ──────────────────────────────────────────────────────────────

function espnEvent(id: string, commence: string): OddsApiEvent {
  return {
    id: `espn:americanfootball_nfl:${id}`,
    sport_key: "americanfootball_nfl",
    sport_title: "NFL",
    commence_time: commence,
    home_team: "Denver Broncos",
    away_team: "Seattle Seahawks",
    bookmakers: [],
  } as unknown as OddsApiEvent;
}

const TNF = () => espnEvent("401872995", "2026-10-16T00:15:00.000Z");
const SUNDAY = () => espnEvent("401872996", "2026-10-18T17:00:00.000Z");

function memoryFs(): JsonlFileSystem & { files: Map<string, string> } {
  const files = new Map<string, string>();
  return {
    files,
    readFile: async (path) => files.get(path) ?? "",
    appendFile: async (path, text) => {
      files.set(path, (files.get(path) ?? "") + text);
    },
  };
}

function ladderPayloads(): ProductPricePayloads {
  return {
    coreProviderDetails: [
      {
        ...CORE_DETAIL_TONIGHT,
        alternateSpread: {
          lines: [{ name: "Denver Broncos", price: -155, point: 6.5 }],
        },
      },
    ],
    summaryPickcenter: [],
    sourcesChecked: [PRODUCT_SOURCE_CORE_ODDS],
  };
}

function makeDeps(
  overrides: Partial<EspnProductPriceArchiverDeps> = {},
): EspnProductPriceArchiverDeps {
  return {
    fetchEvents: async () => ({ events: [] }),
    fetchProductPayloads: async () => tonightPayloads(),
    resolveGameId: async (event) => `game-for-${event.id}`,
    store: createJsonlLineArchiveStore("/tmp/products.jsonl", memoryFs()),
    now: () => NOW,
    ...overrides,
  };
}

describe("runEspnProductPriceArchiver", () => {
  it("persists ladder rows in the featured shape: OPEN first run, INTERIM second", async () => {
    const fs = memoryFs();
    const store = createJsonlLineArchiveStore("/tmp/products.jsonl", fs);
    const deps = makeDeps({
      store,
      fetchEvents: async () => ({ events: [TNF()] }),
      fetchProductPayloads: async () => ladderPayloads(),
    });

    const first = await runEspnProductPriceArchiver(deps);
    expect(first.gamesScanned).toBe(1);
    expect(first.productRowsPersisted).toBe(1);
    expect(first.altSpreadRows).toBe(1);
    expect(first.gaps).toEqual([PRODUCT_MARKET_ALT_TOTAL]);
    expect(first.errors).toEqual([]);

    const lines = (fs.files.get("/tmp/products.jsonl") ?? "")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(lines).toHaveLength(1);
    expect(Object.keys(lines[0]!)).toEqual([
      "gameId",
      "capturedAt",
      "phase",
      "book",
      "market",
      "side",
      "price",
      "line",
      "source",
    ]);
    expect(lines[0]).toMatchObject({
      capturedAt: NOW.toISOString(),
      phase: "OPEN",
      book: PRODUCT_PRICE_BOOK,
      market: PRODUCT_MARKET_ALT_SPREAD,
      side: "home",
      price: -155,
      line: 6.5,
      source: ESPN_LINE_ARCHIVE_SOURCE,
    });

    const second = await runEspnProductPriceArchiver(deps);
    expect(second.productRowsPersisted).toBe(1);
    const all = (fs.files.get("/tmp/products.jsonl") ?? "")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(all).toHaveLength(2);
    expect(all[1]!.phase).toBe("INTERIM");
  });

  it("a no-ladder slate persists nothing and names both classes as gaps", async () => {
    const fs = memoryFs();
    const result = await runEspnProductPriceArchiver(
      makeDeps({
        store: createJsonlLineArchiveStore("/tmp/none.jsonl", fs),
        fetchEvents: async () => ({ events: [TNF(), SUNDAY()] }),
      }),
    );
    expect(result.gamesScanned).toBe(2);
    expect(result.productRowsPersisted).toBe(0);
    expect(result.gamesWithAltSpread).toBe(0);
    expect(result.gamesWithAltTotal).toBe(0);
    expect(result.gaps).toEqual([
      PRODUCT_MARKET_ALT_SPREAD,
      PRODUCT_MARKET_ALT_TOTAL,
    ]);
    expect(result.sourcesChecked).toEqual([
      PRODUCT_SOURCE_CORE_ODDS,
      PRODUCT_SOURCE_SUMMARY_PICKCENTER,
    ]);
    expect(fs.files.get("/tmp/none.jsonl") ?? "").toBe("");
  });

  it("counts unresolved games and isolates a per-event payload failure", async () => {
    const result = await runEspnProductPriceArchiver(
      makeDeps({
        fetchEvents: async () => ({ events: [TNF(), SUNDAY()] }),
        resolveGameId: async (e) =>
          e.id.endsWith("401872995") ? null : `g-${e.id}`,
        fetchProductPayloads: async () => {
          throw new Error("core odds unreachable");
        },
      }),
    );
    expect(result.unresolvedEventIds).toEqual([
      "espn:americanfootball_nfl:401872995",
    ]);
    expect(result.gamesScanned).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("401872996");
    // Nothing scanned ⇒ no gap declared (an empty probe is no evidence).
    expect(result.gaps).toEqual([]);
  });
});

describe("runEspnProductPriceArchiverIfEnabled — hard gate", () => {
  it("invokes no dep at all when LINE_ARCHIVE_ENABLED is unset", async () => {
    const fetchEvents = vi.fn(async () => ({ events: [TNF()] }));
    const fetchProductPayloads = vi.fn(async () => tonightPayloads());
    const store = {
      existingMarkets: vi.fn(async () => new Set<string>()),
      append: vi.fn(async (rows: readonly unknown[]) => rows.length),
    };
    const result = await runEspnProductPriceArchiverIfEnabled(
      makeDeps({ fetchEvents, fetchProductPayloads, store }),
      {},
    );
    expect(result.enabled).toBe(false);
    expect(result.productRowsPersisted).toBe(0);
    expect(fetchEvents).not.toHaveBeenCalled();
    expect(fetchProductPayloads).not.toHaveBeenCalled();
    expect(store.append).not.toHaveBeenCalled();
  });

  it("runs when LINE_ARCHIVE_ENABLED === 'true' and only then", async () => {
    const deps = makeDeps({
      fetchEvents: async () => ({ events: [TNF()] }),
    });
    const off = await runEspnProductPriceArchiverIfEnabled(deps, {
      LINE_ARCHIVE_ENABLED: "1",
    });
    expect(off.enabled).toBe(false);
    const on = await runEspnProductPriceArchiverIfEnabled(deps, {
      LINE_ARCHIVE_ENABLED: "true",
    });
    expect(on.enabled).toBe(true);
    expect(on.gamesScanned).toBe(1);
    expect(on.gaps).toEqual([
      PRODUCT_MARKET_ALT_SPREAD,
      PRODUCT_MARKET_ALT_TOTAL,
    ]);
  });
});
