/**
 * Anti-tautology invariant, PRODUCER side.
 *
 * `normalizer.ts` states the law: `last_update` must carry UPSTREAM timestamps,
 * "never the local clock, preserving the anti-tautology freshness design".
 * `normalizer.test.ts` pins the CONSUMER side (an absent/unparseable timestamp
 * reads as not-provably-fresh). Nothing pinned the producers — so the free-path
 * adapters were free to stamp `new Date()` and quietly re-manufacture the exact
 * signal the gate exists to detect.
 *
 * The concrete pick-corrupting path this locks shut:
 *
 *   process-sport.ts thin-fills any game under MIN_BOOKMAKERS (2) from the
 *   secondary aggregator -> odds-event-merge.unionBookmakers injects that book
 *   into a primary game whose real Odds API books are days stale ->
 *   normalizer.freshGameIds takes the MAX last_update per game -> a now-stamped
 *   free-path book drags the stale game past the freshness gate -> the game now
 *   has >= 2 books, so scoring emits a pick in which a days-stale price is half
 *   the consensus, published as fresh.
 *
 * Thin games are exactly where a stale line is most likely, which is what makes
 * this worse than it looks.
 */

import { describe, expect, it, vi } from "vitest";
import type { OddsApiEvent } from "@sports/types";
import { fetchEspnOddsForSport } from "../espn-odds-client.js";
import { rundownEventToOddsApiEvent } from "../rundown-client.js";
import { mergeBookmakersIntoPrimary, THIN_FILL_MIN_BOOKMAKERS } from "../odds-event-merge.js";
import { DataNormalizer } from "../normalizer.js";

/** Any timestamp within a few seconds of now is a local-clock stamp. */
function looksLikeLocalClock(value: string | undefined): boolean {
  if (value === undefined) return false;
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return false;
  return Math.abs(Date.now() - t) < 60_000;
}

function allTimestamps(event: OddsApiEvent): Array<string | undefined> {
  const out: Array<string | undefined> = [];
  for (const book of event.bookmakers) {
    out.push(book.last_update);
    for (const market of book.markets) out.push(market.last_update);
  }
  return out;
}

describe("producer-side: free-path adapters never stamp the local clock", () => {
  it("ESPN public odds emit NO last_update (ESPN exposes no upstream timestamp)", async () => {
    const commenceSoon = new Date(Date.now() + 6 * 3600 * 1000).toISOString();
    const scoreboard = {
      events: [
        {
          id: "401",
          date: commenceSoon,
          competitions: [
            {
              date: commenceSoon,
              status: { type: { state: "pre", completed: false } },
              competitors: [
                { homeAway: "home", team: { displayName: "Washington Nationals" } },
                { homeAway: "away", team: { displayName: "Cincinnati Reds" } },
              ],
            },
          ],
        },
      ],
    };
    // Full payload: h2h + spreads + totals, so every market branch is covered.
    const coreOdds = {
      items: [
        {
          provider: { id: "100", name: "DraftKings" },
          overUnder: 9.5,
          overOdds: -110,
          underOdds: -110,
          awayTeamOdds: {
            moneyLine: 102,
            current: {
              pointSpread: { alternateDisplayValue: "-1.5" },
              spread: { american: "+148" },
              moneyLine: { american: "+102" },
            },
          },
          homeTeamOdds: {
            moneyLine: -110,
            current: {
              pointSpread: { alternateDisplayValue: "+1.5" },
              spread: { american: "-180" },
              moneyLine: { american: "-110" },
            },
          },
        },
      ],
    };

    const fetchImpl = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("scoreboard")) return { ok: true, json: async () => scoreboard } as Response;
      if (u.includes("/odds")) return { ok: true, json: async () => coreOdds } as Response;
      return { ok: false, status: 404 } as Response;
    });

    const res = await fetchEspnOddsForSport("baseball_mlb", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      interEventMs: 0,
    });

    expect(res.events.length).toBeGreaterThan(0);
    const event = res.events[0]!;
    // Sanity: we really did parse all three markets, so this is not vacuous.
    expect(event.bookmakers[0]!.markets.map((m) => m.key).sort()).toEqual([
      "h2h",
      "spreads",
      "totals",
    ]);

    for (const ts of allTimestamps(event)) {
      expect(ts).toBeUndefined();
      expect(looksLikeLocalClock(ts)).toBe(false);
    }
  });

  it("Rundown v1 line blobs emit NO last_update (v1 carries no upstream timestamp)", () => {
    const event = rundownEventToOddsApiEvent(
      {
        event_id: "e1",
        teams: [
          { name: "Kansas City Chiefs", is_home: true },
          { name: "Buffalo Bills", is_away: true },
        ],
        event_date: "2026-09-10T00:00:00Z",
        lines: {
          "3": {
            moneyline: { moneyline_home: -120, moneyline_away: 100 },
            spread: { point: -2.5, spread_home_price: -110, spread_away_price: -110 },
            total: { total: 47.5, total_over: -110, total_under: -110 },
          },
        },
      },
      "americanfootball_nfl",
    );

    expect(event).not.toBeNull();
    const book = event!.bookmakers[0]!;
    // Sanity: all three v1 market branches produced output.
    expect(book.markets.map((m) => m.key).sort()).toEqual(["h2h", "spreads", "totals"]);

    for (const ts of allTimestamps(event!)) {
      expect(ts).toBeUndefined();
      expect(looksLikeLocalClock(ts)).toBe(false);
    }
  });

  it("Rundown v2 keeps the real upstream updated_at and omits it when absent", () => {
    const upstream = "2026-01-14T22:30:00Z";
    const event = rundownEventToOddsApiEvent(
      {
        event_id: "v2-evt",
        event_date: "2026-01-15T00:00:00Z",
        teams: [
          { name: "Los Angeles", is_away: true, is_home: false },
          { name: "Boston", is_away: false, is_home: true },
        ],
        markets: [
          {
            market_id: 1,
            name: "moneyline",
            participants: [
              {
                name: "Los Angeles Lakers",
                lines: [
                  {
                    value: "",
                    prices: {
                      // 19 = draftkings, carries upstream updated_at
                      "19": { price: 150, updated_at: upstream },
                      // 23 = fanduel, upstream omitted the timestamp
                      "23": { price: 155 },
                    },
                  },
                ],
              },
              {
                name: "Boston Celtics",
                lines: [
                  {
                    value: "",
                    prices: {
                      "19": { price: -180, updated_at: upstream },
                      "23": { price: -185 },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      "basketball_nba",
    );

    expect(event).not.toBeNull();
    const dk = event!.bookmakers.find((b) => b.key === "draftkings")!;
    const fd = event!.bookmakers.find((b) => b.key === "fanduel")!;

    // Real upstream timestamp is preserved verbatim.
    expect(dk.last_update).toBe(upstream);
    expect(dk.markets[0]!.last_update).toBe(upstream);

    // Missing upstream timestamp is OMITTED, never backfilled with the local clock.
    expect(fd.last_update).toBeUndefined();
    expect(fd.markets[0]!.last_update).toBeUndefined();
    for (const ts of allTimestamps(event!)) {
      expect(looksLikeLocalClock(ts)).toBe(false);
    }
  });
});

describe("merge path: a free-path thin-fill cannot resurrect a stale game", () => {
  const STALE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

  function stalePrimary(): OddsApiEvent[] {
    const staleIso = new Date(Date.now() - STALE_MS).toISOString();
    const commence = new Date(Date.now() + 6 * 3600 * 1000).toISOString();
    return [
      {
        id: "game-1",
        sport_key: "americanfootball_nfl",
        sport_title: "NFL",
        commence_time: commence,
        home_team: "Kansas City Chiefs",
        away_team: "Buffalo Bills",
        bookmakers: [
          {
            key: "draftkings",
            title: "DraftKings",
            last_update: staleIso,
            markets: [
              {
                key: "h2h",
                last_update: staleIso,
                outcomes: [
                  { name: "Kansas City Chiefs", price: -120 },
                  { name: "Buffalo Bills", price: 100 },
                ],
              },
            ],
          },
        ],
      },
    ];
  }

  it("stale 1-book game thin-filled by a Rundown v1 book stays NOT fresh", () => {
    const primary = stalePrimary();
    const normalizer = new DataNormalizer();

    // Precondition: the game is genuinely stale before the merge.
    expect(
      normalizer.freshGameIds(normalizer.normalizeOdds(primary, new Date())).has("game-1"),
    ).toBe(false);
    // Precondition: it is thin, so process-sport WILL thin-fill it.
    expect(primary[0]!.bookmakers.length).toBeLessThan(THIN_FILL_MIN_BOOKMAKERS);

    const secondary = rundownEventToOddsApiEvent(
      {
        event_id: "rd-1",
        teams: [
          { name: "Kansas City Chiefs", is_home: true },
          { name: "Buffalo Bills", is_away: true },
        ],
        event_date: primary[0]!.commence_time,
        lines: { "3": { moneyline: { moneyline_home: -118, moneyline_away: 102 } } },
      },
      "americanfootball_nfl",
    )!;

    const merged = mergeBookmakersIntoPrimary(primary, [secondary], THIN_FILL_MIN_BOOKMAKERS);

    // The merge DID happen — the game now clears MIN_BOOKMAKERS, so scoring
    // would emit a pick. This is precisely why freshness must not be faked.
    expect(merged.filledGameIds).toContain("game-1");
    expect(merged.events[0]!.bookmakers.length).toBeGreaterThanOrEqual(THIN_FILL_MIN_BOOKMAKERS);

    // THE INVARIANT: the stale game must NOT be resurrected as fresh.
    const fresh = normalizer.freshGameIds(
      normalizer.normalizeOdds(merged.events, new Date()),
    );
    expect(fresh.has("game-1")).toBe(false);

    // And the whole feed correctly reads as stale, so process-sport stops.
    expect(
      normalizer.validateOddsFreshness(normalizer.normalizeOdds(merged.events, new Date())),
    ).toBe(false);
  });

  it("a genuinely fresh upstream secondary book DOES still refresh the game", () => {
    // Guard against over-correcting: real upstream freshness must still count,
    // otherwise this fix would just break the thin-fill feature.
    const primary = stalePrimary();
    const freshIso = new Date(Date.now() - 60_000).toISOString();
    const secondary: OddsApiEvent[] = [
      {
        ...primary[0]!,
        id: "rd-2",
        bookmakers: [
          {
            key: "pinnacle",
            title: "Pinnacle",
            last_update: freshIso,
            markets: [
              {
                key: "h2h",
                last_update: freshIso,
                outcomes: [
                  { name: "Kansas City Chiefs", price: -118 },
                  { name: "Buffalo Bills", price: 102 },
                ],
              },
            ],
          },
        ],
      },
    ];

    const merged = mergeBookmakersIntoPrimary(primary, secondary, THIN_FILL_MIN_BOOKMAKERS);
    const normalizer = new DataNormalizer();
    const fresh = normalizer.freshGameIds(
      normalizer.normalizeOdds(merged.events, new Date()),
    );
    expect(fresh.has("game-1")).toBe(true);
  });
});

describe("normalizer: an absent upstream timestamp is not-provably-fresh", () => {
  it("treats a book with no last_update anywhere as unparseable, not as now", () => {
    const commence = new Date(Date.now() + 6 * 3600 * 1000).toISOString();
    const event: OddsApiEvent = {
      id: "g-no-ts",
      sport_key: "americanfootball_nfl",
      sport_title: "NFL",
      commence_time: commence,
      home_team: "Home",
      away_team: "Away",
      bookmakers: [
        {
          key: "espn_public",
          title: "ESPN/DraftKings",
          markets: [
            {
              key: "h2h",
              outcomes: [
                { name: "Home", price: -120 },
                { name: "Away", price: 100 },
              ],
            },
          ],
        },
      ],
    };

    const normalizer = new DataNormalizer();
    const odds = normalizer.normalizeOdds([event], new Date());
    expect(odds).toHaveLength(1);
    expect(Number.isNaN(odds[0]!.bookmakerLastUpdate.getTime())).toBe(true);
    expect(normalizer.freshGameIds(odds).has("g-no-ts")).toBe(false);
    expect(normalizer.freshnessDiagnostics(odds).unparseableRows).toBe(1);
  });
});
