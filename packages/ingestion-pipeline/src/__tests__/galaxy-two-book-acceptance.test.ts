/**
 * C-104 / WP-27 acceptance — the completely free two-book board, end to end
 * and fixture-driven (no network):
 *
 *   ESPN inline scoreboard (book 1, `espn_public`)
 *     + PredExon Kalshi catalog (book 2, `kalshi`, via PredExonKalshiCatalog)
 *     → fetchEspnOddsForSport → DataNormalizer → scoreGames
 *
 * With the paid key absent and PREDEXON_INGEST=true an NFL game gets two
 * cleared bookmakers, so MIN_BOOKMAKERS=2 is satisfied and MONEYLINE, SPREAD
 * and TOTAL picks are minted with bookmakerCount 2 and zero paid credits.
 * When either side lacks a live quote for a market, that market is not
 * minted.
 */
import { describe, expect, it, vi } from "vitest";
import {
  DataNormalizer,
  PredExonClient,
  PredExonKalshiCatalog,
  fetchEspnOddsForSport,
} from "@sports/data-ingestion";
import { MIN_BOOKMAKERS, scoreGames } from "@sports/prediction-engine";
import type { GameContextInput, OddsInput } from "@sports/types";

const NOW = new Date("2026-09-13T15:00:00.000Z");
const KICKOFF = "2026-09-14T17:00:00.000Z"; // Sunday 1pm ET, 26 hours out
const ENV = { PREDEXON_INGEST: "true", PREDEXON_API_KEY: "test-not-a-real-key" };

function espnScoreboard() {
  return {
    events: [
      {
        id: "401773001",
        date: KICKOFF,
        competitions: [
          {
            date: KICKOFF,
            status: { type: { state: "pre", completed: false } },
            competitors: [
              { homeAway: "home", team: { displayName: "Buffalo Bills", abbreviation: "BUF" } },
              { homeAway: "away", team: { displayName: "Pittsburgh Steelers", abbreviation: "PIT" } },
            ],
            odds: [
              {
                provider: { name: "DraftKings" },
                spread: -9.5,
                overUnder: 47.5,
                moneyline: { home: { close: { odds: "-400" } }, away: { close: { odds: "+310" } } },
                pointSpread: { home: { close: { line: "-9.5", odds: "-110" } }, away: { close: { line: "+9.5", odds: "-110" } } },
                total: { over: { close: { line: "o47.5", odds: "-110" } }, under: { close: { line: "u47.5", odds: "-110" } } },
              },
            ],
          },
        ],
      },
    ],
  };
}

function two(yesBid: number, yesAsk: number) {
  return [
    { label: "Yes", bid: yesBid, ask: yesAsk },
    { label: "No", bid: 1 - yesAsk, ask: 1 - yesBid },
  ];
}

type Market = Record<string, unknown>;

/**
 * The enrichment context processSport hands the scorer (line movement, rest,
 * ATS form, freshness). Two books alone sit under the engine's thin-market
 * penalty and never reach MIN_PUBLISH_CONFIDENCE — by design; production
 * always scores with this context, so the acceptance does too. The context
 * is identical in every case below; only the books change.
 */
const CONTEXT: GameContextInput = {
  openingSpread: -7.5,
  currentSpread: -9.5,
  openingTotal: 44.5,
  currentTotal: 47.5,
  restDaysHome: 10,
  restDaysAway: 6,
  homeAtsForm: { wins: 7, losses: 3, pushes: 0, sampleSize: 10 },
  awayAtsForm: { wins: 3, losses: 7, pushes: 0, sampleSize: 10 },
  homeAtsFormAtHome: { wins: 4, losses: 1, pushes: 0, sampleSize: 5 },
  awayAtsFormAway: { wins: 1, losses: 4, pushes: 0, sampleSize: 5 },
  headToHeadForm: { wins: 3, losses: 1, pushes: 0, sampleSize: 4 },
  bookmakerCoverageMax: 2,
  dataFreshnessMinutes: 5,
  hasSpreadMarket: true,
  hasTotalMarket: true,
  hasH2HMarket: true,
};

function predexonCatalog(opts: { spreadQuoted?: boolean; totalQuoted?: boolean; moneylineQuoted?: boolean } = {}) {
  const { spreadQuoted = true, totalQuoted = true, moneylineQuoted = true } = opts;
  const bySeries: Record<string, Market[]> = {
    KXNFLGAME: [
      { ticker: "KXNFLGAME-26SEP14PITBUF-BUF", event_ticker: "KXNFLGAME-26SEP14PITBUF", status: "open", yes_subtitle: "Buffalo", outcomes: moneylineQuoted ? two(0.79, 0.81) : [] },
      { ticker: "KXNFLGAME-26SEP14PITBUF-PIT", event_ticker: "KXNFLGAME-26SEP14PITBUF", status: "open", yes_subtitle: "Pittsburgh", outcomes: two(0.19, 0.21) },
    ],
    KXNFLSPREAD: [
      { ticker: "KXNFLSPREAD-26SEP14PITBUF-BUF9", event_ticker: "KXNFLSPREAD-26SEP14PITBUF", status: "open", title: "Buffalo wins by over 9.5 points?", strike_type: "greater", floor_strike: 9.5, outcomes: spreadQuoted ? two(0.51, 0.53) : [] },
    ],
    KXNFLTOTAL: [
      { ticker: "KXNFLTOTAL-26SEP14PITBUF-47", event_ticker: "KXNFLTOTAL-26SEP14PITBUF", status: "open", title: "Total points scored over 47.5?", strike_type: "greater", floor_strike: 47.5, outcomes: totalQuoted ? two(0.54, 0.56) : [] },
    ],
  };
  return vi.fn(async (url: string) => {
    const u = new URL(url);
    const markets = bySeries[u.searchParams.get("series_ticker") ?? ""] ?? [];
    return new Response(JSON.stringify({ markets, pagination: { has_more: false, pagination_key: null } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
}

async function twoBookPicks(catalogOpts: Parameters<typeof predexonCatalog>[0] = {}) {
  const espnFetch = vi.fn(async (url: string) =>
    String(url).includes("scoreboard")
      ? ({ ok: true, json: async () => espnScoreboard() } as Response)
      : ({ ok: false, status: 404 } as Response),
  );
  const predexonFetch = predexonCatalog(catalogOpts);
  const catalog = new PredExonKalshiCatalog(new PredExonClient(ENV, predexonFetch as unknown as typeof fetch), {
    now: () => NOW,
    interRequestMs: 0,
  });

  const board = await fetchEspnOddsForSport("americanfootball_nfl", {
    fetchImpl: espnFetch as unknown as typeof fetch,
    interEventMs: 0,
    secondBook: catalog,
  });
  expect(board.events).toHaveLength(1);

  const normalizer = new DataNormalizer();
  const rows = normalizer.normalizeOdds(board.events, NOW);
  const input: OddsInput = {
    gameId: "game-1",
    homeTeam: "Buffalo Bills",
    awayTeam: "Pittsburgh Steelers",
    commenceTime: new Date(KICKOFF),
    sport: "americanfootball_nfl",
    bookmakerOdds: rows.map((o) => ({
      bookmaker: o.bookmaker,
      market: o.market,
      homePrice: o.homePrice,
      awayPrice: o.awayPrice,
      spread: o.spread,
      homeSpreadPrice: o.homeSpreadPrice,
      awaySpreadPrice: o.awaySpreadPrice,
      total: o.total,
      overPrice: o.overPrice,
      underPrice: o.underPrice,
    })),
    context: CONTEXT,
  };
  return { board, rows, picks: scoreGames([input], NOW), espnFetch, predexonFetch };
}

describe("C-104 acceptance: free two-book NFL board (ESPN inline + Kalshi via PredExon)", () => {
  it("mints MONEYLINE, SPREAD and TOTAL with bookmakerCount 2 and zero paid credits", async () => {
    const { board, rows, picks, espnFetch, predexonFetch } = await twoBookPicks();

    expect(board.events[0]!.bookmakers.map((b) => b.key)).toEqual(["espn_public", "kalshi"]);
    // Two priced books on every market.
    for (const market of ["H2H", "SPREADS", "TOTALS"] as const) {
      expect(rows.filter((r) => r.market === market).map((r) => r.bookmaker).sort()).toEqual(["espn_public", "kalshi"]);
    }
    expect(MIN_BOOKMAKERS).toBe(2);

    const byType = new Map(picks.map((p) => [p.pickType, p]));
    expect([...byType.keys()].sort()).toEqual(["MONEYLINE", "SPREAD", "TOTAL"]);
    for (const p of picks) expect(p.bookmakerCount).toBe(2);

    // Not one request left the free plane: ESPN scoreboard + PredExon only.
    const hosts = new Set([
      ...espnFetch.mock.calls.map((c) => new URL(String(c[0])).hostname),
      ...predexonFetch.mock.calls.map((c) => new URL(String(c[0])).hostname),
    ]);
    expect([...hosts].sort()).toEqual(["api.predexon.com", "site.web.api.espn.com"]);
  });

  it("does not mint a market when the Kalshi side lacks a live quote for it (single book < MIN_BOOKMAKERS)", async () => {
    const noSpread = await twoBookPicks({ spreadQuoted: false });
    expect(noSpread.picks.map((p) => p.pickType).sort()).toEqual(["MONEYLINE", "TOTAL"]);

    const noTotal = await twoBookPicks({ totalQuoted: false });
    expect(noTotal.picks.map((p) => p.pickType).sort()).toEqual(["MONEYLINE", "SPREAD"]);

    const noMoneyline = await twoBookPicks({ moneylineQuoted: false });
    expect(noMoneyline.picks.map((p) => p.pickType).sort()).toEqual(["SPREAD", "TOTAL"]);
  });

  it("mints nothing from the single ESPN book when the second book is off (default)", async () => {
    const espnFetch = vi.fn(async (url: string) =>
      String(url).includes("scoreboard")
        ? ({ ok: true, json: async () => espnScoreboard() } as Response)
        : ({ ok: false, status: 404 } as Response),
    );
    const board = await fetchEspnOddsForSport("americanfootball_nfl", {
      fetchImpl: espnFetch as unknown as typeof fetch,
      interEventMs: 0,
    });
    const rows = new DataNormalizer().normalizeOdds(board.events, NOW);
    const picks = scoreGames(
      [
        {
          gameId: "game-1",
          homeTeam: "Buffalo Bills",
          awayTeam: "Pittsburgh Steelers",
          commenceTime: new Date(KICKOFF),
          sport: "americanfootball_nfl",
          bookmakerOdds: rows.map((o) => ({
            bookmaker: o.bookmaker,
            market: o.market,
            homePrice: o.homePrice,
            awayPrice: o.awayPrice,
            spread: o.spread,
            homeSpreadPrice: o.homeSpreadPrice,
            awaySpreadPrice: o.awaySpreadPrice,
            total: o.total,
            overPrice: o.overPrice,
            underPrice: o.underPrice,
          })),
          context: CONTEXT,
        },
      ],
      NOW,
    );
    expect(board.events[0]!.bookmakers.map((b) => b.key)).toEqual(["espn_public"]);
    expect(picks).toEqual([]);
  });
});
