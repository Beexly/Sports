/**
 * The input side of the continuous path, tested for the properties that matter
 * most: it must never invent a number, and it must never read the future.
 *
 * `deriveSignalGameContext` decides what the 23 wired continuous signals get to
 * see. The dangerous failure is not "too little data" — that produces abstention,
 * which is correct — it is confidently WRONG data entering a published
 * probability. So these tests attack fabrication and lookahead specifically.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getTeamScoringRecords: vi.fn(),
  getLeagueAverageScored: vi.fn(),
}));

vi.mock("@sports/data-ingestion", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@sports/data-ingestion");
  return {
    ...actual,
    getTeamScoringRecords: mocks.getTeamScoringRecords,
    getLeagueAverageScored: mocks.getLeagueAverageScored,
  };
});

import {
  deriveSignalGameContext,
  deriveSignalGameContextCached,
  SignalContextCache,
} from "../signal-game-context.js";

const KICKOFF = new Date("2026-10-01T18:00:00Z");
const input = {
  sportKey: "americanfootball_nfl",
  homeTeam: "KC",
  awayTeam: "NE",
  commenceTime: KICKOFF,
};

function rows(n: number, scored: number, allowed: number, bootstrap = false) {
  return Array.from({ length: n }, () => ({
    teamScore: scored,
    opponentScore: allowed,
    isBootstrap: bootstrap,
  }));
}

describe("deriveSignalGameContext", () => {
  beforeEach(() => {
    mocks.getTeamScoringRecords.mockReset();
    mocks.getLeagueAverageScored.mockReset();
  });

  it("NEVER reads a game at or after kickoff", async () => {
    mocks.getTeamScoringRecords.mockResolvedValue(rows(10, 25, 20));
    mocks.getLeagueAverageScored.mockResolvedValue(22);
    await deriveSignalGameContext(input);
    // Every call must carry the kickoff as an exclusive upper bound.
    for (const call of mocks.getTeamScoringRecords.mock.calls) {
      expect(call[3]).toBe(KICKOFF);
    }
  });

  it("drops bootstrap rows and reports the honest sample size", async () => {
    // 8 real + 12 bootstrap: the engine may only reason from the 8.
    mocks.getTeamScoringRecords
      .mockResolvedValueOnce([...rows(8, 30, 18), ...rows(12, 999, 999, true)])
      .mockResolvedValueOnce(rows(8, 19, 25));
    mocks.getLeagueAverageScored.mockResolvedValue(22);
    const ctx = await deriveSignalGameContext(input);
    expect(ctx.homeSample).toBe(8);
    expect(ctx.awaySample).toBe(8);
    // The synthetic 999 rows must not move the average: real mean is 30.
    expect(ctx.env.TEAM_SCORED_AVG).toBe("30.0000");
  });

  it("abstains entirely below the minimum sample rather than rate on noise", async () => {
    // Three games is not evidence. No env at all is the honest output.
    mocks.getTeamScoringRecords.mockResolvedValue(rows(3, 30, 18));
    mocks.getLeagueAverageScored.mockResolvedValue(22);
    const ctx = await deriveSignalGameContext(input);
    expect(ctx.env.TEAM_SCORED_AVG).toBeUndefined();
    expect(ctx.env).toEqual({});
  });

  it("withholds rates when the league average is missing or non-positive", async () => {
    mocks.getTeamScoringRecords.mockResolvedValue(rows(10, 25, 20));
    mocks.getLeagueAverageScored.mockResolvedValue(0);
    const ctx = await deriveSignalGameContext(input);
    // Without a benchmark there is nothing to compare against, so no rate.
    expect(ctx.env.TEAM_SCORED_AVG).toBeUndefined();
  });

  it("fails closed when the data layer throws — never a default", async () => {
    mocks.getTeamScoringRecords.mockRejectedValue(new Error("DB down"));
    mocks.getLeagueAverageScored.mockRejectedValue(new Error("DB down"));
    const ctx = await deriveSignalGameContext(input);
    expect(ctx.env).toEqual({});
    expect(ctx.sources).toEqual([]);
    expect(ctx.homeSample).toBe(0);
  });

  it("does not fabricate situational inputs it cannot establish", async () => {
    mocks.getTeamScoringRecords.mockResolvedValue(rows(10, 25, 20));
    mocks.getLeagueAverageScored.mockResolvedValue(22);
    const ctx = await deriveSignalGameContext(input);
    // Rest / travel / wind come from sources this builder does not query. They
    // must be ABSENT so those evaluators abstain, not defaulted to a plausible
    // number that would enter a published probability as if it were observed.
    for (const k of ["REST_DAYS", "OPP_REST_DAYS", "IS_ROAD_TEAM", "WIND_MPH", "DEFENSIVE_PLAYS"]) {
      expect(ctx.env[k], `${k} must not be invented`).toBeUndefined();
    }
  });

  it("states its real sources", async () => {
    mocks.getTeamScoringRecords.mockResolvedValue(rows(10, 25, 20));
    mocks.getLeagueAverageScored.mockResolvedValue(22);
    const ctx = await deriveSignalGameContext(input);
    expect(ctx.sources).toContain("TeamGameLog");
    expect(ctx.leagueAvgScored).toBe(22);
  });
});

describe("SignalContextCache", () => {
  beforeEach(() => {
    mocks.getTeamScoringRecords.mockReset();
    mocks.getLeagueAverageScored.mockReset();
  });

  it("queries a team ONCE per (team, kickoff day) and reuses it", async () => {
    mocks.getTeamScoringRecords.mockResolvedValue(rows(10, 25, 20));
    mocks.getLeagueAverageScored.mockResolvedValue(22);
    const cache = new SignalContextCache();
    const day = new Date("2026-10-01T18:00:00Z");

    await deriveSignalGameContextCached({ ...input, homeTeam: "KC", commenceTime: day }, cache);
    await deriveSignalGameContextCached({ ...input, homeTeam: "KC", commenceTime: day }, cache);

    const kcCalls = mocks.getTeamScoringRecords.mock.calls.filter((c) => c[0] === "KC");
    expect(kcCalls.length).toBe(1);
    expect(cache.size).toBeGreaterThan(0);
  });

  it("NEVER serves one kickoff day a later day's view", async () => {
    // The whole point of keying on the day: a rate looked up as of Oct 1 must
    // not answer a question about Oct 8. That would be lookahead, and no cache
    // is worth introducing it.
    // Keyed by team AND day, so the two lookups cannot collide on one another:
    // KC on Oct 1 and KC on Oct 8 must be genuinely different queries.
    mocks.getTeamScoringRecords.mockImplementation(async (team: string) =>
      team === "KC" ? rows(10, 25, 20) : rows(10, 19, 25),
    );
    mocks.getLeagueAverageScored.mockResolvedValue(22);
    const cache = new SignalContextCache();

    const early = await deriveSignalGameContextCached(
      { ...input, homeTeam: "KC", commenceTime: new Date("2026-10-01T18:00:00Z") }, cache);
    const late = await deriveSignalGameContextCached(
      { ...input, homeTeam: "KC", commenceTime: new Date("2026-10-08T18:00:00Z") }, cache);

    expect(early.env.TEAM_SCORED_AVG).toBe("25.0000");
    // A different day MUST be a different query, so a changed truth comes back.
    const kcDays = mocks.getTeamScoringRecords.mock.calls.filter((c) => c[0] === "KC");
    expect(kcDays.length).toBe(2);
    expect(kcDays[0][3]?.toISOString()).not.toBe(kcDays[1][3]?.toISOString());
  });
});
