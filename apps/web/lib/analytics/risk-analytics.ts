/**
 * risk-analytics.ts
 *
 * Pure risk analytics math functions for portfolio management, bankroll risk,
 * and decision making. Zero external dependencies — Node built-ins only.
 *
 * noUncheckedIndexedAccess is enabled — every array index read uses ?? fallback.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i] ?? 0;
  return sum / arr.length;
}

function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  let s = 0;
  for (let i = 0; i < arr.length; i++) {
    const d = (arr[i] ?? 0) - m;
    s += d * d;
  }
  return s / arr.length;
}

function stdDev(arr: number[]): number {
  return Math.sqrt(variance(arr));
}

function covariance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let s = 0;
  for (let i = 0; i < n; i++) {
    s += ((a[i] ?? 0) - ma) * ((b[i] ?? 0) - mb);
  }
  return s / n;
}

/** Cumulative normal distribution via Horner's approximation */
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422820 * Math.exp(-0.5 * x * x);
  const poly =
    t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
  const cdf = 1 - d * poly;
  return x >= 0 ? cdf : 1 - cdf;
}

/** Inverse normal (probit) via Beasley-Springer-Moro */
function normalInverse(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let z: number;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    z =
      (((((c[0] ?? 0) * q + (c[1] ?? 0)) * q + (c[2] ?? 0)) * q + (c[3] ?? 0)) * q +
        (c[4] ?? 0)) *
        q +
        (c[5] ?? 0) /
          (((((d[0] ?? 0) * q + (d[1] ?? 0)) * q + (d[2] ?? 0)) * q + (d[3] ?? 0)) * q + 1);
  } else if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    z =
      (((((a[0] ?? 0) * r + (a[1] ?? 0)) * r + (a[2] ?? 0)) * r + (a[3] ?? 0)) * r +
        (a[4] ?? 0)) *
        r +
        (a[5] ?? 0);
    z *= q;
    z /=
      (((((b[0] ?? 0) * r + (b[1] ?? 0)) * r + (b[2] ?? 0)) * r + (b[3] ?? 0)) * r +
        (b[4] ?? 0)) *
        r +
        1;
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    z = -(
      (((((c[0] ?? 0) * q + (c[1] ?? 0)) * q + (c[2] ?? 0)) * q + (c[3] ?? 0)) * q +
        (c[4] ?? 0)) *
        q +
        (c[5] ?? 0) /
          (((((d[0] ?? 0) * q + (d[1] ?? 0)) * q + (d[2] ?? 0)) * q + (d[3] ?? 0)) * q + 1)
    );
  }
  return z;
}

/** Simple linear congruential generator for seeded pseudo-random numbers */
function makeLCG(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Box-Muller transform to produce normally-distributed samples */
function boxMuller(u1: number, u2: number): number {
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-15))) * Math.cos(2 * Math.PI * u2);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Threshold below which a variance/std-dev result is treated as effectively
 * zero. Guards against floating-point dust from constant/near-constant series
 * (e.g. variance([0.05,0.05,0.05]) ≈ 5e-35) causing division blow-ups.
 */
const ZERO_EPSILON = 1e-12;

// ---------------------------------------------------------------------------
// 1. Value at Risk (VaR)
// ---------------------------------------------------------------------------

/**
 * Historical VaR — sorts returns and finds the percentile loss.
 * Returns a positive number (magnitude of loss).
 */
export function historicalVaR(returns: number[], confidence = 0.95): number {
  if (returns.length === 0) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const idx = Math.floor((1 - confidence) * sorted.length);
  return -(sorted[idx] ?? sorted[0] ?? 0);
}

/**
 * Parametric (normal) VaR.
 * VaR = -(mean - z * stdDev); z: 95%→1.645, 99%→2.326.
 * Returns positive number.
 */
export function parametricVaR(mean_: number, stdDev_: number, confidence = 0.95): number {
  const zMap: Record<string, number> = { "0.99": 2.326, "0.95": 1.645 };
  const z = zMap[confidence.toFixed(2)] ?? -normalInverse(1 - confidence);
  return -(mean_ - z * stdDev_);
}

/**
 * Conditional VaR (CVaR / Expected Shortfall).
 * Mean of returns worse than the VaR threshold.
 * Returns positive number.
 */
export function conditionalVaR(returns: number[], confidence = 0.95): number {
  if (returns.length === 0) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const cutoffIdx = Math.floor((1 - confidence) * sorted.length);
  const tail = sorted.slice(0, Math.max(1, cutoffIdx));
  return -mean(tail);
}

/**
 * Monte Carlo VaR using Box-Muller seeded simulation.
 */
export function monteCarloVaR(
  mean_: number,
  stdDev_: number,
  simulations = 10000,
  confidence = 0.95,
  seed = 42
): number {
  const rng = makeLCG(seed);
  const sims: number[] = [];
  for (let i = 0; i < simulations; i++) {
    const u1 = rng();
    const u2 = rng();
    sims.push(mean_ + stdDev_ * boxMuller(u1, u2));
  }
  sims.sort((a, b) => a - b);
  const idx = Math.floor((1 - confidence) * sims.length);
  return -(sims[idx] ?? sims[0] ?? 0);
}

/**
 * Rolling VaR — VaR for each window of size `window`.
 */
export function rollingVaR(returns: number[], window: number, confidence = 0.95): number[] {
  if (window <= 0 || returns.length < window) return [];
  const result: number[] = [];
  for (let i = 0; i <= returns.length - window; i++) {
    result.push(historicalVaR(returns.slice(i, i + window), confidence));
  }
  return result;
}

// ---------------------------------------------------------------------------
// 2. Portfolio risk
// ---------------------------------------------------------------------------

/**
 * Portfolio variance: w^T Σ w
 * Σ[i][j] = corr[i][j] * std[i] * std[j]
 */
export function portfolioVariance(
  weights: number[],
  variances: number[],
  correlationMatrix: number[][]
): number {
  const n = weights.length;
  let total = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const wi = weights[i] ?? 0;
      const wj = weights[j] ?? 0;
      const stdi = Math.sqrt(variances[i] ?? 0);
      const stdj = Math.sqrt(variances[j] ?? 0);
      const corr = (correlationMatrix[i] ?? [])[j] ?? 0;
      total += wi * wj * corr * stdi * stdj;
    }
  }
  return total;
}

/**
 * Portfolio Sharpe Ratio: (mean(returns) - riskFreeRate) / std(returns).
 */
export function portfolioSharpeRatio(returns: number[], riskFreeRate = 0): number {
  const std = stdDev(returns);
  if (std < ZERO_EPSILON) return 0;
  return (mean(returns) - riskFreeRate) / std;
}

/**
 * Beta coefficient: cov(asset, market) / var(market).
 */
export function betaCoefficient(assetReturns: number[], marketReturns: number[]): number {
  const mktVar = variance(marketReturns);
  if (mktVar < ZERO_EPSILON) return 0;
  return covariance(assetReturns, marketReturns) / mktVar;
}

/**
 * Treynor Ratio: (portfolioReturn - riskFreeRate) / beta.
 */
export function treynorRatio(
  portfolioReturn: number,
  beta: number,
  riskFreeRate = 0
): number {
  if (beta === 0) return 0;
  return (portfolioReturn - riskFreeRate) / beta;
}

/**
 * Information Ratio: active return / tracking error.
 * Returns 0 if tracking error = 0.
 */
export function informationRatio(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): number {
  const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
  if (n === 0) return 0;
  const activeReturns: number[] = [];
  for (let i = 0; i < n; i++) {
    activeReturns.push((portfolioReturns[i] ?? 0) - (benchmarkReturns[i] ?? 0));
  }
  const te = stdDev(activeReturns);
  if (te < ZERO_EPSILON) return 0;
  return mean(activeReturns) / te;
}

// ---------------------------------------------------------------------------
// 3. Drawdown analysis
// ---------------------------------------------------------------------------

/**
 * Maximum peak-to-trough decline as a fraction.
 * Returns 0 if empty or single value.
 */
export function maxDrawdown(values: number[]): number {
  if (values.length <= 1) return 0;
  let peak = values[0] ?? 0;
  let maxDD = 0;
  for (let i = 1; i < values.length; i++) {
    const v = values[i] ?? 0;
    if (v > peak) peak = v;
    const dd = peak === 0 ? 0 : (peak - v) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

/**
 * Longest number of periods spent in drawdown (below a previous peak).
 */
export function maxDrawdownDuration(values: number[]): number {
  if (values.length === 0) return 0;
  let peak = values[0] ?? 0;
  let current = 0;
  let max = 0;
  for (let i = 1; i < values.length; i++) {
    const v = values[i] ?? 0;
    if (v >= peak) {
      peak = v;
      current = 0;
    } else {
      current++;
      if (current > max) max = current;
    }
  }
  return max;
}

/**
 * Calmar Ratio: annualReturn / maxDrawdown. Returns 0 if maxDrawdown = 0.
 */
export function calmarRatio(annualReturn: number, maxDrawdownVal: number): number {
  if (maxDrawdownVal === 0) return 0;
  return annualReturn / maxDrawdownVal;
}

/**
 * Recovery Factor: totalReturn / maxDrawdown.
 */
export function recoveryFactor(totalReturn: number, maxDrawdownVal: number): number {
  if (maxDrawdownVal === 0) return 0;
  return totalReturn / maxDrawdownVal;
}

/**
 * Underwater curve — fractional distance below running peak at each point.
 */
export function underwaterCurve(values: number[]): number[] {
  if (values.length === 0) return [];
  let peak = values[0] ?? 0;
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const v = values[i] ?? 0;
    if (v > peak) peak = v;
    result.push(peak === 0 ? 0 : (v - peak) / peak);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 4. Bankroll risk (sports betting specific)
// ---------------------------------------------------------------------------

/**
 * Ruin probability estimate using simulation (100k steps, seeded).
 * P(bankroll ≤ ruinThreshold) approximated via Monte Carlo.
 */
export function ruinProbability(
  winRate: number,
  oddsDecimal: number,
  betFraction: number,
  initialBankroll: number,
  ruinThreshold = 0
): number {
  if (betFraction <= 0 || betFraction >= 1) return betFraction <= 0 ? 0 : 1;
  if (winRate <= 0) return 1;
  if (winRate >= 1) return 0;

  const TRIALS = 100;
  const STEPS = 1000;
  const rng = makeLCG(12345);
  let ruinCount = 0;

  for (let t = 0; t < TRIALS; t++) {
    let bankroll = initialBankroll;
    let ruined = false;
    for (let s = 0; s < STEPS; s++) {
      if (bankroll <= ruinThreshold) {
        ruined = true;
        break;
      }
      const bet = bankroll * betFraction;
      if (rng() < winRate) {
        bankroll += bet * (oddsDecimal - 1);
      } else {
        bankroll -= bet;
      }
    }
    if (ruined || bankroll <= ruinThreshold) ruinCount++;
  }

  return clamp(ruinCount / TRIALS, 0, 1);
}

/**
 * Full Kelly fraction: (p*b - q) / b where b = odds - 1, q = 1 - p. Clamped 0–1.
 */
export function kellyFractionFull(probability: number, oddsDecimal: number): number {
  const b = oddsDecimal - 1;
  if (b <= 0) return 0;
  const q = 1 - probability;
  const kelly = (probability * b - q) / b;
  return clamp(kelly, 0, 1);
}

/**
 * Half Kelly fraction.
 */
export function kellyFractionHalf(probability: number, oddsDecimal: number): number {
  return kellyFractionFull(probability, oddsDecimal) / 2;
}

/**
 * Quarter Kelly fraction.
 */
export function kellyFractionQuarter(probability: number, oddsDecimal: number): number {
  return kellyFractionFull(probability, oddsDecimal) / 4;
}

/**
 * Expected bankroll growth after `bets` wagers with given fraction and win rate.
 * Formula: (1 + f*(o-1))^(bets*p) * (1-f)^(bets*(1-p))
 */
export function expectedBankrollGrowth(
  betFraction: number,
  winRate: number,
  oddsDecimal: number,
  bets: number
): number {
  const winFactor = 1 + betFraction * (oddsDecimal - 1);
  const loseFactor = 1 - betFraction;
  if (winFactor <= 0 || loseFactor <= 0) return 0;
  return (
    Math.pow(winFactor, bets * winRate) * Math.pow(loseFactor, bets * (1 - winRate))
  );
}

/**
 * Optimal bet fraction to reach a target bankroll.
 * Solves the growth equation via bisection on [0, 0.999].
 */
export function optimalBetSizeForTarget(
  targetBankroll: number,
  currentBankroll: number,
  bets: number,
  winRate: number,
  oddsDecimal: number
): number {
  if (currentBankroll <= 0 || bets <= 0) return 0;
  const targetGrowth = targetBankroll / currentBankroll;

  let lo = 0;
  let hi = 0.999;
  for (let iter = 0; iter < 100; iter++) {
    const mid = (lo + hi) / 2;
    const g = expectedBankrollGrowth(mid, winRate, oddsDecimal, bets);
    if (g < targetGrowth) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

// ---------------------------------------------------------------------------
// 5. Decision theory
// ---------------------------------------------------------------------------

/**
 * Expected utility: sum(p * u(x)). Default utility = identity (risk-neutral).
 */
export function expectedUtility(
  outcomes: number[],
  probabilities: number[],
  utilityFn: (x: number) => number = (x) => x
): number {
  const n = Math.min(outcomes.length, probabilities.length);
  let eu = 0;
  for (let i = 0; i < n; i++) {
    eu += (probabilities[i] ?? 0) * utilityFn(outcomes[i] ?? 0);
  }
  return eu;
}

/**
 * Certainty equivalent using log utility (riskAversion=1 by default).
 * CE = exp(E[log(max(x, 0.001))])
 */
export function certaintyEquivalent(
  outcomes: number[],
  probabilities: number[],
  riskAversion = 1
): number {
  void riskAversion; // parameter reserved; log utility is riskAversion=1
  const n = Math.min(outcomes.length, probabilities.length);
  let sumPLogX = 0;
  for (let i = 0; i < n; i++) {
    const x = Math.max(outcomes[i] ?? 0, 0.001);
    sumPLogX += (probabilities[i] ?? 0) * Math.log(x);
  }
  return Math.exp(sumPLogX);
}

/**
 * Risk premium: EV - CE.
 */
export function riskPremium(expectedValue: number, certaintyEquivalentVal: number): number {
  return expectedValue - certaintyEquivalentVal;
}

/**
 * First-order stochastic dominance comparison.
 * Returns which distribution dominates, or 'neither'.
 */
export function stochasticDominance(
  dist1: number[],
  dist2: number[]
): "dist1" | "dist2" | "neither" {
  const sorted1 = [...dist1].sort((a, b) => a - b);
  const sorted2 = [...dist2].sort((a, b) => a - b);
  const n1 = sorted1.length;
  const n2 = sorted2.length;

  // Compare CDFs at a set of common evaluation points
  const allValues = [...new Set([...sorted1, ...sorted2])].sort((a, b) => a - b);

  let dist1Dominates = true;
  let dist2Dominates = true;

  for (const v of allValues) {
    // CDF(v) = fraction of values <= v
    const cdf1 = sorted1.filter((x) => x <= v).length / Math.max(n1, 1);
    const cdf2 = sorted2.filter((x) => x <= v).length / Math.max(n2, 1);

    // For dist1 to dominate: CDF1(v) <= CDF2(v) for all v (dist1 has "better" outcomes)
    if (cdf1 > cdf2) dist1Dominates = false;
    if (cdf2 > cdf1) dist2Dominates = false;
  }

  // Strict dominance: must be strictly less at some point
  const strictlyLess1 = allValues.some((v) => {
    const cdf1 = sorted1.filter((x) => x <= v).length / Math.max(n1, 1);
    const cdf2 = sorted2.filter((x) => x <= v).length / Math.max(n2, 1);
    return cdf1 < cdf2;
  });
  const strictlyLess2 = allValues.some((v) => {
    const cdf1 = sorted1.filter((x) => x <= v).length / Math.max(n1, 1);
    const cdf2 = sorted2.filter((x) => x <= v).length / Math.max(n2, 1);
    return cdf2 < cdf1;
  });

  if (dist1Dominates && strictlyLess1) return "dist1";
  if (dist2Dominates && strictlyLess2) return "dist2";
  return "neither";
}

/**
 * Decision matrix analysis.
 * payoffs[actionIndex][stateIndex]
 *
 * - maximin: maximises the minimum payoff (pessimistic)
 * - maximax: maximises the maximum payoff (optimistic)
 * - minimaxRegret: minimises the maximum regret
 */
export function decisionMatrix(
  actions: string[],
  states: string[],
  payoffs: number[][]
): { maximin: string; maximax: string; minimaxRegret: string } {
  const nActions = actions.length;
  const nStates = states.length;

  // Build regret matrix
  const maxPerState: number[] = [];
  for (let s = 0; s < nStates; s++) {
    let maxVal = -Infinity;
    for (let a = 0; a < nActions; a++) {
      const val = (payoffs[a] ?? [])[s] ?? 0;
      if (val > maxVal) maxVal = val;
    }
    maxPerState.push(maxVal);
  }

  const regrets: number[][] = payoffs.map((row, a) =>
    row.map((_, s) => (maxPerState[s] ?? 0) - ((payoffs[a] ?? [])[s] ?? 0))
  );

  let maximinAction = 0;
  let maximaxAction = 0;
  let minimaxRegretAction = 0;

  let bestMaximin = -Infinity;
  let bestMaximax = -Infinity;
  let bestMinimaxRegret = Infinity;

  for (let a = 0; a < nActions; a++) {
    const row = payoffs[a] ?? [];
    const regretRow = regrets[a] ?? [];

    let rowMin = Infinity;
    let rowMax = -Infinity;
    let regretMax = -Infinity;

    for (let s = 0; s < nStates; s++) {
      const v = row[s] ?? 0;
      const r = regretRow[s] ?? 0;
      if (v < rowMin) rowMin = v;
      if (v > rowMax) rowMax = v;
      if (r > regretMax) regretMax = r;
    }

    if (rowMin > bestMaximin) {
      bestMaximin = rowMin;
      maximinAction = a;
    }
    if (rowMax > bestMaximax) {
      bestMaximax = rowMax;
      maximaxAction = a;
    }
    if (regretMax < bestMinimaxRegret) {
      bestMinimaxRegret = regretMax;
      minimaxRegretAction = a;
    }
  }

  return {
    maximin: actions[maximinAction] ?? "",
    maximax: actions[maximaxAction] ?? "",
    minimaxRegret: actions[minimaxRegretAction] ?? "",
  };
}

// ---------------------------------------------------------------------------
// 6. Volatility
// ---------------------------------------------------------------------------

/**
 * Historical volatility: std(returns) * sqrt(annualizationFactor).
 * Default annualizationFactor = 252.
 */
export function historicalVolatility(returns: number[], annualizationFactor = 252): number {
  return stdDev(returns) * Math.sqrt(annualizationFactor);
}

/**
 * GARCH(1,1) conditional variance sequence.
 * Initialises from variance of returns.
 */
export function garchVolatility(
  returns: number[],
  omega = 0.00001,
  alpha = 0.1,
  beta = 0.85
): number[] {
  if (returns.length === 0) return [];
  const initVar = variance(returns);
  const result: number[] = [initVar];
  for (let t = 1; t < returns.length; t++) {
    const prevVar = result[t - 1] ?? initVar;
    const prevRet = returns[t - 1] ?? 0;
    result.push(omega + alpha * prevRet * prevRet + beta * prevVar);
  }
  return result;
}

/**
 * Black-Scholes implied volatility via bisection.
 * timeToExpiry in years. Returns 0 if no solution found.
 */
function bsPrice(S: number, K: number, T: number, r: number, sigma: number, isCall: boolean): number {
  if (T <= 0 || sigma <= 0) return 0;
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  if (isCall) {
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  }
  return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
}

export function impliedVolatility(
  optionPrice: number,
  spotPrice: number,
  strike: number,
  timeToExpiry: number,
  riskFreeRate: number,
  isCall = true
): number {
  if (timeToExpiry <= 0 || optionPrice <= 0) return 0;

  let lo = 1e-6;
  let hi = 10.0;

  const fLo = bsPrice(spotPrice, strike, timeToExpiry, riskFreeRate, lo, isCall) - optionPrice;
  const fHi = bsPrice(spotPrice, strike, timeToExpiry, riskFreeRate, hi, isCall) - optionPrice;

  if (fLo * fHi > 0) return 0; // no solution in bracket

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = bsPrice(spotPrice, strike, timeToExpiry, riskFreeRate, mid, isCall) - optionPrice;
    if (Math.abs(fMid) < 1e-8 || (hi - lo) / 2 < 1e-8) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return (lo + hi) / 2;
}

/**
 * Volatility regime based on ratio of short-window vol to long-window vol.
 * Ratio < 0.7 → low, 0.7–1.3 → normal, 1.3–2.0 → high, > 2.0 → extreme.
 */
export function volatilityRegime(
  returns: number[],
  shortWindow = 20,
  longWindow = 100
): "low" | "normal" | "high" | "extreme" {
  if (returns.length < shortWindow) return "normal";
  const recent = returns.slice(-shortWindow);
  const longReturns = returns.slice(-longWindow);
  const shortVol = stdDev(recent);
  const longVol = stdDev(longReturns);
  if (longVol < ZERO_EPSILON) return "normal";
  const ratio = shortVol / longVol;
  if (ratio < 0.7) return "low";
  if (ratio < 1.3) return "normal";
  if (ratio < 2.0) return "high";
  return "extreme";
}

// ---------------------------------------------------------------------------
// 7. Sports risk-specific
// ---------------------------------------------------------------------------

/**
 * Injury risk score (0–100).
 * score = (age/40)*20 + previousInjuries*5 + (minutesPlayed/90)*10 + positionRisk*10; clamped 0–100.
 */
export function injuryRiskScore(
  playerAge: number,
  previousInjuries: number,
  minutesPlayed: number,
  positionRisk: number
): number {
  const score =
    (playerAge / 40) * 20 +
    previousInjuries * 5 +
    (minutesPlayed / 90) * 10 +
    positionRisk * 10;
  return clamp(score, 0, 100);
}

/**
 * Weather risk factor (0–1).
 * wind > 10 m/s → +0.2; wind > 20 m/s → +0.4 (replaces the 0.2 tier)
 * temp < 5°C → +0.15; temp < -5°C → +0.3 (replaces the 0.15 tier)
 * rain → +0.2; sum clamped 0–1.
 */
export function weatherRiskFactor(
  windSpeedMs: number,
  tempCelsius: number,
  precipitation: boolean
): number {
  let risk = 0;
  if (windSpeedMs > 20) risk += 0.4;
  else if (windSpeedMs > 10) risk += 0.2;
  if (tempCelsius < -5) risk += 0.3;
  else if (tempCelsius < 5) risk += 0.15;
  if (precipitation) risk += 0.2;
  return clamp(risk, 0, 1);
}

/**
 * Late injury impact: playerImportance * (1 - replacementQuality); clamped 0–1.
 */
export function lateInjuryImpact(
  playerImportance: number,
  replacementQuality: number
): number {
  return clamp(playerImportance * (1 - replacementQuality), 0, 1);
}

/**
 * Match risk rating — weighted sum of factors.
 * weather*0.2 + injury*0.3 + travel*0.2 + fatigue*0.3
 */
export function matchRiskRating(factors: {
  weather: number;
  injury: number;
  travel: number;
  fatigue: number;
}): number {
  return (
    factors.weather * 0.2 +
    factors.injury * 0.3 +
    factors.travel * 0.2 +
    factors.fatigue * 0.3
  );
}
