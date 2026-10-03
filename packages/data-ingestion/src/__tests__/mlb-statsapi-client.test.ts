import { describe, expect, it, vi } from "vitest";
import {
  fetchMlbStandings,
  buildMlbWinPctLookup,
  lookupMlbWinPct,
  fetchMlbCompletedGamesForDate,
} from "../mlb-statsapi-client.js";

describe("mlb-statsapi-client", () => {
  it("parses standings into winPct rows", async () => {
    const payload = {
      records: [
        {
          teamRecords: [
            {
              wins: 71,
              losses: 46,
              winningPercentage: ".607",
              team: { id: 139, name: "Tampa Bay Rays", abbreviation: "TB" },
            },
            {
              wins: 50,
              losses: 67,
              winningPercentage: ".427",
              team: {
                id: 120,
                name: "Washington Nationals",
                abbreviation: "WSH",
              },
            },
          ],
        },
      ],
    };
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => payload,
    })) as unknown as typeof fetch;

    const rows = await fetchMlbStandings({ season: 2026, fetchImpl });
    expect(rows).toHaveLength(2);
    expect(rows[0]!.winPct).toBeCloseTo(0.607, 3);

    const lookup = buildMlbWinPctLookup(rows);
    expect(lookupMlbWinPct(lookup, "Tampa Bay Rays")).toBeCloseTo(0.607, 3);
    expect(lookupMlbWinPct(lookup, "Washington Nationals")).toBeCloseTo(
      0.427,
      3,
    );
  });

  it("soft-fails empty on HTTP error", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 500,
    })) as unknown as typeof fetch;
    expect(await fetchMlbStandings({ fetchImpl })).toEqual([]);
  });

  it("parses completed schedule finals only", async () => {
    const payload = {
      dates: [
        {
          games: [
            {
              gamePk: 1,
              gameDate: "2026-08-09T16:15:00Z",
              status: { abstractGameState: "Final" },
              teams: {
                home: {
                  team: { name: "Washington Nationals" },
                  score: 5,
                },
                away: {
                  team: { name: "Cincinnati Reds" },
                  score: 3,
                },
              },
            },
            {
              gamePk: 2,
              gameDate: "2026-08-09T23:00:00Z",
              status: { abstractGameState: "Live" },
              teams: {
                home: { team: { name: "A" }, score: 1 },
                away: { team: { name: "B" }, score: 1 },
              },
            },
          ],
        },
      ],
    };
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => payload,
    })) as unknown as typeof fetch;
    const games = await fetchMlbCompletedGamesForDate("2026-08-09", {
      fetchImpl,
    });
    expect(games).toHaveLength(1);
    expect(games[0]!.homeScore).toBe(5);
    expect(games[0]!.awayTeam).toBe("Cincinnati Reds");
  });
});
