import { describe, it, expect } from "vitest";
import {
  computeShotgunSplit,
  type FormationDropbackPlay
} from "../shotgun-split.js";
import { type SuccessPlay } from "../success-rate.js";

const DEFAULT_SEASON = 2025;

function makeSuccessPlay(overrides: Partial<SuccessPlay>): SuccessPlay {
  return {
    playId: "p1",
    teamId: "AAA",
    playerId: "QB1",
    down: 1,
    ydstogo: 10,
    yardsGained: 5,
    touchdown: 0,
    turnover: 0,
    ...overrides
  };
}

function makePlay(overrides: Partial<FormationDropbackPlay>): FormationDropbackPlay {
  return {
    playId: "p1",
    passerId: "QB1",
    season: DEFAULT_SEASON,
    week: 1,
    epa: 0.5,
    shotgun: 1,
    isDropback: true,
    successPlay: makeSuccessPlay({ yardsGained: 5 }), // 1st & 10, 5 yds -> success false since < 40% wait... actually <40% is false, wait, 40% of 10 is 4. 5 >= 4 is true. So it is success.
    ...overrides
  };
}

describe("shotgun-split (SHADOW metric)", () => {
  it("computes exact hand-computed under-center rate, per-arm EPA/dropback, success-rate split, and differential", () => {
    // We need 40 dropbacks overall to clear the MIN_DROPBACKS_OVERALL.
    // Let's do 20 shotgun, 20 under-center.
    // SG: 20 plays, EPA sum = 10, mean = 0.5. Successes = 10 (50%).
    // UC: 20 plays, EPA sum = 0, mean = 0.0. Successes = 0 (0%).
    // Overall: 40 plays, EPA sum = 10, mean = 0.25. Success = 10/40 = 25%.

    // SG shrinkage: (20 / (20 + 20)) * 0.5 + (20 / (20 + 20)) * 0.25 = 0.5 * 0.5 + 0.5 * 0.25 = 0.375
    // UC shrinkage: (20 / (20 + 20)) * 0.0 + (20 / (20 + 20)) * 0.25 = 0.0 + 0.125 = 0.125
    // EPA Diff: UC - SG = 0.125 - 0.375 = -0.250

    const plays: FormationDropbackPlay[] = [];
    for (let i = 0; i < 20; i++) {
      plays.push(makePlay({ playId: `sg-${i}`, shotgun: 1, epa: 0.5, successPlay: makeSuccessPlay({ yardsGained: (i < 10) ? 5 : 0 }) }));
    }
    for (let i = 0; i < 20; i++) {
      plays.push(makePlay({ playId: `uc-${i}`, shotgun: 0, epa: 0.0, successPlay: makeSuccessPlay({ yardsGained: 0 }) })); // success = 0
    }

    const results = computeShotgunSplit(plays, DEFAULT_SEASON, 2, Infinity);
    expect(results).toHaveLength(1);

    const res = results[0]!;
    expect(res.passerId).toBe("QB1");
    expect(res.windowPlays).toBe(40);
    expect(res.overallEpaPerDropback).toBe(0.25);
    expect(res.overallSuccessRate).toBe(0.25);
    expect(res.shotgunRate).toBe(0.5);
    expect(res.underCenterRate).toBe(0.5);

    expect(res.shotgun.plays).toBe(20);
    expect(res.shotgun.epaPerDropback).toBe(0.375);
    expect(res.shotgun.successRate).toBe(0.5);

    expect(res.underCenter.plays).toBe(20);
    expect(res.underCenter.epaPerDropback).toBe(0.125);
    expect(res.underCenter.successRate).toBe(0.0);

    expect(res.epaDifferential).toBe(-0.25);
    expect(res.successRateDifferential).toBe(-0.5);
  });

  it("point-in-time: plays from the target week or later change NOTHING in that week's output", () => {
    const plays: FormationDropbackPlay[] = [];
    // 40 plays in week 1
    for (let i = 0; i < 40; i++) {
      plays.push(makePlay({ week: 1, epa: 1 }));
    }
    // 40 plays in week 2 (should be ignored for targetWeek=2)
    for (let i = 0; i < 40; i++) {
      plays.push(makePlay({ week: 2, epa: -100 }));
    }

    const results = computeShotgunSplit(plays, DEFAULT_SEASON, 2, Infinity);
    expect(results[0]!.windowPlays).toBe(40);
    expect(results[0]!.overallEpaPerDropback).toBe(1);
  });

  it("an arm below its floor reports null for that arm while the other arm and rates still report", () => {
    const plays: FormationDropbackPlay[] = [];
    // 35 SG plays, 5 UC plays (total 40). UC fails the 15-play floor.
    for (let i = 0; i < 35; i++) {
      plays.push(makePlay({ shotgun: 1, epa: 1 }));
    }
    for (let i = 0; i < 5; i++) {
      plays.push(makePlay({ shotgun: 0, epa: -1 }));
    }

    const results = computeShotgunSplit(plays, DEFAULT_SEASON, 2, Infinity);
    expect(results[0]!.windowPlays).toBe(40);

    // SG passes floor
    expect(results[0]!.shotgun.plays).toBe(35);
    expect(results[0]!.shotgun.epaPerDropback).not.toBeNull();

    // UC fails floor
    expect(results[0]!.underCenter.plays).toBe(5);
    expect(results[0]!.underCenter.epaPerDropback).toBeNull();
    expect(results[0]!.underCenter.successRate).toBeNull();

    // Differentials are null
    expect(results[0]!.epaDifferential).toBeNull();
    expect(results[0]!.successRateDifferential).toBeNull();
  });

  it("shrinkage: a small-sample arm's EPA sits strictly between its raw mean and overall EPA", () => {
    // Let's do exactly 15 plays to pass the floor but trigger heavy shrinkage
    // overall: 40 plays (25 SG at 1.0, 15 UC at -1.0)
    // overall mean: (25 - 15) / 40 = 10 / 40 = 0.25
    // UC raw mean = -1.0. Weight = 15 / (15 + 20) = 15/35 = 3/7 ≈ 0.428
    // shrunk UC = (3/7) * -1.0 + (4/7) * 0.25 = -0.428 + 0.142 = -0.285
    // Since -1.0 < -0.285 < 0.25, it is strictly between.
    const plays: FormationDropbackPlay[] = [];
    for (let i = 0; i < 25; i++) {
      plays.push(makePlay({ shotgun: 1, epa: 1.0 }));
    }
    for (let i = 0; i < 15; i++) {
      plays.push(makePlay({ shotgun: 0, epa: -1.0 }));
    }
    const results = computeShotgunSplit(plays, DEFAULT_SEASON, 2, Infinity);
    const res = results[0]!;

    const rawUcEpa = -1.0;
    const overallEpa = res.overallEpaPerDropback;
    expect(overallEpa).toBe(0.25);

    const shrunkUcEpa = res.underCenter.epaPerDropback!;
    expect(shrunkUcEpa).toBeGreaterThan(rawUcEpa);
    expect(shrunkUcEpa).toBeLessThan(overallEpa);

    // Exact check based on hand calc: -0.2857
    expect(shrunkUcEpa).toBeCloseTo(-0.2857, 4);
  });

  it("null-EPA plays are excluded from EPA means and counted in diagnostics; success-rate splits still count them if ratable", () => {
    // 40 plays, 20 SG, 20 UC.
    // 10 SG plays have null EPA but are ratable for success.
    // SG EPA sum from remaining 10 plays is 10 (mean 1.0)
    const plays: FormationDropbackPlay[] = [];
    for (let i = 0; i < 10; i++) {
      plays.push(makePlay({ shotgun: 1, epa: null, successPlay: makeSuccessPlay({ yardsGained: 5 }) })); // success
    }
    for (let i = 0; i < 10; i++) {
      plays.push(makePlay({ shotgun: 1, epa: 1.0, successPlay: makeSuccessPlay({ yardsGained: -1 }) })); // fail
    }
    for (let i = 0; i < 20; i++) {
      plays.push(makePlay({ shotgun: 0, epa: 0.0, successPlay: makeSuccessPlay({ yardsGained: -1 }) })); // fail
    }

    const results = computeShotgunSplit(plays, DEFAULT_SEASON, 2, Infinity);
    const res = results[0]!;

    // 30 plays with finite EPA. overall sum = 10, mean = 0.3333
    expect(res.overallEpaPerDropback).toBeCloseTo(0.3333, 4);

    // SG Success rate should be 10 successes out of 20 = 0.5
    expect(res.shotgun.successRate).toBe(0.5);

    // SG EPA count is 10, so shrinkage uses n=10.
    // Weight = 10/30 = 1/3. Overall = 0.3333. Raw SG = 1.0.
    // Shrunk SG = 1/3 * 1.0 + 2/3 * 0.3333 = 0.3333 + 0.2222 = 0.5556
    expect(res.shotgun.epaPerDropback).toBeCloseTo(0.5556, 4);
  });

  it("scrambles count as dropbacks in the formation they started from; RB runs in the synthetic set change NOTHING", () => {
    const plays: FormationDropbackPlay[] = [];
    for (let i = 0; i < 38; i++) {
      plays.push(makePlay({ shotgun: 1, epa: 1 }));
    }
    // 2 QB scrambles (making 40 total)
    plays.push(makePlay({ shotgun: 1, epa: 1, isDropback: true }));
    plays.push(makePlay({ shotgun: 1, epa: 1, isDropback: true }));

    // 50 RB runs (isDropback = false)
    for (let i = 0; i < 50; i++) {
      plays.push(makePlay({ isDropback: false, epa: -100 }));
    }

    const results = computeShotgunSplit(plays, DEFAULT_SEASON, 2, Infinity);
    expect(results[0]!.windowPlays).toBe(40);
    expect(results[0]!.overallEpaPerDropback).toBe(1.0);
  });

  it("determinism: sorted, id-tiebroken output identical across runs", () => {
    const plays: FormationDropbackPlay[] = [];
    for (let i = 0; i < 40; i++) plays.push(makePlay({ passerId: "B", epa: 1 }));
    for (let i = 0; i < 40; i++) plays.push(makePlay({ passerId: "A", epa: 1 }));

    const r1 = computeShotgunSplit(plays, DEFAULT_SEASON, 2, Infinity);
    const r2 = computeShotgunSplit(plays, DEFAULT_SEASON, 2, Infinity);

    expect(r1[0]!.passerId).toBe("A");
    expect(r1[1]!.passerId).toBe("B");

    expect(r1).toEqual(r2);
  });
});
