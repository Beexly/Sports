import { describe, expect, it } from "vitest";
import {
  buildScheduleLabRows,
  buildTeamSchedules,
  opponentStrength,
  type TeamSchedule,
} from "./schedule-lab";
import type { TeamEnvironmentRow } from "@/lib/intelligence/team-environment";

function env(team: string, offPct: number, defPct: number): TeamEnvironmentRow {
  return {
    team,
    offPlays: 400,
    defPlays: 400,
    offEpaPerPlay: 0,
    defEpaPerPlay: 0,
    offSuccessRate: 0.45,
    defSuccessRate: 0.45,
    proe: 0,
    noHuddleRate: 0.05,
    offEpaPct: offPct,
    defEpaPct: defPct,
  };
}

const GAME_ROWS = [
  { season: "2026", game_type: "REG", week: "1", home_team: "KC", away_team: "BUF" },
  { season: "2026", game_type: "REG", week: "2", home_team: "BUF", away_team: "NYJ" },
  { season: "2026", game_type: "REG", week: "3", home_team: "NYJ", away_team: "KC" },
  // playoff + other-season rows must be ignored
  { season: "2026", game_type: "POST", week: "19", home_team: "KC", away_team: "BUF" },
  { season: "2025", game_type: "REG", week: "1", home_team: "KC", away_team: "NYJ" },
];

describe("buildTeamSchedules", () => {
  it("builds home/away schedules for the requested season, REG only", () => {
    const schedules = buildTeamSchedules(GAME_ROWS, 2026);
    expect(schedules.map((s) => s.team)).toEqual(["BUF", "KC", "NYJ"]);
    const kc = schedules.find((s) => s.team === "KC")!;
    expect(kc.games).toEqual([
      { week: 1, opponent: "BUF", isHome: true },
      { week: 3, opponent: "NYJ", isHome: false },
    ]);
  });
});

describe("buildScheduleLabRows", () => {
  const ENV = [env("KC", 95, 80), env("BUF", 90, 85), env("NYJ", 30, 40)];

  it("ranks harder schedules first and averages opponent strength", () => {
    const schedules = buildTeamSchedules(GAME_ROWS, 2026);
    const rows = buildScheduleLabRows(schedules, ENV);
    // NYJ faces BUF (87.5) and KC (87.5) → hardest. KC faces BUF + NYJ. BUF faces KC + NYJ.
    expect(rows[0]!.team).toBe("NYJ");
    expect(rows[0]!.rank).toBe(1);
    expect(rows[0]!.seasonSos).toBeCloseTo(87.5, 1);
    expect(opponentStrength(ENV[2]!)).toBe(35);
  });

  it("tracks unrated opponents honestly instead of defaulting them", () => {
    const schedules: TeamSchedule[] = [
      { team: "KC", games: [{ week: 1, opponent: "XX", isHome: true }] },
    ];
    const rows = buildScheduleLabRows(schedules, ENV);
    expect(rows[0]!.gamesCounted).toBe(0);
    expect(rows[0]!.unratedOpponents).toEqual(["XX"]);
    expect(rows[0]!.seasonSos).toBe(0);
  });

  it("finds the toughest 3-game stretch with week labels", () => {
    const schedules: TeamSchedule[] = [
      {
        team: "NYJ",
        games: [
          { week: 1, opponent: "NYJ", isHome: true }, // soft (35)
          { week: 2, opponent: "KC", isHome: true },
          { week: 3, opponent: "BUF", isHome: false },
          { week: 4, opponent: "KC", isHome: false },
          { week: 5, opponent: "NYJ", isHome: true },
        ],
      },
    ];
    const rows = buildScheduleLabRows(schedules, ENV);
    expect(rows[0]!.toughestStretch).toEqual({ weeks: "W2–W4", sos: 87.5 });
  });
});
