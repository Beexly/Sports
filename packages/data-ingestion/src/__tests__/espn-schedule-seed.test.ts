import { describe, expect, it } from "vitest";
import { parseEspnScoreboardForSeed } from "../espn-schedule-seed.js";

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
