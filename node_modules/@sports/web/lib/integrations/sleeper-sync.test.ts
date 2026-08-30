import { describe, it, expect, beforeEach } from "vitest";
import {
  loadSleeperLeagues,
  loadSleeperLeague,
  buildStandings,
  resetSleeperSyncCacheForTests,
} from "./sleeper-sync";
import type { SleeperPlayersMap, SleeperRoster } from "./sleeper";

const PLAYERS: SleeperPlayersMap = {
  "100": { player_id: "100", full_name: "Silas Hart", position: "QB", team: "PHI", injury_status: null },
  "200": { player_id: "200", first_name: "Marcus", last_name: "Vale", position: "RB", team: "ATL", injury_status: "Questionable" },
  "300": { player_id: "300", full_name: "Julian Roe", position: "WR", team: "MIA" },
};

const ROSTERS: SleeperRoster[] = [
  { roster_id: 1, owner_id: "u1", players: ["100", "200", "DEN"], starters: ["100", "DEN"], settings: { wins: 7, losses: 2, fpts: 1200, fpts_decimal: 50 } },
  { roster_id: 2, owner_id: "u2", players: ["300"], starters: ["300"], settings: { wins: 9, losses: 0, fpts: 1400 } },
];

const LEAGUE_USERS = [
  { user_id: "u1", display_name: "Nova", metadata: { team_name: "Nova FC" } },
  { user_id: "u2", display_name: "Rival" },
];

const LEAGUE = { league_id: "L1", name: "Dynasty", season: "2025", total_rosters: 2, status: "in_season", roster_positions: ["QB", "RB", "BN"] };

type Body = unknown;
function ok(body: Body): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

/** Route a Sleeper URL to a fixture. More-specific paths checked first to avoid substring collisions. */
function mockFetcher(overrides: Partial<Record<string, Body>> = {}): (input: string) => Promise<Response> {
  return async (input: string) => {
    const url = String(input);
    if (url.includes("/rosters")) return ok(overrides.rosters ?? ROSTERS);
    if (url.includes("/league/") && url.includes("/users")) return ok(overrides.leagueUsers ?? LEAGUE_USERS);
    if (url.includes("/players/nfl")) return ok(overrides.players ?? PLAYERS);
    if (url.includes("/leagues/nfl/")) return ok(overrides.leagues ?? [LEAGUE]);
    if (/\/league\/[^/]+$/.test(url)) return ok(overrides.league ?? LEAGUE);
    if (url.includes("/user/")) {
      if (url.includes("ghost")) return ok(null); // Sleeper returns null (HTTP 200) for unknown handle
      return ok(overrides.user ?? { user_id: "u1", display_name: "Nova" });
    }
    throw new Error(`unexpected url ${url}`);
  };
}

beforeEach(() => resetSleeperSyncCacheForTests());

describe("loadSleeperLeagues", () => {
  it("resolves a username to its leagues (dropping bench slots)", async () => {
    const r = await loadSleeperLeagues({ username: "nova", season: "2025", fetcher: mockFetcher() });
    expect(r.status).toBe("ok");
    expect(r.user).toEqual({ id: "u1", username: "Nova" });
    expect(r.leagues).toHaveLength(1);
    expect(r.leagues[0]?.rosterPositions).toEqual(["QB", "RB"]);
    expect(r.attribution).toBeTypeOf("string");
    expect(r.readOnlyNote).toContain("never");
  });

  it("returns not-found when Sleeper returns null for the handle", async () => {
    const r = await loadSleeperLeagues({ username: "ghost", season: "2025", fetcher: mockFetcher() });
    expect(r.status).toBe("not-found");
    expect(r.user).toBeNull();
    expect(r.error).toContain("ghost");
  });

  it("returns not-found for an empty username without fetching", async () => {
    const r = await loadSleeperLeagues({ username: "  ", season: "2025", fetcher: async () => { throw new Error("should not fetch"); } });
    expect(r.status).toBe("not-found");
  });

  it("degrades to source-error when the fetch throws", async () => {
    const r = await loadSleeperLeagues({ username: "nova", season: "2025", fetcher: async () => { throw new Error("network down"); } });
    expect(r.status).toBe("source-error");
    expect(r.leagues).toEqual([]);
    expect(r.error).toBe("network down");
  });
});

describe("loadSleeperLeague", () => {
  it("builds ranked standings and resolves the requesting user's roster", async () => {
    const r = await loadSleeperLeague({ leagueId: "L1", userId: "u1", fetcher: mockFetcher() });
    expect(r.status).toBe("ok");
    expect(r.league?.name).toBe("Dynasty");
    expect(r.canPublishPicks).toBe(false);
    expect(r.playerPool).toBe(3);

    // 9-0 outranks 7-2; team name prefers metadata.team_name then display_name
    expect(r.standings.map((s) => [s.rank, s.teamName, s.isYou])).toEqual([
      [1, "Rival", false],
      [2, "Nova FC", true],
    ]);

    // your roster resolves starters/bench with a DST and an injury tag
    expect(r.you?.starters.map((p) => p.id)).toEqual(["100", "DEN"]);
    expect(r.you?.bench.map((p) => p.id)).toEqual(["200"]);
    expect(r.you?.bench[0]?.injury).toBe("Questionable");
  });

  it("returns standings but no roster when userId is omitted", async () => {
    const r = await loadSleeperLeague({ leagueId: "L1", fetcher: mockFetcher() });
    expect(r.status).toBe("ok");
    expect(r.you).toBeNull();
    expect(r.standings).toHaveLength(2);
  });

  it("degrades to source-error when a league fetch throws", async () => {
    const r = await loadSleeperLeague({
      leagueId: "L1",
      userId: "u1",
      fetcher: async (input: string) => {
        if (String(input).includes("/rosters")) throw new Error("rosters 500");
        return ok(LEAGUE);
      },
    });
    expect(r.status).toBe("source-error");
    expect(r.standings).toEqual([]);
    expect(r.you).toBeNull();
  });
});

describe("buildStandings", () => {
  it("ranks by wins then points and flags the requesting user", () => {
    const rows = buildStandings(ROSTERS, LEAGUE_USERS, PLAYERS, "u1");
    expect(rows[0]).toMatchObject({ rank: 1, teamName: "Rival", isYou: false });
    expect(rows[1]).toMatchObject({ rank: 2, teamName: "Nova FC", isYou: true });
  });

  it("labels an unowned roster as a ghost roster", () => {
    const rows = buildStandings(
      [{ roster_id: 9, owner_id: null, players: [], starters: [], settings: { wins: 0, losses: 0 } }],
      [],
      PLAYERS,
      null,
    );
    expect(rows[0]?.teamName).toBe("Ghost roster");
  });
});
