import { describe, expect, it } from "vitest";
import {
  offensiveEpaForTeam,
  parseOffensiveEpaCsv,
  parseRushingEpaCsv,
  parseScreenSuccessCsv,
  rushingEpaForPlayer,
  screenSuccessForTeam,
  teamEpaContext,
  PLAYER_RUSHING_EPA_TOP10_WK5,
  TEAM_OFFENSIVE_EPA_PLAY_WK5,
  TEAM_SCREEN_SUCCESS_WK5,
} from "./epa-context.js";

/**
 * The EPA context snapshots are transcriptions of measured tables, and the
 * failure mode they exist to prevent is a quiet invention: a missing team
 * coming back as a league average, a truncated value coming back as zero.
 * These tests pin the measured values AND the absences. Tonight's game is
 * BUF @ LAR, so the BUF/LAR facts are pinned by name.
 */

describe("parsers (fail-closed, blank is null)", () => {
  it("parses the offensive EPA shape and skips the header", () => {
    const rows = parseOffensiveEpaCsv(
      "RANK,TEAM,EPA_PER_PLAY,SOURCE\n1,NE,0.42,x\n28,SEA,-0.43,x\n",
    );
    expect(rows).toEqual([
      { team: "NE", rank: 1, epaPerPlay: 0.42 },
      { team: "SEA", rank: 28, epaPerPlay: -0.43 },
    ]);
  });

  it("keeps a blank rushing value as null — never zero, never dropped", () => {
    const rows = parseRushingEpaCsv(
      "RANK,PLAYER,RUSHING_EPA,SOURCE\n2,James Cook,9.1,x\n10,Jahmyr Gibbs,,x\n",
    );
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({ player: "Jahmyr Gibbs", rank: 10, rushingEpa: null });
  });

  it("maps the screen table's full names to abbreviations and keeps tie labels", () => {
    const rows = parseScreenSuccessCsv(
      "RANK,TEAM,SCREEN_SUCCESS_RATE_PCT,SOURCE\nT-5,Rams,50.0,x\n",
    );
    expect(rows).toEqual([{ team: "LAR", rankLabel: "T-5", successRatePct: 50.0 }]);
  });

  it("skips malformed rows instead of repairing them", () => {
    const rows = parseOffensiveEpaCsv(
      "RANK,TEAM,EPA_PER_PLAY,SOURCE\n1,NE,not-a-number,x\n2,DET,0.33,x\n",
    );
    expect(rows).toEqual([{ team: "DET", rank: 2, epaPerPlay: 0.33 }]);
  });
});

describe("snapshots match the measured Week-5 tables", () => {
  it("offensive table: 28 teams, NE top at 0.42, SEA bottom at -0.43", () => {
    expect(TEAM_OFFENSIVE_EPA_PLAY_WK5).toHaveLength(28);
    expect(offensiveEpaForTeam("NE")).toEqual({ team: "NE", rank: 1, epaPerPlay: 0.42 });
    expect(offensiveEpaForTeam("SEA")).toEqual({ team: "SEA", rank: 28, epaPerPlay: -0.43 });
  });

  it("rushing table: 10 rows, the #10 value is null (not captured), not 0", () => {
    expect(PLAYER_RUSHING_EPA_TOP10_WK5).toHaveLength(10);
    expect(rushingEpaForPlayer("Jahmyr Gibbs")!.rushingEpa).toBeNull();
  });

  it("screen table: 6 teams", () => {
    expect(TEAM_SCREEN_SUCCESS_WK5).toHaveLength(6);
  });
});

describe("tonight — BUF @ LAR (2026-10-12 MNF)", () => {
  it("team offensive EPA is ABSENT for both teams — null, never filled", () => {
    // The Week-5 table covers the 28 teams that played that week; neither
    // BUF nor LAR is in it. The honest context for tonight is "unavailable
    // from this source", and the lookup must say exactly that.
    expect(offensiveEpaForTeam("BUF")).toBeNull();
    expect(offensiveEpaForTeam("LAR")).toBeNull();
    expect(teamEpaContext("BUF").offensiveEpaPerPlay).toBeNull();
    expect(teamEpaContext("LAR").offensiveEpaPerPlay).toBeNull();
  });

  it("James Cook (BUF) rushing EPA is present and measured: #2 at +9.1", () => {
    expect(rushingEpaForPlayer("James Cook")).toEqual({
      player: "James Cook",
      rank: 2,
      rushingEpa: 9.1,
    });
  });

  it("Kyren Williams (LAR) is not in the rushing top-10 — null, not a guess", () => {
    expect(rushingEpaForPlayer("Kyren Williams")).toBeNull();
  });

  it("Rams screen success is present: T-5 at 50.0%; Bills absent", () => {
    expect(screenSuccessForTeam("LAR")).toEqual({
      team: "LAR",
      rankLabel: "T-5",
      successRatePct: 50.0,
    });
    expect(screenSuccessForTeam("BUF")).toBeNull();
  });
});
