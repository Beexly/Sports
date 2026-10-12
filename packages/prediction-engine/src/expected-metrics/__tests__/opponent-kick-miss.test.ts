import { describe, expect, it } from "vitest";
import { extractOpponentKickMissEvents, computeOpponentKickMissMetrics } from "../opponent-kick-miss.js";
import { type PbpRow } from "../nflverse-pbp-mapper.js";

function row(partial: Partial<Record<string, string>>): PbpRow {
  return partial as PbpRow;
}

describe("Opponent Kick Miss Luck", () => {
  it("extracts clean misses correctly and computes positive EPA gained", () => {
    // missed FG
    const fgMiss = row({
      play_type: "field_goal",
      field_goal_result: "missed",
      posteam: "AAA",
      defteam: "BBB",
      ep: "1.0",
      epa: "-2.0",
      game_id: "2025_03_AAA_BBB",
      play_id: "1",
    });

    // blocked FG - should be excluded
    const fgBlock = row({
      play_type: "field_goal",
      field_goal_result: "blocked",
      posteam: "AAA",
      defteam: "BBB",
      ep: "1.0",
      epa: "-3.0",
      game_id: "2025_03_AAA_BBB",
      play_id: "2",
    });

    // XP made
    const xpMake = row({
      play_type: "extra_point",
      posteam: "AAA",
      defteam: "BBB",
      posteam_score: "6",
      posteam_score_post: "7",
      ep: "0.0",
      epa: "1.0",
      game_id: "2025_03_AAA_BBB",
      play_id: "3",
    });

    // XP miss
    const xpMiss = row({
      play_type: "extra_point",
      posteam: "AAA",
      defteam: "BBB",
      posteam_score: "6",
      posteam_score_post: "6",
      ep: "0.0",
      epa: "-1.0",
      game_id: "2025_03_AAA_BBB",
      play_id: "4",
    });

    const events = extractOpponentKickMissEvents([fgMiss, fgBlock, xpMake, xpMiss]);

    expect(events.length).toBe(3);
    const missedFgEvent = events.find(e => e.playId === "1");
    const missedXpEvent = events.find(e => e.playId === "4");



    expect(missedFgEvent!.isMiss).toBe(true);
    expect(missedFgEvent!.isExtraPoint).toBe(false);
    expect(missedFgEvent!.teamId).toBe("BBB"); // BBB is the defense
    // make_epa = 3 - 1.0 = 2.0
    // epaGained = 2.0 - (-2.0) = 4.0
    expect(missedFgEvent!.epaGainedByDefense).toBe(4.0);

    expect(missedXpEvent!.isMiss).toBe(true);
    expect(missedXpEvent!.isExtraPoint).toBe(true);
    // make_epa = 1 - 0.0 = 1.0
    // epaGained = 1.0 - (-1.0) = 2.0
    expect(missedXpEvent!.epaGainedByDefense).toBe(2.0);
  });

  it("applies point-in-time and rolling windows correctly", () => {
    const mkEvent = (week: number, gameId: string, teamId: string, epaGained: number) => ({
      teamId,
      opponentTeamId: "OPP",
      gameId: `2025_${week.toString().padStart(2, "0")}_OPP_${teamId}`,
      season: 2025,
      week,
      playId: "1",
      isExtraPoint: false,
      isMiss: true,
      epaGainedByDefense: epaGained,
    });

    const events = [
      mkEvent(1, "G1", "DEF1", 3),
      mkEvent(2, "G2", "DEF1", 3),
      mkEvent(3, "G3", "DEF1", 3),
      mkEvent(4, "G4", "DEF1", 3),
      mkEvent(5, "G5", "DEF1", 3), // Week 5 game
      mkEvent(6, "G6", "DEF1", 3), // Future week, should be ignored
    ];

    // Compute for week 6. So games 1..5 are valid.
    const metrics = computeOpponentKickMissMetrics(events, 2025, 6);
    expect(metrics.length).toBe(1);
    const m = metrics[0]!;

    // Total attempts (without shrinkage) = 5
    // std (10 floor) = shrink by 5/10 = 0.5. Total EPA = 15 * 0.5 = 7.5
    expect(m.stdOpponentKickAttempts).toBe(5);
    expect(m.stdOpponentKickMissEpa).toBe(7.5);

    // roll4 uses weeks 2, 3, 4, 5. Attempts = 4 (floor is 4, so factor = 1). Total EPA = 12.
    expect(m.roll4OpponentKickAttempts).toBe(4);
    expect(m.roll4OpponentKickMissEpa).toBe(12);

    // roll8 uses weeks 1..5. Attempts = 5 (floor 4, factor 1). Total EPA = 15.
    expect(m.roll8OpponentKickAttempts).toBe(5);
    expect(m.roll8OpponentKickMissEpa).toBe(15);
  });
});
