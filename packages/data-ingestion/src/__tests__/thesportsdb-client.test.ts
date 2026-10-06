import { describe, expect, it, vi } from "vitest";
import {
  fetchSportsDbNflTeams,
  fetchSportsDbNflSeasonEvents,
  fetchSportsDbTeamPlayers,
  buildSportsDbTeamLookup,
  lookupSportsDbTeam,
  currentSportsDbSeason,
  SPORTSDB_NFL_LEAGUE_ID,
  resetSportsDbThrottleForTests,
} from "../thesportsdb-client.js";

function mockFetch(payload: unknown, ok = true) {
  const fn = vi.fn(
    async (
      _input: string | URL | Request,
      _init?: RequestInit,
    ): Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> => ({
      ok,
      status: ok ? 200 : 500,
      json: async () => payload,
    }),
  );
  return { fn, fetchImpl: fn as unknown as typeof fetch };
}

const teamPayload = {
  teams: [
    {
      idTeam: "134946",
      idESPN: "22",
      idAPIfootball: "11",
      strTeam: "Arizona Cardinals",
      strTeamShort: "ARI",
      strTeamAlternate: "Cardinals",
      strLeague: "NFL",
      strStadium: "State Farm Stadium",
      strLocation: "Glendale, Arizona",
      intFormedYear: "1898",
      strColour1: "#97233F",
      strBadge: "https://r2.thesportsdb.com/images/media/team/badge/x.png",
      strLogo: "https://r2.thesportsdb.com/images/media/team/logo/y.png",
    },
    {
      idTeam: "134942",
      idESPN: null,
      idAPIfootball: "8",
      strTeam: "Atlanta Falcons",
      strTeamShort: "ATL",
      strTeamAlternate: "Falcons",
      strLeague: "NFL",
      strStadium: "Mercedes-Benz Stadium",
      strLocation: "Atlanta, Georgia",
      intFormedYear: "1965",
      strColour1: "",
      strBadge: null,
      strLogo: null,
    },
    // malformed row: skipped
    { idTeam: "", strTeam: "" },
  ],
};

const eventPayload = {
  events: [
    {
      idEvent: "2326400",
      strSeason: "2026-2027",
      intRound: "2",
      strHomeTeam: "Houston Texans",
      strAwayTeam: "Cincinnati Bengals",
      idHomeTeam: "134930",
      idAwayTeam: "134918",
      dateEvent: "2026-09-20",
      strTimestamp: "2026-09-20T18:00:00",
      intHomeScore: null,
      intAwayScore: null,
    },
    {
      idEvent: "2326401",
      strSeason: "2026-2027",
      intRound: "1",
      strHomeTeam: "Baltimore Ravens",
      strAwayTeam: "Buffalo Bills",
      idHomeTeam: "134922",
      idAwayTeam: "134918",
      dateEvent: "2026-09-10",
      strTimestamp: "2026-09-11T00:15:00",
      intHomeScore: "24",
      intAwayScore: "17",
    },
  ],
};

const playerPayload = {
  player: [
    {
      idPlayer: "34145937",
      strPlayer: "C.J. Stroud",
      strTeam: "Houston Texans",
      strPosition: "Quarterback",
      strNationality: "United States",
      strHeight: "6 ft 3 in",
      strWeight: "218 lbs",
      dateBorn: "2001-10-03",
      strThumb: "https://r2.thesportsdb.com/images/media/player/thumb/z.png",
    },
  ],
};

describe("thesportsdb-client", () => {
  it("exposes the NFL league id constant", () => {
    expect(SPORTSDB_NFL_LEAGUE_ID).toBe("4391");
  });

  it("parses NFL teams incl. crosswalk ids and skips malformed rows", async () => {
    resetSportsDbThrottleForTests();
    const teams = await fetchSportsDbNflTeams({
      fetchImpl: mockFetch(teamPayload).fetchImpl,
      minIntervalMs: 0,
    });
    expect(teams).toHaveLength(2);
    expect(teams[0]).toMatchObject({
      idTeam: "134946",
      espnId: "22",
      apiFootballId: "11",
      name: "Arizona Cardinals",
      short: "ARI",
      alternate: "Cardinals",
      stadium: "State Farm Stadium",
      location: "Glendale, Arizona",
      formedYear: "1898",
      colorPrimary: "#97233F",
    });
    // null/empty crosswalk fields normalize to null
    expect(teams[1]).toMatchObject({ name: "Atlanta Falcons", espnId: null });
    expect(teams[1]!.badgeUrl).toBeNull();
  });

  it("calls the public free-tier endpoint shape", async () => {
    resetSportsDbThrottleForTests();
    const { fn, fetchImpl } = mockFetch(teamPayload);
    await fetchSportsDbNflTeams({ fetchImpl, minIntervalMs: 0 });
    const url = String(fn.mock.calls[0]![0]);
    expect(url).toContain("thesportsdb.com/api/v1/json/3/search_all_teams.php?l=NFL");
  });

  it("parses season events with scores and week", async () => {
    resetSportsDbThrottleForTests();
    const events = await fetchSportsDbNflSeasonEvents({
      season: "2026-2027",
      fetchImpl: mockFetch(eventPayload).fetchImpl,
      minIntervalMs: 0,
    });
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      idEvent: "2326400",
      week: 2,
      homeTeam: "Houston Texans",
      awayTeam: "Cincinnati Bengals",
      homeScore: null,
      awayScore: null,
      date: "2026-09-20",
    });
    expect(events[1]).toMatchObject({
      week: 1,
      homeScore: 24,
      awayScore: 17,
    });
  });

  it("soft-fails empty when upstream returns events:null", async () => {
    resetSportsDbThrottleForTests();
    // Observed live 2026-09-18 for eventsseason.php?id=4391&s=2026-2027
    const events = await fetchSportsDbNflSeasonEvents({
      season: "2026-2027",
      fetchImpl: mockFetch({ events: null }).fetchImpl,
      minIntervalMs: 0,
    });
    expect(events).toEqual([]);
  });

  it("soft-fails empty on HTTP error", async () => {
    resetSportsDbThrottleForTests();
    expect(
      await fetchSportsDbNflTeams({ fetchImpl: mockFetch({}, false).fetchImpl, minIntervalMs: 0 }),
    ).toEqual([]);
    expect(
      await fetchSportsDbNflSeasonEvents({
        fetchImpl: mockFetch({}, false).fetchImpl,
        minIntervalMs: 0,
      }),
    ).toEqual([]);
  });

  it("soft-fails empty on fetch throw", async () => {
    resetSportsDbThrottleForTests();
    const fetchImpl = vi.fn(async () => {
      throw new Error("boom");
    }) as unknown as typeof fetch;
    expect(
      await fetchSportsDbTeamPlayers({
        teamName: "Houston Texans",
        fetchImpl,
        minIntervalMs: 0,
      }),
    ).toEqual([]);
  });

  it("parses team player bios", async () => {
    resetSportsDbThrottleForTests();
    const players = await fetchSportsDbTeamPlayers({
      teamName: "Houston Texans",
      fetchImpl: mockFetch(playerPayload).fetchImpl,
      minIntervalMs: 0,
    });
    expect(players).toHaveLength(1);
    expect(players[0]).toMatchObject({
      name: "C.J. Stroud",
      team: "Houston Texans",
      position: "Quarterback",
      bornDate: "2001-10-03",
    });
  });

  it("builds and resolves the team lookup by name, short, and alternate", async () => {
    resetSportsDbThrottleForTests();
    const teams = await fetchSportsDbNflTeams({
      fetchImpl: mockFetch(teamPayload).fetchImpl,
      minIntervalMs: 0,
    });
    const lookup = buildSportsDbTeamLookup(teams);
    expect(lookupSportsDbTeam(lookup, "Arizona Cardinals")?.idTeam).toBe("134946");
    expect(lookupSportsDbTeam(lookup, "ari")?.idTeam).toBe("134946");
    expect(lookupSportsDbTeam(lookup, "Cardinals")?.idTeam).toBe("134946");
    expect(lookupSportsDbTeam(lookup, "Atlanta")?.idTeam).toBe("134942");
    expect(lookupSportsDbTeam(lookup, "Chicago Bears")).toBeNull();
    expect(lookupSportsDbTeam(lookup, "")).toBeNull();
  });

  it("computes the current SportsDB season label across the Aug boundary", () => {
    expect(currentSportsDbSeason(new Date("2026-09-18T00:00:00Z"))).toBe("2026-2027");
    expect(currentSportsDbSeason(new Date("2027-02-10T00:00:00Z"))).toBe("2026-2027");
    expect(currentSportsDbSeason(new Date("2027-07-31T00:00:00Z"))).toBe("2026-2027");
    expect(currentSportsDbSeason(new Date("2027-08-01T00:00:00Z"))).toBe("2027-2028");
  });
});
