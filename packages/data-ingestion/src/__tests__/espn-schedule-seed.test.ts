import { describe, expect, it } from "vitest";
import {
  ESPN_SCOREBOARD_LIMIT,
  fetchEspnSeedGamesForSport,
  parseEspnScoreboardForSeed,
} from "../espn-schedule-seed.js";

describe("parseEspnScoreboardForSeed", () => {
  it("maps ESPN events to Odds sport keys with espn: external ids", () => {
    const games = parseEspnScoreboardForSeed("ncaaf", {
      events: [
        {
          id: "401628000",
          date: "2026-08-30T16:00Z",
          status: { type: { state: "pre" } },
          competitions: [
            {
              competitors: [
                { homeAway: "home", team: { displayName: "Alabama Crimson Tide" } },
                { homeAway: "away", team: { displayName: "Western Kentucky" } },
              ],
            },
          ],
        },
      ],
    });
    expect(games).toHaveLength(1);
    expect(games[0]!.externalId).toBe("espn:ncaaf:401628000");
    expect(games[0]!.sportKey).toBe("americanfootball_ncaaf");
    expect(games[0]!.homeTeamName).toBe("Alabama Crimson Tide");
    expect(games[0]!.awayTeamName).toBe("Western Kentucky");
    expect(games[0]!.state).toBe("pre");
  });

  it("skips events missing teams or id", () => {
    const games = parseEspnScoreboardForSeed("mlb", {
      events: [{ id: "", date: "2026-08-09T16:00Z" }, { id: "1", date: "bad" }],
    });
    expect(games).toEqual([]);
  });
});

describe("fetchEspnSeedGamesForSport", () => {
  it("requests every scoreboard board with an explicit limit so busy dates never truncate", async () => {
    const urls: string[] = [];
    const fakeFetch = (async (input: string | URL) => {
      urls.push(String(input));
      return { ok: true, json: async () => ({ events: [] }) } as Response;
    }) as unknown as typeof fetch;

    const { error } = await fetchEspnSeedGamesForSport("mlb", {
      fetchImpl: fakeFetch,
      now: new Date("2026-08-21T00:00:00Z"),
      horizonDays: 0,
    });

    expect(error).toBeNull();
    expect(urls.length).toBeGreaterThan(0);
    // Every request — including the undated "now" board — carries the limit.
    for (const url of urls) {
      expect(url).toContain(`limit=${ESPN_SCOREBOARD_LIMIT}`);
    }
    expect(urls.some((url) => !url.includes("dates="))).toBe(true);
    expect(urls.some((url) => url.includes("dates="))).toBe(true);
  });
});
