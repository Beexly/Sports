import { describe, expect, it } from "vitest";
import {
  defensiveSuccessAllowed,
  type DefensiveSuccessPlay,
} from "../defensive-success-allowed.js";
import { SUCCESS_RATE_MODEL_VERSION } from "../success-rate.js";

const TEST_PLAY_BASE = {
  playId: "1-1",
  teamId: "OFF",
  playerId: "P1",
  touchdown: 0 as const,
  turnover: 0 as const,
  defteam: "DEF",
  week: 1,
};

describe("defensiveSuccessAllowed", () => {
  it("computes hand-computed fixture and ensures reconciliation", () => {
    // We create enough plays to pass the 50 floor overall, and 20 per down.
    // Down 1: 20 plays, 8 success = 40%
    // Down 2: 20 plays, 10 success = 50%
    // Down 3: 20 plays, 5 success = 25%
    // Down 4: 20 plays, 2 success = 10%
    // Overall: 80 plays, 25 success = 31.25%

    const plays: DefensiveSuccessPlay[] = [];

    // Down 1
    for (let i = 0; i < 20; i++) {
      plays.push({
        ...TEST_PLAY_BASE,
        playId: `d1-${i}`,
        down: 1,
        ydstogo: 10,
        yardsGained: i < 8 ? 4 : 3, // >= 40% is success
      });
    }

    // Down 2
    for (let i = 0; i < 20; i++) {
      plays.push({
        ...TEST_PLAY_BASE,
        playId: `d2-${i}`,
        down: 2,
        ydstogo: 10,
        yardsGained: i < 10 ? 6 : 5, // >= 60% is success
      });
    }

    // Down 3
    for (let i = 0; i < 20; i++) {
      plays.push({
        ...TEST_PLAY_BASE,
        playId: `d3-${i}`,
        down: 3,
        ydstogo: 10,
        yardsGained: i < 5 ? 10 : 9, // >= 100% is success
      });
    }

    // Down 4
    for (let i = 0; i < 20; i++) {
      plays.push({
        ...TEST_PLAY_BASE,
        playId: `d4-${i}`,
        down: 4,
        ydstogo: 10,
        yardsGained: i < 2 ? 10 : 9, // >= 100% is success
      });
    }

    const results = defensiveSuccessAllowed(plays, 10, "season-to-date");
    expect(results.length).toBe(1);

    const res = results.find(r => (r.overall?.defteam ?? r.down1?.defteam ?? r.down2?.defteam ?? r.down3?.defteam ?? r.down4?.defteam) === "DEF")!;
    const emptyRes = results.find(r => r.emptyDefteamPlays > 0);
    if (emptyRes) {
      res.emptyDefteamPlays = emptyRes.emptyDefteamPlays; // merge for test convenience, or just expect on emptyRes
    }

    // Overall
    expect(res.overall).not.toBeNull();
    expect(res.overall?.plays).toBe(80);
    expect(res.overall?.successes).toBe(25);
    expect(res.overall?.successAllowedRate).toBe(0.3125);
    expect(res.overall?.provenance.method).toBe("deterministic-rule");

    // Down 1
    expect(res.down1).not.toBeNull();
    expect(res.down1?.plays).toBe(20);
    expect(res.down1?.successes).toBe(8);
    expect(res.down1?.successAllowedRate).toBe(0.4000);

    // Down 2
    expect(res.down2).not.toBeNull();
    expect(res.down2?.plays).toBe(20);
    expect(res.down2?.successes).toBe(10);
    expect(res.down2?.successAllowedRate).toBe(0.5000);

    // Down 3
    expect(res.down3).not.toBeNull();
    expect(res.down3?.plays).toBe(20);
    expect(res.down3?.successes).toBe(5);
    expect(res.down3?.successAllowedRate).toBe(0.2500);

    // Down 4
    expect(res.down4).not.toBeNull();
    expect(res.down4?.plays).toBe(20);
    expect(res.down4?.successes).toBe(2);
    expect(res.down4?.successAllowedRate).toBe(0.1000);

    // Reconciliation
    const sumDownPlays = (res.down1?.plays || 0) + (res.down2?.plays || 0) + (res.down3?.plays || 0) + (res.down4?.plays || 0);
    const sumDownSuccess = (res.down1?.successes || 0) + (res.down2?.successes || 0) + (res.down3?.successes || 0) + (res.down4?.successes || 0);
    expect(res.overall?.plays).toBe(sumDownPlays);
    expect(res.overall?.successes).toBe(sumDownSuccess);

    expect(res.unratablePlays).toBe(0);
    expect(res.emptyDefteamPlays).toBe(0);
  });

  it("applies rule reuse semantics (turnover dominates TD, yardage thresholds)", () => {
    const plays: DefensiveSuccessPlay[] = [];

    // We only need to check how it counts, we can bypass floors if we just want to see if it accumulates properly?
    // Actually we need 50 plays to see it overall. Let's make 50 plays.

    // Play 1: TD = success
    plays.push({ ...TEST_PLAY_BASE, down: 1, ydstogo: 10, yardsGained: 0, touchdown: 1 });
    // Play 2: Turnover + TD = failure (turnover dominates)
    plays.push({ ...TEST_PLAY_BASE, down: 1, ydstogo: 10, yardsGained: 10, touchdown: 1, turnover: 1 });
    // Play 3: exactly fraction = success
    plays.push({ ...TEST_PLAY_BASE, down: 2, ydstogo: 10, yardsGained: 6 });
    // Play 4: almost fraction = failure
    plays.push({ ...TEST_PLAY_BASE, down: 2, ydstogo: 10, yardsGained: 5 });

    for(let i=0; i<46; i++) {
        plays.push({ ...TEST_PLAY_BASE, down: 1, ydstogo: 10, yardsGained: 0 }); // failures
    }

    const results = defensiveSuccessAllowed(plays, 10, "season-to-date");
    const defRes = results.find(r => (r.overall?.defteam || r.down1?.defteam) === "DEF")!;

    expect(defRes.overall?.plays).toBe(50);
    // Successes = Play 1, Play 3 -> 2
    expect(defRes.overall?.successes).toBe(2);
  });

  it("asserts unratable discipline (down 5, empty defteam dropped, counted)", () => {
    const plays: DefensiveSuccessPlay[] = [];

    for(let i=0; i<50; i++) {
        plays.push({ ...TEST_PLAY_BASE, down: 1, ydstogo: 10, yardsGained: 4 }); // 50 valid successes
    }

    // Unratable: Down 5
    plays.push({ ...TEST_PLAY_BASE, down: 5, ydstogo: 10, yardsGained: 10 });
    // Unratable: NaN yards
    plays.push({ ...TEST_PLAY_BASE, down: 1, ydstogo: 10, yardsGained: NaN });
    // Empty defteam
    plays.push({ ...TEST_PLAY_BASE, defteam: "", down: 1, ydstogo: 10, yardsGained: 10 });

    const results = defensiveSuccessAllowed(plays, 10, "season-to-date");

    const defRes = results.find(r => (r.overall?.defteam || r.down1?.defteam) === "DEF")!;
    expect(defRes.overall?.plays).toBe(50);
    expect(defRes.unratablePlays).toBe(2);

    // empty defteam was assigned to the "" team in byDefteam which gets emitted as a result row (with all nulls)
    const emptyRes = results.find(r => r.emptyDefteamPlays > 0)!;
    expect(emptyRes.emptyDefteamPlays).toBe(1);
    expect(emptyRes.overall).toBeNull();
  });

  it("asserts floors (19 down arm absent, 49 overall absent)", () => {
    const plays: DefensiveSuccessPlay[] = [];

    for(let i=0; i<49; i++) {
        plays.push({ ...TEST_PLAY_BASE, down: 1, ydstogo: 10, yardsGained: 4 });
    }

    const results = defensiveSuccessAllowed(plays, 10, "season-to-date");
    const defRes = results.find(r => (r.overall?.defteam || r.down1?.defteam) === "DEF")!;

    // Overall should be null because 49 < 50
    expect(defRes.overall).toBeNull();
    // Down 1 should be present because 49 >= 20
    expect(defRes.down1).not.toBeNull();
    // Down 2 should be null because 0 < 20
    expect(defRes.down2).toBeNull();

    // Make it 19 for Down 2, 31 for Down 1 -> total 50.
    const plays2: DefensiveSuccessPlay[] = [];
    for(let i=0; i<31; i++) {
        plays2.push({ ...TEST_PLAY_BASE, down: 1, ydstogo: 10, yardsGained: 4 });
    }
    for(let i=0; i<19; i++) {
        plays2.push({ ...TEST_PLAY_BASE, down: 2, ydstogo: 10, yardsGained: 6 });
    }

    const results2 = defensiveSuccessAllowed(plays2, 10, "season-to-date");
    const defRes2 = results2.find(r => (r.overall?.defteam || r.down1?.defteam) === "DEF")!;

    // Overall should be present because 50 >= 50
    expect(defRes2.overall).not.toBeNull();
    // Down 2 should be null because 19 < 20
    expect(defRes2.down2).toBeNull();
    expect(defRes2.down1).not.toBeNull();
  });

  it("asserts point-in-time and windows", () => {
    const plays: DefensiveSuccessPlay[] = [];

    // Week 1 to 10, 10 plays each = 100 plays
    for (let w = 1; w <= 10; w++) {
      for (let i = 0; i < 10; i++) {
        plays.push({ ...TEST_PLAY_BASE, week: w, down: 1, ydstogo: 10, yardsGained: 4 });
      }
    }

    // targetWeek = 9, so weeks >= 9 are EXCLUDED.
    // This means valid plays are week 1..8 (80 plays).
    const results1 = defensiveSuccessAllowed(plays, 9, "season-to-date");
    const defRes1 = results1.find(r => (r.overall?.defteam || r.down1?.defteam) === "DEF")!;
    expect(defRes1.overall?.plays).toBe(80);

    // last-4 window for targetWeek = 9 -> distinct weeks below 9 = 8, 7, 6, 5
    // Each week has 10 plays, so 4 weeks * 10 plays = 40 plays
    const results2 = defensiveSuccessAllowed(plays, 9, "last-4");
    const defRes2 = results2.find(r => (r.overall?.defteam || r.down1?.defteam) === "DEF")!;
    expect(defRes2.overall).toBeNull();

    // To test last-4 with floor >= 50, let's bump it up.
    for (let w = 5; w <= 8; w++) {
      for (let i = 0; i < 5; i++) {
        plays.push({ ...TEST_PLAY_BASE, week: w, down: 1, ydstogo: 10, yardsGained: 4 });
      }
    }
    // Now weeks 5,6,7,8 have 15 plays each = 60 plays total.
    const results3 = defensiveSuccessAllowed(plays, 9, "last-4");
    const defRes3 = results3.find(r => (r.overall?.defteam || r.down1?.defteam) === "DEF")!;
    expect(defRes3.overall?.plays).toBe(60);
  });
});
