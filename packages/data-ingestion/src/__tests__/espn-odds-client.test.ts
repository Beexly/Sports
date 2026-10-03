import { describe, expect, it, vi } from "vitest";
import { fetchEspnOddsForSport } from "../espn-odds-client.js";
import type { OddsApiBookmaker } from "@sports/types";

// Clearance seam: the keyless path runs only under the "galaxy-espn-inline"
// registry entry. GALAXY_CLEARED lets one test pin the fail-closed behaviour
// when that entry is revoked; every other test uses the real registry.
let GALAXY_CLEARED = true;
vi.mock("../source-registry.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../source-registry.js")>();
  return {
    ...actual,
    isIngestible: (id: string) =>
      id === "galaxy-espn-inline" ? GALAXY_CLEARED && actual.isIngestible(id) : actual.isIngestible(id),
  };
});

const commenceSoon = () => new Date(Date.now() + 6 * 3600 * 1000).toISOString();

/** One ESPN scoreboard event with an inline DraftKings odds block. */
function inlineScoreboard(oddsBlock: Record<string, unknown>, id = "401873298") {
  const when = commenceSoon();
  return {
    events: [
      {
        id,
        date: when,
        competitions: [
          {
            date: when,
            status: { type: { state: "pre", completed: false } },
            competitors: [
              { homeAway: "home", team: { displayName: "Buffalo Bills", abbreviation: "BUF" } },
              { homeAway: "away", team: { displayName: "Pittsburgh Steelers", abbreviation: "PIT" } },
            ],
            odds: [{ provider: { name: "DraftKings" }, ...oddsBlock }],
          },
        ],
      },
    ],
  };
}

const ML_ONLY = {
  moneyline: { home: { close: { odds: "-146" } }, away: { close: { odds: "+122" } } },
};

function scoreboardOnlyFetch(board: unknown) {
  return vi.fn(async (url: string) =>
    String(url).includes("scoreboard")
      ? ({ ok: true, json: async () => board } as Response)
      : ({ ok: false, status: 404 } as Response),
  );
}

describe("fetchEspnOddsForSport", () => {
  it("maps scoreboard + core odds into OddsApiEvent (h2h required)", async () => {
    // The client drops events outside -6h..+21d of real now, so a fixed
    // fixture date ages out of the window and silently empties events.
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
                {
                  homeAway: "home",
                  team: { displayName: "Washington Nationals" },
                },
                {
                  homeAway: "away",
                  team: { displayName: "Cincinnati Reds" },
                },
              ],
            },
          ],
        },
      ],
    };
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
      if (u.includes("scoreboard")) {
        return {
          ok: true,
          json: async () => scoreboard,
        } as Response;
      }
      if (u.includes("/odds")) {
        return {
          ok: true,
          json: async () => coreOdds,
        } as Response;
      }
      return { ok: false, status: 404 } as Response;
    });

    const res = await fetchEspnOddsForSport("baseball_mlb", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      interEventMs: 0,
    });
    expect(res.provider).toBe("espn_public");
    expect(res.events.length).toBe(1);
    const ev = res.events[0]!;
    expect(ev.home_team).toBe("Washington Nationals");
    expect(ev.away_team).toBe("Cincinnati Reds");
    expect(ev.bookmakers[0]!.key).toBe("espn_public");
    const keys = ev.bookmakers[0]!.markets.map((m) => m.key);
    expect(keys).toContain("h2h");
    expect(keys).toContain("spreads");
    expect(keys).toContain("totals");
    const h2h = ev.bookmakers[0]!.markets.find((m) => m.key === "h2h")!;
    expect(h2h.outcomes).toHaveLength(2);
  });

  it("soft-fails empty for unmapped sport (never invents)", async () => {
    const res = await fetchEspnOddsForSport("unknown_sport_xyz");
    expect(res.events).toEqual([]);
    expect(res.error).toMatch(/no sport map/i);
  });

  it("soft-fails when scoreboard HTTP fails", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 503 }) as Response);
    const res = await fetchEspnOddsForSport("baseball_mlb", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(res.events).toEqual([]);
    expect(res.error).toMatch(/HTTP 503/);
  });

  it("hits site.web.api.espn.com first (Galaxy keyless host — site.api / core are blocked from some hosts)", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 503 }) as Response);
    await fetchEspnOddsForSport("americanfootball_nfl", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const urls = fetchImpl.mock.calls.map((c) => String(c.at(0) ?? ""));
    expect(urls.at(0)).toContain("site.web.api.espn.com");
    expect(urls.at(0)).toContain("/football/nfl/scoreboard");
    // Every request carries a timeout signal (blackholed hosts fail fast).
    const init = fetchImpl.mock.calls[0]?.at(1) as { signal?: unknown } | undefined;
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("maps INLINE scoreboard odds (Galaxy formula) without a core /odds call; points without prices stay unpriced", async () => {
    const fetchImpl = scoreboardOnlyFetch(inlineScoreboard({ ...ML_ONLY, spread: -3.0, overUnder: 34.5 }));
    const res = await fetchEspnOddsForSport("americanfootball_nfl", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      interEventMs: 0,
    });
    expect(res.events).toHaveLength(1);
    const coreCalls = fetchImpl.mock.calls.filter((c) => String(c[0]).includes("sports.core.api.espn.com"));
    expect(coreCalls).toHaveLength(0);
    const markets = res.events[0]!.bookmakers[0]!.markets;
    const h2h = markets.find((m) => m.key === "h2h")!;
    expect(h2h.outcomes.map((o) => o.price)).toEqual(expect.arrayContaining([-146, 122]));
    const bufH2h = h2h.outcomes.find((o) => o.name.includes("Bills"));
    const pitH2h = h2h.outcomes.find((o) => o.name.includes("Steelers"));
    expect(bufH2h?.fair_prob).toBeGreaterThan(0.5);
    expect(pitH2h?.fair_prob).toBeLessThan(0.5);
    expect((bufH2h?.fair_prob ?? 0) + (pitH2h?.fair_prob ?? 0)).toBeCloseTo(1, 3);
    const spreads = markets.find((m) => m.key === "spreads")!;
    // Exact full names — the normalizer matches spreads outcomes against
    // event.home_team/away_team, so abbreviations here would zero the row.
    const buf = spreads.outcomes.find((o) => o.name === "Buffalo Bills");
    const pit = spreads.outcomes.find((o) => o.name === "Pittsburgh Steelers");
    expect(buf?.point).toBe(-3);
    expect(pit?.point).toBe(3);
    // No American price on the scoreboard → no price. Never a faked -110.
    expect(buf?.price).toBeUndefined();
    expect(pit?.price).toBeUndefined();
    const totals = markets.find((m) => m.key === "totals")!;
    expect(totals.outcomes.map((o) => o.point)).toEqual([34.5, 34.5]);
    expect(totals.outcomes.every((o) => o.price === undefined)).toBe(true);
  });

  it("carries REAL inline spread/total prices when ESPN publishes them (close line odds, then team spreadOdds)", async () => {
    const fetchImpl = scoreboardOnlyFetch(
      inlineScoreboard({
        ...ML_ONLY,
        spread: -3.0,
        overUnder: 34.5,
        pointSpread: { home: { close: { line: "-3", odds: "-112" } }, away: { close: { line: "+3", odds: "-108" } } },
        total: { over: { close: { line: "o34.5", odds: "-105" } }, under: { close: { line: "u34.5", odds: "-115" } } },
      }),
    );
    const res = await fetchEspnOddsForSport("americanfootball_nfl", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      interEventMs: 0,
    });
    const markets = res.events[0]!.bookmakers[0]!.markets;
    const spreads = markets.find((m) => m.key === "spreads")!;
    expect(spreads.outcomes.find((o) => o.name === "Buffalo Bills")).toMatchObject({ point: -3, price: -112 });
    expect(spreads.outcomes.find((o) => o.name === "Pittsburgh Steelers")).toMatchObject({ point: 3, price: -108 });
    const totals = markets.find((m) => m.key === "totals")!;
    expect(totals.outcomes.find((o) => o.name === "Over")).toMatchObject({ point: 34.5, price: -105 });
    expect(totals.outcomes.find((o) => o.name === "Under")).toMatchObject({ point: 34.5, price: -115 });

    // Legacy team-odds shape: homeTeamOdds.spreadOdds / awayTeamOdds.spreadOdds.
    const legacy = scoreboardOnlyFetch(
      inlineScoreboard({ ...ML_ONLY, spread: -3.0, homeTeamOdds: { spreadOdds: -110 }, awayTeamOdds: { spreadOdds: -110 } }),
    );
    const res2 = await fetchEspnOddsForSport("americanfootball_nfl", {
      fetchImpl: legacy as unknown as typeof fetch,
      interEventMs: 0,
    });
    const spreads2 = res2.events[0]!.bookmakers[0]!.markets.find((m) => m.key === "spreads")!;
    expect(spreads2.outcomes.every((o) => o.price === -110)).toBe(true);
  });

  it("skips an inline block with a one-sided moneyline (falls to core /odds, never invents the other side)", async () => {
    const fetchImpl = scoreboardOnlyFetch(inlineScoreboard({ moneyline: { home: { close: { odds: "-146" } } } }));
    const res = await fetchEspnOddsForSport("americanfootball_nfl", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      interEventMs: 0,
    });
    expect(res.events).toEqual([]);
    const coreCalls = fetchImpl.mock.calls.filter((c) => String(c[0]).includes("sports.core.api.espn.com"));
    expect(coreCalls).toHaveLength(1);
  });

  it("attaches a second real bookmaker from the secondBook seam with the ESPN abbreviations and full names", async () => {
    const fetchImpl = scoreboardOnlyFetch(inlineScoreboard(ML_ONLY));
    const kalshiBook: OddsApiBookmaker = {
      key: "kalshi",
      title: "Kalshi (exchange)",
      last_update: "2026-09-04T15:00:00.000Z",
      markets: [
        {
          key: "h2h",
          last_update: "2026-09-04T15:00:00.000Z",
          outcomes: [
            { name: "Pittsburgh Steelers", price: 138 },
            { name: "Buffalo Bills", price: -150 },
          ],
        },
      ],
    };
    const secondBook = { bookmakerFor: vi.fn(async () => kalshiBook) };
    const res = await fetchEspnOddsForSport("americanfootball_nfl", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      interEventMs: 0,
      secondBook,
    });
    expect(secondBook.bookmakerFor).toHaveBeenCalledWith({
      sportKey: "americanfootball_nfl",
      commenceTime: res.events[0]!.commence_time,
      homeAbbr: "BUF",
      awayAbbr: "PIT",
      homeTeam: "Buffalo Bills",
      awayTeam: "Pittsburgh Steelers",
    });
    const books = res.events[0]!.bookmakers;
    expect(books.map((b) => b.key)).toEqual(["espn_public", "kalshi"]);
    expect(books[1]!.last_update).toBe("2026-09-04T15:00:00.000Z");
  });

  it("keeps the ESPN book when the second book throws or has no quote (soft miss, never breaks the board)", async () => {
    const throwing = { bookmakerFor: vi.fn(async () => { throw new Error("exchange down"); }) };
    const res = await fetchEspnOddsForSport("americanfootball_nfl", {
      fetchImpl: scoreboardOnlyFetch(inlineScoreboard(ML_ONLY, "401873299")) as unknown as typeof fetch,
      interEventMs: 0,
      secondBook: throwing,
    });
    expect(res.events).toHaveLength(1);
    expect(res.events[0]!.bookmakers.map((b) => b.key)).toEqual(["espn_public"]);
    expect(res.error).toMatch(/second-book/);

    const silent = { bookmakerFor: vi.fn(async () => null) };
    const res2 = await fetchEspnOddsForSport("americanfootball_nfl", {
      fetchImpl: scoreboardOnlyFetch(inlineScoreboard(ML_ONLY, "401873300")) as unknown as typeof fetch,
      interEventMs: 0,
      secondBook: silent,
    });
    expect(res2.events[0]!.bookmakers.map((b) => b.key)).toEqual(["espn_public"]);
    expect(res2.error).toBeUndefined();
  });

  it("fails closed with no network call when the galaxy-espn-inline registry entry is not ingestible", async () => {
    GALAXY_CLEARED = false;
    try {
      const fetchImpl = scoreboardOnlyFetch(inlineScoreboard(ML_ONLY));
      const res = await fetchEspnOddsForSport("americanfootball_nfl", {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
      expect(res.events).toEqual([]);
      expect(res.error).toMatch(/not cleared \(galaxy-espn-inline\)/);
      expect(fetchImpl).not.toHaveBeenCalled();
    } finally {
      GALAXY_CLEARED = true;
    }
  });
});
