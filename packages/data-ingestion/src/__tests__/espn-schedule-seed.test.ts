import { describe, expect, it } from "vitest";
import {
  ESPN_SCOREBOARD_LIMIT,
  espnDateKey,
  espnHorizonDateKeys,
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

describe("espnHorizonDateKeys covers every Eastern day in the horizon (C-95)", () => {
  it("asks for every calendar day from today through the horizon, in order, with no gaps", () => {
    // 19:30 ET on 2026-09-08 (23:30Z). A 21-day horizon is 22 Eastern days.
    const keys = espnHorizonDateKeys(new Date("2026-09-08T23:30:00Z"), 21);
    expect(keys).toHaveLength(22);
    expect(keys[0]).toBe("20260908");
    expect(keys[21]).toBe("20260929");
    for (let i = 1; i < keys.length; i += 1) {
      const prev = Date.UTC(Number(keys[i - 1]!.slice(0, 4)), Number(keys[i - 1]!.slice(4, 6)) - 1, Number(keys[i - 1]!.slice(6, 8)));
      const cur = Date.UTC(Number(keys[i]!.slice(0, 4)), Number(keys[i]!.slice(4, 6)) - 1, Number(keys[i]!.slice(6, 8)));
      expect(cur - prev).toBe(24 * 60 * 60 * 1000);
    }
  });

  it("files a late-evening ET run under the Eastern day, not the rolled-over UTC day", () => {
    // 22:00 ET on 2026-09-08 is 02:00Z on the 9th. Sunday Night Football and a
    // West Coast MLB game on the 8th still live under dates=20260908.
    const keys = espnHorizonDateKeys(new Date("2026-09-09T02:00:00Z"), 2);
    expect(keys).toEqual(["20260908", "20260909", "20260910"]);
    expect(espnDateKey(new Date("2026-09-09T02:00:00Z"))).toBe("20260908");
  });

  it("neither repeats nor skips a day across the fall DST change", () => {
    // 00:30 EDT on 2026-10-31 (04:30Z). DST ends 2026-11-01, so the 3-day
    // horizon instant is 23:30 EST on Nov 2: three Eastern days, each once. A
    // naive `now + i * 24h` walk would have produced Oct 31, Oct 31, Nov 1, Nov 2.
    const keys = espnHorizonDateKeys(new Date("2026-10-31T04:30:00Z"), 3);
    expect(keys).toEqual(["20261031", "20261101", "20261102"]);
  });

  it("neither repeats nor skips a day across the spring DST change", () => {
    // 23:30 EST on 2027-03-13 (04:30Z on the 14th). DST starts 2027-03-14, so
    // the 3-day horizon instant is 00:30 EDT on Mar 17: five Eastern days, no
    // gap. A naive `now + i * 24h` walk would have skipped Mar 14.
    const keys = espnHorizonDateKeys(new Date("2027-03-14T04:30:00Z"), 3);
    expect(keys).toEqual(["20270313", "20270314", "20270315", "20270316", "20270317"]);
  });

  it("a zero-day horizon still asks for today", () => {
    expect(espnHorizonDateKeys(new Date("2026-09-08T15:00:00Z"), 0)).toEqual(["20260908"]);
  });

  it("the seed fetch requests the undated board plus one page per Eastern day", async () => {
    const urls: string[] = [];
    const fetchImpl = (async (input: string | URL | Request) => {
      urls.push(String(input));
      return new Response(JSON.stringify({ events: [] }), { status: 200 });
    }) as typeof fetch;
    await fetchEspnSeedGamesForSport("nfl", { fetchImpl, now: new Date("2026-09-08T23:30:00Z"), horizonDays: 6 });
    const dated = urls.map((u) => new URL(u).searchParams.get("dates")).filter((d): d is string => d !== null);
    expect(urls).toHaveLength(8);
    expect(dated).toEqual(["20260908", "20260909", "20260910", "20260911", "20260912", "20260913", "20260914"]);
  });
});
