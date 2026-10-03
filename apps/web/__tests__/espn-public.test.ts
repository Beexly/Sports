import { describe, it, expect } from "vitest";
import {
  fetchEspnScoreboard,
  fetchEspnTeams,
  fetchEspnRoster,
  NFL_TEAM_IDS,
  ESPN_CACHE_TTL,
} from "@/lib/data-sources/espn-public";

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function mockFetcher(data: unknown, status = 200) {
  return async (_url: string) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });
}

function failingFetcher(): (_url: string) => Promise<never> {
  return async () => { throw new Error("Network failure"); };
}

const SAMPLE_SCOREBOARD = {
  events: [
    {
      id: "401547439",
      date: "2026-09-07T17:00Z",
      name: "Kansas City Chiefs at Baltimore Ravens",
      shortName: "KC @ BAL",
      status: { type: { state: "pre" } },
      competitions: [
        {
          competitors: [
            {
              homeAway: "home",
              team: { id: "33", displayName: "Baltimore Ravens", abbreviation: "BAL" },
              score: "0",
              records: [{ summary: "0-0" }],
            },
            {
              homeAway: "away",
              team: { id: "12", displayName: "Kansas City Chiefs", abbreviation: "KC" },
              score: "0",
              records: [{ summary: "0-0" }],
            },
          ],
        },
      ],
    },
  ],
};

const SAMPLE_TEAMS = {
  sports: [
    {
      leagues: [
        {
          teams: [
            {
              team: {
                id: "12",
                abbreviation: "KC",
                displayName: "Kansas City Chiefs",
                shortDisplayName: "Chiefs",
                location: "Kansas City",
                color: "e31837",
              },
            },
          ],
        },
      ],
    },
  ],
};

const SAMPLE_ROSTER = {
  team: { displayName: "Kansas City Chiefs" },
  athletes: [
    {
      items: [
        {
          id: "3139477",
          fullName: "Patrick Mahomes",
          position: { abbreviation: "QB" },
          jersey: "15",
          status: { type: "active" },
        },
      ],
    },
  ],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ESPN Public API Adapter", () => {
  describe("fetchEspnScoreboard", () => {
    it("returns games array on success", async () => {
      const result = await fetchEspnScoreboard("football", "nfl", mockFetcher(SAMPLE_SCOREBOARD));
      expect(result.ok === false ? result : result.games).toBeDefined();
      if (result.ok !== false) {
        expect(result.games).toHaveLength(1);
        expect(result.source).toBe("espn-public");
        expect(result.dataQuality).toBe("fallback");
      }
    });

    it("parses game home/away teams correctly", async () => {
      const result = await fetchEspnScoreboard("football", "nfl", mockFetcher(SAMPLE_SCOREBOARD));
      if ("games" in result) {
        const game = result.games[0]!;
        expect(game.home.abbreviation).toBe("BAL");
        expect(game.away.abbreviation).toBe("KC");
        expect(game.status).toBe("pre");
        expect(game.name).toBe("Kansas City Chiefs at Baltimore Ravens");
      }
    });

    it("returns error on network failure", async () => {
      const result = await fetchEspnScoreboard("football", "nfl", failingFetcher());
      expect(result.ok).toBe(false);
      if (!("games" in result)) {
        expect(result.status).toBe("network-error");
        expect(result.source).toBe("espn-public");
        expect(result.dataQuality).toBe("fallback");
      }
    });

    it("returns error on HTTP 429", async () => {
      const result = await fetchEspnScoreboard("football", "nfl", mockFetcher({}, 429));
      expect(result.ok === false && result.status).toBe(429);
    });

    it("returns empty games array when events is missing", async () => {
      const result = await fetchEspnScoreboard("football", "nfl", mockFetcher({}));
      if ("games" in result) {
        expect(result.games).toHaveLength(0);
      }
    });

    it("includes cache TTL", async () => {
      const result = await fetchEspnScoreboard("football", "nfl", mockFetcher(SAMPLE_SCOREBOARD));
      if ("games" in result) {
        expect(result.cacheMaxAgeSeconds).toBe(ESPN_CACHE_TTL.scoreboard);
      }
    });
  });

  describe("fetchEspnTeams", () => {
    it("returns teams array on success", async () => {
      const result = await fetchEspnTeams("football", "nfl", mockFetcher(SAMPLE_TEAMS));
      if ("teams" in result) {
        expect(result.teams).toHaveLength(1);
        expect(result.teams[0]!.abbreviation).toBe("KC");
        expect(result.teams[0]!.displayName).toBe("Kansas City Chiefs");
        expect(result.dataQuality).toBe("fallback");
        expect(result.source).toBe("espn-public");
      }
    });

    it("returns error on network failure", async () => {
      const result = await fetchEspnTeams("football", "nfl", failingFetcher());
      expect(result.ok).toBe(false);
    });

    it("returns empty teams array when structure is missing", async () => {
      const result = await fetchEspnTeams("football", "nfl", mockFetcher({}));
      if ("teams" in result) {
        expect(result.teams).toHaveLength(0);
      }
    });
  });

  describe("fetchEspnRoster", () => {
    it("returns roster on success", async () => {
      const result = await fetchEspnRoster("football", "nfl", "12", mockFetcher(SAMPLE_ROSTER));
      if ("players" in result) {
        expect(result.players).toHaveLength(1);
        expect(result.players[0]!.fullName).toBe("Patrick Mahomes");
        expect(result.players[0]!.position).toBe("QB");
        expect(result.players[0]!.jerseyNumber).toBe("15");
        expect(result.teamName).toBe("Kansas City Chiefs");
        expect(result.teamId).toBe("12");
      }
    });

    it("returns error on network failure", async () => {
      const result = await fetchEspnRoster("football", "nfl", "12", failingFetcher());
      expect(result.ok).toBe(false);
    });
  });

  describe("constants", () => {
    it("NFL_TEAM_IDS has 32 teams", () => {
      expect(Object.keys(NFL_TEAM_IDS)).toHaveLength(32);
    });

    it("NFL_TEAM_IDS has KC mapped", () => {
      expect(NFL_TEAM_IDS.KC).toBe("12");
    });

    it("ESPN_CACHE_TTL scoreboard is shorter than teams", () => {
      expect(ESPN_CACHE_TTL.scoreboard).toBeLessThan(ESPN_CACHE_TTL.teams);
    });
  });
});
