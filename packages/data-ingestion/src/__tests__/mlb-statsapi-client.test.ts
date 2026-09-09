import { describe, expect, it, vi } from "vitest";
import {
  fetchMlbStandings,
  buildMlbWinPctLookup,
  lookupMlbWinPct,
  fetchMlbCompletedGamesForDate,
  fetchMlbInjuredListMoves,
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

  // Real shapes captured live from statsapi.mlb.com/api/v1/transactions
  // (2026-08-01 sample) — not invented fixtures.
  it("parses injured-list moves and classifies action from real transaction shapes", async () => {
    const payload = {
      transactions: [
        {
          id: 933995,
          person: { id: 694361, fullName: "Will Klein" },
          toTeam: { id: 119, name: "Los Angeles Dodgers" },
          date: "2026-08-01",
          typeCode: "SC",
          typeDesc: "Status Change",
          description:
            "Los Angeles Dodgers placed RHP Will Klein on the 15-day injured list. Right elbow discomfort.",
        },
        {
          id: 933953,
          person: { id: 663604, fullName: "Brandon Lockridge" },
          toTeam: { id: 158, name: "Milwaukee Brewers" },
          date: "2026-08-01",
          typeCode: "SC",
          typeDesc: "Status Change",
          description:
            "Milwaukee Brewers activated LF Brandon Lockridge from the 60-day injured list.",
        },
        {
          id: 933803,
          person: { id: 702474, fullName: "Mike Paredes" },
          toTeam: { id: 142, name: "Minnesota Twins" },
          date: "2026-08-01",
          typeCode: "SC",
          typeDesc: "Status Change",
          description:
            "Minnesota Twins transferred RHP Mike Paredes from the 15-day injured list to the 60-day injured list. Left oblique strain.",
        },
        {
          // Non-IL transaction — must be filtered out.
          id: 933811,
          person: { id: 844379, fullName: "Hunter Kingsbury" },
          toTeam: { id: 6096, name: "Brewster Whitecaps" },
          date: "2026-08-01",
          typeCode: "ASG",
          typeDesc: "Assigned",
          description: "OF Hunter Kingsbury assigned to Brewster Whitecaps.",
        },
      ],
    };
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => payload,
    })) as unknown as typeof fetch;

    const moves = await fetchMlbInjuredListMoves({
      startDate: "2026-08-01",
      endDate: "2026-08-01",
      fetchImpl,
    });

    expect(moves).toHaveLength(3);
    expect(moves[0]!).toMatchObject({
      playerName: "Will Klein",
      teamName: "Los Angeles Dodgers",
      action: "placed",
    });
    expect(moves[1]!.action).toBe("activated");
    expect(moves[2]!.action).toBe("transferred");
  });

  it("soft-fails empty on HTTP error for injured-list moves", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 500,
    })) as unknown as typeof fetch;
    expect(await fetchMlbInjuredListMoves({ fetchImpl })).toEqual([]);
  });
});
