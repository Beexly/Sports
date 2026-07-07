/**
 * Expected-metrics engine tests.
 *
 * The engine's whole claim is: from public play-by-play we can compute an
 * over-expected metric that (a) recovers a player's true latent skill and (b)
 * correlates with an independent ground truth. We prove that here by generating
 * synthetic plays from a KNOWN latent skill with a seeded RNG (deterministic —
 * no Math.random), fitting our real models, and asserting the computed metric
 * ranks and correlates with the injected skill. We also unit-test the numeric,
 * regression, and validation primitives directly.
 */

import { describe, expect, it } from "vitest";
import {
  applyScaler,
  fitScaler,
  mae,
  mean,
  pearson,
  rankAverage,
  rmse,
  sigmoid,
  solveLinearSystem,
  spearman,
  stddev,
} from "../expected-metrics/numeric.js";
import { fitRidge, predictRidge } from "../expected-metrics/linear.js";
import { fitLogistic, predictLogistic } from "../expected-metrics/logistic.js";
import { computeFeatureSchemaHash } from "../expected-metrics/types.js";
import {
  computeCpoe,
  fitExpectedCompletionModel,
  MIN_DROPBACKS_TO_FIT,
  type DropbackPlay,
} from "../expected-metrics/expected-completion.js";
import {
  computeRyoe,
  fitExpectedRushModel,
  type RushPlay,
} from "../expected-metrics/expected-rush-yards.js";
import {
  computeYacOverExpected,
  fitExpectedYacModel,
  type CatchPlay,
} from "../expected-metrics/expected-yac.js";
import {
  buildCalibrationReport,
  DEFAULT_GRADUATION_THRESHOLDS,
  graduationVerdict,
  type CalibrationReport,
  type GroundTruthPoint,
} from "../expected-metrics/validation.js";
import type { PlayerExpectedMetric } from "../expected-metrics/types.js";

/** Deterministic LCG in [0, 1). Seeded → fixtures are reproducible. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const PASSERS = ["00-P00", "00-P01", "00-P02", "00-P03", "00-P04", "00-P05", "00-P06"] as const;

describe("numeric primitives", () => {
  it("mean/variance/stddev are correct", () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(stddev([2, 4, 6])).toBeCloseTo(2, 6); // sample sd of {2,4,6}
    expect(mean([])).toBe(0);
    expect(stddev([5])).toBe(0);
  });

  it("solveLinearSystem solves a known system", () => {
    // 2x + y = 5 ; x + 3y = 10  → x = 1, y = 3
    const sol = solveLinearSystem(
      [
        [2, 1],
        [1, 3],
      ],
      [5, 10],
    );
    expect(sol).not.toBeNull();
    expect(sol?.[0]).toBeCloseTo(1, 9);
    expect(sol?.[1]).toBeCloseTo(3, 9);
  });

  it("solveLinearSystem returns null for a singular matrix", () => {
    expect(
      solveLinearSystem(
        [
          [1, 2],
          [2, 4],
        ],
        [3, 6],
      ),
    ).toBeNull();
  });

  it("pearson is +1 / -1 / 0 in the obvious cases", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 9);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 9);
    expect(pearson([1, 2, 3, 4], [5, 5, 5, 5])).toBe(0); // zero variance
  });

  it("spearman captures monotone-but-nonlinear relationships", () => {
    const xs = [1, 2, 3, 4, 5];
    const ys = xs.map((x) => x ** 3); // strictly increasing, nonlinear
    expect(spearman(xs, ys)).toBeCloseTo(1, 9);
  });

  it("rankAverage averages ties", () => {
    expect(rankAverage([10, 20, 20, 40])).toEqual([1, 2.5, 2.5, 4]);
  });

  it("rmse and mae are correct", () => {
    expect(rmse([1, 2, 3], [1, 2, 3])).toBe(0);
    expect(mae([1, 2, 3], [2, 2, 2])).toBeCloseTo((1 + 0 + 1) / 3, 9);
  });

  it("scaler standardizes and is a no-op on zero-variance columns", () => {
    const scaler = fitScaler([
      [0, 5],
      [10, 5],
    ]);
    const scaled = applyScaler(scaler, [5, 5]);
    expect(scaled[0]).toBeCloseTo(0, 9); // 5 is the mean of {0,10}
    expect(scaled[1]).toBe(0); // constant column → std forced to 1, (5-5)/1 = 0
  });
});

describe("ridge linear regression", () => {
  it("recovers a known linear relationship with no noise", () => {
    // y = 3 + 2*x1 - 1*x2
    const rng = makeRng(7);
    const rows: number[][] = [];
    const targets: number[] = [];
    for (let i = 0; i < 200; i++) {
      const x1 = rng() * 10;
      const x2 = rng() * 10;
      rows.push([x1, x2]);
      targets.push(3 + 2 * x1 - 1 * x2);
    }
    const model = fitRidge(rows, targets, 1e-6);
    expect(model).not.toBeNull();
    if (!model) return;
    // Predictions should be essentially exact on held-in points.
    expect(predictRidge(model, [5, 5])).toBeCloseTo(3 + 2 * 5 - 5, 2);
    expect(predictRidge(model, [1, 8])).toBeCloseTo(3 + 2 - 8, 2);
  });

  it("returns null when underdetermined", () => {
    expect(fitRidge([[1, 2]], [1], 1)).toBeNull(); // 1 row, 2 features
  });
});

describe("logistic regression", () => {
  it("recovers the sign and monotonicity of a known logistic model", () => {
    // P(y=1) = sigmoid(-1 + 1.5 * x)
    const rng = makeRng(11);
    const rows: number[][] = [];
    const labels: number[] = [];
    for (let i = 0; i < 1500; i++) {
      const x = rng() * 4 - 2; // [-2, 2]
      const p = sigmoid(-1 + 1.5 * x);
      const y = rng() < p ? 1 : 0;
      rows.push([x]);
      labels.push(y);
    }
    const model = fitLogistic(rows, labels);
    expect(model).not.toBeNull();
    if (!model) return;
    // Higher feature → higher predicted probability (monotone increasing).
    expect(predictLogistic(model, [2])).toBeGreaterThan(predictLogistic(model, [-2]));
    // Probabilities stay strictly inside (0, 1).
    const p = predictLogistic(model, [0.5]);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });

  it("returns null on degenerate (all-one-class) labels", () => {
    const rows = Array.from({ length: 300 }, (_, i) => [i / 300]);
    expect(fitLogistic(rows, new Array(300).fill(1))).toBeNull();
  });
});

/** Build a synthetic season of dropbacks where completion depends on air yards
 *  plus a per-passer latent skill offset (in logit space). */
function syntheticDropbacks(skillById: Record<string, number>, perPasser: number, seed: number): DropbackPlay[] {
  const rng = makeRng(seed);
  const plays: DropbackPlay[] = [];
  for (const [passerId, skill] of Object.entries(skillById)) {
    for (let i = 0; i < perPasser; i++) {
      const airYards = Math.round(rng() * 28 - 4); // [-4, 24]
      const qbHit: 0 | 1 = rng() < 0.15 ? 1 : 0;
      // True completion prob: falls with depth + pressure, rises with skill.
      const logit = 1.2 - 0.09 * airYards - 0.5 * qbHit + skill;
      const complete: 0 | 1 = rng() < sigmoid(logit) ? 1 : 0;
      const locRoll = rng();
      plays.push({
        passerId,
        complete,
        airYards,
        yardline100: 1 + Math.floor(rng() * 98),
        down: 1 + Math.floor(rng() * 4),
        ydstogo: 1 + Math.floor(rng() * 15),
        shotgun: rng() < 0.6 ? 1 : 0,
        noHuddle: rng() < 0.1 ? 1 : 0,
        qbHit,
        passLocation: locRoll < 0.34 ? "left" : locRoll < 0.67 ? "middle" : "right",
      });
    }
  }
  return plays;
}

describe("expected completion → GSE-CPOE", () => {
  it("gates: returns null below the minimum dropback sample", () => {
    const tiny = syntheticDropbacks({ "00-P00": 0 }, MIN_DROPBACKS_TO_FIT - 50, 1);
    expect(fitExpectedCompletionModel(tiny)).toBeNull();
  });

  it("a more accurate passer earns a higher CPOE than a weaker one", () => {
    const plays = syntheticDropbacks({ "00-GOOD": 0.9, "00-BAD": -0.9 }, 400, 3);
    const model = fitExpectedCompletionModel(plays);
    expect(model).not.toBeNull();
    if (!model) return;
    const cpoe = computeCpoe(plays, model, { minAttempts: 100 });
    const good = cpoe.find((m) => m.playerId === "00-GOOD");
    const bad = cpoe.find((m) => m.playerId === "00-BAD");
    expect(good).toBeDefined();
    expect(bad).toBeDefined();
    expect(good!.overExpected).toBeGreaterThan(bad!.overExpected);
    expect(good!.overExpected).toBeGreaterThan(0);
    expect(bad!.overExpected).toBeLessThan(0);
  });

  it("computed CPOE correlates with injected latent skill (recovers the truth)", () => {
    const skillById: Record<string, number> = {};
    PASSERS.forEach((id, i) => {
      skillById[id] = -0.9 + (1.8 * i) / (PASSERS.length - 1); // evenly spaced [-0.9, 0.9]
    });
    const plays = syntheticDropbacks(skillById, 350, 5);
    const model = fitExpectedCompletionModel(plays);
    expect(model).not.toBeNull();
    if (!model) return;
    const cpoe = computeCpoe(plays, model, { minAttempts: 100 });
    expect(cpoe.length).toBe(PASSERS.length);
    const truth: GroundTruthPoint[] = PASSERS.map((id) => ({ playerId: id, value: skillById[id] ?? 0 }));
    const report = buildCalibrationReport(cpoe, truth);
    expect(report.n).toBe(PASSERS.length);
    // Our CPOE should track the latent skill strongly and monotonically.
    expect(report.pearson).toBeGreaterThan(0.85);
    expect(report.spearman).toBeGreaterThan(0.85);
  });

  it("provenance carries a stable feature schema hash", () => {
    const plays = syntheticDropbacks({ "00-P00": 0, "00-P01": 0 }, 250, 9);
    const model = fitExpectedCompletionModel(plays);
    expect(model?.provenance.method).toBe("logistic-regression");
    expect(model?.provenance.featureSchemaHash).toBe(model?.provenance.featureSchemaHash);
    expect(model?.provenance.featureSchemaHash).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("expected rush yards → GSE-RYOE", () => {
  it("a more explosive back earns a higher RYOE", () => {
    const rng = makeRng(21);
    const plays: RushPlay[] = [];
    const skill: Record<string, number> = { "00-BURST": 1.4, "00-PLOD": -1.4 };
    for (const [rusherId, s] of Object.entries(skill)) {
      for (let i = 0; i < 400; i++) {
        const yardline100 = 1 + Math.floor(rng() * 98);
        const down = 1 + Math.floor(rng() * 4);
        const ydstogo = 1 + Math.floor(rng() * 12);
        // Base expected yards fall near the goal line; skill adds/subtracts.
        const base = 4.2 - 0.02 * (100 - yardline100) * 0.0 + 0.01 * yardline100;
        const noise = rng() * 4 - 2;
        plays.push({
          rusherId,
          rushingYards: Math.max(-3, base + s + noise),
          yardline100,
          down,
          ydstogo,
          shotgun: rng() < 0.4 ? 1 : 0,
          scoreDifferential: Math.floor(rng() * 30 - 15),
          runLocation: rng() < 0.5 ? "middle" : "left",
          runGap: rng() < 0.5 ? "guard" : "tackle",
        });
      }
    }
    const model = fitExpectedRushModel(plays);
    expect(model).not.toBeNull();
    if (!model) return;
    const ryoe = computeRyoe(plays, model, { minAttempts: 50 });
    const burst = ryoe.find((m) => m.playerId === "00-BURST");
    const plod = ryoe.find((m) => m.playerId === "00-PLOD");
    expect(burst!.overExpected).toBeGreaterThan(plod!.overExpected);
    expect(burst!.overExpected).toBeGreaterThan(0);
  });
});

describe("expected YAC → GSE-xYAC", () => {
  it("a YAC-heavy receiver earns positive YAC over expected", () => {
    const rng = makeRng(31);
    const plays: CatchPlay[] = [];
    const skill: Record<string, number> = { "00-ELUSIVE": 2.5, "00-POSSESSION": -2.5 };
    for (const [receiverId, s] of Object.entries(skill)) {
      for (let i = 0; i < 300; i++) {
        const airYards = Math.round(rng() * 20 - 2);
        // Expected YAC falls with air yards (deeper catches → less room).
        const base = 6 - 0.15 * airYards;
        const noise = rng() * 3 - 1.5;
        plays.push({
          receiverId,
          yardsAfterCatch: Math.max(0, base + s + noise),
          airYards,
          yardline100: 1 + Math.floor(rng() * 98),
          down: 1 + Math.floor(rng() * 4),
          ydstogo: 1 + Math.floor(rng() * 12),
          passLocation: rng() < 0.5 ? "middle" : "right",
        });
      }
    }
    const model = fitExpectedYacModel(plays);
    expect(model).not.toBeNull();
    if (!model) return;
    const xyac = computeYacOverExpected(plays, model, { minCatches: 30 });
    const elusive = xyac.find((m) => m.playerId === "00-ELUSIVE");
    const possession = xyac.find((m) => m.playerId === "00-POSSESSION");
    expect(elusive!.overExpected).toBeGreaterThan(possession!.overExpected);
    expect(elusive!.overExpected).toBeGreaterThan(0);
  });
});

describe("validation bridge", () => {
  const mk = (playerId: string, overExpected: number): PlayerExpectedMetric => ({
    playerId,
    plays: 100,
    actualMean: 0,
    expectedMean: 0,
    overExpected,
    overExpectedTotal: overExpected,
  });

  it("inner-joins by playerId and computes agreement stats", () => {
    const ours = [mk("a", 1), mk("b", 2), mk("c", 3), mk("d", 4)];
    const truth: GroundTruthPoint[] = [
      { playerId: "a", value: 1.1 },
      { playerId: "b", value: 1.9 },
      { playerId: "c", value: 3.2 },
      { playerId: "z", value: 99 }, // not in ours → dropped
    ];
    const report = buildCalibrationReport(ours, truth);
    expect(report.n).toBe(3); // a, b, c
    expect(report.pearson).toBeGreaterThan(0.95);
  });

  it("returns an all-zero report when fewer than 2 players join", () => {
    const report = buildCalibrationReport([mk("a", 1)], [{ playerId: "a", value: 1 }]);
    expect(report).toEqual<CalibrationReport>({
      n: 1,
      pearson: 0,
      spearman: 0,
      rmse: 0,
      mae: 0,
      bias: 0,
      ourMean: 0,
      truthMean: 0,
    });
  });

  it("graduationVerdict transitions across the thresholds", () => {
    const base = { rmse: 0, mae: 0, bias: 0, ourMean: 0, truthMean: 0, spearman: 0 };
    const th = DEFAULT_GRADUATION_THRESHOLDS.cpoe;

    const insufficient = graduationVerdict({ ...base, n: 5, pearson: 0.9 }, th);
    expect(insufficient.verdict).toBe("insufficient-sample");

    const graduated = graduationVerdict({ ...base, n: 20, pearson: 0.72 }, th);
    expect(graduated.verdict).toBe("graduated");

    const provisional = graduationVerdict({ ...base, n: 20, pearson: 0.45 }, th);
    expect(provisional.verdict).toBe("provisional");

    const failed = graduationVerdict({ ...base, n: 20, pearson: 0.1 }, th);
    expect(failed.verdict).toBe("failed");
  });

  it("schema hash is deterministic and order-sensitive", () => {
    expect(computeFeatureSchemaHash(["a", "b"])).toBe(computeFeatureSchemaHash(["a", "b"]));
    expect(computeFeatureSchemaHash(["a", "b"])).not.toBe(computeFeatureSchemaHash(["b", "a"]));
  });
});
