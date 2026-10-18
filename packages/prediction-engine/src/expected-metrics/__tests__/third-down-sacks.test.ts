import { describe, it, expect } from "vitest";
import { computeThirdDownSacks, ThirdDownSackPlay, MIN_THIRD_DOWN_DROPBACKS_TO_FIT } from "../third-down-sacks.js";

function makePlay(overrides: Partial<ThirdDownSackPlay>): ThirdDownSackPlay {
  return {
    playId: "p1",
    gameId: "g1",
    week: 1,
    posteam: "TEAM_A",
    passerId: "QB_A",
    down: 3,
    passAttempt: 1,
    sack: 0,
    ...overrides,
  };
}

describe("third-down-sacks", () => {
  it("computes team and qb rollups accurately and excludes scrambles", () => {
    const plays: ThirdDownSackPlay[] = [];

    // Add 20 pass attempts (0 sacks) for QB_A in week 1
    for (let i = 0; i < 20; i++) {
      plays.push(makePlay({ playId: `w1_pass_${i}` }));
    }

    // Add 10 sacks for QB_A in week 2
    for (let i = 0; i < 10; i++) {
      plays.push(makePlay({ playId: `w2_sack_${i}`, gameId: "g2", week: 2, passAttempt: 0, sack: 1 }));
    }

    // Add 5 scrambles (neither passAttempt nor sack)
    for (let i = 0; i < 5; i++) {
      plays.push(makePlay({ playId: `w2_scram_${i}`, gameId: "g2", week: 2, passAttempt: 0, sack: 0 }));
    }

    const qbRes = computeThirdDownSacks(plays, 3, "ytd", "qb");
    expect(qbRes.length).toBe(1);
    expect(qbRes[0]!.dropbacks).toBe(30);
    expect(qbRes[0]!.sacksTaken).toBe(10);
    expect(qbRes[0]!.sackRate).toBe(10 / 30);
  });

  it("defensively ignores non-3rd down plays and plays on/after target week", () => {
    const plays: ThirdDownSackPlay[] = [
      makePlay({ down: 2, sack: 1 }), // Ignored (down)
      makePlay({ down: 3, week: 3, sack: 1 }), // Ignored (on target week)
      makePlay({ down: 3, week: 1, sack: 1, passAttempt: 0 }), // Included
    ];

    const teamRes = computeThirdDownSacks(plays, 3, "ytd", "team");
    expect(teamRes.length).toBe(1);
    expect(teamRes[0]!.dropbacks).toBe(1);
    expect(teamRes[0]!.sacksTaken).toBe(1);
    expect(teamRes[0]!.sackRate).toBe(null); // floor rule
  });

  it("returns null sackRate if floor is not met", () => {
    const plays: ThirdDownSackPlay[] = [];
    for (let i = 0; i < MIN_THIRD_DOWN_DROPBACKS_TO_FIT - 1; i++) {
      plays.push(makePlay({ playId: `p_${i}` }));
    }
    const qbRes = computeThirdDownSacks(plays, 2, "ytd", "qb");
    expect(qbRes[0]!.dropbacks).toBe(MIN_THIRD_DOWN_DROPBACKS_TO_FIT - 1);
    expect(qbRes[0]!.sackRate).toBeNull();
  });

  it("handles windowTypes correctly based on unique games", () => {
    const plays: ThirdDownSackPlay[] = [];

    // Add plays over 5 distinct weeks/games
    for (let week = 1; week <= 5; week++) {
      for (let i = 0; i < 10; i++) {
        plays.push(makePlay({ playId: `w${week}_${i}`, gameId: `g${week}`, week, passAttempt: 1, sack: 0 }));
      }
    }

    // rolling-4 window with targetWeek = 6
    const res = computeThirdDownSacks(plays, 6, "rolling-4", "qb");
    expect(res.length).toBe(1);
    expect(res[0]!.dropbacks).toBe(40); // 4 games * 10 dropbacks
  });
});
