import { describe, expect, it } from "vitest";
import {
  MANAGEABLE_THIRD_DOWN_MODEL_VERSION,
  computeManageableThirdDownRate,
  type ManageableThirdDownPlay,
} from "../manageable-third-down.js";

function play(partial: Partial<ManageableThirdDownPlay>): ManageableThirdDownPlay {
  return {
    playId: "g-1",
    gameId: "G1",
    week: 1,
    posteam: "AAA",
    defteam: "BBB",
    down: 1,
    ydstogo: 10,
    playType: "pass",
    qbKneel: 0,
    qbSpike: 0,
    fixedDrive: 1,
    ...partial,
  };
}

describe("computeManageableThirdDownRate", () => {
  it("computes attempts, creations, and rate correctly for hand-computed multi-drive fixture", () => {
    const plays: ManageableThirdDownPlay[] = [];
    // To meet minAttemptsFloor=3, we will use a small floor in this test.
    // Drive 1: creation (2nd & 8+ -> 3rd & 4)
    plays.push(play({ playId: "1", down: 2, ydstogo: 8, fixedDrive: 1 }));
    plays.push(play({ playId: "2", down: 3, ydstogo: 4, fixedDrive: 1 })); // creation
    // Drive 2: non-creation (2nd & 8+ -> 3rd & 7)
    plays.push(play({ playId: "3", down: 2, ydstogo: 10, fixedDrive: 2 }));
    plays.push(play({ playId: "4", down: 3, ydstogo: 7, fixedDrive: 2 })); // non-creation
    // Drive 3: conversion on 2nd (2nd & 8+ -> 1st down)
    plays.push(play({ playId: "5", down: 2, ydstogo: 8, fixedDrive: 3 }));
    plays.push(play({ playId: "6", down: 1, ydstogo: 10, fixedDrive: 3 })); // conversion, non-creation
    // Drive 4: resolved on 2nd (no next play in drive)
    plays.push(play({ playId: "7", down: 2, ydstogo: 9, fixedDrive: 4 })); // drive ends

    // Result: 3 attempts (Drive 1, 2, 3), 1 creation, 1 convertedOnSecond, 1 resolvedOnSecond
    const splits = computeManageableThirdDownRate(plays, 2, [Number.POSITIVE_INFINITY], 1);
    expect(splits).toHaveLength(1);

    const s = splits[0]!;
    expect(s.teamId).toBe("AAA");
    expect(s.attempts).toBe(3);
    expect(s.creations).toBe(1);
    expect(s.manageableThirdDownRate).toBe(0.3333);
    expect(s.diagnostics.resolvedOnSecond).toBe(1);
    expect(s.diagnostics.convertedOnSecond).toBe(1);
    expect(s.provenance.modelVersion).toBe(MANAGEABLE_THIRD_DOWN_MODEL_VERSION);
  });

  it("excludes cross-drive transitions from attempts (resolvedOnSecond)", () => {
    const plays = [
      play({ playId: "1", fixedDrive: 1, down: 2, ydstogo: 10 }),
      // Next play is different drive
      play({ playId: "2", fixedDrive: 2, down: 3, ydstogo: 2 }),
    ];
    // We pass minAttemptsFloor=0 to see the 0 attempt entry
    const splits = computeManageableThirdDownRate(plays, 2, [Number.POSITIVE_INFINITY], 0);
    expect(splits[0]!.attempts).toBe(0);
    expect(splits[0]!.diagnostics.resolvedOnSecond).toBe(1);
  });

  it("strictly excludes kneels and spikes", () => {
    const plays = [
      play({ playId: "1", down: 2, ydstogo: 10, fixedDrive: 1 }),
      // Next is a kneel in same drive
      play({ playId: "2", qbKneel: 1, fixedDrive: 1 }),
      // Next is a spike in same drive
      play({ playId: "3", qbSpike: 1, fixedDrive: 1 }),
      // The real next scrimmage play:
      play({ playId: "4", down: 3, ydstogo: 4, fixedDrive: 1 }),
    ];
    const splits = computeManageableThirdDownRate(plays, 2, [Number.POSITIVE_INFINITY], 0);
    // Because kneel and spike are excluded globally, the series is [play1, play4].
    // Play 1 (2nd & 10) is followed by Play 4 (3rd & 4) in the filtered series.
    expect(splits[0]!.attempts).toBe(1);
    expect(splits[0]!.creations).toBe(1);
    expect(splits[0]!.diagnostics.excludedKneelsOrSpikes).toBe(2);
  });

  it("ignores non-qualifying 2nd downs and 1st/3rd downs as candidates", () => {
    const plays = [
      play({ playId: "1", down: 1, ydstogo: 10 }),
      play({ playId: "2", down: 2, ydstogo: 7 }), // ydstogo < 8
      play({ playId: "3", down: 3, ydstogo: 4 }), // creation candidate if preceded, but standalone no
    ];
    // No qualifying 2nd down at all means attempts remain 0
    const splits = computeManageableThirdDownRate(plays, 2, [Number.POSITIVE_INFINITY], 0);
    expect(splits[0].attempts).toBe(0);
  });

  it("enforces point-in-time discipline", () => {
    const plays = [
      // Week 1: 1 creation
      play({ playId: "1", week: 1, down: 2, ydstogo: 10 }),
      play({ playId: "2", week: 1, down: 3, ydstogo: 3 }),
      // Week 2 (target week): 1 creation
      play({ playId: "3", week: 2, down: 2, ydstogo: 10 }),
      play({ playId: "4", week: 2, down: 3, ydstogo: 3 }),
    ];
    const splits = computeManageableThirdDownRate(plays, 2, [Number.POSITIVE_INFINITY], 1);
    // Should only see Week 1
    expect(splits[0]!.attempts).toBe(1);
  });

  it("enforces attempts floor and distinct weeks windowing", () => {
    const plays: ManageableThirdDownPlay[] = [];
    // Generate 31 attempts for AAA across 5 distinct weeks (1, 2, 3, 4, 5)
    // 6 per week (weeks 1-4) = 24. Week 5 = 7 attempts. Total 31.
    for (let w = 1; w <= 5; w++) {
      const attempts = w === 5 ? 7 : 6;
      for (let i = 0; i < attempts; i++) {
        const pId = w * 100 + i * 2;
        plays.push(play({ playId: `${pId}`, week: w, fixedDrive: pId, down: 2, ydstogo: 10 }));
        // All non-creations for simplicity
        plays.push(play({ playId: `${pId + 1}`, week: w, fixedDrive: pId, down: 3, ydstogo: 8 }));
      }
    }

    // AAA has weeks [5, 4, 3, 2, 1]
    const splits = computeManageableThirdDownRate(plays, 6, [Number.POSITIVE_INFINITY, 4, 8], 30);

    // POSITIVE_INFINITY window -> all 31 attempts
    const splitInf = splits.find((s) => s.windowWeeks === Number.POSITIVE_INFINITY)!;
    expect(splitInf).toBeDefined();
    expect(splitInf.attempts).toBe(31);

    // 4-week window -> distinct weeks [5, 4, 3, 2] -> 7 + 6 + 6 + 6 = 25 attempts
    // This is below the floor of 30, so it should be ABSENT!
    const split4 = splits.find((s) => s.windowWeeks === 4);
    expect(split4).toBeUndefined();

    // 8-week window -> all 5 weeks -> 31 attempts
    const split8 = splits.find((s) => s.windowWeeks === 8)!;
    expect(split8).toBeDefined();
    expect(split8.attempts).toBe(31);
  });
});
