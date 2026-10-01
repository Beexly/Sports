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
import { applyContinuousSignalTilt } from "../continuous-signal-tilt.js";
import { SIGNAL_REGISTRY } from "../signal-registry-definitions.js";

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
            // Destructured after the length assertion; `as Date` marks the non-null
            // bound the assertion above already establishes.
            const [firstKickoff, secondKickoff] = kcDays.map((c) => c[3] as Date);
            expect(firstKickoff).toBeDefined();
            expect((firstKickoff as Date).toISOString()).not.toBe((secondKickoff as Date).toISOString());
      });
});

describe("END TO END — a wired signal reaches a probability", () => {
  beforeEach(() => {
    mocks.getTeamScoringRecords.mockReset();
    mocks.getLeagueAverageScored.mockReset();
    mocks.getTeamScoringRecords.mockResolvedValue(rows(10, 25, 20));
    mocks.getLeagueAverageScored.mockResolvedValue(22);
  });

  it("REST_DAYS from the Game row makes a SITUATIONAL signal actually vote", async () => {
    // The short-week road deficit: the AWAY team on 4 days' rest against a
    // rested home team. This is the scenario the evaluator models, and it is
    // the one thing the engine previously could not express — not because the
    // signal was missing, but because REST_DAYS was never selected off the row.
    const ctx = await deriveSignalGameContext({
      ...input,
      schedule: {
        restDaysHome: 7, restDaysAway: 4,
        isBackToBackHome: false, isBackToBackAway: false,
        scheduleDensityHome: 1, scheduleDensityAway: 2,
        openingSpread: -3, openingTotal: 45,
      },
    });
    // REST_DAYS is the HOME side (the team the slate evaluates); the short-week
    // scenario puts the deficit on the VISITOR, which the evaluator reads as
    // REST_DAYS=4 / OPP_REST_DAYS=7 with IS_ROAD_TEAM=1. Both are derived from
    // the same two columns, seen from opposite sides.
    expect(ctx.env.REST_DAYS).toBe("7");
    expect(ctx.env.OPP_REST_DAYS).toBe("4");
    expect(ctx.env.HOME_REST_DAYS).toBe("7");
    expect(ctx.env.AWAY_REST_DAYS).toBe("4");
    expect(ctx.env.IS_ROAD_TEAM).toBe("0");
    expect(ctx.sources).toContain("GameSchedule");

    // The slate evaluates the home side (IS_ROAD_TEAM=0) and already has both
    // rest columns. The signal must vote from THAT env. Swapping the keys in
    // the test was hiding the production bug: the road team's short week never
    // reached the tilt.
    const tilt = await applyContinuousSignalTilt(0.5, SIGNAL_REGISTRY, {
      sportKey: "americanfootball_nfl",
      homeTeam: "KC", awayTeam: "NE",
      env: ctx.env,
      now: () => new Date("2026-10-01T12:00:00Z"),
    } as never);

    const vote = tilt.votes.find((v) => v.signalId === "nfl_short_week_road_deficit");
    expect(vote, "the short-week signal must reach the tilt from the slate env").toBeTruthy();
    // Home-relative: the road penalty is negated, so a tired visitor favors home.
    expect(vote!.rawValue).toBe(2.25);
    expect(vote!.tilt).toBeGreaterThan(0);
    expect(tilt.applied).toBe(true);
    expect(tilt.adjustedHomeP).toBeGreaterThan(0.5);
  });

  it("abstains honestly when enrichment has not run (nulls, not defaults)", async () => {
    // isBackToBackHome/Away are non-nullable with @default(false) in the schema,
    // so they ARE known (false) even on an un-enriched row. That is a real
    // observed value, not a stand-in, which is why the GameSchedule source is
    // legitimately claimed here. The nullable rest/density columns must still
    // abstain rather than be coerced to a plausible rest-day number.
    const ctx = await deriveSignalGameContext({
      ...input,
      schedule: {
        restDaysHome: null, restDaysAway: null,
        isBackToBackHome: false, isBackToBackAway: false,
        scheduleDensityHome: null, scheduleDensityAway: null,
        openingSpread: null, openingTotal: null,
      },
    });
    expect(ctx.env.REST_DAYS).toBeUndefined();
    expect(ctx.env.OPP_REST_DAYS).toBeUndefined();
    expect(ctx.env.SCHEDULE_DENSITY_HOME).toBeUndefined();
    // The real boolean IS passed through, because the database asserted it.
    expect(ctx.env.IS_BACK_TO_BACK_HOME).toBe("0");
    // IS_ROAD_TEAM is a slate constant, never an observation: it must not be the
    // reason a source gets claimed.
    expect(ctx.env.IS_ROAD_TEAM).toBe("0");
  });

  it("claims NO schedule source when every schedule fact is null", async () => {
    // Guards the specific lie: reporting "GameSchedule" when nothing was read.
    const ctx = await deriveSignalGameContext({
      ...input,
      schedule: {
        restDaysHome: null, restDaysAway: null,
        scheduleDensityHome: null, scheduleDensityAway: null,
        openingSpread: null, openingTotal: null,
      } as never,
    });
    expect(ctx.sources).not.toContain("GameSchedule");
    expect(ctx.env.IS_ROAD_TEAM).toBeUndefined();
  });
});
