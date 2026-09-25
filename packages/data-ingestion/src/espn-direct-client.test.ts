import { describe, expect, it, vi } from "vitest";
import {
  ESPN_DIRECT_SOURCE_ID,
  ESPN_DIRECT_SITE_HOSTS,
  espnDirectBaseUrl,
  espnDirectEventSummaryPath,
  espnDirectRosterPath,
  espnDirectTeamSchedulePath,
  fetchEspnDirectEventSummary,
  fetchEspnDirectInjuries,
  fetchEspnDirectRoster,
  fetchEspnDirectTeamSchedule,
  fetchEspnDirectTeams,
  parseEspnDirectInjuries,
} from "./espn-direct-client.js";

const NFL_JSON = {
  season: { year: 2026, type: 2, name: "Regular Season" },
  injuries: [
    {
      id: "22",
      displayName: "Arizona Cardinals",
      injuries: [
        {
          id: "639083",
          status: "Questionable",
          date: "2026-09-25T03:06Z",
          shortComment: "Melton (toe) was a limited participant.",
          athlete: { id: "4698113", displayName: "Max Melton" },
        },
      ],
    },
  ],
};

const EVENT_JSON = {
  header: {
    id: "401872932",
    competitions: [{ competitors: [{ team: { id: "2" } }] }],
  },
};

const TEAM_SCHEDULE_JSON = {
  team: { id: "2" },
  events: [{ id: "401872932", date: "2026-09-18T00:15Z" }],
};

const ROSTER_JSON = {
  athletes: [{ id: "4361307", displayName: "Josh Allen" }],
};

const TEAMS_JSON = {
  sports: [{ leagues: [{ teams: [{ team: { id: "2", displayName: "Buffalo Bills" } }] }] }],
};

describe("ESPN direct source", () => {
  it("uses the reachable site.web host first and keeps the legacy host as fallback", () => {
    expect(ESPN_DIRECT_SOURCE_ID).toBe("espn-public-api");
    expect(ESPN_DIRECT_SITE_HOSTS[0]).toContain("site.web.api.espn.com");
    expect(espnDirectBaseUrl("football", "nfl")).toBe(
      "https://site.web.api.espn.com/apis/site/v2/sports/football/nfl",
    );
  });

  it("builds the exact Alexandria-mapped ESPN paths with their distinct identifiers", () => {
    expect(espnDirectEventSummaryPath("football", "nfl", "401872932")).toBe(
      "/apis/site/v2/sports/football/nfl/summary?event=401872932",
    );
    expect(espnDirectTeamSchedulePath("football", "nfl", "2", { season: 2026, limit: 50 })).toBe(
      "/apis/site/v2/sports/football/nfl/teams/2/schedule?season=2026&limit=50",
    );
    expect(espnDirectRosterPath("football", "nfl", "2", { offset: 0, limit: 100 })).toBe(
      "/apis/site/v2/sports/football/nfl/teams/2/roster?offset=0&limit=100",
    );
  });

  it("normalizes the league injury response without inventing missing fields", () => {
    const rows = parseEspnDirectInjuries(NFL_JSON);
    expect(rows).toEqual([
      {
        team: "Arizona Cardinals",
        teamId: "22",
        playerId: "4698113",
        playerName: "Max Melton",
        status: "Questionable",
        detail: "Melton (toe) was a limited participant.",
        date: "2026-09-25T03:06Z",
      },
    ]);
    expect(parseEspnDirectInjuries({ injuries: [{ displayName: "No player" }] })).toEqual([]);
  });

  it("fetches through the first responsive ESPN host and falls back on HTTP failure", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("blocked", { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(NFL_JSON), { status: 200 }));

    const result = await fetchEspnDirectInjuries("nfl", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.sourceId).toBe(ESPN_DIRECT_SOURCE_ID);
    expect(result.rows).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("site.web.api.espn.com");
    expect(String(fetchImpl.mock.calls[1]?.[0])).toContain("site.api.espn.com");
  });

  it("exposes event, team-schedule, roster, and teams responses without cross-source substitution", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(EVENT_JSON), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(TEAM_SCHEDULE_JSON), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(ROSTER_JSON), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(TEAMS_JSON), { status: 200 }));

    const options = { fetchImpl: fetchImpl as unknown as typeof fetch };
    const event = await fetchEspnDirectEventSummary("football", "nfl", "401872932", options);
    const schedule = await fetchEspnDirectTeamSchedule("football", "nfl", "2", options);
    const roster = await fetchEspnDirectRoster("football", "nfl", "2", options);
    const teams = await fetchEspnDirectTeams("football", "nfl", options);

    expect(event.payload).toEqual(EVENT_JSON);
    expect(schedule.payload).toEqual(TEAM_SCHEDULE_JSON);
    expect(roster.payload).toEqual(ROSTER_JSON);
    expect(teams.payload).toEqual(TEAMS_JSON);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("/summary?event=401872932");
    expect(String(fetchImpl.mock.calls[1]?.[0])).toContain("/teams/2/schedule");
    expect(String(fetchImpl.mock.calls[2]?.[0])).toContain("/teams/2/roster");
    expect(String(fetchImpl.mock.calls[3]?.[0])).toContain("/teams");
  });

  it("does not call the network when the source is not ingestible", async () => {
    vi.resetModules();
    vi.doMock("./source-registry.js", async (importOriginal) => ({
      ...(await importOriginal<typeof import("./source-registry.js")>()),
      isIngestible: () => false,
    }));
    const mod = await import("./espn-direct-client.js");
    const fetchImpl = vi.fn();
    const result = await mod.fetchEspnDirectInjuries("nfl", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.rows).toEqual([]);
    expect(result.error).toMatch(/not cleared/);
    expect(fetchImpl).not.toHaveBeenCalled();
    vi.doUnmock("./source-registry.js");
  });
});
