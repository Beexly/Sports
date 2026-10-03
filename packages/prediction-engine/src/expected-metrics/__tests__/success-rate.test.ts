/**
 * Unit tests for the deterministic success-rate module.
 */

import { describe, expect, it } from "vitest";
import {
  SUCCESS_RATE_MODEL_VERSION,
  isSuccessfulPlay,
  successRateByDown,
  successRateByPlayer,
  successRateBySituation,
  successRateByTeam,
  type SuccessPlay,
} from "../success-rate.js";

function play(partial: Partial<SuccessPlay>): SuccessPlay {
  return {
    playId: "g-1",
    teamId: "AAA",
    playerId: "P1",
    down: 1,
    ydstogo: 10,
    yardsGained: 0,
    touchdown: 0,
    turnover: 0,
    ...partial,
  };
}

describe("isSuccessfulPlay — down-conditioned yardage rule", () => {
  it("1st down needs 40% of distance", () => {
    expect(isSuccessfulPlay(play({ down: 1, ydstogo: 10, yardsGained: 4 }))).toBe(true);
    expect(isSuccessfulPlay(play({ down: 1, ydstogo: 10, yardsGained: 3 }))).toBe(false);
  });

  it("2nd down needs 60% of distance", () => {
    expect(isSuccessfulPlay(play({ down: 2, ydstogo: 10, yardsGained: 6 }))).toBe(true);
    expect(isSuccessfulPlay(play({ down: 2, ydstogo: 10, yardsGained: 5 }))).toBe(false);
  });

  it("3rd and 4th down need 100% of distance", () => {
    expect(isSuccessfulPlay(play({ down: 3, ydstogo: 10, yardsGained: 10 }))).toBe(true);
    expect(isSuccessfulPlay(play({ down: 3, ydstogo: 10, yardsGained: 9 }))).toBe(false);
    expect(isSuccessfulPlay(play({ down: 4, ydstogo: 10, yardsGained: 10 }))).toBe(true);
    expect(isSuccessfulPlay(play({ down: 4, ydstogo: 10, yardsGained: 9 }))).toBe(false);
  });

  it("a touchdown forces success even on a short gain in a long situation", () => {
    expect(isSuccessfulPlay(play({ down: 3, ydstogo: 20, yardsGained: 1, touchdown: 1 }))).toBe(true);
  });

  it("a turnover forces failure even on a huge gain", () => {
    expect(isSuccessfulPlay(play({ down: 1, ydstogo: 10, yardsGained: 40, turnover: 1 }))).toBe(false);
  });

  it("a turnover DOMINATES a touchdown flag (pick-six is an offensive failure)", () => {
    expect(isSuccessfulPlay(play({ down: 2, ydstogo: 5, yardsGained: 0, touchdown: 1, turnover: 1 }))).toBe(false);
  });

  it("returns null for an unratable down (0 or 5) without touching the fraction table", () => {
    expect(isSuccessfulPlay(play({ down: 0, ydstogo: 10, yardsGained: 8 }))).toBeNull();
    expect(isSuccessfulPlay(play({ down: 5, ydstogo: 10, yardsGained: 8 }))).toBeNull();
  });

  it("returns null (unratable, NOT failure) for a non-finite yardsGained or ydstogo on a valid down", () => {
    expect(isSuccessfulPlay(play({ down: 1, ydstogo: 10, yardsGained: Number("NA") }))).toBeNull();
    expect(isSuccessfulPlay(play({ down: 2, ydstogo: Number.NaN, yardsGained: 6 }))).toBeNull();
  });
});

describe("rollups", () => {
  it("excludes unratable plays from every count", () => {
    const plays = [
      play({ playerId: "P1", down: 1, ydstogo: 10, yardsGained: 5 }), // success
      play({ playerId: "P1", down: 0, ydstogo: 10, yardsGained: 50 }), // unratable → dropped
    ];
    const rows = successRateByPlayer(plays, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.plays).toBe(1);
    expect(rows[0]?.successes).toBe(1);
    expect(rows[0]?.successRate).toBe(1);
  });

  it("excludes a NaN-yardsGained row from the rollup — not counted as a failure", () => {
    const withoutBad = [
      play({ teamId: "AAA", down: 1, ydstogo: 10, yardsGained: 5 }), // success
      play({ teamId: "AAA", down: 2, ydstogo: 10, yardsGained: 6 }), // success
    ];
    const withBad = [
      ...withoutBad,
      play({ teamId: "AAA", down: 1, ydstogo: 10, yardsGained: Number("NA") }), // unratable → dropped
    ];
    const clean = successRateByTeam(withoutBad, 1);
    const dirty = successRateByTeam(withBad, 1);
    // The NaN row neither entered the denominator (plays) nor scored a failure.
    expect(clean[0]?.plays).toBe(2);
    expect(dirty[0]?.plays).toBe(2);
    expect(dirty[0]?.successes).toBe(2);
    // Rate is identical to the rollup WITHOUT the bad row (would be 2/3 = 0.6667 if
    // the NaN row were wrongly counted as a failure).
    expect(dirty[0]?.successRate).toBe(clean[0]?.successRate);
    expect(dirty[0]?.successRate).toBe(1);
  });

  it("drops sub-minPlays groups (mirrors the rollup qualifier)", () => {
    const plays = [
      ...Array.from({ length: 20 }, () => play({ playerId: "BIG", yardsGained: 5 })),
      ...Array.from({ length: 3 }, () => play({ playerId: "SMALL", yardsGained: 5 })),
    ];
    const rows = successRateByPlayer(plays, 20);
    expect(rows.map((r) => r.key)).toEqual(["BIG"]);
  });

  it("rounds success rate to 4 decimals and sorts by rate desc then key asc", () => {
    const plays = [
      play({ teamId: "AAA", down: 1, ydstogo: 10, yardsGained: 5 }), // success
      play({ teamId: "AAA", down: 1, ydstogo: 10, yardsGained: 5 }), // success
      play({ teamId: "AAA", down: 1, ydstogo: 10, yardsGained: 0 }), // fail → 2/3
      play({ teamId: "BBB", down: 1, ydstogo: 10, yardsGained: 5 }), // 1/1
    ];
    const rows = successRateByTeam(plays, 1);
    expect(rows.map((r) => r.key)).toEqual(["BBB", "AAA"]);
    expect(rows[1]?.successRate).toBe(0.6667);
  });

  it("splits by down and by situation bucket deterministically", () => {
    const plays = [
      play({ down: 1, ydstogo: 10, yardsGained: 5 }), // early_long, down:1
      play({ down: 3, ydstogo: 2, yardsGained: 3 }), // late_short, down:3
    ];
    expect(successRateByDown(plays, 1).map((r) => r.key).sort()).toEqual(["down:1", "down:3"]);
    expect(successRateBySituation(plays, 1).map((r) => r.key).sort()).toEqual([
      "situation:early_long",
      "situation:late_short",
    ]);
  });

  it("stamps deterministic-rule provenance", () => {
    const rows = successRateByTeam([play({ yardsGained: 5 })], 1);
    expect(rows[0]?.provenance.method).toBe("deterministic-rule");
    expect(rows[0]?.provenance.modelVersion).toBe(SUCCESS_RATE_MODEL_VERSION);
  });
});
