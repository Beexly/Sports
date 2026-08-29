import { describe, it, expect } from "vitest";
import {
  percentTimeFrame,
  randomWalkSmooth,
  inGameRateFactor,
  inGameWinProbability,
  type FrameObservation,
  type MatchClock,
} from "../ingame-soccer.js";
import { moneylineProbabilities } from "../poisson.js";

describe("percentTimeFrame", () => {
  it("maps minute 0 of half 1 to frame 0, and half 2's kickoff to exactly 50 (the halftime pin)", () => {
    expect(percentTimeFrame({ half: 1, minute: 0 })).toBe(0);
    expect(percentTimeFrame({ half: 2, minute: 0 })).toBe(50);
  });

  it("matches a hand-computed linear frame within regulation time", () => {
    // span = reg(45) + maxStoppage(5) = 50 -- minute 25 -> (25/50)*50 = 25
    expect(percentTimeFrame({ half: 1, minute: 25, regulationHalfMinutes: 45, maxStoppageMinutes: 5 })).toBeCloseTo(25, 10);
    // half 2, same clock -> 50 + 25 = 75
    expect(percentTimeFrame({ half: 2, minute: 25, regulationHalfMinutes: 45, maxStoppageMinutes: 5 })).toBeCloseTo(75, 10);
  });

  it("reaches exactly the half's upper boundary at minute = regulation + maxStoppage, and saturates beyond it", () => {
    expect(percentTimeFrame({ half: 1, minute: 50, regulationHalfMinutes: 45, maxStoppageMinutes: 5 })).toBeCloseTo(50, 10);
    expect(percentTimeFrame({ half: 1, minute: 90, regulationHalfMinutes: 45, maxStoppageMinutes: 5 })).toBeCloseTo(50, 10);
    expect(percentTimeFrame({ half: 2, minute: 50, regulationHalfMinutes: 45, maxStoppageMinutes: 5 })).toBeCloseTo(100, 10);
    expect(percentTimeFrame({ half: 2, minute: 999, regulationHalfMinutes: 45, maxStoppageMinutes: 5 })).toBeCloseTo(100, 10);
  });

  it("is monotonic non-decreasing in minute within a half", () => {
    let prev = -Infinity;
    for (let m = 0; m <= 60; m += 3) {
      const f = percentTimeFrame({ half: 1, minute: m });
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
  });

  it("throws on an invalid half, non-positive regulation length, negative stoppage cap, or negative/non-finite minute", () => {
    const invalidHalfClock = { half: 3, minute: 0 } as unknown as MatchClock;
    expect(() => percentTimeFrame(invalidHalfClock)).toThrow(RangeError);
    expect(() => percentTimeFrame({ half: 1, minute: 0, regulationHalfMinutes: 0 })).toThrow(RangeError);
    expect(() => percentTimeFrame({ half: 1, minute: 0, maxStoppageMinutes: -1 })).toThrow(RangeError);
    expect(() => percentTimeFrame({ half: 1, minute: -1 })).toThrow(RangeError);
    expect(() => percentTimeFrame({ half: 1, minute: Infinity })).toThrow(RangeError);
  });
});

describe("randomWalkSmooth", () => {
  it("returns the exact constant value at every frame when the prior and every observation already agree, for any variances (proves the forward+backward pass compose correctly)", () => {
    const v = 7.25;
    const obs: FrameObservation[] = [
      { value: v, variance: 3 },
      { value: v, variance: 0.5 },
      { value: v, variance: 10 },
      { value: v, variance: 1 },
    ];
    const smoothed = randomWalkSmooth(obs, 2, v, 2);
    for (const s of smoothed) {
      expect(s.value).toBeCloseTo(v, 10);
    }
  });

  it("pulls a single noisy, sparse-data frame toward its confident neighbors -- the paper's 'rare state gets a sane estimate' claim", () => {
    const obs: FrameObservation[] = [
      { value: 5, variance: 0.01 },
      { value: 5, variance: 0.01 },
      { value: 500, variance: 1e6 }, // wildly different, effectively uninformative
      { value: 5, variance: 0.01 },
      { value: 5, variance: 0.01 },
    ];
    const smoothed = randomWalkSmooth(obs, 0.5, 5, 0.01);
    // Pulled dramatically toward the confident neighborhood, nowhere near its raw 500.
    expect(smoothed[2]!.value).toBeLessThan(50);
    expect(smoothed[2]!.value).toBeGreaterThan(0);
    // And its smoothed uncertainty should collapse far below its raw observation variance.
    expect(smoothed[2]!.variance).toBeLessThan(1e6 / 100);
  });

  it("is deterministic across repeated calls on identical input", () => {
    const obs: FrameObservation[] = [
      { value: 1, variance: 1 },
      { value: 2, variance: 0.5 },
      { value: -3, variance: 2 },
    ];
    const a = randomWalkSmooth(obs, 1, 0, 2);
    const b = randomWalkSmooth(obs, 1, 0, 2);
    expect(a).toEqual(b);
  });

  it("throws on empty input, non-positive process/prior/observation variance, or a non-finite value", () => {
    expect(() => randomWalkSmooth([], 1)).toThrow(RangeError);
    expect(() => randomWalkSmooth([{ value: 1, variance: 1 }], 0)).toThrow(RangeError);
    expect(() => randomWalkSmooth([{ value: 1, variance: 1 }], 1, 0, 0)).toThrow(RangeError);
    expect(() => randomWalkSmooth([{ value: 1, variance: 0 }], 1)).toThrow(RangeError);
    expect(() => randomWalkSmooth([{ value: 1, variance: -1 }], 1)).toThrow(RangeError);
    expect(() => randomWalkSmooth([{ value: NaN, variance: 1 }], 1)).toThrow(RangeError);
  });
});

describe("inGameRateFactor", () => {
  const zeroCoef = { scoreDiff: 0, frame: 0, cardDiff: 0, eloDiff: 0, intercept: 0, homeAdvantage: 0 };
  const zeroFeat = { scoreDiff: 0, frame: 0, cardDiff: 0, eloDiff: 0 };

  it("is exactly 1.0 (no adjustment) when every feature and coefficient, including home advantage, is zero", () => {
    expect(inGameRateFactor(zeroFeat, zeroCoef, false)).toBeCloseTo(1, 12);
    expect(inGameRateFactor(zeroFeat, zeroCoef, true)).toBeCloseTo(1, 12);
  });

  it("matches a hand-computed value for a home-advantage-only coefficient", () => {
    const coef = { ...zeroCoef, homeAdvantage: 0.5 };
    // eta = 0.5 -> 2 / (1 + e^-0.5)
    expect(inGameRateFactor(zeroFeat, coef, true)).toBeCloseTo(2 / (1 + Math.exp(-0.5)), 12);
    // away side never adds homeAdvantage -- unaffected, still exactly 1.0
    expect(inGameRateFactor(zeroFeat, coef, false)).toBeCloseTo(1, 12);
  });

  it("stays strictly within (0,2) for extreme finite eta, and approaches the bounds in the limit", () => {
    // eta=50 would underflow exp(-eta) to exactly 0 in float64, making the
    // factor exactly 2 rather than merely close to it -- eta=20 still
    // demonstrates the asymptotic approach without hitting that floor.
    const bigPositive = { ...zeroCoef, intercept: 20 };
    const bigNegative = { ...zeroCoef, intercept: -20 };
    const hi = inGameRateFactor(zeroFeat, bigPositive, false);
    const lo = inGameRateFactor(zeroFeat, bigNegative, false);
    expect(hi).toBeLessThan(2);
    expect(hi).toBeGreaterThan(1.99);
    expect(lo).toBeGreaterThan(0);
    expect(lo).toBeLessThan(0.01);
  });
});

describe("inGameWinProbability", () => {
  it("reduces EXACTLY to the pregame independent-Poisson moneyline at frame=0 with a 0-0 current score -- the paper's own point: in-game IS a strict generalization of pregame, not a separate model", () => {
    const lambdaHome = 1.6;
    const lambdaAway = 1.1;
    const maxGoals = 10;
    const pregame = moneylineProbabilities(lambdaHome, lambdaAway, maxGoals);
    const inGame = inGameWinProbability(
      { frame: 0, currentHomeGoals: 0, currentAwayGoals: 0, thetaHome: lambdaHome, thetaAway: lambdaAway },
      maxGoals,
    );
    expect(inGame.home).toBeCloseTo(pregame.home, 12);
    expect(inGame.draw).toBeCloseTo(pregame.draw, 12);
    expect(inGame.away).toBeCloseTo(pregame.away, 12);
    expect(inGame.coverage).toBeCloseTo(pregame.coverage, 12);
    expect(inGame.remainingFraction).toBe(1);
  });

  it("returns the exact degenerate result when no time remains: the current score IS the final score", () => {
    const tied = inGameWinProbability({ frame: 100, currentHomeGoals: 1, currentAwayGoals: 1, thetaHome: 1.5, thetaAway: 1.5 });
    expect(tied).toEqual({ home: 0, draw: 1, away: 0, coverage: 1, remainingFraction: 0 });

    const homeAhead = inGameWinProbability({ frame: 100, currentHomeGoals: 2, currentAwayGoals: 1, thetaHome: 1.5, thetaAway: 1.5 });
    expect(homeAhead).toEqual({ home: 1, draw: 0, away: 0, coverage: 1, remainingFraction: 0 });

    const awayAhead = inGameWinProbability({ frame: 100, currentHomeGoals: 0, currentAwayGoals: 2, thetaHome: 1.5, thetaAway: 1.5 });
    expect(awayAhead).toEqual({ home: 0, draw: 0, away: 1, coverage: 1, remainingFraction: 0 });
  });

  it("a fixed lead becomes a safer win as less time remains (home-win probability is non-decreasing in frame, lead held constant)", () => {
    let prevHome = -1;
    for (const frame of [0, 25, 50, 75, 90, 99]) {
      const p = inGameWinProbability({ frame, currentHomeGoals: 1, currentAwayGoals: 0, thetaHome: 1.4, thetaAway: 1.3 });
      expect(p.home).toBeGreaterThanOrEqual(prevHome - 1e-9);
      prevHome = p.home;
    }
    // And it should be decisively likely to hold by the 99th percentile frame.
    expect(prevHome).toBeGreaterThan(0.9);
  });

  it("a non-positive theta on one side yields zero mass for that side's future goals and zero overall coverage -- 'no opinion,' matching the existing pregame convention, never a fabricated certainty", () => {
    const result = inGameWinProbability({ frame: 40, currentHomeGoals: 0, currentAwayGoals: 0, thetaHome: 0, thetaAway: 1.2 });
    expect(result.coverage).toBe(0);
    expect(result.home).toBe(0);
    expect(result.draw).toBe(0);
    expect(result.away).toBe(0);
  });

  it("throws on an out-of-range or non-finite frame, non-integer/negative current goals, non-finite theta, or an invalid maxFutureGoals", () => {
    const base = { frame: 10, currentHomeGoals: 0, currentAwayGoals: 0, thetaHome: 1, thetaAway: 1 };
    expect(() => inGameWinProbability({ ...base, frame: -1 })).toThrow(RangeError);
    expect(() => inGameWinProbability({ ...base, frame: 101 })).toThrow(RangeError);
    expect(() => inGameWinProbability({ ...base, frame: NaN })).toThrow(RangeError);
    expect(() => inGameWinProbability({ ...base, currentHomeGoals: 1.5 })).toThrow(RangeError);
    expect(() => inGameWinProbability({ ...base, currentHomeGoals: -1 })).toThrow(RangeError);
    expect(() => inGameWinProbability({ ...base, thetaHome: NaN })).toThrow(RangeError);
    expect(() => inGameWinProbability(base, -1)).toThrow(RangeError);
    expect(() => inGameWinProbability(base, 1.5)).toThrow(RangeError);
  });

  it("is deterministic across repeated calls on identical input", () => {
    const state = { frame: 60, currentHomeGoals: 1, currentAwayGoals: 1, thetaHome: 1.2, thetaAway: 0.9 };
    expect(inGameWinProbability(state)).toEqual(inGameWinProbability(state));
  });
});
