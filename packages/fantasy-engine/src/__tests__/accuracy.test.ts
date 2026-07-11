import { describe, expect, it } from "vitest";
import {
  brierScore,
  brierSkillScore,
  calibrationBins,
  expectedCalibrationError,
  logLoss,
  type ScoredForecast,
} from "../accuracy/scoring";
import { accuracyWeightedConsensus, buildLeaderboard } from "../accuracy/leaderboard";

/**
 * The honest accuracy engine — each test pins the closure of a specific seam
 * in the incumbent leaderboard design. These are the properties a chalk-
 * rewarding, blowup-laundering, relative-only grader CANNOT have.
 */

function f(probability: number, outcome: 0 | 1): ScoredForecast {
  return { probability, outcome };
}

describe("proper scoring rules", () => {
  it("Brier: perfect = 0, coin flip on balanced events = 0.25, confident wrongness is worst", () => {
    expect(brierScore([f(1, 1), f(0, 0)])).toBe(0);
    expect(brierScore([f(0.5, 1), f(0.5, 0)])).toBe(0.25);
    expect(brierScore([f(0.99, 0)])).toBeCloseTo(0.9801, 6);
  });

  it("is PROPER: truthful reporting beats hedging and beats overclaiming (seam 1 closed)", () => {
    // True rate 0.7 over many events: the truthful forecaster's expected
    // Brier beats both the hedger (0.5) and the overclaimer (0.95).
    const outcomes: Array<0 | 1> = [];
    for (let i = 0; i < 1000; i++) outcomes.push(i % 10 < 7 ? 1 : 0); // exactly 70%
    const truthful = brierScore(outcomes.map((o) => f(0.7, o)));
    const hedger = brierScore(outcomes.map((o) => f(0.5, o)));
    const overclaimer = brierScore(outcomes.map((o) => f(0.95, o)));
    expect(truthful).toBeLessThan(hedger);
    expect(truthful).toBeLessThan(overclaimer);
  });

  it("log loss punishes overconfident misses hard but stays finite (fixed public clamp)", () => {
    const ll = logLoss([f(1, 0)]);
    expect(Number.isFinite(ll)).toBe(true);
    expect(ll).toBeGreaterThan(20);
  });

  it("skill score is ABSOLUTE-anchored: consensus-wide error costs everyone (seam 6 closed)", () => {
    // Every forecaster said 90%; the events hit at 50%. Under a field-relative
    // z-score, all of them grade "average" — wrong together is free. Under an
    // absolute skill score, every one of them shows NEGATIVE skill.
    const outcomes: Array<0 | 1> = [];
    for (let i = 0; i < 100; i++) outcomes.push(i % 2 === 0 ? 1 : 0);
    const wrongTogether = outcomes.map((o) => f(0.9, o));
    expect(brierSkillScore(wrongTogether)).toBeLessThan(0);
  });

  it("calibration bins report the promise vs reality per bin", () => {
    const forecasts = [f(0.75, 1), f(0.75, 1), f(0.75, 0), f(0.75, 1)];
    const bins = calibrationBins(forecasts, 10);
    const bin7 = bins[7]!;
    expect(bin7.count).toBe(4);
    expect(bin7.meanForecast).toBeCloseTo(0.75, 10);
    expect(bin7.realizedRate).toBeCloseTo(0.75, 10);
    expect(expectedCalibrationError(forecasts)).toBeCloseTo(0, 10);
  });

  it("rejects invalid probabilities and outcomes instead of repairing them", () => {
    expect(() => brierScore([f(1.2, 1)])).toThrow();
    expect(() => logLoss([{ probability: 0.5, outcome: 2 as unknown as 0 }])).toThrow();
  });
});

describe("honest leaderboard", () => {
  const outcomes: Array<0 | 1> = [];
  for (let i = 0; i < 100; i++) outcomes.push(i % 10 < 6 ? 1 : 0); // 60% base rate

  it("no dropped weeks: every forecast counts, so one laundered blowup is impossible (seam 2 closed)", () => {
    // Identical forecasters except one catastrophic week for B. Under
    // drop-worst-week they tie; here B must rank strictly worse.
    const good = outcomes.map((o) => f(o === 1 ? 0.7 : 0.4, o));
    const withBlowup = [...good.slice(0, 90), ...outcomes.slice(90).map((o) => f(o === 1 ? 0.01 : 0.99, o))];
    const board = buildLeaderboard(
      [
        { forecasterId: "steady", forecasts: good, eventsAvailable: 100 },
        { forecasterId: "blowup", forecasts: withBlowup, eventsAvailable: 100 },
      ],
      { minimumSample: 50 },
    );
    expect(board[0]!.forecasterId).toBe("steady");
    expect(board[1]!.brier).toBeGreaterThan(board[0]!.brier);
  });

  it("coverage is visible and positive skill is coverage-scaled: cherry-picking is not free (seam 3 closed)", () => {
    const skilled = outcomes.map((o) => f(o === 1 ? 0.8 : 0.2, o));
    const board = buildLeaderboard(
      [
        // Same per-forecast skill; one only forecast 30% of the board.
        { forecasterId: "full-board", forecasts: skilled, eventsAvailable: 100 },
        { forecasterId: "cherry-picker", forecasts: skilled.slice(0, 30), eventsAvailable: 100 },
      ],
      { minimumSample: 25 },
    );
    const full = board.find((e) => e.forecasterId === "full-board")!;
    const cherry = board.find((e) => e.forecasterId === "cherry-picker")!;
    expect(full.coverage).toBe(1);
    expect(cherry.coverage).toBeCloseTo(0.3, 10);
    expect(full.coverageAdjustedSkill).toBeGreaterThan(cherry.coverageAdjustedSkill);
    expect(board[0]!.forecasterId).toBe("full-board");
  });

  it("low coverage never flatters NEGATIVE skill toward zero", () => {
    const bad = outcomes.slice(0, 30).map((o) => f(o === 1 ? 0.2 : 0.8, o));
    const board = buildLeaderboard(
      [{ forecasterId: "bad-and-sparse", forecasts: bad, eventsAvailable: 100 }],
      { minimumSample: 25 },
    );
    // Composite equals the raw (negative) skill — not skill × 0.3.
    expect(board[0]!.coverageAdjustedSkill).toBeCloseTo(board[0]!.skillVsBaseRate, 10);
    expect(board[0]!.coverageAdjustedSkill).toBeLessThan(0);
  });

  it("small samples are reported but never ranked above the floor (withhold, never fabricate)", () => {
    const hot = [f(0.9, 1), f(0.9, 1), f(0.9, 1)]; // 3-for-3 lucky streak
    const steady = outcomes.map((o) => f(o === 1 ? 0.7 : 0.4, o));
    const board = buildLeaderboard(
      [
        { forecasterId: "lucky-streak", forecasts: hot, eventsAvailable: 100 },
        { forecasterId: "proven", forecasts: steady, eventsAvailable: 100 },
      ],
      { minimumSample: 25 },
    );
    expect(board[0]!.forecasterId).toBe("proven");
    expect(board[1]!.meetsMinimumSample).toBe(false);
  });

  it("deterministic: same inputs produce the identical board", () => {
    const records = [
      { forecasterId: "a", forecasts: outcomes.map((o) => f(0.6, o)), eventsAvailable: 100 },
      { forecasterId: "b", forecasts: outcomes.map((o) => f(0.55, o)), eventsAvailable: 100 },
    ];
    expect(buildLeaderboard(records)).toEqual(buildLeaderboard(records));
  });
});

describe("edge-case hardening (Codex on PR #90)", () => {
  it("all-same-outcome window: -Infinity skill is PRESERVED and ranks below finite negative skill", () => {
    // Outcomes all 1 → the base-rate reference is perfect → any imperfect
    // forecaster has skill -Infinity. That entry must rank BELOW a forecaster
    // with finite negative skill, never launder to neutral.
    const allOnes: Array<0 | 1> = Array.from({ length: 30 }, () => 1);
    const mixed: Array<0 | 1> = Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 1 : 0));
    const board = buildLeaderboard(
      [
        { forecasterId: "neg-infinity", forecasts: allOnes.map((o) => f(0.9, o)), eventsAvailable: 30 },
        { forecasterId: "finite-negative", forecasts: mixed.map((o) => f(o === 1 ? 0.3 : 0.7, o)), eventsAvailable: 30 },
      ],
      { minimumSample: 25 },
    );
    expect(board[0]!.forecasterId).toBe("finite-negative");
    expect(board[1]!.coverageAdjustedSkill).toBe(Number.NEGATIVE_INFINITY);
  });

  it("rejects non-finite or negative eventsAvailable instead of corrupting coverage", () => {
    const forecasts = [f(0.5, 1)];
    expect(() =>
      buildLeaderboard([{ forecasterId: "x", forecasts, eventsAvailable: Number.NaN }]),
    ).toThrow();
    expect(() =>
      buildLeaderboard([{ forecasterId: "x", forecasts, eventsAvailable: Number.POSITIVE_INFINITY }]),
    ).toThrow();
    expect(() =>
      buildLeaderboard([{ forecasterId: "x", forecasts, eventsAvailable: -1 }]),
    ).toThrow();
  });

  it("rejects an out-of-range log-loss epsilon instead of scoring garbage", () => {
    expect(() => logLoss([f(0.5, 1)], 2)).toThrow();
    expect(() => logLoss([f(0.5, 1)], 0)).toThrow();
    expect(() => logLoss([f(0.5, 1)], -1e-9)).toThrow();
    expect(() => logLoss([f(0.5, 1)], Number.NaN)).toThrow();
    expect(Number.isFinite(logLoss([f(0.5, 1)], 1e-6))).toBe(true);
  });
});

describe("accuracy-weighted consensus", () => {
  const outcomes: Array<0 | 1> = [];
  for (let i = 0; i < 100; i++) outcomes.push(i % 10 < 6 ? 1 : 0);

  it("weights proven skill and ignores no-skill voices (the ATC-beats-Zeile design, weights visible)", () => {
    const board = buildLeaderboard(
      [
        { forecasterId: "sharp", forecasts: outcomes.map((o) => f(o === 1 ? 0.8 : 0.2, o)), eventsAvailable: 100 },
        { forecasterId: "noise", forecasts: outcomes.map(() => f(0.5, outcomes[0]!)), eventsAvailable: 100 },
      ],
      { minimumSample: 25 },
    );
    const consensus = accuracyWeightedConsensus(
      [
        { forecasterId: "sharp", probability: 0.8 },
        { forecasterId: "noise", probability: 0.2 },
      ],
      board,
    );
    // The sharp voice dominates; the blend sits near 0.8, not the 0.5 midpoint.
    expect(consensus).toBeGreaterThan(0.7);
  });

  it("falls back to the plain mean when nobody has proven positive skill (the crowd floor)", () => {
    const consensus = accuracyWeightedConsensus(
      [
        { forecasterId: "x", probability: 0.6 },
        { forecasterId: "y", probability: 0.4 },
      ],
      [],
    );
    expect(consensus).toBeCloseTo(0.5, 10);
  });
});
