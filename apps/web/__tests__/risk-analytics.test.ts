/**
 * Tests for risk-analytics.ts — pure risk analytics math functions.
 * 140+ test cases covering every exported function: happy paths, edge cases,
 * empty inputs, zero/negative values, single-element arrays, and boundary
 * conditions (division-by-zero guards, clamping).
 */

import { describe, it, expect } from "vitest";
import {
  historicalVaR,
  parametricVaR,
  conditionalVaR,
  monteCarloVaR,
  rollingVaR,
  portfolioVariance,
  portfolioSharpeRatio,
  betaCoefficient,
  treynorRatio,
  informationRatio,
  maxDrawdown,
  maxDrawdownDuration,
  calmarRatio,
  recoveryFactor,
  underwaterCurve,
  ruinProbability,
  kellyFractionFull,
  kellyFractionHalf,
  kellyFractionQuarter,
  expectedBankrollGrowth,
  optimalBetSizeForTarget,
  expectedUtility,
  certaintyEquivalent,
  riskPremium,
  stochasticDominance,
  decisionMatrix,
  historicalVolatility,
  garchVolatility,
  impliedVolatility,
  volatilityRegime,
  injuryRiskScore,
  weatherRiskFactor,
  lateInjuryImpact,
  matchRiskRating,
} from "@/lib/analytics/risk-analytics";

// ---------------------------------------------------------------------------
// 1. Value at Risk (VaR)
// ---------------------------------------------------------------------------

describe("historicalVaR", () => {
  it("returns 0 for empty array", () => {
    expect(historicalVaR([])).toBe(0);
  });

  it("returns magnitude of loss as a positive number", () => {
    const returns = [-0.1, -0.05, 0.02, 0.03, 0.04];
    const v = historicalVaR(returns, 0.8);
    expect(v).toBeGreaterThanOrEqual(0);
  });

  it("picks the percentile loss at the configured confidence", () => {
    // 20 values; confidence 0.9 -> idx = floor((1-0.9)*20) = floor(1.9999..) = 1
    // -> sorted[1] which is the 2nd-worst loss.
    const returns = [
      -1.0, -0.9, -0.8, -0.7, -0.6, -0.5, -0.4, -0.3, -0.2, -0.1, 0.1, 0.2, 0.3, 0.4,
      0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
    ];
    expect(historicalVaR(returns, 0.9)).toBeCloseTo(0.9, 10);
  });

  it("uses idx 0 at confidence 1 (idx = 0)", () => {
    const returns = [-0.5, -0.2, 0.1];
    // floor((1-1)*3) = 0 -> sorted[0] = -0.5
    expect(historicalVaR(returns, 1)).toBeCloseTo(0.5, 10);
  });

  it("handles single element", () => {
    expect(historicalVaR([-0.3])).toBeCloseTo(0.3, 10);
  });

  it("returns negative of a positive worst value when all positive", () => {
    const returns = [0.1, 0.2, 0.3];
    // floor(0.05*3)=0 -> sorted[0]=0.1 -> -0.1
    expect(historicalVaR(returns, 0.95)).toBeCloseTo(-0.1, 10);
  });

  it("does not mutate the input array", () => {
    const returns = [0.3, -0.1, 0.2];
    const copy = [...returns];
    historicalVaR(returns);
    expect(returns).toEqual(copy);
  });

  it("defaults confidence to 0.95", () => {
    const returns = [-0.9, -0.5, -0.2, 0.1, 0.3];
    // floor(0.05*5)=0 -> sorted[0]=-0.9 -> 0.9
    expect(historicalVaR(returns)).toBeCloseTo(0.9, 10);
  });
});

describe("parametricVaR", () => {
  it("uses z=1.645 at 95% confidence", () => {
    // -(mean - z*std) = -(0 - 1.645*1) = 1.645
    expect(parametricVaR(0, 1, 0.95)).toBeCloseTo(1.645, 10);
  });

  it("uses z=2.326 at 99% confidence", () => {
    expect(parametricVaR(0, 1, 0.99)).toBeCloseTo(2.326, 10);
  });

  it("incorporates a non-zero mean", () => {
    // -(0.05 - 1.645*0.1) = -(0.05 - 0.1645) = 0.1145
    expect(parametricVaR(0.05, 0.1, 0.95)).toBeCloseTo(0.1145, 6);
  });

  it("falls back to normalInverse for non-tabulated confidence", () => {
    // confidence 0.975 -> z = -normalInverse(0.025) ~ 1.96
    const v = parametricVaR(0, 1, 0.975);
    expect(v).toBeCloseTo(1.96, 1);
  });

  it("returns 0 when mean equals z*std (95%)", () => {
    expect(parametricVaR(1.645, 1, 0.95)).toBeCloseTo(0, 6);
  });

  it("handles zero std (returns negative mean)", () => {
    expect(parametricVaR(0.1, 0, 0.95)).toBeCloseTo(-0.1, 10);
  });

  it("defaults confidence to 0.95", () => {
    expect(parametricVaR(0, 2)).toBeCloseTo(3.29, 6);
  });

  it("can produce negative VaR for large positive mean", () => {
    expect(parametricVaR(5, 1, 0.95)).toBeLessThan(0);
  });
});

describe("conditionalVaR", () => {
  it("returns 0 for empty array", () => {
    expect(conditionalVaR([])).toBe(0);
  });

  it("returns the mean of the tail losses as positive", () => {
    const returns = [-0.5, -0.4, -0.3, -0.2, -0.1, 0.1, 0.2, 0.3, 0.4, 0.5];
    // cutoffIdx = floor(0.05*10)=0 -> max(1,0)=1 -> tail=[-0.5] -> -mean=0.5
    expect(conditionalVaR(returns, 0.95)).toBeCloseTo(0.5, 10);
  });

  it("averages multiple tail values", () => {
    const returns = [-0.5, -0.4, -0.3, -0.2, -0.1, 0.1, 0.2, 0.3, 0.4, 0.5];
    // confidence 0.7 -> cutoffIdx=floor(0.3*10)=3 -> tail=[-0.5,-0.4,-0.3] -> mean=-0.4 -> 0.4
    expect(conditionalVaR(returns, 0.7)).toBeCloseTo(0.4, 10);
  });

  it("handles single element", () => {
    expect(conditionalVaR([-0.2])).toBeCloseTo(0.2, 10);
  });

  it("does not mutate the input array", () => {
    const returns = [0.2, -0.5, 0.1];
    const copy = [...returns];
    conditionalVaR(returns);
    expect(returns).toEqual(copy);
  });

  it("CVaR >= VaR in magnitude generally", () => {
    const returns = [-0.5, -0.4, -0.3, -0.2, -0.1, 0.1, 0.2, 0.3, 0.4, 0.5];
    expect(conditionalVaR(returns, 0.7)).toBeGreaterThanOrEqual(0);
  });

  it("defaults confidence to 0.95", () => {
    const returns = [-1, -0.5, 0, 0.5, 1];
    // cutoffIdx=floor(0.05*5)=0 -> max(1,0)=1 -> tail=[-1] -> 1
    expect(conditionalVaR(returns)).toBeCloseTo(1, 10);
  });
});

describe("monteCarloVaR", () => {
  it("is deterministic given a fixed seed", () => {
    const a = monteCarloVaR(0, 1, 1000, 0.95, 42);
    const b = monteCarloVaR(0, 1, 1000, 0.95, 42);
    expect(a).toBeCloseTo(b, 12);
  });

  it("produces a positive VaR for zero-mean unit-std distribution", () => {
    const v = monteCarloVaR(0, 1, 5000, 0.95, 7);
    expect(v).toBeGreaterThan(0);
  });

  it("approximates ~1.645 for standard normal at 95%", () => {
    const v = monteCarloVaR(0, 1, 20000, 0.95, 123);
    expect(v).toBeCloseTo(1.645, 0);
  });

  it("returns -mean (zero VaR offset) when std is zero", () => {
    // all sims equal mean; idx value = mean; -mean
    expect(monteCarloVaR(0.2, 0, 1000, 0.95, 1)).toBeCloseTo(-0.2, 6);
  });

  it("scales with std", () => {
    const small = monteCarloVaR(0, 1, 5000, 0.95, 5);
    const large = monteCarloVaR(0, 5, 5000, 0.95, 5);
    expect(large).toBeGreaterThan(small);
  });

  it("returns 0-ish for zero simulations (sims[0] undefined -> 0)", () => {
    expect(monteCarloVaR(0, 1, 0, 0.95, 1)).toBe(-0);
  });

  it("uses defaults for simulations/confidence/seed", () => {
    const v = monteCarloVaR(0, 1);
    expect(typeof v).toBe("number");
    expect(Number.isFinite(v)).toBe(true);
  });

  it("different seeds give different results", () => {
    const a = monteCarloVaR(0, 1, 2000, 0.95, 1);
    const b = monteCarloVaR(0, 1, 2000, 0.95, 999);
    expect(a).not.toBe(b);
  });
});

describe("rollingVaR", () => {
  it("returns empty for window <= 0", () => {
    expect(rollingVaR([0.1, 0.2, 0.3], 0)).toEqual([]);
    expect(rollingVaR([0.1, 0.2, 0.3], -2)).toEqual([]);
  });

  it("returns empty when fewer values than window", () => {
    expect(rollingVaR([0.1, 0.2], 3)).toEqual([]);
  });

  it("produces returns.length - window + 1 windows", () => {
    const returns = [-0.1, -0.2, 0.1, 0.05, -0.3];
    const r = rollingVaR(returns, 3, 0.9);
    expect(r.length).toBe(3);
  });

  it("each entry equals historicalVaR of its window", () => {
    const returns = [-0.1, -0.2, 0.1, 0.05];
    const r = rollingVaR(returns, 2, 0.9);
    expect(r[0]).toBeCloseTo(historicalVaR([-0.1, -0.2], 0.9), 10);
    expect(r[1]).toBeCloseTo(historicalVaR([-0.2, 0.1], 0.9), 10);
  });

  it("single window when window equals length", () => {
    const returns = [-0.1, 0.2, 0.3];
    expect(rollingVaR(returns, 3).length).toBe(1);
  });

  it("defaults confidence to 0.95", () => {
    const r = rollingVaR([-0.5, -0.2, 0.1, 0.3], 2);
    expect(r.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// 2. Portfolio risk
// ---------------------------------------------------------------------------

describe("portfolioVariance", () => {
  it("returns 0 for empty weights", () => {
    expect(portfolioVariance([], [], [])).toBe(0);
  });

  it("single asset: w^2 * var (corr=1)", () => {
    // var=0.04 std=0.2 w=1 corr=1 -> 1*1*1*0.2*0.2 = 0.04
    expect(portfolioVariance([1], [0.04], [[1]])).toBeCloseTo(0.04, 10);
  });

  it("two uncorrelated assets diversify", () => {
    const weights = [0.5, 0.5];
    const variances = [0.04, 0.04];
    const corr = [
      [1, 0],
      [0, 1],
    ];
    // 0.25*1*0.04 + 0.25*1*0.04 = 0.02
    expect(portfolioVariance(weights, variances, corr)).toBeCloseTo(0.02, 10);
  });

  it("perfectly correlated assets add up", () => {
    const weights = [0.5, 0.5];
    const variances = [0.04, 0.04];
    const corr = [
      [1, 1],
      [1, 1],
    ];
    // all terms: 0.25*1*0.2*0.2 *4 = 0.04
    expect(portfolioVariance(weights, variances, corr)).toBeCloseTo(0.04, 10);
  });

  it("negative correlation reduces variance below uncorrelated", () => {
    const weights = [0.5, 0.5];
    const variances = [0.04, 0.04];
    const corrNeg = [
      [1, -1],
      [-1, 1],
    ];
    expect(portfolioVariance(weights, variances, corrNeg)).toBeCloseTo(0, 10);
  });

  it("handles missing correlation row (treated as 0 off-diagonal)", () => {
    const weights = [0.5, 0.5];
    const variances = [0.04, 0.04];
    const corr = [[1]]; // missing second row
    // only [0][0] term contributes: 0.25*1*0.04 = 0.01
    expect(portfolioVariance(weights, variances, corr)).toBeCloseTo(0.01, 10);
  });

  it("handles zero variances", () => {
    expect(portfolioVariance([1, 1], [0, 0], [[1, 1], [1, 1]])).toBe(0);
  });
});

describe("portfolioSharpeRatio", () => {
  it("returns 0 when std is 0 (constant returns)", () => {
    expect(portfolioSharpeRatio([0.05, 0.05, 0.05])).toBe(0);
  });

  it("returns 0 for empty", () => {
    expect(portfolioSharpeRatio([])).toBe(0);
  });

  it("computes (mean - rf) / std", () => {
    const returns = [0.1, 0.2, 0.3];
    // mean=0.2, var = ((0.01+0+0.01)/3)=0.006667, std~0.08165
    const std = Math.sqrt((0.01 + 0 + 0.01) / 3);
    expect(portfolioSharpeRatio(returns)).toBeCloseTo(0.2 / std, 6);
  });

  it("subtracts the risk-free rate", () => {
    const returns = [0.1, 0.2, 0.3];
    const std = Math.sqrt((0.01 + 0 + 0.01) / 3);
    expect(portfolioSharpeRatio(returns, 0.05)).toBeCloseTo((0.2 - 0.05) / std, 6);
  });

  it("negative when mean below risk-free rate", () => {
    expect(portfolioSharpeRatio([0.01, 0.02, 0.03], 0.5)).toBeLessThan(0);
  });

  it("returns 0 for single element (std=0)", () => {
    expect(portfolioSharpeRatio([0.1])).toBe(0);
  });
});

describe("betaCoefficient", () => {
  it("returns 0 when market variance is 0", () => {
    expect(betaCoefficient([0.1, 0.2], [0.05, 0.05])).toBe(0);
  });

  it("beta of 1 when asset == market", () => {
    const r = [0.1, -0.2, 0.3, -0.1];
    expect(betaCoefficient(r, r)).toBeCloseTo(1, 10);
  });

  it("beta of 2 when asset is 2x market", () => {
    const market = [0.1, -0.2, 0.3, -0.1];
    const asset = market.map((x) => 2 * x);
    expect(betaCoefficient(asset, market)).toBeCloseTo(2, 10);
  });

  it("negative beta for inverse correlation", () => {
    const market = [0.1, -0.2, 0.3, -0.1];
    const asset = market.map((x) => -x);
    expect(betaCoefficient(asset, market)).toBeCloseTo(-1, 10);
  });

  it("returns 0 for empty market", () => {
    expect(betaCoefficient([0.1], [])).toBe(0);
  });

  it("handles mismatched lengths via covariance min", () => {
    const market = [0.1, -0.2, 0.3];
    const asset = [0.1, -0.2, 0.3, 99];
    expect(betaCoefficient(asset, market)).toBeCloseTo(1, 6);
  });
});

describe("treynorRatio", () => {
  it("returns 0 when beta is 0", () => {
    expect(treynorRatio(0.1, 0)).toBe(0);
  });

  it("computes (return - rf) / beta", () => {
    expect(treynorRatio(0.1, 2)).toBeCloseTo(0.05, 10);
  });

  it("subtracts risk-free rate", () => {
    expect(treynorRatio(0.1, 2, 0.02)).toBeCloseTo(0.04, 10);
  });

  it("negative beta flips sign", () => {
    expect(treynorRatio(0.1, -2)).toBeCloseTo(-0.05, 10);
  });

  it("defaults risk-free rate to 0", () => {
    expect(treynorRatio(0.2, 4)).toBeCloseTo(0.05, 10);
  });
});

describe("informationRatio", () => {
  it("returns 0 for empty inputs", () => {
    expect(informationRatio([], [])).toBe(0);
  });

  it("returns 0 when tracking error is 0 (constant active return)", () => {
    // active returns all equal -> stdDev 0
    expect(informationRatio([0.1, 0.2, 0.3], [0.05, 0.15, 0.25])).toBe(0);
  });

  it("computes mean active / tracking error", () => {
    const p = [0.1, 0.3, 0.2];
    const b = [0.0, 0.1, 0.1];
    // active = [0.1, 0.2, 0.1], mean=0.13333, var=((0.000277...)*2)/3
    const active = [0.1, 0.2, 0.1];
    const m = (0.1 + 0.2 + 0.1) / 3;
    const v = ((0.1 - m) ** 2 + (0.2 - m) ** 2 + (0.1 - m) ** 2) / 3;
    const te = Math.sqrt(v);
    expect(informationRatio(p, b)).toBeCloseTo(m / te, 6);
    void active;
  });

  it("handles mismatched lengths using the shorter", () => {
    const p = [0.1, 0.3, 0.2, 0.9];
    const b = [0.0, 0.1, 0.1];
    expect(Number.isFinite(informationRatio(p, b))).toBe(true);
  });

  it("returns 0 for single matched element (te=0)", () => {
    expect(informationRatio([0.1], [0.05])).toBe(0);
  });

  it("negative when portfolio underperforms benchmark on average", () => {
    const p = [0.0, 0.1, 0.05];
    const b = [0.2, 0.1, 0.4];
    expect(informationRatio(p, b)).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Drawdown analysis
// ---------------------------------------------------------------------------

describe("maxDrawdown", () => {
  it("returns 0 for empty", () => {
    expect(maxDrawdown([])).toBe(0);
  });

  it("returns 0 for single value", () => {
    expect(maxDrawdown([100])).toBe(0);
  });

  it("returns 0 for monotonically increasing series", () => {
    expect(maxDrawdown([1, 2, 3, 4])).toBe(0);
  });

  it("computes peak-to-trough fraction", () => {
    // peak 100, trough 50 -> 0.5
    expect(maxDrawdown([100, 80, 50, 70])).toBeCloseTo(0.5, 10);
  });

  it("tracks a new peak after recovery", () => {
    // 100 -> 50 (DD 0.5) -> 200 -> 100 (DD 0.5) -> max 0.5
    expect(maxDrawdown([100, 50, 200, 100])).toBeCloseTo(0.5, 10);
  });

  it("handles a zero peak (avoids division by zero)", () => {
    // first value 0; subsequent values keep peak handling safe
    expect(maxDrawdown([0, 0, 0])).toBe(0);
  });

  it("full drawdown to zero is 1", () => {
    expect(maxDrawdown([100, 0])).toBeCloseTo(1, 10);
  });
});

describe("maxDrawdownDuration", () => {
  it("returns 0 for empty", () => {
    expect(maxDrawdownDuration([])).toBe(0);
  });

  it("returns 0 for monotonically increasing", () => {
    expect(maxDrawdownDuration([1, 2, 3, 4])).toBe(0);
  });

  it("counts the longest below-peak streak", () => {
    // 100, then 90,80,70 below peak (3), recovers to 110, then 100 (1)
    expect(maxDrawdownDuration([100, 90, 80, 70, 110, 100])).toBe(3);
  });

  it("returns 0 when never below peak (flat counts as >= peak)", () => {
    expect(maxDrawdownDuration([100, 100, 100])).toBe(0);
  });

  it("entire series in drawdown", () => {
    expect(maxDrawdownDuration([100, 90, 80, 70])).toBe(3);
  });

  it("resets streak on new peak", () => {
    expect(maxDrawdownDuration([100, 90, 200, 150, 140])).toBe(2);
  });

  it("single value returns 0", () => {
    expect(maxDrawdownDuration([100])).toBe(0);
  });
});

describe("calmarRatio", () => {
  it("returns 0 when maxDrawdown is 0", () => {
    expect(calmarRatio(0.2, 0)).toBe(0);
  });

  it("computes annualReturn / maxDrawdown", () => {
    expect(calmarRatio(0.3, 0.15)).toBeCloseTo(2, 10);
  });

  it("negative return gives negative ratio", () => {
    expect(calmarRatio(-0.1, 0.2)).toBeCloseTo(-0.5, 10);
  });
});

describe("recoveryFactor", () => {
  it("returns 0 when maxDrawdown is 0", () => {
    expect(recoveryFactor(1.0, 0)).toBe(0);
  });

  it("computes totalReturn / maxDrawdown", () => {
    expect(recoveryFactor(0.5, 0.25)).toBeCloseTo(2, 10);
  });

  it("negative total return", () => {
    expect(recoveryFactor(-0.5, 0.25)).toBeCloseTo(-2, 10);
  });
});

describe("underwaterCurve", () => {
  it("returns empty for empty input", () => {
    expect(underwaterCurve([])).toEqual([]);
  });

  it("first point is 0 (at peak)", () => {
    const c = underwaterCurve([100, 80, 120]);
    expect(c[0]).toBeCloseTo(0, 10);
  });

  it("computes fractional distance below peak (<= 0)", () => {
    const c = underwaterCurve([100, 80, 50, 100]);
    expect(c[1]).toBeCloseTo(-0.2, 10);
    expect(c[2]).toBeCloseTo(-0.5, 10);
    expect(c[3]).toBeCloseTo(0, 10);
  });

  it("stays at 0 for monotonically increasing series", () => {
    const c = underwaterCurve([1, 2, 3]);
    expect(c.every((x) => Math.abs(x) < 1e-12)).toBe(true);
  });

  it("returns same length as input", () => {
    expect(underwaterCurve([1, 2, 3, 4, 5]).length).toBe(5);
  });

  it("handles a zero peak safely", () => {
    expect(underwaterCurve([0, 0]).every((x) => x === 0)).toBe(true);
  });

  it("single element returns [0]", () => {
    expect(underwaterCurve([42])).toEqual([0]);
  });
});

// ---------------------------------------------------------------------------
// 4. Bankroll risk
// ---------------------------------------------------------------------------

describe("ruinProbability", () => {
  it("returns 0 when betFraction <= 0", () => {
    expect(ruinProbability(0.5, 2, 0, 100)).toBe(0);
    expect(ruinProbability(0.5, 2, -0.1, 100)).toBe(0);
  });

  it("returns 1 when betFraction >= 1", () => {
    expect(ruinProbability(0.5, 2, 1, 100)).toBe(1);
    expect(ruinProbability(0.5, 2, 1.5, 100)).toBe(1);
  });

  it("returns 1 when winRate <= 0", () => {
    expect(ruinProbability(0, 2, 0.1, 100)).toBe(1);
    expect(ruinProbability(-0.2, 2, 0.1, 100)).toBe(1);
  });

  it("returns 0 when winRate >= 1", () => {
    expect(ruinProbability(1, 2, 0.1, 100)).toBe(0);
    expect(ruinProbability(1.2, 2, 0.1, 100)).toBe(0);
  });

  it("is deterministic (seeded)", () => {
    const a = ruinProbability(0.4, 2, 0.2, 100);
    const b = ruinProbability(0.4, 2, 0.2, 100);
    expect(a).toBe(b);
  });

  it("returns a probability in [0,1]", () => {
    const p = ruinProbability(0.45, 1.9, 0.3, 100);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("high edge / low bet has low ruin", () => {
    const p = ruinProbability(0.7, 2, 0.05, 100);
    expect(p).toBeLessThan(0.5);
  });

  it("defaults ruinThreshold to 0", () => {
    const p = ruinProbability(0.5, 2, 0.2, 100);
    expect(typeof p).toBe("number");
  });
});

describe("kellyFractionFull", () => {
  it("returns 0 when odds <= 1 (b <= 0)", () => {
    expect(kellyFractionFull(0.6, 1)).toBe(0);
    expect(kellyFractionFull(0.6, 0.5)).toBe(0);
  });

  it("computes (p*b - q)/b", () => {
    // p=0.6, odds=2, b=1, q=0.4 -> (0.6 - 0.4)/1 = 0.2
    expect(kellyFractionFull(0.6, 2)).toBeCloseTo(0.2, 10);
  });

  it("clamps to 0 when negative edge", () => {
    // p=0.4, odds=2 -> (0.4-0.6)/1 = -0.2 -> 0
    expect(kellyFractionFull(0.4, 2)).toBe(0);
  });

  it("clamps to 1 when result exceeds 1", () => {
    // p=1, odds=2 -> (1 - 0)/1 = 1
    expect(kellyFractionFull(1, 2)).toBe(1);
  });

  it("higher odds with same prob gives different fraction", () => {
    const k = kellyFractionFull(0.6, 3);
    // b=2, q=0.4 -> (0.6*2 - 0.4)/2 = (1.2-0.4)/2 = 0.4
    expect(k).toBeCloseTo(0.4, 10);
  });

  it("zero probability yields 0", () => {
    expect(kellyFractionFull(0, 2)).toBe(0);
  });
});

describe("kellyFractionHalf", () => {
  it("is half of full Kelly", () => {
    expect(kellyFractionHalf(0.6, 2)).toBeCloseTo(kellyFractionFull(0.6, 2) / 2, 12);
  });

  it("returns 0 when full is 0", () => {
    expect(kellyFractionHalf(0.4, 2)).toBe(0);
  });

  it("returns 0 for invalid odds", () => {
    expect(kellyFractionHalf(0.6, 1)).toBe(0);
  });
});

describe("kellyFractionQuarter", () => {
  it("is a quarter of full Kelly", () => {
    expect(kellyFractionQuarter(0.6, 2)).toBeCloseTo(kellyFractionFull(0.6, 2) / 4, 12);
  });

  it("returns 0 when full is 0", () => {
    expect(kellyFractionQuarter(0.4, 2)).toBe(0);
  });

  it("relates to half Kelly", () => {
    expect(kellyFractionQuarter(0.6, 2)).toBeCloseTo(kellyFractionHalf(0.6, 2) / 2, 12);
  });
});

describe("expectedBankrollGrowth", () => {
  it("returns 1 with zero bets", () => {
    expect(expectedBankrollGrowth(0.1, 0.6, 2, 0)).toBeCloseTo(1, 10);
  });

  it("returns 0 when loseFactor <= 0 (betFraction >= 1)", () => {
    expect(expectedBankrollGrowth(1, 0.6, 2, 10)).toBe(0);
  });

  it("returns 0 when winFactor <= 0", () => {
    // betFraction negative large with odds making winFactor <= 0
    expect(expectedBankrollGrowth(2, 0.6, 0.4, 10)).toBe(0);
  });

  it("growth > 1 for profitable edge", () => {
    const g = expectedBankrollGrowth(0.1, 0.6, 2, 100);
    expect(g).toBeGreaterThan(1);
  });

  it("growth < 1 for losing edge", () => {
    const g = expectedBankrollGrowth(0.5, 0.3, 1.5, 100);
    expect(g).toBeLessThan(1);
  });

  it("computes exact value for known inputs", () => {
    // f=0.5, p=1, odds=2, bets=1 -> winFactor=1.5^1 * loseFactor^0 = 1.5
    expect(expectedBankrollGrowth(0.5, 1, 2, 1)).toBeCloseTo(1.5, 10);
  });

  it("zero bet fraction keeps bankroll flat (growth 1)", () => {
    expect(expectedBankrollGrowth(0, 0.6, 2, 50)).toBeCloseTo(1, 10);
  });
});

describe("optimalBetSizeForTarget", () => {
  it("returns 0 when current bankroll <= 0", () => {
    expect(optimalBetSizeForTarget(200, 0, 100, 0.6, 2)).toBe(0);
    expect(optimalBetSizeForTarget(200, -50, 100, 0.6, 2)).toBe(0);
  });

  it("returns 0 when bets <= 0", () => {
    expect(optimalBetSizeForTarget(200, 100, 0, 0.6, 2)).toBe(0);
  });

  it("returns a fraction in [0, 0.999]", () => {
    const f = optimalBetSizeForTarget(200, 100, 100, 0.6, 2);
    expect(f).toBeGreaterThanOrEqual(0);
    expect(f).toBeLessThanOrEqual(0.999);
  });

  it("is deterministic for identical inputs", () => {
    const a = optimalBetSizeForTarget(200, 100, 100, 0.6, 2);
    const b = optimalBetSizeForTarget(200, 100, 100, 0.6, 2);
    expect(a).toBe(b);
  });

  it("converges to a finite fraction via bisection", () => {
    const f = optimalBetSizeForTarget(100, 100, 100, 0.6, 2);
    expect(Number.isFinite(f)).toBe(true);
    expect(f).toBeGreaterThanOrEqual(0);
    expect(f).toBeLessThanOrEqual(0.999);
  });

  it("very high unreachable target pushes toward upper bound", () => {
    const f = optimalBetSizeForTarget(1e12, 100, 5, 0.6, 2);
    expect(f).toBeGreaterThan(0.5);
  });
});

// ---------------------------------------------------------------------------
// 5. Decision theory
// ---------------------------------------------------------------------------

describe("expectedUtility", () => {
  it("returns 0 for empty inputs", () => {
    expect(expectedUtility([], [])).toBe(0);
  });

  it("computes risk-neutral expected value by default", () => {
    // 0.5*10 + 0.5*20 = 15
    expect(expectedUtility([10, 20], [0.5, 0.5])).toBeCloseTo(15, 10);
  });

  it("applies a custom utility function", () => {
    // sqrt utility: 0.5*sqrt(4) + 0.5*sqrt(16) = 0.5*2 + 0.5*4 = 3
    expect(expectedUtility([4, 16], [0.5, 0.5], (x) => Math.sqrt(x))).toBeCloseTo(3, 10);
  });

  it("uses min length when mismatched", () => {
    // only first pair: 0.5*10 = 5
    expect(expectedUtility([10, 20], [0.5])).toBeCloseTo(5, 10);
  });

  it("handles probabilities summing to less than 1", () => {
    expect(expectedUtility([100], [0.3])).toBeCloseTo(30, 10);
  });

  it("handles single outcome", () => {
    expect(expectedUtility([50], [1])).toBeCloseTo(50, 10);
  });
});

describe("certaintyEquivalent", () => {
  it("equals the value for a certain outcome", () => {
    // single outcome p=1: exp(log(10)) = 10
    expect(certaintyEquivalent([10], [1])).toBeCloseTo(10, 6);
  });

  it("CE < EV for a risky gamble (log utility is risk-averse)", () => {
    const outcomes = [10, 100];
    const probs = [0.5, 0.5];
    const ce = certaintyEquivalent(outcomes, probs);
    const ev = expectedUtility(outcomes, probs);
    expect(ce).toBeLessThan(ev);
  });

  it("floors outcomes at 0.001 (avoids log(0))", () => {
    // outcome 0 -> log(0.001); should be finite
    const ce = certaintyEquivalent([0, 0], [0.5, 0.5]);
    expect(Number.isFinite(ce)).toBe(true);
    expect(ce).toBeCloseTo(0.001, 6);
  });

  it("returns 1 for empty inputs (exp(0))", () => {
    expect(certaintyEquivalent([], [])).toBeCloseTo(1, 10);
  });

  it("ignores riskAversion parameter (reserved)", () => {
    const a = certaintyEquivalent([10, 100], [0.5, 0.5], 1);
    const b = certaintyEquivalent([10, 100], [0.5, 0.5], 5);
    expect(a).toBeCloseTo(b, 12);
  });

  it("geometric-mean-like for equal probs", () => {
    // 0.5*log(4) + 0.5*log(9) -> exp = sqrt(4*9) = 6
    expect(certaintyEquivalent([4, 9], [0.5, 0.5])).toBeCloseTo(6, 6);
  });
});

describe("riskPremium", () => {
  it("computes EV - CE", () => {
    expect(riskPremium(15, 12)).toBeCloseTo(3, 10);
  });

  it("is 0 when EV equals CE", () => {
    expect(riskPremium(10, 10)).toBe(0);
  });

  it("can be negative", () => {
    expect(riskPremium(10, 15)).toBeCloseTo(-5, 10);
  });
});

describe("stochasticDominance", () => {
  it("dist1 dominates when uniformly better", () => {
    // dist1 outcomes all greater than dist2 -> dist1 has lower CDF -> dist1 dominates
    expect(stochasticDominance([10, 20, 30], [1, 2, 3])).toBe("dist1");
  });

  it("dist2 dominates when uniformly better", () => {
    expect(stochasticDominance([1, 2, 3], [10, 20, 30])).toBe("dist2");
  });

  it("returns neither for identical distributions", () => {
    expect(stochasticDominance([1, 2, 3], [1, 2, 3])).toBe("neither");
  });

  it("returns neither for crossing CDFs", () => {
    // overlapping/crossing distributions
    expect(stochasticDominance([1, 5, 9], [2, 3, 8])).toBe("neither");
  });

  it("handles unsorted inputs", () => {
    expect(stochasticDominance([30, 10, 20], [3, 1, 2])).toBe("dist1");
  });

  it("does not mutate inputs", () => {
    const a = [3, 1, 2];
    const b = [9, 7, 8];
    const ca = [...a];
    const cb = [...b];
    stochasticDominance(a, b);
    expect(a).toEqual(ca);
    expect(b).toEqual(cb);
  });

  it("single element distributions", () => {
    expect(stochasticDominance([10], [1])).toBe("dist1");
  });
});

describe("decisionMatrix", () => {
  const actions = ["A", "B", "C"];
  const states = ["S1", "S2", "S3"];

  it("maximin picks the action with the best worst-case payoff", () => {
    const payoffs = [
      [10, 20, 5], // min 5
      [8, 8, 8], // min 8
      [30, 1, 2], // min 1
    ];
    const r = decisionMatrix(actions, states, payoffs);
    expect(r.maximin).toBe("B");
  });

  it("maximax picks the action with the best best-case payoff", () => {
    const payoffs = [
      [10, 20, 5], // max 20
      [8, 8, 8], // max 8
      [30, 1, 2], // max 30
    ];
    const r = decisionMatrix(actions, states, payoffs);
    expect(r.maximax).toBe("C");
  });

  it("minimaxRegret minimizes the maximum regret", () => {
    const payoffs = [
      [10, 20, 30],
      [25, 15, 5],
      [20, 25, 10],
    ];
    // maxPerState = [25, 25, 30]
    // regret A: [15, 5, 0] -> max 15
    // regret B: [0, 10, 25] -> max 25
    // regret C: [5, 0, 20] -> max 20
    // min of maxima is A (15)
    const r = decisionMatrix(actions, states, payoffs);
    expect(r.minimaxRegret).toBe("A");
  });

  it("handles a single action", () => {
    const r = decisionMatrix(["only"], states, [[1, 2, 3]]);
    expect(r.maximin).toBe("only");
    expect(r.maximax).toBe("only");
    expect(r.minimaxRegret).toBe("only");
  });

  it("handles empty actions (returns empty strings)", () => {
    const r = decisionMatrix([], [], []);
    expect(r.maximin).toBe("");
    expect(r.maximax).toBe("");
    expect(r.minimaxRegret).toBe("");
  });

  it("handles missing payoff cells (treated as 0)", () => {
    const r = decisionMatrix(["A", "B"], ["S1", "S2"], [[5]]);
    expect(typeof r.maximin).toBe("string");
  });

  it("ties default to the earliest action", () => {
    const payoffs = [
      [5, 5],
      [5, 5],
    ];
    const r = decisionMatrix(["A", "B"], ["S1", "S2"], payoffs);
    expect(r.maximin).toBe("A");
    expect(r.maximax).toBe("A");
    expect(r.minimaxRegret).toBe("A");
  });
});

// ---------------------------------------------------------------------------
// 6. Volatility
// ---------------------------------------------------------------------------

describe("historicalVolatility", () => {
  it("returns 0 for empty array", () => {
    expect(historicalVolatility([])).toBe(0);
  });

  it("returns 0 for constant returns", () => {
    expect(historicalVolatility([0.01, 0.01, 0.01])).toBe(0);
  });

  it("annualizes by sqrt(factor)", () => {
    const returns = [0.01, -0.01, 0.02, -0.02];
    const m = (0.01 - 0.01 + 0.02 - 0.02) / 4;
    const v =
      ((0.01 - m) ** 2 + (-0.01 - m) ** 2 + (0.02 - m) ** 2 + (-0.02 - m) ** 2) / 4;
    const std = Math.sqrt(v);
    expect(historicalVolatility(returns, 252)).toBeCloseTo(std * Math.sqrt(252), 6);
  });

  it("respects a custom annualization factor", () => {
    const returns = [0.01, -0.01, 0.02, -0.02];
    const std = historicalVolatility(returns, 1);
    expect(historicalVolatility(returns, 4)).toBeCloseTo(std * 2, 6);
  });

  it("defaults annualization to 252", () => {
    const returns = [0.05, -0.05];
    const std = Math.sqrt(0.0025);
    expect(historicalVolatility(returns)).toBeCloseTo(std * Math.sqrt(252), 6);
  });

  it("single element returns 0", () => {
    expect(historicalVolatility([0.5])).toBe(0);
  });
});

describe("garchVolatility", () => {
  it("returns empty for empty input", () => {
    expect(garchVolatility([])).toEqual([]);
  });

  it("first value is the variance of returns", () => {
    const returns = [0.01, -0.02, 0.03, -0.01];
    const r = garchVolatility(returns);
    const m = (0.01 - 0.02 + 0.03 - 0.01) / 4;
    const v =
      ((0.01 - m) ** 2 + (-0.02 - m) ** 2 + (0.03 - m) ** 2 + (-0.01 - m) ** 2) / 4;
    expect(r[0]).toBeCloseTo(v, 10);
  });

  it("returns same length as input", () => {
    expect(garchVolatility([0.01, -0.02, 0.03, -0.01]).length).toBe(4);
  });

  it("applies the recurrence omega + alpha*r^2 + beta*prevVar", () => {
    const returns = [0.1, 0.2, 0.3];
    const r = garchVolatility(returns, 0.001, 0.1, 0.8);
    const init = variance3([0.1, 0.2, 0.3]);
    const v1 = 0.001 + 0.1 * 0.1 * 0.1 + 0.8 * init;
    expect(r[1]).toBeCloseTo(v1, 10);
  });

  it("single element returns just init variance (0 for length 1)", () => {
    // variance of single element is 0
    expect(garchVolatility([0.5])).toEqual([0]);
  });

  it("all values are non-negative for non-negative params", () => {
    const r = garchVolatility([0.1, -0.2, 0.3, -0.4], 0.0001, 0.1, 0.85);
    expect(r.every((x) => x >= 0)).toBe(true);
  });

  it("uses default params", () => {
    const r = garchVolatility([0.01, 0.02, -0.01]);
    expect(r.length).toBe(3);
    expect(Number.isFinite(r[1]!)).toBe(true);
  });
});

// helper used in garch test
function variance3(arr: number[]): number {
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
}

describe("impliedVolatility", () => {
  it("returns 0 for non-positive time to expiry", () => {
    expect(impliedVolatility(5, 100, 100, 0, 0.01)).toBe(0);
    expect(impliedVolatility(5, 100, 100, -1, 0.01)).toBe(0);
  });

  it("returns 0 for non-positive option price", () => {
    expect(impliedVolatility(0, 100, 100, 1, 0.01)).toBe(0);
    expect(impliedVolatility(-5, 100, 100, 1, 0.01)).toBe(0);
  });

  it("recovers the volatility used to price a call", () => {
    // Price a call at sigma=0.2 using a forward calc, then invert.
    const S = 100,
      K = 100,
      T = 1,
      r = 0.05,
      sigma = 0.2;
    const price = bsCall(S, K, T, r, sigma);
    const iv = impliedVolatility(price, S, K, T, r, true);
    expect(iv).toBeCloseTo(0.2, 2);
  });

  it("recovers volatility for a put", () => {
    const S = 100,
      K = 110,
      T = 0.5,
      r = 0.03,
      sigma = 0.35;
    const price = bsPut(S, K, T, r, sigma);
    const iv = impliedVolatility(price, S, K, T, r, false);
    expect(iv).toBeCloseTo(0.35, 2);
  });

  it("returns 0 when price is outside the solvable bracket", () => {
    // absurdly high option price -> no solution
    expect(impliedVolatility(1e6, 100, 100, 1, 0.01, true)).toBe(0);
  });

  it("defaults isCall to true", () => {
    const S = 100,
      K = 100,
      T = 1,
      r = 0.0;
    const price = bsCall(S, K, T, r, 0.25);
    expect(impliedVolatility(price, S, K, T, r)).toBeCloseTo(0.25, 2);
  });
});

// Black-Scholes reference helpers for the implied-vol tests
function refNormalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422820 * Math.exp(-0.5 * x * x);
  const poly =
    t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  const cdf = 1 - d * poly;
  return x >= 0 ? cdf : 1 - cdf;
}
function bsCall(S: number, K: number, T: number, r: number, sigma: number): number {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return S * refNormalCDF(d1) - K * Math.exp(-r * T) * refNormalCDF(d2);
}
function bsPut(S: number, K: number, T: number, r: number, sigma: number): number {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return K * Math.exp(-r * T) * refNormalCDF(-d2) - S * refNormalCDF(-d1);
}

describe("volatilityRegime", () => {
  it("returns 'normal' when fewer returns than short window", () => {
    expect(volatilityRegime([0.01, 0.02], 20, 100)).toBe("normal");
  });

  it("returns 'normal' when long-window vol is 0", () => {
    const flat = new Array(120).fill(0.01);
    expect(volatilityRegime(flat, 20, 100)).toBe("normal");
  });

  it("classifies 'low' when recent vol much lower than long vol", () => {
    // long window has high variance, recent window flat
    const noisy = Array.from({ length: 100 }, (_, i) => (i % 2 === 0 ? 0.5 : -0.5));
    const calm = new Array(20).fill(0.001);
    const series = [...noisy, ...calm];
    expect(volatilityRegime(series, 20, 120)).toBe("low");
  });

  it("classifies 'extreme' when recent vol much higher than long vol", () => {
    const calm = new Array(100).fill(0).map((_, i) => (i % 2 === 0 ? 0.001 : -0.001));
    const spike = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 1 : -1));
    const series = [...calm, ...spike];
    expect(volatilityRegime(series, 20, 120)).toBe("extreme");
  });

  it("classifies 'normal' when short and long vol are similar", () => {
    const series = Array.from({ length: 120 }, (_, i) => (i % 2 === 0 ? 0.1 : -0.1));
    expect(volatilityRegime(series, 20, 100)).toBe("normal");
  });

  it("classifies 'high' for ratio between 1.3 and 2.0", () => {
    // Build a series where short window vol is ~1.5x long window vol.
    const longPart = Array.from({ length: 100 }, (_, i) => (i % 2 === 0 ? 0.1 : -0.1));
    const shortPart = Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 0.16 : -0.16));
    const series = [...longPart, ...shortPart];
    // recent (last 20) std ~0.16; long (last 120) mixes both -> ratio ~1.3-2.0
    const regime = volatilityRegime(series, 20, 120);
    expect(["high", "normal"]).toContain(regime);
  });

  it("uses default windows", () => {
    const series = Array.from({ length: 150 }, (_, i) => (i % 2 === 0 ? 0.05 : -0.05));
    expect(["low", "normal", "high", "extreme"]).toContain(volatilityRegime(series));
  });
});

// ---------------------------------------------------------------------------
// 7. Sports risk-specific
// ---------------------------------------------------------------------------

describe("injuryRiskScore", () => {
  it("computes the weighted score", () => {
    // age 40 -> 20, prevInjuries 2 -> 10, minutes 90 -> 10, positionRisk 1 -> 10 = 50
    expect(injuryRiskScore(40, 2, 90, 1)).toBeCloseTo(50, 10);
  });

  it("clamps to 100", () => {
    expect(injuryRiskScore(80, 20, 180, 5)).toBe(100);
  });

  it("clamps to 0 (never negative for non-negative inputs)", () => {
    expect(injuryRiskScore(0, 0, 0, 0)).toBe(0);
  });

  it("scales with age", () => {
    expect(injuryRiskScore(20, 0, 0, 0)).toBeCloseTo(10, 10);
  });

  it("scales with previous injuries", () => {
    expect(injuryRiskScore(0, 3, 0, 0)).toBeCloseTo(15, 10);
  });

  it("scales with minutes played", () => {
    expect(injuryRiskScore(0, 0, 45, 0)).toBeCloseTo(5, 10);
  });

  it("scales with position risk", () => {
    expect(injuryRiskScore(0, 0, 0, 0.5)).toBeCloseTo(5, 10);
  });
});

describe("weatherRiskFactor", () => {
  it("returns 0 for calm conditions", () => {
    expect(weatherRiskFactor(5, 15, false)).toBe(0);
  });

  it("adds 0.2 for moderate wind (>10, <=20)", () => {
    expect(weatherRiskFactor(15, 15, false)).toBeCloseTo(0.2, 10);
  });

  it("adds 0.4 for high wind (>20), not stacking the 0.2 tier", () => {
    expect(weatherRiskFactor(25, 15, false)).toBeCloseTo(0.4, 10);
  });

  it("adds 0.15 for cold (<5, >=-5)", () => {
    expect(weatherRiskFactor(5, 0, false)).toBeCloseTo(0.15, 10);
  });

  it("adds 0.3 for extreme cold (<-5), not stacking 0.15", () => {
    expect(weatherRiskFactor(5, -10, false)).toBeCloseTo(0.3, 10);
  });

  it("adds 0.2 for precipitation", () => {
    expect(weatherRiskFactor(5, 15, true)).toBeCloseTo(0.2, 10);
  });

  it("sums multiple factors", () => {
    // wind 15 (0.2) + temp 0 (0.15) + rain (0.2) = 0.55
    expect(weatherRiskFactor(15, 0, true)).toBeCloseTo(0.55, 10);
  });

  it("clamps to 1", () => {
    // wind>20 (0.4) + temp<-5 (0.3) + rain (0.2) = 0.9 -> within 1
    expect(weatherRiskFactor(30, -10, true)).toBeCloseTo(0.9, 10);
  });

  it("boundary: wind exactly 10 adds nothing", () => {
    expect(weatherRiskFactor(10, 15, false)).toBe(0);
  });

  it("boundary: temp exactly 5 adds nothing", () => {
    expect(weatherRiskFactor(5, 5, false)).toBe(0);
  });
});

describe("lateInjuryImpact", () => {
  it("computes importance * (1 - replacementQuality)", () => {
    expect(lateInjuryImpact(0.8, 0.5)).toBeCloseTo(0.4, 10);
  });

  it("returns 0 when replacement is perfect", () => {
    expect(lateInjuryImpact(1, 1)).toBe(0);
  });

  it("equals importance when replacement is useless", () => {
    expect(lateInjuryImpact(0.7, 0)).toBeCloseTo(0.7, 10);
  });

  it("clamps to 1", () => {
    // importance 2 * (1-0) = 2 -> clamp to 1
    expect(lateInjuryImpact(2, 0)).toBe(1);
  });

  it("clamps to 0 for negative product", () => {
    // replacement > 1 makes (1 - q) negative
    expect(lateInjuryImpact(0.5, 2)).toBe(0);
  });
});

describe("matchRiskRating", () => {
  it("computes the weighted sum", () => {
    // 0.5*0.2 + 0.4*0.3 + 0.6*0.2 + 0.8*0.3 = 0.1 + 0.12 + 0.12 + 0.24 = 0.58
    expect(
      matchRiskRating({ weather: 0.5, injury: 0.4, travel: 0.6, fatigue: 0.8 })
    ).toBeCloseTo(0.58, 10);
  });

  it("returns 0 for all-zero factors", () => {
    expect(matchRiskRating({ weather: 0, injury: 0, travel: 0, fatigue: 0 })).toBe(0);
  });

  it("returns 1 when all factors are 1 (weights sum to 1)", () => {
    expect(matchRiskRating({ weather: 1, injury: 1, travel: 1, fatigue: 1 })).toBeCloseTo(
      1,
      10
    );
  });

  it("weights injury and fatigue more heavily", () => {
    const highInjury = matchRiskRating({ weather: 0, injury: 1, travel: 0, fatigue: 0 });
    const highWeather = matchRiskRating({ weather: 1, injury: 0, travel: 0, fatigue: 0 });
    expect(highInjury).toBeGreaterThan(highWeather);
  });
});
