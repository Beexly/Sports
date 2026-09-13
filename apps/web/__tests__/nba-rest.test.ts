import { describe, expect, it } from "vitest";
import {
  averageMinutes,
  computeTeamRest,
  mergePlayerMinutes,
  parseNbaBoxscoreMinutes,
  toRestFactorInput,
  type NbaRestProfile,
} from "@/lib/nba/rest";

describe("computeTeamRest", () => {
  it("counts games in the trailing 7-day window (exclusive of today)", () => {
    const games = [
      { gameId: "1", startTime: "2026-09-05T00:00:00Z", home: { abbreviation: "BOS" }, away: { abbreviation: "NYK" } },
      { gameId: "2", startTime: "2026-09-10T00:00:00Z", home: { abbreviation: "BOS" }, away: { abbreviation: "MIA" } },
      { gameId: "3", startTime: "2026-09-12T00:00:00Z", home: { abbreviation: "BOS" }, away: { abbreviation: "LAL" } },
    ] as const;
    const rest = computeTeamRest(games as never, "BOS", "2026-09-12", 7);
    // 09-10 and 09-05 are within the trailing 7-day window (exclusive of today).
    expect(rest.gamesInLast7Days).toBe(2);
    expect(rest.daysRest).toBe(2); // last game before today was 09-10
  });

  it("returns null daysRest when the team has no prior game", () => {
    const games = [{ gameId: "9", startTime: "2026-09-12T00:00:00Z", home: { abbreviation: "DEN" }, away: { abbreviation: "GSW" } }] as const;
    const rest = computeTeamRest(games as never, "DEN", "2026-09-12", 7);
    expect(rest.daysRest).toBeNull();
    expect(rest.gamesInLast7Days).toBe(0); // today's game is excluded; no prior
  });

  it("reports a back-to-back as 1 day rest", () => {
    const games = [
      { gameId: "1", startTime: "2026-09-11T00:00:00Z", home: { abbreviation: "BOS" }, away: { abbreviation: "NYK" } },
      { gameId: "2", startTime: "2026-09-12T00:00:00Z", home: { abbreviation: "BOS" }, away: { abbreviation: "MIA" } },
    ] as const;
    const rest = computeTeamRest(games as never, "BOS", "2026-09-12", 7);
    expect(rest.daysRest).toBe(1);
    expect(rest.gamesInLast7Days).toBe(1); // only yesterday's game counts (today excluded)
  });

  it("ignores games on the other side of the schedule", () => {
    const games = [
      { gameId: "1", startTime: "2026-09-12T00:00:00Z", home: { abbreviation: "GSW" }, away: { abbreviation: "BOS" } },
    ] as const;
    const rest = computeTeamRest(games as never, "LAL", "2026-09-12", 7);
    expect(rest.gamesInLast7Days).toBe(0);
    expect(rest.daysRest).toBeNull();
  });
});

describe("averageMinutes", () => {
  it("averages the last 3 games", () => {
    expect(averageMinutes([30, 40, 20])).toBe(30);
    expect(averageMinutes([10])).toBe(10);
  });
  it("returns null when no valid minutes", () => {
    expect(averageMinutes([])).toBeNull();
    expect(averageMinutes([0, -5])).toBeNull();
  });
});

describe("mergePlayerMinutes", () => {
  it("appends per-game minutes preserving order, ignoring non-positive", () => {
    const a = mergePlayerMinutes({}, { "1": 30 });
    const b = mergePlayerMinutes(a, { "1": 40, "2": 25 });
    expect(b["1"]).toEqual([30, 40]);
    expect(b["2"]).toEqual([25]);
    const c = mergePlayerMinutes(b, { "1": 0 });
    expect(c["1"]).toEqual([30, 40]); // 0 stays absent
  });
});

describe("parseNbaBoxscoreMinutes", () => {
  it("maps athlete ids to minutes + team abbreviation", () => {
    const parsed = parseNbaBoxscoreMinutes({
      boxscore: {
        players: [
          {
            team: { abbreviation: "BOS" },
            statistics: [
              {
                athletes: [{ athlete: { id: "101", displayName: "Jayson Tatum" }, stats: ["36.4", "28", "9", "5"] }],
              },
            ],
          },
          {
            team: { abbreviation: "LAL" },
            statistics: [
              { athletes: [{ athlete: { id: "202", displayName: "LeBron James" }, stats: ["38.1", "25", "7", "9"] }] },
            ],
          },
        ],
      },
    });
    expect(parsed.minutesByAthlete["101"]).toBe(36.4);
    expect(parsed.minutesByAthlete["202"]).toBe(38.1);
    expect(parsed.teamAbbreviations["101"]).toBe("BOS");
    expect(parsed.athletes["202"]).toBe("LeBron James");
  });

  it("is defensive against empty payloads", () => {
    const parsed = parseNbaBoxscoreMinutes({});
    expect(parsed.minutesByAthlete).toEqual({});
    expect(parsed.athletes).toEqual({});
    expect(parsed.teamAbbreviations).toEqual({});
  });
});

describe("toRestFactorInput", () => {
  it("shapes the factor-engine rest input", () => {
    const p: NbaRestProfile = {
      playerId: "101",
      playerName: "Jayson Tatum",
      teamAbbreviation: "BOS",
      gamesInLast7Days: 3,
      daysRest: 1,
      minutesLast3: 35.2,
      lastMinutes: [36.4, 34.1, 35.2],
      attribution: "Rest factors derived from scores data via ESPN",
    };
    const input = toRestFactorInput(p);
    expect(input.gamesInLastDays).toBe(3);
    expect(input.daysRest).toBe(1);
    expect(input.label).toContain("Jayson Tatum");
  });

  it("handles unknown rest as null", () => {
    const p: NbaRestProfile = {
      playerId: "202",
      playerName: "LeBron James",
      teamAbbreviation: "LAL",
      gamesInLast7Days: 1,
      daysRest: null,
      minutesLast3: null,
      lastMinutes: [],
      attribution: "Rest factors derived from scores data via ESPN",
    };
    expect(toRestFactorInput(p).daysRest).toBeNull();
  });
});