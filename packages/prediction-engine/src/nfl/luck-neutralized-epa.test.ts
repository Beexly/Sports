import { describe, expect, it } from "vitest";
import {
  deserveToWin,
  neutralize,
  neutralizeAll,
  type GameInput,
  type PlayInput,
} from "./luck-neutralized-epa.js";

function play(over: Partial<PlayInput> = {}): PlayInput {
  return {
    playId: "p1",
    gameId: "g1",
    homeTeam: "KC",
    awayTeam: "BUF",
    offenseTeam: "KC",
    epa: 0.4,
    playType: "pass",
    fumble: false,
    fumbleRecoveredByOwnTeam: false,
    interception: false,
    tippedInterception: false,
    fieldGoal: false,
    fieldGoalMade: false,
    fieldGoalDistance: null,
    wpBefore: 0.55,
    ...over,
  };
}

describe("W5 neutralize", () => {
  it("keeps EPA when no luck event", () => {
    const r = neutralize(play({ epa: 0.4 }));
    expect(r.neutralizedEpa).toBeCloseTo(0.4, 4);
    expect(r.adjustment).toBe(0);
    expect(r.reason).toContain("kept");
  });

  it("neutralizes tipped interceptions", () => {
    const r = neutralize(
      play({ epa: -3.2, interception: true, tippedInterception: true }),
    );
    expect(r.neutralizedEpa).toBeCloseTo(-0.25, 4);
    expect(r.adjustment).toBeGreaterThan(2);
    expect(r.reason).toContain("tipped INT");
  });

  it("leaves clean interceptions alone", () => {
    const r = neutralize(play({ epa: -2.8, interception: true }));
    expect(r.neutralizedEpa).toBeCloseTo(-2.8, 4);
  });

  it("neutralizes missed field goals", () => {
    const shortMiss = neutralize(
      play({ epa: -1.1, fieldGoal: true, fieldGoalMade: false, fieldGoalDistance: 38 }),
    );
    expect(shortMiss.neutralizedEpa).toBeCloseTo(-0.25, 4);

    const longMiss = neutralize(
      play({ epa: -1.4, fieldGoal: true, fieldGoalMade: false, fieldGoalDistance: 55 }),
    );
    expect(longMiss.neutralizedEpa).toBeCloseTo(-0.35, 4);
    expect(longMiss.reason).toContain("missed FG");
  });

  it("leaves made field goals alone", () => {
    const r = neutralize(
      play({ epa: 2.1, fieldGoal: true, fieldGoalMade: true, fieldGoalDistance: 42 }),
    );
    expect(r.neutralizedEpa).toBeCloseTo(2.1, 4);
  });

  it("neutralizes fumble recoveries toward expected EPA", () => {
    const own = neutralize(
      play({ epa: 1.8, fumble: true, fumbleRecoveredByOwnTeam: true }),
    );
    expect(own.neutralizedEpa).toBeCloseTo(0.05, 4);

    const opp = neutralize(
      play({ epa: -2.4, fumble: true, fumbleRecoveredByOwnTeam: false }),
    );
    expect(opp.neutralizedEpa).toBeCloseTo(-0.35, 4);
    expect(opp.reason).toContain("fumble");
  });

  it("passes null through — never imputes", () => {
    const r = neutralize(play({ epa: null }));
    expect(r.neutralizedEpa).toBeNull();
    expect(r.originalEpa).toBeNull();
    expect(r.reason).toContain("fail-closed");

    expect(neutralize(null).neutralizedEpa).toBeNull();
    expect(neutralize(undefined).neutralizedEpa).toBeNull();
  });
});

describe("W5 neutralizeAll", () => {
  it("maps nulls to null and real plays to neutralized values", () => {
    const r = neutralizeAll([
      play({ playId: "a", epa: 0.3 }),
      null,
      play({ playId: "b", epa: -3, interception: true, tippedInterception: true }),
    ]);
    expect(r).toHaveLength(3);
    expect(r[0]!.neutralizedEpa).toBeCloseTo(0.3, 4);
    expect(r[1]!.neutralizedEpa).toBeNull();
    expect(r[2]!.neutralizedEpa).toBeCloseTo(-0.25, 4);
  });
});

describe("W5 deserveToWin", () => {
  function game(plays: PlayInput[]): GameInput {
    return {
      gameId: "g1",
      homeTeam: "KC",
      awayTeam: "BUF",
      plays,
    };
  }

  it("favors the team with more neutralized EPA", () => {
    const plays = [
      ...Array.from({ length: 8 }, (_, i) =>
        play({
          playId: `h${i}`,
          offenseTeam: "KC",
          epa: 0.5,
          playType: "pass",
        }),
      ),
      ...Array.from({ length: 8 }, (_, i) =>
        play({
          playId: `a${i}`,
          offenseTeam: "BUF",
          epa: 0.1,
          playType: "run",
        }),
      ),
    ];
    const r = deserveToWin(game(plays));
    expect(r.homeEpa).toBeGreaterThan(r.awayEpa);
    expect(r.pHomeWin).toBeGreaterThan(0.5);
    expect(r.pHomeWin + r.pAwayWin + r.pTie).toBeCloseTo(1, 3);
    expect(r.playsUsed).toBe(16);
  });

  it("neutralization can flip deserve-to-win vs raw EPA", () => {
    // Home: one huge tipped-INT-lucky play + solid positive plays
    // Away: modest positive EPA that only looks better because home's
    // raw EPA is crushed by the unlucky INT
    const plays = [
      play({
        playId: "lucky",
        offenseTeam: "KC",
        epa: -3.5,
        interception: true,
        tippedInterception: true,
      }),
      ...Array.from({ length: 8 }, (_, i) =>
        play({ playId: `h${i}`, offenseTeam: "KC", epa: 0.35 }),
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        play({ playId: `a${i}`, offenseTeam: "BUF", epa: 0.12 }),
      ),
    ];
    const r = deserveToWin(game(plays));
    // Neutralized: KC's lucky INT becomes -0.25 instead of -3.5
    // KC neutralized ≈ -0.25 + 8*0.35 = 2.55 ; BUF ≈ 0.72
    expect(r.homeEpa).toBeGreaterThan(r.awayEpa);
    expect(r.homeEpa).toBeGreaterThan(2);
    expect(r.pHomeWin).toBeGreaterThan(0.5);
  });

  it("skips plays with null EPA", () => {
    const plays = [
      play({ playId: "ok", offenseTeam: "KC", epa: 0.3 }),
      play({ playId: "missing", offenseTeam: "BUF", epa: null }),
    ];
    const r = deserveToWin(game(plays));
    expect(r.playsUsed).toBe(1);
    expect(r.playsSkipped).toBe(1);
  });

  it("throws without a game", () => {
    expect(() => deserveToWin(null)).toThrow();
  });
});
