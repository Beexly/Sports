import { describe, expect, it, vi } from "vitest";
import {
  EspnError,
  EspnResultsClient,
  parseEspnScoreboard,
} from "../espn-results-client";

const COMPLETED_SCOREBOARD = {
  events: [
    {
      id: "401700001",
      date: "2026-06-03T23:00Z",
      competitions: [
        {
          status: { type: { state: "post", completed: true } },
          competitors: [
            { homeAway: "home", score: "110", winner: true, team: { abbreviation: "SAS", displayName: "San Antonio Spurs" } },
            { homeAway: "away", score: "104", winner: false, team: { abbreviation: "NYK", displayName: "New York Knicks" } },
          ],
        },
      ],
    },
    {
      id: "401700002",
      date: "2026-06-03T23:30Z",
      competitions: [
        {
          status: { type: { state: "in", completed: false } },
          competitors: [
            { homeAway: "home", score: "48", team: { abbreviation: "BOS", displayName: "Boston Celtics" } },
            { homeAway: "away", score: "50", team: { abbreviation: "MIA", displayName: "Miami Heat" } },
          ],
        },
      ],
    },
  ],
} as const;

describe("parseEspnScoreboard", () => {
  it("normalizes a completed game with a winner", () => {
    const [game] = parseEspnScoreboard(COMPLETED_SCOREBOARD, "nba");
    expect(game).toMatchObject({
      id: "401700001",
      league: "nba",
      completed: true,
      home: { abbr: "SAS", score: 110 },
      away: { abbr: "NYK", score: 104 },
      winnerAbbr: "SAS",
    });
  });

  it("leaves winnerAbbr null for an in-progress game", () => {
    const game = parseEspnScoreboard(COMPLETED_SCOREBOARD, "nba")[1];
    expect(game?.completed).toBe(false);
    expect(game?.winnerAbbr).toBeNull();
    expect(game?.away).toMatchObject({ abbr: "MIA", score: 50 });
  });

  it("tolerates an empty / malformed payload", () => {
    expect(parseEspnScoreboard({}, "nfl")).toEqual([]);
  });

  it("reports null (not a fabricated 0) for an empty or whitespace score string", () => {
    const payload = {
      events: [
        {
          id: "401700003",
          date: "2026-06-04T00:00Z",
          competitions: [
            {
              status: { type: { state: "pre", completed: false } },
              competitors: [
                { homeAway: "home", score: "", team: { abbreviation: "LAL", displayName: "Los Angeles Lakers" } },
                { homeAway: "away", score: "  ", team: { abbreviation: "GSW", displayName: "Golden State Warriors" } },
              ],
            },
          ],
        },
      ],
    } as const;

    const [game] = parseEspnScoreboard(payload, "nba");
    expect(game?.home).toMatchObject({ abbr: "LAL", score: null });
    expect(game?.away).toMatchObject({ abbr: "GSW", score: null });
  });
});

describe("EspnResultsClient", () => {
  it("requests the correct league path and returns parsed results", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(COMPLETED_SCOREBOARD), { status: 200 }));
    const client = new EspnResultsClient({ fetchImpl });

    const results = await client.getResults("nba", "20260603");

    expect(results[0]?.winnerAbbr).toBe("SAS");
    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls[0]?.[0]).toBe(
      "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20260603",
    );
  });

  it("throws a typed error on a non-2xx response", async () => {
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 404 }));
    const client = new EspnResultsClient({ fetchImpl, maxRetries: 0 });
    await expect(client.getResults("nfl")).rejects.toBeInstanceOf(EspnError);
  });
});
