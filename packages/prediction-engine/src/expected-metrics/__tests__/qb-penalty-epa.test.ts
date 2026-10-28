import { describe, expect, it } from "vitest";
import { computeQbPenaltyEpa, type QbPenaltyPlay } from "../qb-penalty-epa.js";

const DEFAULT_PLAY: QbPenaltyPlay = {
  playId: "play1",
  game_id: "game1",
  week: 1,
  posteam: "DAL",
  defteam: "PHI",
  passer_player_id: "QB1",
  penalty: 1,
  penalty_team: "PHI",
  yards_gained: 0,
  epa: 2.5,
};

describe("qb-penalty-epa", () => {
  it("identifies qualifying plays and sums EPA, excluding nulls", () => {
    const plays: QbPenaltyPlay[] = [
      { ...DEFAULT_PLAY, playId: "1", epa: 3.0 }, // Valid
      { ...DEFAULT_PLAY, playId: "2", epa: null }, // Valid but missing EPA
      { ...DEFAULT_PLAY, playId: "3", penalty_team: "DAL" }, // Invalid: penalty_team == posteam (counts in diagnostics)
      { ...DEFAULT_PLAY, playId: "4", penalty_team: "" }, // Invalid: empty penalty_team (counts in diagnostics)
      { ...DEFAULT_PLAY, playId: "5", yards_gained: 5 }, // Invalid: yards_gained != 0
      { ...DEFAULT_PLAY, playId: "6", penalty: 0 }, // Invalid: no penalty
      { ...DEFAULT_PLAY, playId: "7", game_id: "game2", epa: 4.0 }, // Valid, 2nd game
      { ...DEFAULT_PLAY, playId: "8", game_id: "game2", epa: 2.0 }, // Valid
      { ...DEFAULT_PLAY, playId: "9", game_id: "game3", epa: 1.0 }, // Valid
      { ...DEFAULT_PLAY, playId: "10", game_id: "game3", epa: 2.0 }, // Valid
    ];

    const result = computeQbPenaltyEpa(plays, 10, "season-to-date");

    // QB1 has 6 valid qualifying plays (1, 2, 7, 8, 9, 10). Plays >= 5, so emitted.
    expect(result.players.length).toBe(1);
    const qb1 = result.players[0]!;

    expect(qb1.passer_player_id).toBe("QB1");
    expect(qb1.qualifyingPlays).toBe(6);
    expect(qb1.totalEpaGained).toBe(3.0 + 4.0 + 2.0 + 1.0 + 2.0); // 12.0
    expect(qb1.games).toBe(3);
    expect(qb1.epaPerGame).toBe(4.0); // 12.0 / 3

    expect(result.diagnostics.nullEpaOmitted).toBe(1);
    expect(result.diagnostics.invalidPenaltyPlaysOmitted).toBe(2);
  });

  it("enforces a floor of 5 qualifying plays per QB", () => {
    const plays: QbPenaltyPlay[] = [
      { ...DEFAULT_PLAY, playId: "1", passer_player_id: "QB_UNDER" },
      { ...DEFAULT_PLAY, playId: "2", passer_player_id: "QB_UNDER" },
      { ...DEFAULT_PLAY, playId: "3", passer_player_id: "QB_UNDER" },
      { ...DEFAULT_PLAY, playId: "4", passer_player_id: "QB_UNDER" },
      // 4 plays < 5, omitted
      { ...DEFAULT_PLAY, playId: "5", passer_player_id: "QB_OVER" },
      { ...DEFAULT_PLAY, playId: "6", passer_player_id: "QB_OVER" },
      { ...DEFAULT_PLAY, playId: "7", passer_player_id: "QB_OVER" },
      { ...DEFAULT_PLAY, playId: "8", passer_player_id: "QB_OVER" },
      { ...DEFAULT_PLAY, playId: "9", passer_player_id: "QB_OVER" },
      // 5 plays >= 5, emitted
    ];

    const result = computeQbPenaltyEpa(plays, 10, "season-to-date");
    expect(result.players.length).toBe(1);
    expect(result.players[0]!.passer_player_id).toBe("QB_OVER");
    expect(result.diagnostics.belowFloorOmitted).toBe(1);
  });

  it("does not apply a display cutoff for < 3.0 EPA", () => {
    const plays: QbPenaltyPlay[] = Array(5).fill(null).map((_, i) => ({
      ...DEFAULT_PLAY,
      playId: `p${i}`,
      epa: 0.1, // Total EPA will be 0.5
    }));

    const result = computeQbPenaltyEpa(plays, 10, "season-to-date");
    expect(result.players.length).toBe(1);
    expect(result.players[0]!.totalEpaGained).toBe(0.5); // Emitted despite < 3.0
  });

  it("respects point-in-time discipline", () => {
    const plays: QbPenaltyPlay[] = Array(10).fill(null).map((_, i) => ({
      ...DEFAULT_PLAY,
      playId: `p${i}`,
      week: i + 1, // Weeks 1 to 10
    }));

    const result = computeQbPenaltyEpa(plays, 5, "season-to-date"); // targetWeek = 5
    expect(result.diagnostics.playsEvaluated).toBe(4); // Only weeks 1-4 are evaluated
    expect(result.players.length).toBe(0); // 4 qualifying plays < 5, so omitted
  });

  it("last-4 window aggregates only the 4 most recent distinct weeks globally", () => {
    // Generate exactly 5 qualifying plays for each week to ensure floor is met
    const generateWeekPlays = (weekNum: number, qb: string) => {
      return Array(5).fill(null).map((_, i) => ({
        ...DEFAULT_PLAY,
        passer_player_id: qb,
        playId: `w${weekNum}_p${i}`,
        week: weekNum,
        epa: 1.0,
      }));
    };

    const plays: QbPenaltyPlay[] = [
      ...generateWeekPlays(1, "QB1"),
      ...generateWeekPlays(3, "QB1"),
      ...generateWeekPlays(5, "QB1"),
      ...generateWeekPlays(7, "QB1"),
      ...generateWeekPlays(8, "QB1"),
      ...generateWeekPlays(9, "QB1"),
      ...generateWeekPlays(1, "QB2"), // QB2 only played week 1
    ];

    const result = computeQbPenaltyEpa(plays, 10, "last-4");

    // Distinct weeks available globally: 9, 8, 7, 5, 3, 1
    // last-4 should take: 9, 8, 7, 5
    // QB1 has plays in 9, 8, 7, 5. Each week has 5 plays. 4 weeks * 5 plays = 20 plays.
    // 20 plays * 1.0 EPA = 20.0 total EPA.
    // QB2 only has plays in week 1. Week 1 is not in the last 4 distinct weeks globally. So QB2 should have 0.

    expect(result.players.length).toBe(1);
    expect(result.players[0]!.passer_player_id).toBe("QB1");
    expect(result.players[0]!.qualifyingPlays).toBe(20);
    expect(result.players[0]!.totalEpaGained).toBe(20.0);
  });
});
