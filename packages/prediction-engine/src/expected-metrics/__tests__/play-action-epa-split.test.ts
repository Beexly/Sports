import { describe, expect, it } from "vitest";
import { computePlayActionEpaSplit, type PlayActionDropbackPlay } from "../play-action-epa-split.js";
import { mapNflversePbpToExpectedMetrics } from "../nflverse-pbp-mapper.js";

function play(partial: Partial<PlayActionDropbackPlay>): PlayActionDropbackPlay {
  return {
    playId: "p-1",
    passerId: "P1",
    teamId: "T1",
    week: 1,
    playAction: 0,
    qbSpike: 0,
    playType: "pass",
    epa: 0.5,
    ...partial
  };
}

describe("Play Action EPA Split", () => {
  it("filters correctly and handles point-in-time logic", () => {
    const plays: PlayActionDropbackPlay[] = [];

    for (let i = 0; i < 20; i++) {
      plays.push(play({ playId: `pa-${i}`, playAction: 1, epa: 1.0, week: 1 }));
      plays.push(play({ playId: `npa-${i}`, playAction: 0, epa: 0.0, week: 1 }));
    }

    const result = computePlayActionEpaSplit(plays, 2);

    expect(result.teamSplits.length).toBe(1);
    expect(result.playerSplits.length).toBe(1);

    const teamSplit = result.teamSplits[0];
    const std = teamSplit!.windows.find(w => w.window === "season-to-date")!;

    expect(std.playActionArm!.rawEpaPerDropback).toBeCloseTo(1.0);
    expect(std.playActionArm!.shrunkEpaPerDropback).toBeCloseTo(1.0);
    expect(std.nonPlayActionArm!.rawEpaPerDropback).toBeCloseTo(0.0);
    expect(std.nonPlayActionArm!.shrunkEpaPerDropback).toBeCloseTo(0.0);
    expect(std.paEpaDifferential).toBeCloseTo(1.0);
    expect(std.playActionRate).toBeCloseTo(0.5);
  });

  it("computes empirical Bayes shrinkage correctly", () => {
    const plays: PlayActionDropbackPlay[] = [];

    // Create a league mean distinct from the player mean.
    // We will have 200 PA plays total in the league.
    // 10 of them belong to Player A, where they perform poorly (EPA = -1)
    // 190 belong to Player B, where they perform well (EPA = +1)
    // League PA mean = (10 * -1 + 190 * 1) / 200 = 180 / 200 = 0.9.

    for (let i = 0; i < 10; i++) {
      plays.push(play({ playId: `pa-${i}`, playAction: 1, epa: -1.0, week: 1, passerId: "P1", teamId: "T1" }));
    }
    for (let i = 10; i < 200; i++) {
      plays.push(play({ playId: `pa-${i}`, playAction: 1, epa: 1.0, week: 1, passerId: "P2", teamId: "T2" }));
    }

    const result = computePlayActionEpaSplit(plays, 2);
    const p1Split = result.playerSplits.find(s => s.playerId === "P1")!.windows.find(w => w.window === "season-to-date")!;

    // Player 1 PA count = 10 (hits floor).
    // League mean = 0.9. Player raw = -1.0.
    // Shrink factor = 10 / (10 + 20) = 1/3
    // Shrunk EPA = 0.9 + (1/3) * (-1.0 - 0.9) = 0.9 + (1/3) * (-1.9) = 0.9 - 0.6333... = 0.26666
    expect(p1Split.playActionArm!.shrunkEpaPerDropback).toBeCloseTo(0.2667, 3);
  });

  it("applies floors (QB >= 10, Team >= 20)", () => {
    const plays: PlayActionDropbackPlay[] = [];

    for (let i = 0; i < 9; i++) {
      plays.push(play({ playAction: 1, epa: 1.0, week: 1 }));
    }
    for (let i = 0; i < 19; i++) {
      plays.push(play({ playAction: 0, epa: 0.0, week: 1 }));
    }

    const result = computePlayActionEpaSplit(plays, 2);

    const playerStd = result.playerSplits[0]!.windows.find(w => w.window === "season-to-date")!;
    expect(playerStd.playActionArm).toBeNull();
    expect(playerStd.nonPlayActionArm).not.toBeNull();
    expect(playerStd.paEpaDifferential).toBeNull();
    expect(playerStd.playActionRate).toBeNull();

    const teamStd = result.teamSplits[0]!.windows.find(w => w.window === "season-to-date")!;
    expect(teamStd.playActionArm).toBeNull();
    expect(teamStd.nonPlayActionArm).toBeNull();
  });

  it("counts spike exclusion, null EPA, non-pass, missing PA, and missing passerId for QB correctly", () => {
    const plays = [
      play({ playAction: 1, epa: null, week: 1 }),
      play({ playAction: null, epa: 1.0, week: 1 }),
      play({ playAction: 1, epa: 1.0, qbSpike: 1, week: 1 }),
      play({ playAction: 1, epa: 1.0, playType: "run", week: 1 }),
      play({ playAction: 1, epa: 1.0, passerId: "", week: 1 })
    ];

    // Add plays to actually render a split for the QB so we can assert the stats
    for (let i = 0; i < 20; i++) {
      plays.push(play({ playAction: 1, epa: 1.0, week: 1 }));
      plays.push(play({ playAction: 0, epa: 0.0, week: 1 }));
    }

    const result = computePlayActionEpaSplit(plays, 2);

    const teamStd = result.teamSplits[0]!.windows.find(w => w.window === "season-to-date")!;
    expect(teamStd.diagnostics.excludedNullEpa).toBe(1);
    expect(teamStd.diagnostics.excludedMissingPlayAction).toBe(1);
    expect(teamStd.diagnostics.excludedQbSpike).toBe(1);
    expect(teamStd.diagnostics.excludedMissingPasserId).toBe(0); // Team shouldn't exclude missing passerId

    const playerStd = result.playerSplits[0]!.windows.find(w => w.window === "season-to-date")!;
    expect(playerStd.diagnostics.excludedMissingPasserId).toBe(1); // QB grain should count missing passerId
  });

  it("implements point-in-time windows (last-4, last-8 distinct weeks)", () => {
    const plays: PlayActionDropbackPlay[] = [];

    const distinctWeeks = [1, 3, 4, 5, 7, 8];
    for (const w of distinctWeeks) {
      for (let i = 0; i < 20; i++) {
        plays.push(play({ playAction: 1, epa: 1.0, week: w }));
        plays.push(play({ playAction: 0, epa: 0.0, week: w }));
      }
    }

    plays.push(play({ playAction: 1, epa: 1.0, week: 9 }));
    plays.push(play({ playAction: 1, epa: 1.0, week: 10 }));

    const result = computePlayActionEpaSplit(plays, 9);

    const teamSplit = result.teamSplits[0]!;

    const std = teamSplit.windows.find(w => w.window === "season-to-date")!;
    expect(std.ratableDropbacks).toBe(20 * 2 * 6);

    const last4 = teamSplit.windows.find(w => w.window === "last-4-weeks")!;
    expect(last4.ratableDropbacks).toBe(20 * 2 * 4);

    const last8 = teamSplit.windows.find(w => w.window === "last-8-weeks")!;
    expect(last8.ratableDropbacks).toBe(20 * 2 * 6);
  });

  it("uses specific null own-EPA rule", () => {
    const plays = [
       play({ playAction: 1, epa: 1.0, week: 1 }),
       play({ playAction: 1, epa: null, week: 1 })
    ];
    const result = computePlayActionEpaSplit(plays, 2);
    const teamSplit = result.teamSplits[0]!;
    const std = teamSplit.windows.find(w => w.window === "season-to-date")!;
    expect(std.diagnostics.excludedNullEpa).toBe(1);
    expect(std.ratableDropbacks).toBe(1);
  });

  it("verifies mapper output respects own EPA vs referee EPA", () => {
    // nflverse epa mapped is ignored in playActionPlays interface (it maps to null directly).
    // The metric only accesses what is on the interface.
    const raw: any[] = [
      {
        season: "2024", season_type: "REG", game_id: "2024_01_AAA_BBB", play_id: "10",
        home_team: "AAA", away_team: "BBB", posteam: "AAA", defteam: "BBB",
        play_type: "pass", week: "1", passer_player_id: "P1", play_action: "1", qb_spike: "0",
        epa: "4.0" // referee EPA
      }
    ];
    const { playActionPlays } = mapNflversePbpToExpectedMetrics(raw as any[]);
    expect(playActionPlays.length).toBe(1);
    expect(playActionPlays[0]?.playAction).toBe(1);
    expect(playActionPlays[0]?.epa).toBeNull(); // own EPA is null before attachOwnEpa
  });
});
