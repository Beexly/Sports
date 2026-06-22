import { describe, it, expect } from "vitest";
import {
  // forecasting
  logLoss,
  brierDecomposition,
  crpsGaussian,
  crpsEnsemble,
  plattScale,
  applyPlatt,
  temperatureScale,
  applyTemperature,
  kalmanFilterSeries,
  ucb1Select,
  // scoreline
  poissonPmf,
  dixonColesScorelineGrid,
  matchOutcomeProbs,
  overUnderProbs,
  bttsProbs,
  dixonColesMatch,
} from "./index";

describe("forecasting — proper scores", () => {
  it("log loss rewards confident-correct and punishes confident-wrong", () => {
    expect(logLoss([0.99, 0.01], [1, 0])).toBeLessThan(0.02);
    expect(logLoss([0.5, 0.5], [1, 0])).toBeCloseTo(Math.log(2), 5);
    expect(logLoss([0.01, 0.99], [1, 0])).toBeGreaterThan(2);
  });

  it("Brier decomposition satisfies brier = reliability - resolution + uncertainty", () => {
    const preds = [0.1, 0.1, 0.9, 0.9, 0.5, 0.5];
    const outs: (0 | 1)[] = [0, 0, 1, 1, 0, 1];
    const d = brierDecomposition(preds, outs, 10);
    expect(Math.abs(d.brier - (d.reliability - d.resolution + d.uncertainty))).toBeLessThan(1e-9);
    expect(d.uncertainty).toBeGreaterThan(0);
  });

  it("CRPS prefers sharp, well-centered Gaussian forecasts", () => {
    expect(crpsGaussian(0, 1, 0)).toBeCloseTo(0.2337, 3);
    expect(crpsGaussian(0, 0.5, 0)).toBeLessThan(crpsGaussian(0, 2, 0)); // tighter is better when centered
    expect(crpsGaussian(0, 1, 0)).toBeLessThan(crpsGaussian(3, 1, 0)); // centered beats off-center
  });

  it("ensemble CRPS is ~0 for a spot-on ensemble and grows as it spreads", () => {
    expect(crpsEnsemble([5, 5, 5], 5)).toBeCloseTo(0, 6);
    expect(crpsEnsemble([4, 5, 6], 5)).toBeLessThan(crpsEnsemble([0, 5, 10], 5));
  });
});

describe("forecasting — recalibration", () => {
  it("Platt scaling learns a monotone increasing map when scores track labels", () => {
    const scores = [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2];
    const outs: (0 | 1)[] = [0, 0, 0, 0, 1, 1, 1, 1];
    const params = plattScale(scores, outs);
    expect(params.a).toBeGreaterThan(0);
    expect(applyPlatt(params, 2)).toBeGreaterThan(applyPlatt(params, -2));
  });

  it("temperature scaling never increases log loss vs T=1", () => {
    const preds = [0.99, 0.99, 0.99, 0.99, 0.01, 0.01, 0.01, 0.01];
    const outs: (0 | 1)[] = [1, 1, 1, 0, 0, 0, 0, 1]; // over-confident
    const T = temperatureScale(preds, outs);
    expect(T).toBeGreaterThan(0);
    const after = logLoss(preds.map((p) => applyTemperature(p, T)), outs);
    const before = logLoss(preds, outs);
    expect(after).toBeLessThanOrEqual(before + 1e-9);
  });
});

describe("forecasting — form tracking + selection", () => {
  it("Kalman filter converges toward a constant signal and tightens variance", () => {
    const series = kalmanFilterSeries([10, 10, 10, 10, 10, 10, 10, 10], { processVar: 0.1, obsVar: 1, init: { mean: 0, variance: 10 } });
    const last = series[series.length - 1]!;
    const first = series[0]!;
    expect(Math.abs(last.mean - 10)).toBeLessThan(Math.abs(first.mean - 10));
    expect(last.variance).toBeLessThan(first.variance);
  });

  it("UCB1 explores untried arms first, then exploits the best", () => {
    expect(ucb1Select([{ pulls: 5, totalReward: 5 }, { pulls: 0, totalReward: 0 }])).toBe(1);
    expect(ucb1Select([{ pulls: 100, totalReward: 80 }, { pulls: 100, totalReward: 30 }])).toBe(0);
  });
});

describe("scoreline model (Dixon-Coles)", () => {
  it("Poisson pmf is a valid distribution", () => {
    let sum = 0;
    for (let k = 0; k <= 20; k++) sum += poissonPmf(k, 1.4);
    expect(sum).toBeCloseTo(1, 4);
  });

  it("the scoreline grid is a normalised distribution", () => {
    const grid = dixonColesScorelineGrid(1.6, 1.1, -0.05, 10);
    let sum = 0;
    for (const row of grid) for (const p of row) sum += p;
    expect(sum).toBeCloseTo(1, 6);
  });

  it("1X2 probabilities are coherent and favour the higher-xG side", () => {
    const grid = dixonColesScorelineGrid(1.9, 0.9, -0.05, 10);
    const out = matchOutcomeProbs(grid);
    expect(out.homeWin + out.draw + out.awayWin).toBeCloseTo(1, 6);
    expect(out.homeWin).toBeGreaterThan(out.awayWin);
  });

  it("over/under 2.5 sums to 1 (no integer push)", () => {
    const grid = dixonColesScorelineGrid(1.5, 1.3, -0.05, 10);
    const ou = overUnderProbs(grid, 2.5);
    expect(ou.over + ou.under).toBeCloseTo(1, 6);
    expect(ou.push).toBe(0);
  });

  it("BTTS yes+no = 1", () => {
    const grid = dixonColesScorelineGrid(1.4, 1.2, -0.05, 10);
    const b = bttsProbs(grid);
    expect(b.yes + b.no).toBeCloseTo(1, 6);
  });

  it("negative rho lifts low-score draw mass vs independence", () => {
    const gridDep = dixonColesScorelineGrid(1.2, 1.2, -0.1, 10);
    const gridIndep = dixonColesScorelineGrid(1.2, 1.2, 0, 10);
    expect(gridDep[0]![0]!).toBeGreaterThan(gridIndep[0]![0]!); // 0-0 boosted
    expect(matchOutcomeProbs(gridDep).draw).toBeGreaterThan(matchOutcomeProbs(gridIndep).draw);
  });

  it("dixonColesMatch returns a coherent summary with top scorelines", () => {
    const m = dixonColesMatch(1.7, 1.0);
    expect(m.outcome.homeWin + m.outcome.draw + m.outcome.awayWin).toBeCloseTo(1, 6);
    expect(m.topScores.length).toBe(5);
    expect(m.expectedGoals.total).toBeCloseTo(2.7, 6);
  });
});
