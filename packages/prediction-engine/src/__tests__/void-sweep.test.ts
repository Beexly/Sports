import { describe, it, expect } from "vitest";
import {
  DEFAULT_VOID_SWEEP_HOURS,
  parseVoidSweepHours,
  isVoidSweepEligible,
  picksToVoid,
} from "../void-sweep.js";
import { isDecisiveSettlementResult } from "../settlement.js";
import type { VoidSweepGame, VoidSweepPick } from "../void-sweep.js";

const HOUR_MS = 60 * 60 * 1000;
const COMMENCE = new Date("2026-06-01T19:00:00.000Z");

function game(overrides: Partial<VoidSweepGame> = {}): VoidSweepGame {
  return {
    status: "SCHEDULED",
    commenceTime: COMMENCE,
    homeScore: null,
    awayScore: null,
    ...overrides,
  };
}

function atHoursAfterCommence(hours: number): Date {
  return new Date(COMMENCE.getTime() + hours * HOUR_MS);
}

// ============================================================
// parseVoidSweepHours — env configurability, fail-closed parse
// ============================================================

describe("parseVoidSweepHours", () => {
  it("defaults to 12h when unset", () => {
    expect(DEFAULT_VOID_SWEEP_HOURS).toBe(12);
    expect(parseVoidSweepHours(undefined)).toBe(12);
    expect(parseVoidSweepHours("")).toBe(12);
    expect(parseVoidSweepHours("   ")).toBe(12);
  });

  it("accepts a valid positive override", () => {
    expect(parseVoidSweepHours("24")).toBe(24);
    expect(parseVoidSweepHours("6.5")).toBe(6.5);
  });

  it("falls back to the default on garbage, zero, or negative values", () => {
    expect(parseVoidSweepHours("not-a-number")).toBe(12);
    expect(parseVoidSweepHours("0")).toBe(12);
    expect(parseVoidSweepHours("-4")).toBe(12);
    expect(parseVoidSweepHours("Infinity")).toBe(12);
  });
});

// ============================================================
// isVoidSweepEligible — threshold behavior
// ============================================================

describe("isVoidSweepEligible — time threshold", () => {
  it("triggers exactly AT commenceTime + sweep window (inclusive)", () => {
    expect(isVoidSweepEligible(game(), atHoursAfterCommence(12), 12)).toBe(true);
  });

  it("does not trigger one millisecond before the threshold", () => {
    const justBefore = new Date(atHoursAfterCommence(12).getTime() - 1);
    expect(isVoidSweepEligible(game(), justBefore, 12)).toBe(false);
  });

  it("does not trigger for an in-window game (kickoff + 2h)", () => {
    expect(isVoidSweepEligible(game(), atHoursAfterCommence(2), 12)).toBe(false);
  });

  it("triggers long after the threshold", () => {
    expect(isVoidSweepEligible(game(), atHoursAfterCommence(72), 12)).toBe(true);
  });

  it("honors a custom sweep window", () => {
    expect(isVoidSweepEligible(game(), atHoursAfterCommence(5), 4)).toBe(true);
    expect(isVoidSweepEligible(game(), atHoursAfterCommence(5), 6)).toBe(false);
  });
});

describe("isVoidSweepEligible — scores always win (fail-closed)", () => {
  it("NEVER voids a game with both final scores, even far past the threshold", () => {
    const scored = game({ status: "FINAL", homeScore: 21, awayScore: 14 });
    expect(isVoidSweepEligible(scored, atHoursAfterCommence(100), 12)).toBe(false);
  });

  it("does not void a 0-0 final (zero is a real score, not a missing one)", () => {
    const scoreless = game({ status: "FINAL", homeScore: 0, awayScore: 0 });
    expect(isVoidSweepEligible(scoreless, atHoursAfterCommence(100), 12)).toBe(false);
  });

  it("a partial score pair is not gradable — still void-eligible past threshold", () => {
    const partial = game({ status: "FINAL", homeScore: 21, awayScore: null });
    expect(isVoidSweepEligible(partial, atHoursAfterCommence(13), 12)).toBe(true);
  });

  it("scores override an explicit POSTPONED/CANCELED status", () => {
    const scored = game({ status: "POSTPONED", homeScore: 3, awayScore: 1 });
    expect(isVoidSweepEligible(scored, atHoursAfterCommence(1), 12)).toBe(false);
  });
});

describe("isVoidSweepEligible — explicit abandonment status", () => {
  it("POSTPONED voids immediately, before the time threshold", () => {
    expect(isVoidSweepEligible(game({ status: "POSTPONED" }), atHoursAfterCommence(0), 12)).toBe(true);
  });

  it("CANCELED voids immediately, before the time threshold", () => {
    expect(isVoidSweepEligible(game({ status: "CANCELED" }), atHoursAfterCommence(0), 12)).toBe(true);
  });

  it("LIVE/SCHEDULED games inside the window are untouched", () => {
    expect(isVoidSweepEligible(game({ status: "LIVE" }), atHoursAfterCommence(3), 12)).toBe(false);
    expect(isVoidSweepEligible(game({ status: "SCHEDULED" }), atHoursAfterCommence(3), 12)).toBe(false);
  });
});

// ============================================================
// picksToVoid — only PENDING picks, only eligible games
// ============================================================

describe("picksToVoid", () => {
  const picks: readonly VoidSweepPick[] = [
    { id: "p-pending-1", result: "PENDING" },
    { id: "p-win", result: "WIN" },
    { id: "p-loss", result: "LOSS" },
    { id: "p-push", result: "PUSH" },
    { id: "p-void", result: "VOID" },
    { id: "p-pending-2", result: "PENDING" },
  ];

  it("returns only PENDING pick ids — settled W/L/PUSH (and prior VOID) untouched", () => {
    const ids = picksToVoid(game(), picks, atHoursAfterCommence(13), 12);
    expect(ids).toEqual(["p-pending-1", "p-pending-2"]);
  });

  it("returns [] when the game is not yet void-eligible", () => {
    expect(picksToVoid(game(), picks, atHoursAfterCommence(2), 12)).toEqual([]);
  });

  it("returns [] when the game has final scores (normal settlement owns it)", () => {
    const scored = game({ homeScore: 21, awayScore: 14 });
    expect(picksToVoid(scored, picks, atHoursAfterCommence(48), 12)).toEqual([]);
  });

  it("returns [] for an eligible game with no PENDING picks", () => {
    const settledOnly = picks.filter((p) => p.result !== "PENDING");
    expect(picksToVoid(game(), settledOnly, atHoursAfterCommence(48), 12)).toEqual([]);
  });
});

// ============================================================
// Learning/calibration exclusion contract
// ============================================================

describe("VOID exclusion from learning (worker contract)", () => {
  it("VOID is not a decisive result — eligibleForLearning must stay false", () => {
    // The worker's settleResults() gates eligibleForLearning on this exact
    // predicate; VOID and PENDING must never become learning-eligible.
    expect(isDecisiveSettlementResult("WIN")).toBe(true);
    expect(isDecisiveSettlementResult("LOSS")).toBe(true);
    expect(isDecisiveSettlementResult("PUSH")).toBe(true);
    expect(isDecisiveSettlementResult("VOID")).toBe(false);
    expect(isDecisiveSettlementResult("PENDING")).toBe(false);
  });
});
