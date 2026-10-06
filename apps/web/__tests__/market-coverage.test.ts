import { describe, expect, it } from "vitest";
import {
  classifyMarketCoverage,
  loadMarketCoverage,
  MARKET_COVERAGE_WINDOW_HOURS,
  type MarketCoverageDb,
  type MarketCoverageGameRow,
} from "@/lib/board/market-coverage";

const from = new Date("2026-09-12T12:00:00Z");
const to = new Date("2026-09-15T12:00:00Z");

describe("classifyMarketCoverage", () => {
  it("flags CFB totals as degraded when games exist but no TOTAL picks do (the zero-key gap)", () => {
    const report = classifyMarketCoverage(
      {
        games: [
          { sportKey: "americanfootball_ncaaf" },
          { sportKey: "americanfootball_ncaaf" },
          { sportKey: "americanfootball_ncaaf" },
        ],
        picks: [
          { sportKey: "americanfootball_ncaaf", pickType: "MONEYLINE" },
          { sportKey: "americanfootball_ncaaf", pickType: "MONEYLINE" },
          { sportKey: "americanfootball_ncaaf", pickType: "SPREAD" },
        ],
      },
      { from, to },
    );
    const cfb = report.sports.find((s) => s.sportKey === "americanfootball_ncaaf");
    expect(cfb?.games).toBe(3);
    expect(cfb?.picks).toEqual({ MONEYLINE: 2, SPREAD: 1, TOTAL: 0 });
    expect(cfb?.status).toEqual({ MONEYLINE: "covered", SPREAD: "covered", TOTAL: "none" });
    expect(report.degraded).toHaveLength(1);
    expect(report.degraded[0]).toMatchObject({ sportKey: "americanfootball_ncaaf", market: "TOTAL", games: 3 });
    expect(report.degraded[0]!.hint).toMatch(/MIN_BOOKMAKERS=2/);
    expect(report.degraded[0]!.hint).toMatch(/degraded, not broken/);
  });

  it("reports covered when every market has at least one published pending pick", () => {
    const report = classifyMarketCoverage(
      {
        games: [{ sportKey: "americanfootball_nfl" }],
        picks: [
          { sportKey: "americanfootball_nfl", pickType: "MONEYLINE" },
          { sportKey: "americanfootball_nfl", pickType: "SPREAD" },
          { sportKey: "americanfootball_nfl", pickType: "TOTAL" },
        ],
      },
      { from, to },
    );
    expect(report.degraded).toEqual([]);
    expect(report.sports[0]?.status).toEqual({ MONEYLINE: "covered", SPREAD: "covered", TOTAL: "covered" });
  });

  it("a sport with picks but no games in the window is no_games, never degraded (picks on stale rows)", () => {
    const report = classifyMarketCoverage(
      { games: [], picks: [{ sportKey: "baseball_mlb", pickType: "MONEYLINE" }] },
      { from, to },
    );
    expect(report.sports[0]?.status.TOTAL).toBe("no_games");
    expect(report.degraded).toEqual([]);
  });

  it("ignores unknown pick types and never invents a market", () => {
    const report = classifyMarketCoverage(
      { games: [{ sportKey: "soccer_usa_mls" }], picks: [{ sportKey: "soccer_usa_mls", pickType: "PROP" }] },
      { from, to },
    );
    expect(report.sports[0]?.picks).toEqual({ MONEYLINE: 0, SPREAD: 0, TOTAL: 0 });
    expect(report.degraded.map((d) => d.market)).toEqual(["MONEYLINE", "SPREAD", "TOTAL"]);
  });

  it("carries the window it was asked about", () => {
    const report = classifyMarketCoverage({ games: [], picks: [] }, { from, to });
    expect(report.from).toBe(from.toISOString());
    expect(report.to).toBe(to.toISOString());
    expect(report.windowHours).toBe(MARKET_COVERAGE_WINDOW_HOURS);
  });
});

/** A game row as the coverage loader selects it (collapse identity + sport key). */
function gameRow(args: {
  id: string;
  externalId: string;
  sportId: string;
  key: string;
  home: string;
  away: string;
  commenceTime?: Date;
  picks?: number;
}): MarketCoverageGameRow {
  return {
    id: args.id,
    externalId: args.externalId,
    sportId: args.sportId,
    homeTeamName: args.home,
    awayTeamName: args.away,
    commenceTime: args.commenceTime ?? new Date("2026-09-13T17:00:00Z"),
    createdAt: new Date("2026-09-01T00:00:00Z"),
    mergedIntoGameId: null,
    sport: { key: args.key },
    _count: { picks: args.picks ?? 0, odds: 0, oddsLineSnapshots: 0 },
  };
}

describe("loadMarketCoverage", () => {
  it("queries board-eligible PENDING picks (published, non-bootstrap, not seed) and games inside the window", async () => {
    const seen: unknown[] = [];
    const db: MarketCoverageDb = {
      game: {
        findMany: async (args) => {
          seen.push(args);
          return [
            gameRow({ id: "g-cfb", externalId: "odds-cfb", sportId: "s-cfb", key: "americanfootball_ncaaf", home: "Alabama Crimson Tide", away: "Georgia Bulldogs" }),
            gameRow({ id: "g-nfl", externalId: "odds-nfl", sportId: "s-nfl", key: "americanfootball_nfl", home: "Seattle Seahawks", away: "New England Patriots" }),
          ];
        },
      },
      pick: {
        findMany: async (args) => {
          seen.push(args);
          return [
            { pickType: "MONEYLINE", game: { sport: { key: "americanfootball_ncaaf" } } },
            { pickType: "TOTAL", game: { sport: { key: "americanfootball_nfl" } } },
            { pickType: "MONEYLINE", game: { sport: { key: "americanfootball_nfl" } } },
            { pickType: "SPREAD", game: { sport: { key: "americanfootball_nfl" } } },
          ];
        },
      },
    };
    const now = new Date("2026-09-12T12:00:00Z");
    const report = await loadMarketCoverage(db, now, 48);
    expect(report.windowHours).toBe(48);
    expect(report.to).toBe(new Date("2026-09-14T12:00:00Z").toISOString());
    expect(seen).toHaveLength(2);
    // Canonical games only: a merged alias is the same contest twice.
    expect(seen[0]).toMatchObject({ where: { mergedIntoGameId: null } });
    // A pick the public board hides (bootstrap, seed, unpublished, on a
    // tombstone, or stale) must never satisfy coverage: the same predicates
    // the board's relation filter and the stale-pick policy use.
    expect(seen[1]).toMatchObject({
      where: {
        isPublished: true,
        isBootstrap: false,
        NOT: { modelVersion: "v5.0.0-seed" },
        result: "PENDING",
        game: { mergedIntoGameId: null },
        OR: [
          { dataFreshnessAt: { gte: expect.any(Date) } },
          { dataFreshnessAt: null, generatedAt: { gte: expect.any(Date) } },
        ],
      },
    });
    expect(report.degraded.map((d) => `${d.sportKey}:${d.market}`)).toEqual([
      "americanfootball_ncaaf:SPREAD",
      "americanfootball_ncaaf:TOTAL",
    ]);
  });

  it("counts fixtures, not feed rows: three feeds' rows for two NFL games read as 2 games (C-261)", async () => {
    // Measured 2026-09-08 19:07 UTC on the production truth surface:
    // americanfootball_nfl `games: 6` for a 72h window in which ESPN's public
    // scoreboard lists exactly two fixtures (NE at SEA 2026-09-10 00:20Z, SF at
    // LAR 2026-09-11 00:35Z). Each odds feed writes its own game row; only the
    // merged ones are tombstoned. The count must collapse to contests.
    const sea = { sportId: "s-nfl", key: "americanfootball_nfl", home: "Seattle Seahawks", away: "New England Patriots", commenceTime: new Date("2026-09-10T00:20:00Z") };
    const lar = { sportId: "s-nfl", key: "americanfootball_nfl", home: "Los Angeles Rams", away: "San Francisco 49ers", commenceTime: new Date("2026-09-11T00:35:00Z") };
    const db: MarketCoverageDb = {
      game: {
        findMany: async () => [
          gameRow({ id: "sea-odds", externalId: "0a1b2c", ...sea, picks: 1 }),
          gameRow({ id: "sea-espn", externalId: "espn:nfl:401872656", ...sea }),
          gameRow({ id: "sea-rundown", externalId: "rundown:12345", ...sea }),
          gameRow({ id: "lar-odds", externalId: "3d4e5f", ...lar, picks: 1 }),
          gameRow({ id: "lar-espn", externalId: "espn:nfl:401872657", ...lar }),
          gameRow({ id: "lar-rundown", externalId: "rundown:12346", ...lar }),
        ],
      },
      pick: {
        findMany: async () => [
          { pickType: "SPREAD", game: { sport: { key: "americanfootball_nfl" } } },
          { pickType: "SPREAD", game: { sport: { key: "americanfootball_nfl" } } },
        ],
      },
    };
    const report = await loadMarketCoverage(db, new Date("2026-09-08T19:07:38Z"), 72);
    const nfl = report.sports.find((s) => s.sportKey === "americanfootball_nfl");
    expect(nfl?.games).toBe(2);
    expect(nfl?.picks).toEqual({ MONEYLINE: 0, SPREAD: 2, TOTAL: 0 });
    expect(report.degraded.map((d) => `${d.market}:${d.games}`)).toEqual(["MONEYLINE:2", "TOTAL:2"]);
  });

  it("keeps two different contests apart even when they share a sport and a kickoff", async () => {
    const db: MarketCoverageDb = {
      game: {
        findMany: async () => [
          gameRow({ id: "a", externalId: "x1", sportId: "s-nfl", key: "americanfootball_nfl", home: "Cincinnati Bengals", away: "Tampa Bay Buccaneers" }),
          gameRow({ id: "b", externalId: "x2", sportId: "s-nfl", key: "americanfootball_nfl", home: "Detroit Lions", away: "New Orleans Saints" }),
        ],
      },
      pick: { findMany: async () => [] },
    };
    const report = await loadMarketCoverage(db, new Date("2026-09-12T12:00:00Z"), 48);
    expect(report.sports[0]?.games).toBe(2);
  });
});

describe("degraded hints tell the truth about what they can see (C-261)", () => {
  // Measured 2026-09-08 19:07 UTC on the production truth surface: the NFL
  // TOTAL hint read "Known cause: ... totals need a live odds feed
  // (THE_ODDS_API_KEY or TheRundown)" while the same payload reported the key
  // present, an odds insert 15 minutes old and 13,306 credits. The classifier
  // sees pick and game counts only, so it must name the scorer's gates and
  // point at the feed posture, never assert a cause it cannot observe.
  const report = classifyMarketCoverage(
    { games: [{ sportKey: "americanfootball_nfl" }], picks: [] },
    { from, to },
  );
  const hint = (market: string) => report.degraded.find((d) => d.market === market)!.hint;

  it("never asserts a missing key or a 'known cause' it did not observe", () => {
    for (const market of ["MONEYLINE", "SPREAD", "TOTAL"]) {
      expect(hint(market)).not.toMatch(/Known cause/);
      expect(hint(market)).not.toMatch(/THE_ODDS_API_KEY/);
      expect(hint(market)).not.toMatch(/TheRundown/);
      expect(hint(market)).toMatch(/oddsInserting/);
    }
  });

  it("names the scorer gates a TOTAL must clear, in order: priced books, vote, confidence", () => {
    const h = hint("TOTAL");
    expect(h).toMatch(/MIN_BOOKMAKERS=2 books price both sides/);
    expect(h).toMatch(/over\/under vote across those books reaches 0\.55/);
    expect(h).toMatch(/composite confidence reaches 50/);
    expect(h).toMatch(/scoreTotalPick/);
    expect(h).toMatch(/by design/);
  });

  it("names the 0.58 fair-probability floor a book-priced MONEYLINE must clear", () => {
    const h = hint("MONEYLINE");
    expect(h).toMatch(/fair probability for the favoured side reaches 0\.58/);
    expect(h).toMatch(/composite confidence reaches 50/);
    expect(h).toMatch(/scoreMoneylinePick/);
    expect(h).toMatch(/independent estimate/);
  });

  it("names the spread gates and says the zero-key slate is moneyline-only", () => {
    const h = hint("SPREAD");
    expect(h).toMatch(/scoreSpreadPick/);
    expect(h).toMatch(/zero-key signal slate is moneyline-only/);
  });
});
