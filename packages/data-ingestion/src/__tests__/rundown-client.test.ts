import { describe, expect, it } from "vitest";
import {
  composeRundownTeamName,
  resolveRundownApiKey,
  rundownEventToOddsApiEvent,
  RUNDOWN_AFFILIATE_BOOK_KEYS,
  RUNDOWN_SPORT_IDS,
} from "../rundown-client.js";

describe("rundown-client", () => {
  it("maps sport ids from the published V2 sports list (NHL≠NCAAB, MLS≠EPL)", () => {
    expect(RUNDOWN_SPORT_IDS.americanfootball_nfl).toBe(2);
    expect(RUNDOWN_SPORT_IDS.basketball_ncaab).toBe(5);
    expect(RUNDOWN_SPORT_IDS.icehockey_nhl).toBe(6);
    expect(RUNDOWN_SPORT_IDS.soccer_usa_mls).toBe(10);
    expect(RUNDOWN_SPORT_IDS.soccer_epl).toBe(11);
  });

  it("maps documented affiliate IDs to Odds-API book keys", () => {
    expect(RUNDOWN_AFFILIATE_BOOK_KEYS["19"]).toBe("draftkings");
    expect(RUNDOWN_AFFILIATE_BOOK_KEYS["23"]).toBe("fanduel");
    expect(RUNDOWN_AFFILIATE_BOOK_KEYS["22"]).toBe("betmgm");
    expect(RUNDOWN_AFFILIATE_BOOK_KEYS["3"]).toBe("pinnacle");
    expect(RUNDOWN_AFFILIATE_BOOK_KEYS["25"]).toBe("kalshi");
  });

  it("resolves key from env aliases", () => {
    expect(resolveRundownApiKey({ RUNDOWN_API_KEY: " a " })).toBe("a");
    expect(resolveRundownApiKey({ RUNDOWN_KEY: "b" })).toBe("b");
    expect(resolveRundownApiKey({ FREE_RUNDOWN_API_KEY: "c" })).toBe("c");
    expect(resolveRundownApiKey({})).toBe("");
  });

  /**
   * TheRundown splits a team into `name` (city/school) and `mascot`. Reading
   * `name` alone produced city-only board names ("Los Angeles", "St. Louis")
   * that match no other feed — the direct cause of duplicate `games` rows.
   */
  describe("team name composition (name + mascot)", () => {
    it("joins city and mascot, and never invents one that is absent", () => {
      expect(composeRundownTeamName("Los Angeles", "Dodgers")).toBe("Los Angeles Dodgers");
      expect(composeRundownTeamName("St. Louis", "Cardinals")).toBe("St. Louis Cardinals");
      expect(composeRundownTeamName("Athletics", "")).toBe("Athletics");
      expect(composeRundownTeamName("Athletics", undefined)).toBe("Athletics");
      expect(composeRundownTeamName("  Oakland  ", " Athletics ")).toBe("Oakland Athletics");
    });

    it("does not repeat a mascot the name already ends with", () => {
      expect(composeRundownTeamName("Oakland Athletics", "Athletics")).toBe("Oakland Athletics");
      expect(composeRundownTeamName("Athletics", "Athletics")).toBe("Athletics");
    });

    it("keeps whichever half the feed actually sent", () => {
      expect(composeRundownTeamName("", "Dodgers")).toBe("Dodgers");
      expect(composeRundownTeamName("", "")).toBe("");
    });

    it("emits full team names on the event (city-only names are what duplicated rows)", () => {
      const ev = rundownEventToOddsApiEvent(
        {
          event_id: "e2",
          teams: [
            { name: "St. Louis", mascot: "Cardinals", is_away: false },
            { name: "Los Angeles", mascot: "Dodgers", is_away: true },
          ],
          event_date: "2026-09-10T00:00:00Z",
          lines: { "3": { moneyline: { moneyline_home: -120, moneyline_away: 100 } } },
        },
        "baseball_mlb",
      );
      expect(ev!.home_team).toBe("St. Louis Cardinals");
      expect(ev!.away_team).toBe("Los Angeles Dodgers");
      // Outcome names must carry the same composed names as the event.
      expect(ev!.bookmakers[0]!.markets[0]!.outcomes.map((o) => o.name)).toEqual([
        "St. Louis Cardinals",
        "Los Angeles Dodgers",
      ]);
    });
  });

  it("maps moneyline lines to OddsApiEvent with team names", () => {
    const ev = rundownEventToOddsApiEvent(
      {
        event_id: "e1",
        teams: [
          { name: "Kansas City Chiefs", is_away: false },
          { name: "Buffalo Bills", is_away: true },
        ],
        event_date: "2026-09-10T00:00:00Z",
        lines: {
          "3": {
            moneyline: { moneyline_home: -120, moneyline_away: 100 },
          },
        },
      },
      "americanfootball_nfl",
    );
    expect(ev).not.toBeNull();
    expect(ev!.home_team).toBe("Kansas City Chiefs");
    expect(ev!.bookmakers[0]!.key).toBe("pinnacle");
    expect(ev!.bookmakers[0]!.markets[0]!.outcomes[0]!.name).toBe("Kansas City Chiefs");
  });

  it("parses V2 markets[] (the live events endpoint) into named books", () => {
    const ev = rundownEventToOddsApiEvent(
      {
        event_id: "816efd1e5767d7133b5bc70c77173a18",
        event_date: "2026-01-15T00:00:00Z",
        teams: [
          { team_id: 145, name: "Los Angeles", is_away: true, is_home: false },
          { team_id: 153, name: "Boston", is_away: false, is_home: true },
        ],
        markets: [
          {
            market_id: 1,
            name: "moneyline",
            participants: [
              {
                id: 145,
                name: "Los Angeles Lakers",
                lines: [
                  {
                    value: "",
                    prices: {
                      "19": { price: 150, is_main_line: true, updated_at: "2026-01-14T22:30:00Z" },
                      "23": { price: 155, is_main_line: true },
                    },
                  },
                ],
              },
              {
                id: 153,
                name: "Boston Celtics",
                lines: [
                  {
                    value: "",
                    prices: {
                      "19": { price: -180, is_main_line: true, updated_at: "2026-01-14T22:30:00Z" },
                      "23": { price: -185, is_main_line: true },
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
    expect(ev).not.toBeNull();
    const keys = ev!.bookmakers.map((b) => b.key).sort();
    expect(keys).toEqual(["draftkings", "fanduel"]);
    const dk = ev!.bookmakers.find((b) => b.key === "draftkings")!;
    const ml = dk.markets.find((m) => m.key === "h2h")!;
    const home = ml.outcomes.find((o) => o.name === "Boston")!;
    const away = ml.outcomes.find((o) => o.name === "Los Angeles")!;
    expect(home.price).toBe(-180);
    expect(away.price).toBe(150);
  });

  it("drops the 0.0001 off-the-board sentinel", () => {
    const ev = rundownEventToOddsApiEvent(
      {
        event_id: "e-otb",
        teams: [
          { name: "Home", is_home: true },
          { name: "Away", is_away: true },
        ],
        lines: {
          "19": { moneyline: { home: 0.0001, away: 0.0001 } },
        },
      },
      "basketball_nba",
    );
    expect(ev).not.toBeNull();
    expect(ev!.bookmakers).toEqual([]);
  });
});

describe("fetchRundownEventsForSport rate limit", () => {
  it("aborts remaining days on HTTP 429", async () => {
    const { fetchRundownEventsForSport } = await import("../rundown-client.js");
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return new Response("rate", { status: 429 });
    };
    const out = await fetchRundownEventsForSport("americanfootball_nfl", "k", {
      daySpan: 5,
      date: "2026-08-10",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out.events).toEqual([]);
    expect(calls).toBe(1);
    expect(out.error ?? "").toMatch(/429|rate_limited/);
    expect(out.rateLimited).toBe(true);
  });

  it("reports rateLimited=false on a clean empty response (no 429)", async () => {
    const { fetchRundownEventsForSport } = await import("../rundown-client.js");
    const fetchImpl = async () =>
      new Response(JSON.stringify({ events: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    const out = await fetchRundownEventsForSport("americanfootball_nfl", "k", {
      daySpan: 1,
      date: "2026-08-10",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out.rateLimited).toBe(false);
  });
});

describe("GSE-SEC-028: Rundown API key via header, not query string", () => {
  it("does not put the API key in the URL query string", async () => {
    const { fetchRundownEventsForSport } = await import("../rundown-client.js");
    let capturedUrl = "";
    const fetchImpl = async (input: string) => {
      capturedUrl = input;
      return new Response(JSON.stringify({ events: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    await fetchRundownEventsForSport("americanfootball_nfl", "super-secret-key", {
      daySpan: 1,
      date: "2026-08-10",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    // The API key must NOT appear in the query string.
    expect(capturedUrl).not.toContain("super-secret-key");
    expect(capturedUrl).not.toContain("key=");
  });

  it("sends the API key via X-TheRundown-Key header", async () => {
    const { fetchRundownEventsForSport } = await import("../rundown-client.js");
    const headersSent: Record<string, string> = {};
    const fetchImpl = async (_input: string, init?: { headers?: Record<string, string> }) => {
      Object.assign(headersSent, init?.headers ?? {});
      return new Response(JSON.stringify({ events: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    await fetchRundownEventsForSport("americanfootball_nfl", "my-rundown-key", {
      daySpan: 1,
      date: "2026-08-10",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(headersSent["X-TheRundown-Key"]).toBe("my-rundown-key");
  });
});
