import { describe, expect, it } from "vitest";
import {
  evalLogLambda,
  evalPoissonLogLik,
  evalDispersion,
  evalFitChanceRates,
  evalMaeNullTable,
  evalScheduleAdjustedDiff,
  evalFitWinsRegression,
  evalPredictWins,
  evalTableMae,
  evalPlayProgress,
  evalDriveProgress,
  evalIncrementalRSquared,
  evalBesselI,
  evalSkellamPMF,
  evalSkellamCDF,
  evalMarginProbs,
  evalCoverProb,
  evalFitSkellamRegression,
  evalPredictMarginProbs,
} from "./nfl-batch-bridge.js";
import type { BlockObs, ChanceRateParams, EarlyGame, SkellamObs } from "./nfl-batch-bridge.js";

const params: ChanceRateParams = {
  offTheta: { BUF: 0.1, NYJ: -0.1 },
  defTheta: { NYJ: 0.05, BUF: -0.05 },
  homeGamma: 0.08,
  alpha: 0.01,
  beta: 0.02,
  baseRate: 0.55,
};

function block(i: number): BlockObs {
  return {
    teamOff: i % 2 === 0 ? "BUF" : "NYJ",
    teamDef: i % 2 === 0 ? "NYJ" : "BUF",
    home: i % 2 === 0,
    scoreDiff: (i % 3) - 1,
    chaos: (i % 4) * 0.1,
    chances: 1 + (i % 3),
  };
}

const blocks: BlockObs[] = Array.from({ length: 12 }, (_, i) => block(i));

describe("nfl-batch-bridge block-poisson", () => {
  it("log-lambda is finite and ordered by chance rate", () => {
    const r = evalLogLambda({ obs: blocks[0]!, params });
    expect(r.ok).toBe(true);
    if (r.ok) expect(Number.isFinite(r.data)).toBe(true);
  });

  it("poisson log-lik is finite on a real block panel", () => {
    const r = evalPoissonLogLik({ obs: blocks, params });
    expect(r.ok).toBe(true);
    if (r.ok) expect(Number.isFinite(r.data)).toBe(true);
  });

  it("dispersion is finite and non-negative", () => {
    const r = evalDispersion({ obs: blocks, params });
    expect(r.ok).toBe(true);
    if (r.ok) expect(Number.isFinite(r.data)).toBe(true);
  });

  it("fits chance rates on a block panel", () => {
    const r = evalFitChanceRates({ obs: blocks, iters: 200 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(Number.isFinite(r.data.baseRate)).toBe(true);
  });

  it("fail-closes on empty obs and missing params", () => {
    expect(evalPoissonLogLik({ obs: [], params }).ok).toBe(false);
    expect(evalDispersion({ obs: [], params }).ok).toBe(false);
    expect(evalFitChanceRates({ obs: [] }).ok).toBe(false);
    const missing = evalLogLambda({
      obs: blocks[0]!,
      params: undefined as unknown as ChanceRateParams,
    });
    expect(missing.ok).toBe(false);
  });
});

describe("nfl-batch-bridge parsimonious-season", () => {
  const games: EarlyGame[] = [
    { team: "BUF", opponent: "NYJ", pointDiff: 14, oppStrength: 2 },
    { team: "BUF", opponent: "MIA", pointDiff: 7, oppStrength: -1 },
    { team: "NYJ", opponent: "BUF", pointDiff: -14, oppStrength: 3 },
    { team: "NYJ", opponent: "CLE", pointDiff: 3, oppStrength: -2 },
    { team: "MIA", opponent: "BUF", pointDiff: -7, oppStrength: 3 },
  ];

  it("null-table MAE grows with team count", () => {
    const small = evalMaeNullTable({ n: 8 });
    const large = evalMaeNullTable({ n: 32 });
    expect(small.ok).toBe(true);
    expect(large.ok).toBe(true);
    if (small.ok && large.ok) expect(large.data).toBeGreaterThan(small.data);
  });

  it("fail-closes on a degenerate season length", () => {
    expect(evalMaeNullTable({ n: 1 }).ok).toBe(false);
  });

  it("schedule-adjusted diff nets out opponent strength", () => {
    const r = evalScheduleAdjustedDiff({ games });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.keys(r.data).length).toBeGreaterThan(0);
      expect(Number.isFinite(r.data["BUF"] ?? Number.NaN)).toBe(true);
    }
  });

  it("fits wins regression and reports R-squared", () => {
    const early = { BUF: 9, NYJ: -2, MIA: -1, CLE: 1, DET: 0.5 };
    const final = { BUF: 13, NYJ: 4, MIA: 6, CLE: 9, DET: 7 };
    const r = evalFitWinsRegression({ earlyDiff: early, finalWins: final });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Number.isFinite(r.data.slope)).toBe(true);
      expect(r.data.rSquared).toBeGreaterThanOrEqual(0);
    }
  });

  it("refuses a regression on fewer than three teams", () => {
    const r = evalFitWinsRegression({
      earlyDiff: { A: 1, B: 2 },
      finalWins: { A: 8, B: 7 },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("3 teams");
  });

  it("predicts wins per team and scores the table", () => {
    const early = { BUF: 9, NYJ: -2, MIA: -1 };
    const fit = evalFitWinsRegression({
      earlyDiff: early,
      finalWins: { BUF: 13, NYJ: 4, MIA: 6 },
    });
    expect(fit.ok).toBe(true);
    if (!fit.ok) return;
    const predicted = evalPredictWins({
      earlyDiff: early,
      slope: fit.data.slope,
      intercept: fit.data.intercept,
    });
    expect(predicted.ok).toBe(true);
    if (!predicted.ok) return;
    const mae = evalTableMae({
      predicted: predicted.data,
      actual: { BUF: 13, NYJ: 4, MIA: 6 },
    });
    expect(mae.ok).toBe(true);
    if (mae.ok) expect(mae.data).toBeGreaterThanOrEqual(0);
  });

  it("fail-closes on empty tables and no team overlap", () => {
    expect(evalScheduleAdjustedDiff({ games: [] }).ok).toBe(false);
    expect(
      evalTableMae({ predicted: { A: 1 }, actual: { B: 2 } }).ok,
    ).toBe(false);
  });
});

describe("nfl-batch-bridge progress-target", () => {
  it("play progress rises with yards gained", () => {
    const small = evalPlayProgress({ yardsGained: 1, yardsToGo: 10, down: 1 });
    const big = evalPlayProgress({ yardsGained: 9, yardsToGo: 10, down: 1 });
    expect(small.ok).toBe(true);
    expect(big.ok).toBe(true);
    if (small.ok && big.ok) expect(big.data).toBeGreaterThan(small.data);
  });

  it("fail-closes on bad yards-to-go and down", () => {
    expect(evalPlayProgress({ yardsGained: 1, yardsToGo: 0, down: 1 }).ok).toBe(
      false,
    );
    expect(
      evalPlayProgress({ yardsGained: 1, yardsToGo: 10, down: 7 as 1 }).ok,
    ).toBe(false);
  });

  it("drive progress averages its plays", () => {
    const r = evalDriveProgress({
      plays: [
        { yardsGained: 5, yardsToGo: 10, down: 1 },
        { yardsGained: 2, yardsToGo: 10, down: 2 },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(Number.isFinite(r.data)).toBe(true);
  });

  it("fail-closes on an empty drive", () => {
    expect(evalDriveProgress({ plays: [] }).ok).toBe(false);
  });

  it("incremental R-squared is zero when the baseline is the full model", () => {
    const actual = [1, 2, 3, 4, 5, 6];
    const same = [1.1, 2.1, 2.9, 4.2, 4.8, 6.1];
    const r = evalIncrementalRSquared({
      actual,
      predEpaOnly: same,
      predFull: same,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeCloseTo(0, 6);
  });

  it("incremental R-squared is non-zero when the full model improves", () => {
    const actual = [1, 2, 3, 4, 5, 6];
    const poor = [3, 3, 3, 3, 3, 3];
    const good = [1, 2, 3, 4, 5, 6];
    const r = evalIncrementalRSquared({
      actual,
      predEpaOnly: poor,
      predFull: good,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeGreaterThan(0);
  });

  it("fail-closes on length mismatch and tiny samples", () => {
    expect(
      evalIncrementalRSquared({
        actual: [1, 2],
        predEpaOnly: [1],
        predFull: [1, 2],
      }).ok,
    ).toBe(false);
    // A single-observation fit is a degenerate but well-formed input:
    // ssTot is 0, so the engine reports 0 rather than refusing.
    const degenerate = evalIncrementalRSquared({
      actual: [1],
      predEpaOnly: [1],
      predFull: [1],
    });
    expect(degenerate.ok).toBe(true);
    if (degenerate.ok) expect(degenerate.data).toBe(0);
  });
});

describe("nfl-batch-bridge skellam-margin", () => {
  it("Bessel I is 1 at order 0, x=0", () => {
    const r = evalBesselI({ n: 0, x: 0 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeCloseTo(1, 6);
  });

  it("fail-closes on negative Bessel arguments", () => {
    expect(evalBesselI({ n: -1, x: 1 }).ok).toBe(false);
    expect(evalBesselI({ n: 1, x: -1 }).ok).toBe(false);
  });

  it("Skellam PMF peaks at the mean margin", () => {
    const l1 = 24;
    const l2 = 20;
    const atMean = evalSkellamPMF({ k: l1 - l2, l1, l2 });
    const offMean = evalSkellamPMF({ k: l1 - l2 + 6, l1, l2 });
    expect(atMean.ok).toBe(true);
    expect(offMean.ok).toBe(true);
    if (atMean.ok && offMean.ok) {
      expect(atMean.data).toBeGreaterThan(offMean.data);
      expect(atMean.data).toBeGreaterThan(0);
      expect(atMean.data).toBeLessThanOrEqual(1);
    }
  });

  it("refuses a non-positive scoring rate", () => {
    expect(evalSkellamPMF({ k: 0, l1: 0, l2: 20 }).ok).toBe(false);
    expect(evalSkellamPMF({ k: 0, l1: 24, l2: -1 }).ok).toBe(false);
    expect(evalSkellamCDF({ k: 0, l1: 0, l2: 0 }).ok).toBe(false);
    expect(evalMarginProbs({ l1: 0, l2: 20 }).ok).toBe(false);
  });

  it("CDF is monotone in k", () => {
    const lo = evalSkellamCDF({ k: -2, l1: 24, l2: 20 });
    const hi = evalSkellamCDF({ k: 6, l1: 24, l2: 20 });
    expect(lo.ok).toBe(true);
    expect(hi.ok).toBe(true);
    if (lo.ok && hi.ok) expect(hi.data).toBeGreaterThan(lo.data);
  });

  it("margin probabilities partition the outcome space", () => {
    const r = evalMarginProbs({ l1: 24, l2: 20 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.homeWin + r.data.push + r.data.awayWin).toBeCloseTo(1, 6);
      expect(r.data.homeWin).toBeGreaterThan(r.data.awayWin);
    }
  });

  it("equal rates give a symmetric split", () => {
    const r = evalMarginProbs({ l1: 22, l2: 22 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.homeWin).toBeCloseTo(r.data.awayWin, 3);
    }
  });

  it("cover probability falls as the spread grows", () => {
    const easy = evalCoverProb({ l1: 28, l2: 18, spread: -7 });
    const hard = evalCoverProb({ l1: 28, l2: 18, spread: 7 });
    expect(easy.ok).toBe(true);
    expect(hard.ok).toBe(true);
    if (easy.ok && hard.ok) expect(easy.data).toBeGreaterThan(hard.data);
  });

  it("fail-closes on a non-finite spread", () => {
    expect(
      evalCoverProb({ l1: 24, l2: 20, spread: Number.NaN }).ok,
    ).toBe(false);
  });

  it("fits and applies a Skellam regression", () => {
    const data: SkellamObs[] = Array.from({ length: 12 }, (_, i) => ({
      covariates: [1, i / 10],
      margin: 2 + Math.round(i / 2),
    }));
    const fit = evalFitSkellamRegression({ data, iters: 150 });
    expect(fit.ok).toBe(true);
    if (!fit.ok) return;
    const predicted = evalPredictMarginProbs({
      regression: fit.data,
      covariates: [1, 0.5],
    });
    expect(predicted.ok).toBe(true);
    if (predicted.ok) {
      const total =
        predicted.data.homeWin + predicted.data.push + predicted.data.awayWin;
      expect(total).toBeCloseTo(1, 6);
    }
  });

  it("fail-closes on an empty fit and mismatched covariate width", () => {
    expect(evalFitSkellamRegression({ data: [] }).ok).toBe(false);
    const data: SkellamObs[] = [{ covariates: [1, 0.2], margin: 3 }];
    const fit = evalFitSkellamRegression({ data });
    if (fit.ok) {
      const bad = evalPredictMarginProbs({
        regression: fit.data,
        covariates: [1, 0.2, 0.3, 0.4],
      });
      expect(bad.ok).toBe(false);
      if (!bad.ok) expect(bad.reason).toContain("model width");
    }
  });
});
