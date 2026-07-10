import { describe, it, expect, afterEach } from "vitest";
import {
  isQuietBoard,
  quietBoardHorizonHours,
  DEFAULT_QUIET_BOARD_HORIZON_HOURS,
} from "./quiet-board.js";

const NOW = new Date("2026-07-10T12:00:00Z");

function hoursFromNow(h: number): Date {
  return new Date(NOW.getTime() + h * 3_600_000);
}

describe("isQuietBoard", () => {
  it("is quiet when every game is beyond the horizon (mid-week MLS shape)", () => {
    // Observed production shape: 6 weekend games, ~40h+ out, books untouched 13h.
    const commences = [hoursFromNow(40), hoursFromNow(42), hoursFromNow(48)];
    expect(isQuietBoard(commences, NOW, 24)).toBe(true);
  });

  it("is NOT quiet when any upcoming game is inside the horizon (dead board near kickoff = incident)", () => {
    const commences = [hoursFromNow(40), hoursFromNow(6)];
    expect(isQuietBoard(commences, NOW, 24)).toBe(false);
  });

  it("a game exactly at the horizon boundary counts as inside (must be fresh)", () => {
    expect(isQuietBoard([hoursFromNow(24)], NOW, 24)).toBe(false);
  });

  it("ignores games already underway — no pregame pick exists for them and books stop updating at start", () => {
    const commences = [hoursFromNow(-3), hoursFromNow(-1)];
    expect(isQuietBoard(commences, NOW, 24)).toBe(true);
  });

  it("ignores unparseable commence times (they cannot prove the board is loud)", () => {
    expect(isQuietBoard([new Date(NaN), hoursFromNow(48)], NOW, 24)).toBe(true);
    expect(isQuietBoard([new Date(NaN), hoursFromNow(2)], NOW, 24)).toBe(false);
  });

  it("an empty feed is vacuously quiet", () => {
    expect(isQuietBoard([], NOW, 24)).toBe(true);
  });
});

describe("quietBoardHorizonHours", () => {
  const key = "QUIET_BOARD_HORIZON_HOURS";
  const original = process.env[key];

  afterEach(() => {
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  });

  it("defaults to 24h", () => {
    delete process.env[key];
    expect(quietBoardHorizonHours()).toBe(DEFAULT_QUIET_BOARD_HORIZON_HOURS);
    expect(DEFAULT_QUIET_BOARD_HORIZON_HOURS).toBe(24);
  });

  it("honours a valid env override", () => {
    process.env[key] = "36";
    expect(quietBoardHorizonHours()).toBe(36);
  });

  it("rejects garbage/non-positive overrides and keeps the default", () => {
    for (const bad of ["", "abc", "0", "-4"]) {
      process.env[key] = bad;
      expect(quietBoardHorizonHours()).toBe(DEFAULT_QUIET_BOARD_HORIZON_HOURS);
    }
  });
});
