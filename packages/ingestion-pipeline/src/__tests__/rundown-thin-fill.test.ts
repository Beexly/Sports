import { beforeEach, describe, expect, it } from "vitest";
import type { OddsApiEvent } from "@sports/types";
import {
  RUNDOWN_RATE_LIMIT_COOLDOWN_MS,
  isInThinFillWindow,
  isRundownCoolingDown,
  isRundownThinFillSport,
  openRundownCooldown,
  resetRundownCooldowns,
  rundownCooldownRemainingMs,
  thinFillCandidates,
} from "../rundown-thin-fill.js";

const NOW = Date.parse("2026-09-09T13:00:00.000Z");

function event(overrides: Partial<OddsApiEvent> = {}): OddsApiEvent {
  return {
    id: "odds-1",
    sport_key: "americanfootball_nfl",
    sport_title: "NFL",
    commence_time: new Date(NOW + 6 * 3600 * 1000).toISOString(),
    home_team: "Chiefs",
    away_team: "Bills",
    bookmakers: [],
    ...overrides,
  };
}

describe("isRundownThinFillSport", () => {
  it("admits NFL and NCAAF only", () => {
    expect(isRundownThinFillSport("americanfootball_nfl")).toBe(true);
    expect(isRundownThinFillSport("americanfootball_ncaaf")).toBe(true);
    expect(isRundownThinFillSport("baseball_mlb")).toBe(false);
    expect(isRundownThinFillSport("soccer_usa_mls")).toBe(false);
    expect(isRundownThinFillSport("basketball_nba")).toBe(false);
  });
});

describe("isInThinFillWindow", () => {
  it("admits a game inside the 72-hour board window", () => {
    expect(isInThinFillWindow(event(), NOW)).toBe(true);
    expect(
      isInThinFillWindow(event({ commence_time: new Date(NOW + 71 * 3600 * 1000).toISOString() }), NOW),
    ).toBe(true);
  });

  it("admits a game in play inside the grace behind now", () => {
    expect(
      isInThinFillWindow(event({ commence_time: new Date(NOW - 2 * 3600 * 1000).toISOString() }), NOW),
    ).toBe(true);
  });

  it("refuses a finished game, a game beyond the window, and an unparseable time", () => {
    expect(
      isInThinFillWindow(event({ commence_time: new Date(NOW - 30 * 3600 * 1000).toISOString() }), NOW),
    ).toBe(false);
    expect(
      isInThinFillWindow(event({ commence_time: new Date(NOW + 96 * 3600 * 1000).toISOString() }), NOW),
    ).toBe(false);
    expect(isInThinFillWindow(event({ commence_time: "not-a-date" }), NOW)).toBe(false);
  });
});

describe("thinFillCandidates", () => {
  it("keeps only the thin events inside the window", () => {
    const inWindow = event({ id: "in" });
    const past = event({ id: "past", commence_time: new Date(NOW - 48 * 3600 * 1000).toISOString() });
    expect(thinFillCandidates([inWindow, past], NOW).map((e) => e.id)).toEqual(["in"]);
  });
});

describe("429 cooldown", () => {
  beforeEach(() => {
    resetRundownCooldowns();
  });

  it("is closed by default", () => {
    expect(isRundownCoolingDown("americanfootball_nfl", NOW)).toBe(false);
    expect(rundownCooldownRemainingMs("americanfootball_nfl", NOW)).toBe(0);
  });

  it("opens for 30 minutes and reports the resume time", () => {
    const resumeAt = openRundownCooldown("americanfootball_nfl", NOW);
    expect(resumeAt.getTime()).toBe(NOW + RUNDOWN_RATE_LIMIT_COOLDOWN_MS);
    expect(isRundownCoolingDown("americanfootball_nfl", NOW)).toBe(true);
    expect(rundownCooldownRemainingMs("americanfootball_nfl", NOW)).toBe(RUNDOWN_RATE_LIMIT_COOLDOWN_MS);
  });

  it("still blocks one minute before the cooldown expires and clears once past it", () => {
    openRundownCooldown("americanfootball_nfl", NOW);
    expect(isRundownCoolingDown("americanfootball_nfl", NOW + 29 * 60 * 1000)).toBe(true);
    expect(isRundownCoolingDown("americanfootball_nfl", NOW + RUNDOWN_RATE_LIMIT_COOLDOWN_MS)).toBe(false);
    expect(isRundownCoolingDown("americanfootball_nfl", NOW + 31 * 60 * 1000)).toBe(false);
  });

  it("is per sport — a 429 on NFL does not silence NCAAF", () => {
    openRundownCooldown("americanfootball_nfl", NOW);
    expect(isRundownCoolingDown("americanfootball_nfl", NOW)).toBe(true);
    expect(isRundownCoolingDown("americanfootball_ncaaf", NOW)).toBe(false);
  });

  it("extends rather than shortens when a second 429 lands inside the window", () => {
    openRundownCooldown("americanfootball_nfl", NOW);
    const second = openRundownCooldown("americanfootball_nfl", NOW + 10 * 60 * 1000);
    expect(second.getTime()).toBe(NOW + 10 * 60 * 1000 + RUNDOWN_RATE_LIMIT_COOLDOWN_MS);
  });
});
