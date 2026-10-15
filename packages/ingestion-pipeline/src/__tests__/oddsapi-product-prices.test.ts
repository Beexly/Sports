import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OddsApiEvent } from "@sports/types";
import {
  createJsonlLineArchiveStore,
  type JsonlFileSystem,
} from "../line-archiver/espn-line-archive.js";
import {
  extractOddsApiProductPrices,
  projectedMonthlyBurn,
  estimatePerCaptureCredits,
  runOddsApiProductPriceArchiver,
  runOddsApiProductPriceArchiverIfEnabled,
  ODDSAPI_EVENT_MARKETS,
  ODDSAPI_LINE_ARCHIVE_SOURCE,
  ODDSAPI_MAX_CAPTURES_PER_GAME,
  ODDSAPI_MONTHLY_BURN_CAP,
  type OddsApiProductPriceArchiverDeps,
} from "../line-archiver/oddsapi-product-prices.js";
import {
  buildEspnMatchIndex,
  countOddsApiCapturesInJsonl,
  runOddsApiProductPricesJob,
  sanitizeOddsApiError,
} from "../line-archiver/run-oddsapi-product-prices.js";

/**
 * oddsapi-product-prices — the KEYED product-price leg. ALL payloads in
 * this file are SYNTHETIC fixtures shaped like The Odds API's event-odds
 * responses (tonight's teams and featured prices are the public ones the
 * keyless archive already recorded; the alternate ladders are invented
 * for the fixture and are never presented as captured data anywhere).
 *
 * These tests pin:
 *   - extraction over a full event payload: alternate rungs become
 *     ALT_SPREAD / ALT_TOTAL rows; the rung identical to the book's own
 *     featured row (same side, line AND price) is dropped by the
 *     duplicate guard; the moneyline cross-check reports match /
 *     mismatch / not_checked honestly
 *   - single-book provenance: the preference-first book carrying an
 *     alternate market is the one persisted
 *   - strict validation: zero prices, missing points, unresolvable
 *     sides and exact duplicates drop and count, never coerce
 *   - the credit budget: 48h window (a +72h game is never fetched), the
 *     3-capture-per-game cap enforced BEFORE a call, realized
 *     per-capture cost measured from x-requests-used deltas, and the
 *     monthly-burn projection aborting the alt capture mid-slate
 *   - the runner through the featured leg's JSONL store: rows carry
 *     source "oddsapi" and the book's own key, phase OPEN then INTERIM
 *   - the hard gate and the missing-key job result: zero API calls,
 *     the reason named, the key value nowhere
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

const HOME = "Denver Broncos";
const AWAY = "Seattle Seahawks";
const CTX = { homeTeam: HOME, awayTeam: AWAY };
/** Kickoff 2026-10-16T00:15Z — inside the 48h window from NOW. */
const KICKOFF = "2026-10-16T00:15:00Z";

function outcome(name: string, price?: number, point?: number) {
  return {
    name,
    ...(price !== undefined ? { price } : {}),
    ...(point !== undefined ? { point } : {}),
  };
}

function draftKingsBook() {
  return {
    key: "draftkings",
    title: "DraftKings",
    markets: [
      {
        key: "h2h",
        outcomes: [outcome(AWAY, -142), outcome(HOME, 120)],
      },
      {
        key: "spreads",
        outcomes: [outcome(AWAY, -112, -2.5), outcome(HOME, -108, 2.5)],
      },
      {
        key: "totals",
        outcomes: [outcome("Over", -115, 40.5), outcome("Under", -105, 40.5)],
      },
      {
        key: "alternate_spreads",
        outcomes: [
          outcome(AWAY, 145, -6.5),
          outcome(HOME, -170, 6.5),
          outcome(AWAY, -102, -3.5),
          outcome(HOME, -118, 3.5),
          // the featured rung itself — the duplicate guard drops these two
          outcome(AWAY, -112, -2.5),
          outcome(HOME, -108, 2.5),
          outcome(AWAY, -135, 1.5),
          outcome(HOME, 115, -1.5),
        ],
      },
      {
        key: "alternate_totals",
        outcomes: [
          outcome("Over", -165, 36.5),
          outcome("Under", 140, 36.5),
          // the featured rung — dropped
          outcome("Over", -115, 40.5),
          outcome("Under", -105, 40.5),
          outcome("Over", 135, 44.5),
          outcome("Under", -160, 44.5),
        ],
      },
    ],
  };
}

function eventPayload(bookmakers: unknown[]) {
  return {
    id: "oddsapi-event-1",
    sport_key: "americanfootball_nfl",
    sport_title: "NFL",
    commence_time: KICKOFF,
    home_team: HOME,
    away_team: AWAY,
    bookmakers,
  };
}

function slateEvent(id: string, commence: string): OddsApiEvent {
  return {
    id,
    sport_key: "americanfootball_nfl",
    sport_title: "NFL",
    commence_time: commence,
    home_team: HOME,
    away_team: AWAY,
    bookmakers: [],
  };
}

describe("extractOddsApiProductPrices — synthetic event payload", () => {
  it("extracts both ladders, drops the featured rungs, cross-checks the moneyline", () => {
    const x = extractOddsApiProductPrices(eventPayload([draftKingsBook()]), {
      ...CTX,
      expectedMoneyline: { home: 120, away: -142 },
    });
    expect(x.book).toBe("draftkings");
    expect(x.laddersFound).toBe(2);
    expect(x.featuredRungsDropped).toBe(4);
    expect(x.entriesDropped).toBe(0);
    expect(x.altSpreadExposed).toBe(true);
    expect(x.altTotalExposed).toBe(true);
    // 8 alt-spread outcomes − 2 featured = 6; 6 alt-total − 2 featured = 4
    expect(x.rows).toHaveLength(10);
    expect(
      x.rows.filter((r) => r.market === "ALT_SPREAD"),
    ).toHaveLength(6);
    expect(x.rows.filter((r) => r.market === "ALT_TOTAL")).toHaveLength(4);
    expect(x.rows).toContainEqual({
      market: "ALT_SPREAD",
      side: "away",
      price: 145,
      line: -6.5,
    });
    expect(x.rows).toContainEqual({
      market: "ALT_TOTAL",
      side: "under",
      price: -160,
      line: 44.5,
    });
    expect(x.featured).toMatchObject({
      moneylineHome: 120,
      moneylineAway: -142,
      spreadHomeLine: 2.5,
      totalLine: 40.5,
    });
    expect(x.moneylineCrossCheck).toBe("match");
  });

  it("reports a moneyline mismatch, and not_checked without an expectation", () => {
    const payload = eventPayload([draftKingsBook()]);
    expect(
      extractOddsApiProductPrices(payload, {
        ...CTX,
        expectedMoneyline: { home: 125, away: -145 },
      }).moneylineCrossCheck,
    ).toBe("mismatch");
    expect(extractOddsApiProductPrices(payload, CTX).moneylineCrossCheck).toBe(
      "not_checked",
    );
  });

  it("persists the preference-first book carrying an alternate market", () => {
    const fanduel = {
      key: "fanduel",
      title: "FanDuel",
      markets: [
        { key: "h2h", outcomes: [outcome(AWAY, -140), outcome(HOME, 118)] },
      ],
    };
    // FanDuel listed first but carries no ladder — DraftKings wins.
    const x = extractOddsApiProductPrices(
      eventPayload([fanduel, draftKingsBook()]),
      CTX,
    );
    expect(x.book).toBe("draftkings");
    expect(x.rows.length).toBeGreaterThan(0);
  });

  it("drops malformed and duplicate outcomes, counting each", () => {
    const book = draftKingsBook();
    const alt = book.markets.find((m) => m.key === "alternate_spreads")!;
    alt.outcomes.push(
      outcome(AWAY, 0, -9.5), // zero is not a price
      outcome(AWAY, 150), // no point
      outcome("Somebody Else", 150, -9.5), // unresolvable side
      outcome(AWAY, 145, -6.5), // exact duplicate of a valid rung
    );
    const x = extractOddsApiProductPrices(eventPayload([book]), CTX);
    expect(x.entriesDropped).toBe(4);
    expect(x.rows.filter((r) => r.market === "ALT_SPREAD")).toHaveLength(6);
  });

  it("no bookmakers: nothing exposed, featured null, cross-check not run", () => {
    const x = extractOddsApiProductPrices(eventPayload([]), {
      ...CTX,
      expectedMoneyline: { home: 120, away: -142 },
    });
    expect(x.book).toBeNull();
    expect(x.featured).toBeNull();
    expect(x.rows).toHaveLength(0);
    expect(x.moneylineCrossCheck).toBe("not_checked");
  });
});

describe("projectedMonthlyBurn", () => {
  it("prices the capped cadence and respects the cap at the request shape", () => {
    expect(estimatePerCaptureCredits()).toBe(ODDSAPI_EVENT_MARKETS.length);
    // 5 credits × 3 captures × 16 games × 5 slates = 1,200 ≤ 2,000
    expect(projectedMonthlyBurn(estimatePerCaptureCredits())).toBe(1_200);
    expect(projectedMonthlyBurn(9)).toBeGreaterThan(ODDSAPI_MONTHLY_BURN_CAP);
  });
});

// ── runner ──────────────────────────────────────────────────────────────

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

interface RunnerHarness {
  deps: OddsApiProductPriceArchiverDeps;
  fetchEventOdds: ReturnType<typeof vi.fn>;
  fs: ReturnType<typeof memoryFs>;
}

/**
 * A two-game slate, both in the 48h window. Quota script: the events
 * list lands at used=1000; each event-odds call adds `perCapture`
 * credits (default 5 — the request's market count).
 */
function makeHarness(
  options: {
    perCapture?: number;
    priorCaptures?: number;
    secondEventError?: boolean;
  } = {},
): RunnerHarness {
  const perCapture = options.perCapture ?? 5;
  const fs = memoryFs();
  let used = 1_000;
  const fetchEventOdds = vi.fn(async (event: OddsApiEvent) => {
    used += perCapture;
    if (options.secondEventError && event.id === "oddsapi-event-2") {
      return {
        data: null,
        error: "HTTP 429 quota",
        usedRequests: used,
        remainingRequests: 19_000 - used,
      };
    }
    return {
      data: eventPayload([draftKingsBook()]),
      usedRequests: used,
      remainingRequests: 19_000 - used,
    };
  });
  const deps: OddsApiProductPriceArchiverDeps = {
    fetchEvents: async () => ({
      events: [
        slateEvent("oddsapi-event-1", KICKOFF),
        slateEvent("oddsapi-event-2", "2026-10-16T17:00:00Z"),
        // +72h — beyond the 48h capture window, never fetched
        slateEvent("oddsapi-event-3", "2026-10-18T17:00:00Z"),
      ],
      usedRequests: used,
      remainingRequests: 19_000 - used,
    }),
    fetchEventOdds,
    resolveGameId: async (event) => `game:${event.id}`,
    priorCaptureCount: async () => options.priorCaptures ?? 0,
    expectedMoneylineByEventId: new Map([
      ["oddsapi-event-1", { home: 120, away: -142 }],
      ["oddsapi-event-2", { home: 120, away: -142 }],
    ]),
    store: createJsonlLineArchiveStore("/tmp/oddsapi.jsonl", fs),
    now: () => NOW,
  };
  return { deps, fetchEventOdds, fs };
}

describe("runOddsApiProductPriceArchiver", () => {
  it("captures in-window games only, stamps source/book, measures credits from headers", async () => {
    const { deps, fetchEventOdds, fs } = makeHarness();
    const result = await runOddsApiProductPriceArchiver(deps);

    expect(result.fetchedEvents).toBe(3);
    expect(result.windowEvents).toBe(2);
    expect(result.skippedBeyondWindow).toBe(1);
    expect(result.gamesScanned).toBe(2);
    expect(fetchEventOdds).toHaveBeenCalledTimes(2);
    expect(result.productRowsPersisted).toBe(20);
    expect(result.altSpreadRows).toBe(12);
    expect(result.altTotalRows).toBe(8);
    expect(result.gaps).toEqual([]);
    expect(result.moneylineCrossChecks).toEqual({
      match: 2,
      mismatch: 0,
      notChecked: 0,
    });
    expect(result.credits.perCaptureCost).toBe(5);
    expect(result.credits.perCaptureCostSource).toBe("measured");
    expect(result.credits.totalEventOddsCredits).toBe(10);
    expect(result.credits.usedRequests).toBe(1_010);
    expect(result.credits.projectedMonthlyBurn).toBe(1_200);
    expect(result.credits.abortedForBudget).toBe(false);

    const lines = (fs.files.get("/tmp/oddsapi.jsonl") ?? "")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(lines).toHaveLength(20);
    expect(lines[0]).toMatchObject({
      gameId: "game:oddsapi-event-1",
      phase: "OPEN",
      book: "draftkings",
      market: "ALT_SPREAD",
      side: "away",
      price: 145,
      line: -6.5,
      source: ODDSAPI_LINE_ARCHIVE_SOURCE,
    });
  });

  it("second run against the same ledger classifies INTERIM", async () => {
    const { deps, fs } = makeHarness();
    await runOddsApiProductPriceArchiver(deps);
    const second = await runOddsApiProductPriceArchiver({
      ...deps,
      now: () => new Date("2026-10-15T16:00:00.000Z"),
    });
    expect(second.productRowsPersisted).toBe(20);
    const phases = (fs.files.get("/tmp/oddsapi.jsonl") ?? "")
      .split("\n")
      .filter(Boolean)
      .map((l) => (JSON.parse(l) as { phase: string }).phase);
    expect(phases.slice(0, 20).every((p) => p === "OPEN")).toBe(true);
    expect(phases.slice(20).every((p) => p === "INTERIM")).toBe(true);
  });

  it("enforces the capture cap BEFORE spending: at-cap games are never fetched", async () => {
    const { deps, fetchEventOdds } = makeHarness({
      priorCaptures: ODDSAPI_MAX_CAPTURES_PER_GAME,
    });
    const result = await runOddsApiProductPriceArchiver(deps);
    expect(result.gamesSkippedCaptureCap).toBe(2);
    expect(result.gamesScanned).toBe(0);
    expect(fetchEventOdds).not.toHaveBeenCalled();
    expect(result.credits.totalEventOddsCredits).toBe(0);
  });

  it("aborts the alt capture when the measured per-capture cost breaks the monthly cap", async () => {
    // 9 credits/capture × 240 capped-cadence captures = 2,160 > 2,000.
    const { deps, fetchEventOdds } = makeHarness({ perCapture: 9 });
    const result = await runOddsApiProductPriceArchiver(deps);
    expect(result.gamesScanned).toBe(1);
    expect(result.gamesSkippedBudget).toBe(1);
    expect(result.credits.abortedForBudget).toBe(true);
    expect(result.credits.perCaptureCost).toBe(9);
    expect(result.credits.projectedMonthlyBurn).toBe(2_160);
    expect(fetchEventOdds).toHaveBeenCalledTimes(1);
    expect(result.errors.some((e) => e.includes("budget abort"))).toBe(true);
  });

  it("a failed event-odds call records the error and still accounts its credits", async () => {
    const { deps } = makeHarness({ secondEventError: true });
    const result = await runOddsApiProductPriceArchiver(deps);
    expect(result.gamesScanned).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("oddsapi-event-2");
    // the failed call's header delta is real spend and is counted
    expect(result.credits.totalEventOddsCredits).toBe(10);
    expect(result.credits.usedRequests).toBe(1_010);
  });
});

describe("runOddsApiProductPriceArchiverIfEnabled — hard gate", () => {
  it("invokes no dep at all when LINE_ARCHIVE_ENABLED is unset", async () => {
    const { deps } = makeHarness();
    const spied: OddsApiProductPriceArchiverDeps = {
      ...deps,
      fetchEvents: vi.fn(deps.fetchEvents),
      fetchEventOdds: vi.fn(deps.fetchEventOdds),
      store: {
        existingMarkets: vi.fn(deps.store.existingMarkets),
        append: vi.fn(deps.store.append),
      },
    };
    const result = await runOddsApiProductPriceArchiverIfEnabled(spied);
    expect(result.enabled).toBe(false);
    expect(spied.fetchEvents).not.toHaveBeenCalled();
    expect(spied.fetchEventOdds).not.toHaveBeenCalled();
  });

  it("runs when LINE_ARCHIVE_ENABLED === 'true'", async () => {
    process.env["LINE_ARCHIVE_ENABLED"] = "true";
    const { deps } = makeHarness();
    const result = await runOddsApiProductPriceArchiverIfEnabled(deps);
    expect(result.enabled).toBe(true);
    expect(result.gamesScanned).toBe(2);
  });
});

// ── wiring helpers + job ────────────────────────────────────────────────

describe("run-oddsapi-product-prices helpers", () => {
  it("countOddsApiCapturesInJsonl counts distinct stamps for this leg only", () => {
    const row = (gameId: string, source: string, capturedAt: string) =>
      JSON.stringify({
        gameId,
        capturedAt,
        phase: "OPEN",
        book: "draftkings",
        market: "ALT_SPREAD",
        side: "away",
        price: 145,
        line: -6.5,
        source,
      });
    const text = [
      row("g1", ODDSAPI_LINE_ARCHIVE_SOURCE, "2026-10-15T15:00:00.000Z"),
      row("g1", ODDSAPI_LINE_ARCHIVE_SOURCE, "2026-10-15T15:00:00.000Z"),
      row("g1", ODDSAPI_LINE_ARCHIVE_SOURCE, "2026-10-15T16:00:00.000Z"),
      row("g1", "espn-public-dk", "2026-10-15T17:00:00.000Z"),
      row("g2", ODDSAPI_LINE_ARCHIVE_SOURCE, "2026-10-15T15:00:00.000Z"),
    ].join("\n");
    expect(countOddsApiCapturesInJsonl(text, "g1")).toBe(2);
    expect(countOddsApiCapturesInJsonl(text, "g2")).toBe(1);
    expect(countOddsApiCapturesInJsonl("", "g1")).toBe(0);
  });

  it("sanitizeOddsApiError can never pass a key fragment through", () => {
    const dirty = "GET https://api.the-odds-api.com/v4/sports?apiKey=SECRET123&regions=us failed";
    const clean = sanitizeOddsApiError(dirty);
    expect(clean).not.toContain("SECRET123");
    expect(clean).toContain("apiKey=<redacted>");
  });

  it("buildEspnMatchIndex joins on teams + commence and reads the board moneyline", () => {
    const oddsEvent = slateEvent("oddsapi-event-1", KICKOFF);
    const espnEvent: OddsApiEvent = {
      id: "espn:americanfootball_nfl:401872995",
      sport_key: "americanfootball_nfl",
      sport_title: "NFL",
      commence_time: KICKOFF,
      home_team: HOME,
      away_team: AWAY,
      bookmakers: [
        {
          key: "espn_public",
          title: "ESPN",
          markets: [
            {
              key: "h2h",
              last_update: "2026-10-15T14:55:00Z",
              outcomes: [
                { name: AWAY, price: -142 },
                { name: HOME, price: 120 },
              ],
            },
          ],
        },
      ],
    };
    const index = buildEspnMatchIndex([oddsEvent], [espnEvent]);
    expect(index.gameIdByOddsApiEventId.get("oddsapi-event-1")).toBe(
      "espn:americanfootball_nfl:401872995",
    );
    expect(index.moneylineByOddsApiEventId.get("oddsapi-event-1")).toEqual({
      home: 120,
      away: -142,
    });
    // a same-teams game a week later is outside tolerance — no join
    const later = slateEvent("oddsapi-event-9", "2026-10-23T00:15:00Z");
    expect(
      buildEspnMatchIndex([later], [espnEvent]).gameIdByOddsApiEventId.size,
    ).toBe(0);
  });
});

describe("runOddsApiProductPricesJob — key handling", () => {
  it("missing key: reported, zero calls, no crash — in both modes", async () => {
    const dry = await runOddsApiProductPricesJob({
      dryRun: true,
      env: {},
      now: NOW,
    });
    expect(dry.keyConfigured).toBe(false);
    expect(dry.enabled).toBe(false);
    expect(dry.gamesScanned).toBe(0);
    expect(dry.errors[0]).toContain("THE_ODDS_API_KEY not configured");

    const gated = await runOddsApiProductPricesJob({ env: {}, now: NOW });
    expect(gated.keyConfigured).toBe(false);
    expect(gated.enabled).toBe(false);
    expect(gated.errors).toHaveLength(0); // flag-off no-op stays silent
  });
});
