import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEASON_REPS,
  evaluateRecordBenchmark,
  featureDifferentials,
  predictGame,
  simulateSeason,
  trainWalkForward,
  walkForwardSplit,
  winProbabilityFromDifferentials,
  type FeatureDifferentials,
  type TeamFeatures,
  type WalkForwardSample,
} from "./ethandojo-game-predictor";

function fullFeatures(overrides: Partial<TeamFeatures> = {}): TeamFeatures {
  return {
    qbEPA: 0.12,
    explosiveRate: 0.09,
    turnoverMargin: 0.4,
    passRush: 0.7,
    pointDiff: 4.5,
    availability: 0.92,
    rosterCarryover: 0.81,
    ...overrides,
  };
}

function diffs(overrides: Partial<FeatureDifferentials> = {}): FeatureDifferentials {
  return {
    qbEPA: 0.1,
    explosiveRate: 0.02,
    turnoverMargin: 0.3,
    passRush: 0.15,
    pointDiff: 3,
    availability: 0.05,
    rosterCarryover: 0.1,
    ...overrides,
  };
}

describe("ethandojo-game-predictor feature differentials", () => {
  it("computes home − away for all seven differentials", () => {
    const home = fullFeatures();
    const away = fullFeatures({
      qbEPA: 0.02,
      explosiveRate: 0.07,
      turnoverMargin: -0.1,
      passRush: 0.55,
      pointDiff: 1.5,
      availability: 0.87,
      rosterCarryover: 0.71,
    });
    const d = featureDifferentials(home, away);
    expect(d).not.toBeNull();
    if (d === null) throw new Error("expected differentials");
    expect(d.qbEPA).toBeCloseTo(0.1, 12);
    expect(d.explosiveRate).toBeCloseTo(0.02, 12);
    expect(d.turnoverMargin).toBeCloseTo(0.5, 12);
    expect(d.passRush).toBeCloseTo(0.15, 12);
    expect(d.pointDiff).toBeCloseTo(3, 12);
    expect(d.availability).toBeCloseTo(0.05, 12);
    expect(d.rosterCarryover).toBeCloseTo(0.1, 12);
  });

  it("orders the seven named feature keys", () => {
    const d = featureDifferentials(fullFeatures(), fullFeatures());
    expect(d).not.toBeNull();
    if (d === null) throw new Error("expected differentials");
    expect(Object.keys(d).sort()).toEqual(
      [
        "availability",
        "explosiveRate",
        "passRush",
        "pointDiff",
        "qbEPA",
        "rosterCarryover",
        "turnoverMargin",
      ].sort(),
    );
  });
});

describe("ethandojo-game-predictor fail-closed inference", () => {
  it("returns null when a feature is missing on either side", () => {
    const home = fullFeatures();
    // Omit the key rather than `delete` it. `Partial<T>` makes a property
    // optional but NOT writable, so `delete` on it is a TS2704 error; building
    // the object without the field expresses the same intent and typechecks.
    const { qbEPA: _droppedQb, ...awayMissing } = fullFeatures();
    expect(featureDifferentials(home, awayMissing)).toBeNull();
    expect(predictGame(home, awayMissing)).toBeNull();

    const { availability: _droppedAvail, ...homeMissing } = fullFeatures();
    expect(featureDifferentials(homeMissing, fullFeatures())).toBeNull();
    expect(predictGame(homeMissing, fullFeatures())).toBeNull();
  });

  it("returns null on non-finite features (NaN / Infinity)", () => {
    expect(
      predictGame(fullFeatures(), fullFeatures({ explosiveRate: Number.NaN })),
    ).toBeNull();
    expect(
      predictGame(fullFeatures({ pointDiff: Number.POSITIVE_INFINITY }), fullFeatures()),
    ).toBeNull();
    expect(
      featureDifferentials(fullFeatures(), fullFeatures({ rosterCarryover: Number.NEGATIVE_INFINITY })),
    ).toBeNull();
  });

  it("returns null on null / undefined team inputs", () => {
    expect(featureDifferentials(null, fullFeatures())).toBeNull();
    expect(featureDifferentials(fullFeatures(), undefined)).toBeNull();
    expect(predictGame(undefined, null)).toBeNull();
  });

  it("never imputes: a partial feature object is rejected whole", () => {
    const partial = { qbEPA: 0.1, explosiveRate: 0.02 } as Partial<TeamFeatures>;
    expect(featureDifferentials(partial, fullFeatures())).toBeNull();
    expect(winProbabilityFromDifferentials(null)).toBeNull();
  });

  it("returns null when weights are malformed", () => {
    expect(
      winProbabilityFromDifferentials(diffs(), { intercept: 0, coefficients: [1, 2] }),
    ).toBeNull();
    expect(
      winProbabilityFromDifferentials(diffs(), {
        intercept: Number.NaN,
        coefficients: [0, 0, 0, 0, 0, 0, 0],
      }),
    ).toBeNull();
  });

  it("produces a finite prediction when all features are present", () => {
    const pred = predictGame(fullFeatures(), fullFeatures());
    expect(pred).not.toBeNull();
    if (pred === null) throw new Error("expected prediction");
    expect(pred.winProb).toBeGreaterThan(0);
    expect(pred.winProb).toBeLessThan(1);
    expect(Number.isFinite(pred.projectedScoreHome)).toBe(true);
    expect(Number.isFinite(pred.projectedScoreAway)).toBe(true);
  });
});

describe("ethandojo-game-predictor walk-forward training (leakage-free)", () => {
  const makeSample = (
    season: number,
    week: number,
    qbEPA: number,
    homeWon: boolean,
  ): WalkForwardSample => ({
    season,
    week,
    differentials: diffs({ qbEPA }),
    homeWon,
  });

  it("never trains on the target week (strictly-before split)", () => {
    const samples: WalkForwardSample[] = [
      makeSample(2025, 3, 0.05, true),
      makeSample(2025, 4, -0.02, false),
      makeSample(2025, 5, 0.4, true), // target week — must be excluded
      makeSample(2025, 6, -0.4, false), // after target — must be excluded
      makeSample(2026, 1, 0.3, true), // later season — must be excluded
    ];
    const split = walkForwardSplit(samples, 2025, 5);
    expect(split.train).toHaveLength(2);
    expect(split.excluded).toHaveLength(3);
    for (const s of split.train) {
      const isTargetWeek = s.season === 2025 && s.week === 5;
      const isAfter = s.season > 2025 || (s.season === 2025 && s.week >= 5);
      expect(isTargetWeek).toBe(false);
      expect(isAfter).toBe(false);
    }
    // Target week is present in the raw input but absent from train.
    expect(split.train.some((s) => s.week === 5 && s.season === 2025)).toBe(false);
    expect(split.excluded.some((s) => s.week === 5 && s.season === 2025)).toBe(true);
  });

  it("trained weights are unaffected by injecting the target week outcome", () => {
    const base: WalkForwardSample[] = [
      makeSample(2025, 1, 0.2, true),
      makeSample(2025, 2, -0.15, false),
      makeSample(2025, 3, 0.1, true),
      makeSample(2025, 4, -0.05, false),
    ];
    const withTarget = [...base, makeSample(2025, 5, 9.99, true)];
    const w1 = trainWalkForward(base, 2025, 5);
    const w2 = trainWalkForward(withTarget, 2025, 5);
    expect(w1).not.toBeNull();
    expect(w2).not.toBeNull();
    if (w1 === null || w2 === null) throw new Error("expected weights");
    expect(w2.intercept).toBeCloseTo(w1.intercept, 12);
    expect([...w2.coefficients]).toEqual([...w1.coefficients]);
  });

  it("returns null when the training split is empty (fail-closed)", () => {
    const onlyTarget = [makeSample(2025, 5, 0.1, true)];
    expect(trainWalkForward(onlyTarget, 2025, 5)).toBeNull();
    expect(trainWalkForward([], 2025, 5)).toBeNull();
  });

  it("returns null when any training row has a non-finite differential", () => {
    const bad: WalkForwardSample[] = [
      {
        season: 2025,
        week: 1,
        differentials: diffs({ passRush: Number.NaN }),
        homeWon: true,
      },
    ];
    expect(trainWalkForward(bad, 2025, 5)).toBeNull();
  });

  it("uses ordinal season/week keys only — no hard-coded calendar dates", () => {
    // Training works for arbitrary ordinal keys (not tied to any real calendar).
    const samples = [
      makeSample(1, 1, 0.3, true),
      makeSample(1, 2, -0.3, false),
      makeSample(1, 3, 0.25, true),
      makeSample(1, 4, -0.25, false),
    ];
    const w = trainWalkForward(samples, 1, 3);
    expect(w).not.toBeNull();
  });
});

describe("ethandojo-game-predictor season simulator", () => {
  it("runs the default 10,000 reps and summarizes wins per team", () => {
    const schedule = [
      { week: 1, homeTeam: "A", awayTeam: "B", homeWinProb: 0.7 },
      { week: 2, homeTeam: "B", awayTeam: "A", homeWinProb: 0.3 },
      { week: 3, homeTeam: "A", awayTeam: "B", homeWinProb: 0.65 },
      { week: 4, homeTeam: "B", awayTeam: "A", homeWinProb: 0.35 },
    ];
    const summary = simulateSeason(schedule, { seed: 42 });
    expect(summary).toHaveLength(2);
    const a = summary.find((t) => t.team === "A");
    const b = summary.find((t) => t.team === "B");
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    if (a === undefined || b === undefined) throw new Error("expected both teams");
    // A is favoured in all four games → mean wins well above 2.
    expect(a.meanWins).toBeGreaterThan(2);
    expect(b.meanWins).toBeLessThan(2);
    // Histogram mass equals the rep count.
    const massA = a.winsHistogram.reduce((s, c) => s + c, 0);
    expect(massA).toBe(DEFAULT_SEASON_REPS);
    expect(a.p10Wins).toBeLessThanOrEqual(a.p50Wins);
    expect(a.p50Wins).toBeLessThanOrEqual(a.p90Wins);
  });

  it("is deterministic for a fixed seed", () => {
    const schedule = [
      { week: 1, homeTeam: "X", awayTeam: "Y", homeWinProb: 0.55 },
      { week: 2, homeTeam: "Y", awayTeam: "X", homeWinProb: 0.45 },
    ];
    const a = simulateSeason(schedule, { seed: 7, reps: 500 });
    const b = simulateSeason(schedule, { seed: 7, reps: 500 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("throws on structurally invalid schedule input", () => {
    expect(() => simulateSeason([])).toThrow();
    expect(() =>
      simulateSeason([{ week: 1, homeTeam: "A", awayTeam: "B", homeWinProb: 1.2 }]),
    ).toThrow();
    expect(() =>
      simulateSeason([{ week: 1, homeTeam: "A", awayTeam: "B", homeWinProb: Number.NaN }]),
    ).toThrow();
    expect(() =>
      simulateSeason([{ week: 1, homeTeam: "A", awayTeam: "B", homeWinProb: 0.5 }], { reps: 0 }),
    ).toThrow();
  });
});

describe("ethandojo-game-predictor benchmark gate (10-6 and 11-5)", () => {
  const flat = (n: number, p: number): number[] => new Array<number>(n).fill(p);

  it("a 10-6 model that beats coin-flip on win error is accepted", () => {
    // 16 games, actual 10 wins. Coin-flip projects 8 (error 2).
    // Model projects 10.0 (error 0) → beats coin-flip.
    const result = evaluateRecordBenchmark({
      gameWinProbs: [...flat(10, 0.75), ...flat(6, 0.25)].map((p, i) =>
        i < 10 ? 0.75 : 0.25,
      ),
      actualWins: 10,
      targetRecord: "10-6",
    });
    // projected = 10*0.75 + 6*0.25 = 7.5+1.5 = 9 → error 1 < 2
    expect(result).not.toBeNull();
    if (result === null) throw new Error("expected benchmark result");
    expect(result.projectedWins).toBeCloseTo(9, 12);
    expect(result.coinFlipProjectedWins).toBeCloseTo(8, 12);
    expect(result.absError).toBeCloseTo(1, 12);
    expect(result.coinFlipAbsError).toBeCloseTo(2, 12);
    expect(result.beatsCoinFlip).toBe(true);
  });

  it("50% every game is NOT beating coin-flip on a 10-6 record", () => {
    const result = evaluateRecordBenchmark({
      gameWinProbs: flat(16, 0.5),
      actualWins: 10,
      targetRecord: "10-6",
    });
    expect(result).not.toBeNull();
    if (result === null) throw new Error("expected benchmark result");
    expect(result.projectedWins).toBeCloseTo(8, 12);
    expect(result.absError).toBeCloseTo(result.coinFlipAbsError, 12);
    expect(result.beatsCoinFlip).toBe(false);
  });

  it("evaluates the 11-5 benchmark and rejects a 50% projection", () => {
    const coin = evaluateRecordBenchmark({
      gameWinProbs: flat(16, 0.5),
      actualWins: 11,
      targetRecord: "11-5",
    });
    expect(coin).not.toBeNull();
    if (coin === null) throw new Error("expected benchmark result");
    // Coin-flip error |8-11| = 3; flat 0.5 ties it → not beating.
    expect(coin.coinFlipAbsError).toBeCloseTo(3, 12);
    expect(coin.beatsCoinFlip).toBe(false);

    const sharp = evaluateRecordBenchmark({
      gameWinProbs: [...flat(11, 0.8), ...flat(5, 0.3)],
      actualWins: 11,
      targetRecord: "11-5",
    });
    expect(sharp).not.toBeNull();
    if (sharp === null) throw new Error("expected benchmark result");
    // projected = 11*0.8 + 5*0.3 = 8.8 + 1.5 = 10.3 → error 0.7 < 3
    expect(sharp.projectedWins).toBeCloseTo(10.3, 12);
    expect(sharp.beatsCoinFlip).toBe(true);
  });

  it("returns null on invalid benchmark input (fail-closed)", () => {
    expect(
      evaluateRecordBenchmark({
        gameWinProbs: flat(16, Number.NaN),
        actualWins: 10,
        targetRecord: "10-6",
      }),
    ).toBeNull();
    expect(
      evaluateRecordBenchmark({
        gameWinProbs: flat(15, 0.5),
        actualWins: 10,
        targetRecord: "10-6",
      }),
    ).toBeNull();
    expect(
      evaluateRecordBenchmark({
        gameWinProbs: flat(16, 0.5),
        actualWins: 9,
        targetRecord: "10-6",
      }),
    ).toBeNull();
    expect(
      evaluateRecordBenchmark({
        gameWinProbs: flat(16, 1.4),
        actualWins: 10,
        targetRecord: "10-6",
      }),
    ).toBeNull();
    expect(evaluateRecordBenchmark(null)).toBeNull();
    expect(
      evaluateRecordBenchmark({
        gameWinProbs: [],
        actualWins: 10,
        targetRecord: "10-6",
      }),
    ).toBeNull();
  });
});
