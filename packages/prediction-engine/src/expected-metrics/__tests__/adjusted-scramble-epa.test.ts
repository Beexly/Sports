import { describe, it, expect } from "vitest";
import { computeAdjustedScrambleEpa, type AdjustedScramblePlay } from "../adjusted-scramble-epa.js";

describe("adjusted-scramble-epa", () => {
  it("matches hand-computed means and ignores distinct runs", () => {
    const qb = "QB1";
    const plays: AdjustedScramblePlay[] = [
      // Week 1 plays
      { playId: "1", gameId: "g1", week: 1, posteam: "TB", passerPlayerId: qb, rusherPlayerId: qb, qbScramble: 1, sack: 0, epa: 1.0 },
      { playId: "2", gameId: "g1", week: 1, posteam: "TB", passerPlayerId: qb, rusherPlayerId: qb, qbScramble: 1, sack: 0, epa: 2.0 },
      { playId: "3", gameId: "g1", week: 1, posteam: "TB", passerPlayerId: qb, rusherPlayerId: qb, qbScramble: 0, sack: 1, epa: -1.0 },
      { playId: "4", gameId: "g1", week: 1, posteam: "TB", passerPlayerId: qb, rusherPlayerId: qb, qbScramble: 0, sack: 1, epa: -2.0 },
      // Opportunity that shouldn't count (not a scramble, not a sack - regular pass attempt)
      { playId: "5", gameId: "g1", week: 1, posteam: "TB", passerPlayerId: qb, rusherPlayerId: qb, qbScramble: 0, sack: 0, epa: 3.0 },
      // Opportunity that shouldn't count due to null epa
      { playId: "6", gameId: "g1", week: 1, posteam: "TB", passerPlayerId: qb, rusherPlayerId: qb, qbScramble: 1, sack: 0, epa: null },
    ];

    // Duplicate these enough times to hit the floor of 20
    const fixturePlays: AdjustedScramblePlay[] = [];
    for (let i = 0; i < 5; i++) {
        plays.forEach(p => fixturePlays.push({...p, playId: p.playId + "-" + i}));
    }

    const res = computeAdjustedScrambleEpa(fixturePlays, 2);

    expect(res.qbs.length).toBe(1);
    const qbRes = res.qbs[0];

    // 2 scrambles, 2 sacks per set * 5 = 10 scrambles, 10 sacks = 20 opportunities
    // plus 1 scramble per set with null epa -> total scrambles 15, total sacks 10, total opportunities 25
    expect(qbRes.opportunities).toBe(25);
    expect(qbRes.scrambles).toBe(15);
    expect(qbRes.sacks).toBe(10);
    expect(qbRes.scrambleEpaMean).toBe(1.5); // (1+2)/2
    expect(qbRes.sackEpaMean).toBe(-1.5); // (-1-2)/2
    expect(qbRes.adjustedScrambleEpa).toBe(0); // (1.5 * 10 + -1.5 * 10) / 20 = 0

    // 1 unratable opportunity per set * 5 = 5
    expect(res.diagnostics.unratableOpportunitiesExcluded).toBe(5);
  });

  it("sack dominates when both qbScramble and sack are 1", () => {
    const qb = "QB1";
    const fixturePlays: AdjustedScramblePlay[] = [];

    // 25 plays, all with qbScramble=1 and sack=1
    for (let i = 0; i < 25; i++) {
        fixturePlays.push({ playId: `p${i}`, gameId: "g1", week: 1, posteam: "TB", passerPlayerId: qb, rusherPlayerId: qb, qbScramble: 1, sack: 1, epa: -1.0 });
    }

    const res = computeAdjustedScrambleEpa(fixturePlays, 2);
    expect(res.qbs[0].opportunities).toBe(25);
    expect(res.qbs[0].scrambles).toBe(0);
    expect(res.qbs[0].sacks).toBe(25);
  });

  it("credits scramble to passerPlayerId, ignoring rusherPlayerId", () => {
    const qb = "QB_PASSER";
    const rb = "RB_RUSHER";
    const fixturePlays: AdjustedScramblePlay[] = [];

    for (let i = 0; i < 20; i++) {
        fixturePlays.push({ playId: `p${i}`, gameId: "g1", week: 1, posteam: "TB", passerPlayerId: qb, rusherPlayerId: rb, qbScramble: 1, sack: 0, epa: 1.0 });
    }

    const res = computeAdjustedScrambleEpa(fixturePlays, 2);
    expect(res.qbs[0].passerPlayerId).toBe(qb);
  });

  it("applies floor of 20 opportunities", () => {
    const qb = "QB1";
    const fixturePlays: AdjustedScramblePlay[] = [];

    for (let i = 0; i < 19; i++) {
        fixturePlays.push({ playId: `p${i}`, gameId: "g1", week: 1, posteam: "TB", passerPlayerId: qb, rusherPlayerId: qb, qbScramble: 1, sack: 0, epa: 1.0 });
    }

    const res = computeAdjustedScrambleEpa(fixturePlays, 2);
    expect(res.qbs.length).toBe(0);
    expect(res.diagnostics.qbsBelowFloor).toBe(1);

    fixturePlays.push({ playId: `p19`, gameId: "g1", week: 1, posteam: "TB", passerPlayerId: qb, rusherPlayerId: qb, qbScramble: 1, sack: 0, epa: 1.0 });
    const res2 = computeAdjustedScrambleEpa(fixturePlays, 2);
    expect(res2.qbs.length).toBe(1);
    expect(res2.diagnostics.qbsBelowFloor).toBe(0);
  });

  it("enforces distinct weeks limit", () => {
    const qb = "QB1";
    const fixturePlays: AdjustedScramblePlay[] = [];

    // Weeks 1-10, 5 opportunities each
    for (let w = 1; w <= 10; w++) {
        for (let i = 0; i < 5; i++) {
            fixturePlays.push({ playId: `w${w}p${i}`, gameId: `g${w}`, week: w, posteam: "TB", passerPlayerId: qb, rusherPlayerId: qb, qbScramble: 1, sack: 0, epa: w });
        }
    }

    // targetWeek 11, distinctWeeksLimit 4 -> should only include weeks 7, 8, 9, 10
    const res = computeAdjustedScrambleEpa(fixturePlays, 11, 4);

    expect(res.qbs.length).toBe(1);
    expect(res.qbs[0].opportunities).toBe(20); // 4 weeks * 5 ops
    // expected mean = (7 + 8 + 9 + 10) / 4 = 8.5
    expect(res.qbs[0].scrambleEpaMean).toBe(8.5);
  });
});
