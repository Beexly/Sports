import { describe, expect, it } from "vitest";
import { computeAnya, type AnyaPlay, ANY_A_MODEL_VERSION } from "../any-a.js";

function play(partial: Partial<AnyaPlay>): AnyaPlay {
  return {
    playId: "g-1",
    week: 1,
    gameId: "g1",
    passerId: "P1",
    posteam: "AAA",
    playType: "pass",
    isSack: false,
    passingYards: 10,
    yardsGained: 10,
    touchdown: false,
    tdTeam: "AAA",
    interception: false,
    ...partial,
  };
}

describe("ANY/A formula computation", () => {
  it("computes ANY/A correctly including +20 TD and -45 INT", () => {
    // 60 dropbacks (to pass floor)
    const plays: AnyaPlay[] = [];
    // 58 standard attempts: 580 passing yards
    for (let i = 0; i < 58; i++) {
      plays.push(play({ passingYards: 10, yardsGained: 10 }));
    }
    // 1 passing TD: 10 passing yards, +20 TD bonus
    plays.push(play({ passingYards: 10, yardsGained: 10, touchdown: true }));
    // 1 interception: 0 passing yards, -45 INT penalty
    plays.push(play({ passingYards: 0, yardsGained: 0, interception: true }));

    // totals: 60 attempts, 0 sacks.
    // passingYards = 58 * 10 + 10 + 0 = 590
    // ANY/A = (590 + 20*1 - 45*1 - 0) / 60 = (590 + 20 - 45) / 60 = 565 / 60 = 9.4167

    const result = computeAnya(plays, 2);
    expect(result.records).toHaveLength(3); // season-to-date, last-4, last-8

    for (const r of result.records) {
      expect(r.anyA).toBe(9.4167);
      expect(r.attempts).toBe(60);
      expect(r.passingYards).toBe(590);
      expect(r.passingTds).toBe(1);
      expect(r.interceptions).toBe(1);
      expect(r.sackYards).toBe(0);
      expect(r.sacks).toBe(0);
    }
  });

  it("handles sacks correctly: excluded from attempts, included in denominator, yardage via sackYards only", () => {
    const plays: AnyaPlay[] = [];
    // 59 standard attempts: 590 passing yards
    for (let i = 0; i < 59; i++) {
      plays.push(play({ passingYards: 10, yardsGained: 10 }));
    }
    // 1 sack for -5 yards
    // A sack row should NOT contribute to passingYards even if the loader maps passingYards.
    plays.push(play({ isSack: true, yardsGained: -5, passingYards: 100 }));

    // totals: 59 attempts, 1 sack -> 60 dropbacks
    // passingYards = 59 * 10 = 590 (the 100 passingYards on the sack play is ignored)
    // sackYards = 5 (positive magnitude)
    // ANY/A = (590 + 0 - 0 - 5) / 60 = 585 / 60 = 9.75

    const result = computeAnya(plays, 2);
    expect(result.records).toHaveLength(3);
    const r = result.records[0]!;
    expect(r.attempts).toBe(59);
    expect(r.sacks).toBe(1);
    expect(r.dropbacks).toBe(60);
    expect(r.passingYards).toBe(590);
    expect(r.sackYards).toBe(5);
    expect(r.anyA).toBe(9.75);
  });

  it("does not count rushing TDs or opponent defensive TDs as passing TDs", () => {
    const plays: AnyaPlay[] = [];
    for (let i = 0; i < 60; i++) {
      plays.push(play({ passingYards: 10, yardsGained: 10 }));
    }
    // Passing TD with td_team != posteam (pick six)
    plays.push(play({ passingYards: 0, yardsGained: 0, interception: true, touchdown: true, tdTeam: "BBB" }));
    // QB rush TD (playType: "run")
    plays.push(play({ playType: "run", yardsGained: 5, touchdown: true, tdTeam: "AAA" }));

    // totals: 61 attempts, 0 sacks.
    // passingYards = 60 * 10 = 600
    // interceptions = 1
    // passingTds = 0 (the pick six doesn't count, the run TD doesn't count)
    // ANY/A = (600 + 0 - 45 - 0) / 61 = 555 / 61 = 9.0984

    const result = computeAnya(plays, 2);
    const r = result.records[0]!;
    expect(r.attempts).toBe(61);
    expect(r.passingTds).toBe(0);
    expect(r.interceptions).toBe(1);
    expect(r.anyA).toBe(9.0984);
  });
});

describe("point-in-time discipline", () => {
  it("ignores plays from weeks >= asOfWeek", () => {
    const plays: AnyaPlay[] = [];
    for (let i = 0; i < 60; i++) plays.push(play({ week: 1 }));
    for (let i = 0; i < 10; i++) plays.push(play({ week: 2 }));

    // Check asOf = 2 (should only include week 1)
    const resultAsOf2 = computeAnya(plays, 2);
    expect(resultAsOf2.records[0]!.dropbacks).toBe(60);

    // Check asOf = 3 (includes week 1 and 2)
    const resultAsOf3 = computeAnya(plays, 3);
    expect(resultAsOf3.records[0]!.dropbacks).toBe(70);
  });
});

describe("floor and null discipline", () => {
  it("excludes passers below the 60 dropback floor and increments excludedBelowFloor", () => {
    const plays: AnyaPlay[] = [];
    for (let i = 0; i < 59; i++) plays.push(play({}));

    const result = computeAnya(plays, 2);
    expect(result.records).toHaveLength(0);
    expect(result.counts.excludedBelowFloor).toBe(3); // season, last-4, last-8 all below
  });

  it("yields no record (never NaN or 0) for zero dropbacks", () => {
    // Only pass play with no passerId, and run plays
    const plays: AnyaPlay[] = [
      play({ passerId: "" }),
      play({ playType: "run" })
    ];

    const result = computeAnya(plays, 2);
    expect(result.records).toHaveLength(0);
    expect(result.counts.excludedBelowFloor).toBe(0); // 0 dropbacks shouldn't count as 'excluded below floor', it just doesn't emit
  });
});

describe("rolling windows", () => {
  it("calculates last 4 and last 8 distinct games correctly", () => {
    const plays: AnyaPlay[] = [];
    // 10 games, 10 dropbacks each
    for (let w = 1; w <= 10; w++) {
      for (let i = 0; i < 10; i++) {
        plays.push(play({ week: w, gameId: `g${w}` }));
      }
    }
    // Totals per game = 10 dropbacks, 100 passing yards

    const result = computeAnya(plays, 11);
    // Should have season-to-date (100 db), last-4 (40 db), last-8 (80 db)

    const std = result.records.find(r => r.windowType === "season-to-date");
    const last4 = result.records.find(r => r.windowType === "last-4");
    const last8 = result.records.find(r => r.windowType === "last-8");

    expect(std!.dropbacks).toBe(100);

    // last4 has 40 dropbacks (below floor of 60), so it should be missing!
    expect(last4).toBeUndefined();

    expect(last8!.dropbacks).toBe(80);
    expect(last8!.passingYards).toBe(800);
  });
});

describe("provenance", () => {
  it("stamps provenance with deterministic-rule and correct modelVersion", () => {
    const plays: AnyaPlay[] = [];
    for (let i = 0; i < 60; i++) plays.push(play({}));
    const result = computeAnya(plays, 2);
    expect(result.records[0]!.provenance.method).toBe("deterministic-rule");
    expect(result.records[0]!.provenance.modelVersion).toBe(ANY_A_MODEL_VERSION);
  });
});
