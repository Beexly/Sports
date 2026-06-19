import { describe, it, expect } from "vitest";

import {
  validateMatchupCompareInput,
  runMatchupCompare,
  MATCHUP_COMPARE_DISCLAIMER,
  MATCHUP_MAX_PPG,
  type MatchupCompareInput,
  type MatchupLeague,
  type TeamSeasonStats,
} from "@/lib/lab/matchup-compare";

function team(overrides: Partial<TeamSeasonStats> = {}): TeamSeasonStats {
  return {
    name: "Team",
    winPct: 0.5,
    pointsForPerGame: 110,
    pointsAgainstPerGame: 110,
    strengthOfSchedule: 0.5,
    recentForm: 0.5,
    ...overrides,
  };
}

function baseInput(
  overrides: Partial<MatchupCompareInput> = {},
): MatchupCompareInput {
  return {
    league: "NBA",
    home: team({ name: "Home" }),
    away: team({ name: "Away" }),
    ...overrides,
  };
}

describe("validateMatchupCompareInput", () => {
  it("rejects non-objects", () => {
    expect(validateMatchupCompareInput(null)).toEqual({
      error: expect.stringContaining("JSON object"),
    });
    expect(validateMatchupCompareInput("nope")).toHaveProperty("error");
    expect(validateMatchupCompareInput(42)).toHaveProperty("error");
  });

  it("requires a valid league", () => {
    expect(
      validateMatchupCompareInput({ home: {}, away: {} }),
    ).toHaveProperty("error");
    expect(
      validateMatchupCompareInput({ league: "MLS", home: {}, away: {} }),
    ).toHaveProperty("error");
  });

  it("normalizes a lowercase league string", () => {
    const res = validateMatchupCompareInput({
      league: "nfl",
      home: { winPct: 0.6, pointsForPerGame: 25, pointsAgainstPerGame: 20 },
      away: { winPct: 0.5, pointsForPerGame: 22, pointsAgainstPerGame: 23 },
    });
    expect(res).not.toHaveProperty("error");
    expect((res as MatchupCompareInput).league).toBe("NFL");
  });

  it("requires both team objects", () => {
    expect(
      validateMatchupCompareInput({ league: "NBA" }),
    ).toHaveProperty("error");
    expect(
      validateMatchupCompareInput({
        league: "NBA",
        home: { winPct: 0.5, pointsForPerGame: 110, pointsAgainstPerGame: 108 },
      }),
    ).toHaveProperty("error");
  });

  it("requires the core numeric stats on each team", () => {
    expect(
      validateMatchupCompareInput({
        league: "NBA",
        home: { winPct: 0.5, pointsForPerGame: 110 }, // missing pointsAgainst
        away: { winPct: 0.5, pointsForPerGame: 108, pointsAgainstPerGame: 110 },
      }),
    ).toHaveProperty("error");
  });

  it("accepts numeric strings for stats", () => {
    const res = validateMatchupCompareInput({
      league: "NBA",
      home: {
        name: "A",
        winPct: "0.7",
        pointsForPerGame: "118",
        pointsAgainstPerGame: "108",
      },
      away: {
        name: "B",
        winPct: "0.4",
        pointsForPerGame: "104",
        pointsAgainstPerGame: "112",
      },
    });
    expect(res).not.toHaveProperty("error");
    const v = res as MatchupCompareInput;
    expect(v.home.winPct).toBe(0.7);
    expect(v.home.pointsForPerGame).toBe(118);
  });

  it("defaults optional SoS to neutral and recentForm to winPct", () => {
    const v = validateMatchupCompareInput({
      league: "NBA",
      home: { winPct: 0.66, pointsForPerGame: 115, pointsAgainstPerGame: 110 },
      away: { winPct: 0.5, pointsForPerGame: 110, pointsAgainstPerGame: 111 },
    }) as MatchupCompareInput;
    expect(v.home.strengthOfSchedule).toBe(0.5);
    expect(v.home.recentForm).toBe(0.66);
  });

  it("clamps win pct into [0,1] and points into range", () => {
    const v = validateMatchupCompareInput({
      league: "NBA",
      home: {
        winPct: 9,
        pointsForPerGame: 99999,
        pointsAgainstPerGame: -50,
      },
      away: { winPct: -3, pointsForPerGame: 110, pointsAgainstPerGame: 110 },
    }) as MatchupCompareInput;
    expect(v.home.winPct).toBe(1);
    expect(v.away.winPct).toBe(0);
    expect(v.home.pointsForPerGame).toBe(MATCHUP_MAX_PPG);
    expect(v.home.pointsAgainstPerGame).toBe(0);
  });

  it("truncates over-long team names", () => {
    const v = validateMatchupCompareInput({
      league: "NBA",
      home: {
        name: "x".repeat(200),
        winPct: 0.5,
        pointsForPerGame: 110,
        pointsAgainstPerGame: 110,
      },
      away: { winPct: 0.5, pointsForPerGame: 110, pointsAgainstPerGame: 110 },
    }) as MatchupCompareInput;
    expect(v.home.name.length).toBeLessThanOrEqual(48);
  });
});

describe("runMatchupCompare — happy path per supported league", () => {
  const leagues: MatchupLeague[] = ["NBA", "NFL", "NHL", "MLB"];

  for (const league of leagues) {
    it(`produces a coherent frame for ${league} where the stronger side leans home`, () => {
      const out = runMatchupCompare(
        baseInput({
          league,
          home: team({
            name: "Strong",
            winPct: 0.7,
            pointsForPerGame: league === "NFL" ? 28 : league === "NBA" ? 118 : 4,
            pointsAgainstPerGame:
              league === "NFL" ? 18 : league === "NBA" ? 106 : 2.5,
            recentForm: 0.7,
          }),
          away: team({
            name: "Weak",
            winPct: 0.35,
            pointsForPerGame: league === "NFL" ? 19 : league === "NBA" ? 104 : 2.6,
            pointsAgainstPerGame:
              league === "NFL" ? 26 : league === "NBA" ? 114 : 3.4,
            recentForm: 0.35,
          }),
        }),
      );
      expect(out.league).toBe(league);
      expect(out.expectedMargin).toBeGreaterThan(0);
      expect(out.leans).toBe("home");
      expect(out.homeWinProbability).toBeGreaterThan(0.5);
      // Power scores are bounded 0–100.
      expect(out.home.powerScore).toBeGreaterThanOrEqual(0);
      expect(out.home.powerScore).toBeLessThanOrEqual(100);
      // Stronger team should grade higher and land above the 50 normalized midpoint.
      expect(out.home.powerScore).toBeGreaterThan(out.away.powerScore);
      expect(out.home.normalizedRating).toBe(100);
      expect(out.away.normalizedRating).toBe(0);
      expect(out.factorNotes.length).toBeGreaterThan(0);
    });
  }
});

describe("runMatchupCompare — edge cases", () => {
  it("equal teams produce a near-zero margin plus only the home edge", () => {
    const out = runMatchupCompare(baseInput());
    // With identical inputs the only driver is the home-edge parameter (NBA=2.5).
    expect(out.expectedMargin).toBeCloseTo(2.5, 5);
    // Identical composite scores map both normalized ratings to the midpoint.
    expect(out.home.normalizedRating).toBe(50);
    expect(out.away.normalizedRating).toBe(50);
    expect(out.home.powerScore).toBe(out.away.powerScore);
  });

  it("the away side can lean away when it is clearly stronger", () => {
    const out = runMatchupCompare(
      baseInput({
        home: team({ name: "Home", winPct: 0.3, pointsForPerGame: 100, pointsAgainstPerGame: 115 }),
        away: team({ name: "Away", winPct: 0.75, pointsForPerGame: 120, pointsAgainstPerGame: 104 }),
      }),
    );
    expect(out.expectedMargin).toBeLessThan(0);
    expect(out.leans).toBe("away");
    expect(out.homeWinProbability).toBeLessThan(0.5);
  });

  it("handles extreme stats without producing NaN/Infinity", () => {
    const out = runMatchupCompare(
      baseInput({
        league: "NFL",
        home: team({ name: "Max", winPct: 1, pointsForPerGame: 200, pointsAgainstPerGame: 0, recentForm: 1, strengthOfSchedule: 1 }),
        away: team({ name: "Min", winPct: 0, pointsForPerGame: 0, pointsAgainstPerGame: 200, recentForm: 0, strengthOfSchedule: 0 }),
      }),
    );
    expect(Number.isFinite(out.expectedMargin)).toBe(true);
    expect(Number.isFinite(out.marginInterval[0])).toBe(true);
    expect(Number.isFinite(out.marginInterval[1])).toBe(true);
    expect(out.homeWinProbability).toBeGreaterThanOrEqual(0);
    expect(out.homeWinProbability).toBeLessThanOrEqual(1);
  });

  it("interval brackets the point estimate and is ordered", () => {
    const out = runMatchupCompare(
      baseInput({
        home: team({ name: "Home", winPct: 0.65, pointsForPerGame: 116, pointsAgainstPerGame: 108 }),
        away: team({ name: "Away", winPct: 0.45, pointsForPerGame: 108, pointsAgainstPerGame: 112 }),
      }),
    );
    const [lo, hi] = out.marginInterval;
    expect(lo).toBeLessThan(out.expectedMargin);
    expect(hi).toBeGreaterThan(out.expectedMargin);
    expect(hi).toBeGreaterThan(lo);
  });

  it("assigns power tiers and tier labels", () => {
    const out = runMatchupCompare(baseInput());
    expect(typeof out.home.tier).toBe("string");
    expect(typeof out.home.tierLabel).toBe("string");
    expect(out.home.tierLabel.length).toBeGreaterThan(0);
  });

  it("home win probability is bounded in [0,1] under a lopsided matchup", () => {
    const out = runMatchupCompare(
      baseInput({
        league: "NHL",
        home: team({ name: "H", winPct: 0.9, pointsForPerGame: 4.5, pointsAgainstPerGame: 2.0 }),
        away: team({ name: "A", winPct: 0.2, pointsForPerGame: 2.2, pointsAgainstPerGame: 3.8 }),
      }),
    );
    expect(out.homeWinProbability).toBeGreaterThanOrEqual(0);
    expect(out.homeWinProbability).toBeLessThanOrEqual(1);
  });
});

describe("runMatchupCompare — determinism & honesty", () => {
  it("is deterministic — same input yields identical output", () => {
    const input = baseInput({
      home: team({ name: "Home", winPct: 0.62, pointsForPerGame: 116, pointsAgainstPerGame: 110 }),
      away: team({ name: "Away", winPct: 0.48, pointsForPerGame: 111, pointsAgainstPerGame: 113 }),
    });
    const a = runMatchupCompare(input);
    const b = runMatchupCompare(input);
    expect(a).toEqual(b);
  });

  it("always carries the honesty disclaimer", () => {
    const out = runMatchupCompare(baseInput());
    expect(out.disclaimer).toBe(MATCHUP_COMPARE_DISCLAIMER);
    expect(out.disclaimer.toLowerCase()).toContain("not a published pick");
    expect(out.disclaimer.toLowerCase()).toContain("injury");
    expect(out.disclaimer).toContain("1-800-GAMBLER");
  });

  it("labels the home-edge as a model parameter, not a measured stat", () => {
    const out = runMatchupCompare(baseInput());
    expect(
      out.factorNotes.some((n) => n.toLowerCase().includes("parameter")),
    ).toBe(true);
  });
});
