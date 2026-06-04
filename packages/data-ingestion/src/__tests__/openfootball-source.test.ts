import { describe, expect, it, vi } from "vitest";
import {
  OpenFootballError,
  OpenFootballSource,
  computeTeamGoalRates,
  parseOpenFootball,
} from "../openfootball-source";

const SEASON = {
  name: "English Premier League 2023/24",
  matches: [
    { date: "2023-08-11", team1: "Burnley", team2: "Manchester City", score: { ft: [0, 3] } },
    { date: "2023-08-12", team1: "Arsenal", team2: "Nottingham Forest", score: { ft: [2, 1] } },
    { date: "2023-08-12", team1: "Manchester City", team2: "Arsenal", score: { ft: [1, 1] } },
    { date: "2024-05-19", team1: "Arsenal", team2: "Everton", score: {} }, // unplayed → skipped
  ],
} as const;

describe("parseOpenFootball", () => {
  it("normalizes matches and marks unplayed ones", () => {
    const matches = parseOpenFootball(SEASON);
    expect(matches).toHaveLength(4);
    expect(matches[0]).toMatchObject({ home: "Burnley", away: "Manchester City", homeGoals: 0, awayGoals: 3, played: true });
    expect(matches[3]?.played).toBe(false);
  });
});

describe("computeTeamGoalRates", () => {
  it("computes real per-team scored/conceded rates over played matches only", () => {
    const rates = computeTeamGoalRates(parseOpenFootball(SEASON));
    const arsenal = rates.find((r) => r.team === "Arsenal");
    // Arsenal: 2-1 vs Forest, 1-1 at City → 2 games, scored 3 (3/2=1.5), conceded 2 (1.0)
    expect(arsenal).toMatchObject({ games: 2, scoredPerGame: 1.5, concededPerGame: 1 });
    const city = rates.find((r) => r.team === "Manchester City");
    // City: 3-0 at Burnley, 1-1 vs Arsenal → 2 games, scored 4 (2.0), conceded 1 (0.5)
    expect(city).toMatchObject({ games: 2, scoredPerGame: 2, concededPerGame: 0.5 });
  });
});

describe("OpenFootballSource", () => {
  it("builds the correct season URL and returns parsed matches", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(SEASON), { status: 200 }));
    const source = new OpenFootballSource({ fetchImpl });
    const matches = await source.fetchSeason("2023-24", "en.1");
    expect(matches[0]?.home).toBe("Burnley");
    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls[0]?.[0]).toBe(
      "https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/en.1.json",
    );
  });

  it("throws a typed error on a non-2xx response", async () => {
    const fetchImpl = vi.fn(async () => new Response("not found", { status: 404 }));
    const source = new OpenFootballSource({ fetchImpl, maxRetries: 0 });
    await expect(source.fetchSeason("2023-24", "en.1")).rejects.toBeInstanceOf(OpenFootballError);
  });
});
