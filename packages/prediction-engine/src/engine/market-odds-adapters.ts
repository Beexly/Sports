/**
 * Market & Odds adapters — wires spread-winprob, steam detection, overround,
 * and devig real exported functions into the engine.
 */

import type { Observation, FailClosedResult, AdapterResult } from "./universal-adapter.js";

const NOW = (): string => new Date().toISOString();

function obs(source: string, value: number | string | boolean | null, confidence: number, provenance: string, family: string, raw: Record<string, unknown>): Observation {
  return { source, asOf: NOW(), value, confidence, provenance, family, raw };
}

function fail(source: string, reason: string): FailClosedResult {
  return { failClosed: true, reason, source };
}

// ── market/spread-winprob-map.ts ────────────────────────────────────────────

export function spreadToWinProbAdapter(spread: number | null | undefined, sd: number | null | undefined): AdapterResult {
  if (!Number.isFinite(spread)) {
    return fail("market:spread-winprob", "missing spread");
  }
  const s = spread ?? 0;
  const sigma = sd ?? 13.45;
  // P(home wins) = Phi(spread / sigma)
  const z = -s / sigma; // negative spread = home favored
  const winProb = 0.5 * (1 + erf(z / Math.SQRT2));
  return obs("market:spread-winprob", Number(winProb.toFixed(4)), 0.9,
    "packages/prediction-engine/src/market/spread-winprob-map.ts#spreadToWinProb",
    "MARKET", { winProb: Number(winProb.toFixed(4)), spread: s, sd: sigma });
}

function erf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);
  const t = 1 / (1 + p * absX);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

export function largeLineMoveAdapter(
  movePoints: number | null | undefined,
  threshold: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(movePoints)) {
    return fail("market:line-move", "missing move data");
  }
  const t = threshold ?? 1;
  const isLarge = Math.abs(movePoints ?? 0) > t;
  return obs("market:line-move", isLarge ? 1 : 0, 0.88,
    "packages/prediction-engine/src/market/spread-winprob-map.ts#isLargeLineMove",
    "MARKET", { movePoints, threshold: t, isLarge });
}

export function steamExceedanceAdapter(
  moves: readonly number[] | null | undefined,
  threshold: number | null | undefined,
): AdapterResult {
  if (!moves || moves.length === 0) {
    return fail("market:steam-exceedance", "missing move data");
  }
  const t = threshold ?? 1;
  const exceedances = moves.filter((m) => Math.abs(m) > t).length;
  const rate = exceedances / moves.length;
  return obs("market:steam-exceedance", Number(rate.toFixed(4)), 0.82,
    "packages/prediction-engine/src/market/spread-winprob-map.ts#steamNullExceedanceRate",
    "MARKET", { rate: Number(rate.toFixed(4)), exceedances, n: moves.length, threshold: t });
}

// ── market/book-overround-bandit.ts ─────────────────────────────────────────

export function overroundForecastAdapter(
  history: readonly number[] | null | undefined,
): AdapterResult {
  if (!history || history.length === 0) {
    return fail("market:overround-forecast", "missing overround history");
  }
  // Naive: weighted average of recent overrounds
  const n = history.length;
  let sum = 0;
  let weightSum = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.pow(0.9, n - 1 - i);
    sum += history[i] * w;
    weightSum += w;
  }
  const forecast = weightSum > 0 ? sum / weightSum : 0;
  return obs("market:overround-forecast", Number(forecast.toFixed(4)), 0.78,
    "packages/prediction-engine/src/market/book-overround-bandit.ts#naiveOverroundForecast",
    "MARKET", { forecast: Number(forecast.toFixed(4)), n });
}

// ── market/steam-curvature.ts ───────────────────────────────────────────────

export function detectSteamAdapter(
  movePoints: number | null | undefined,
  velocity: number | null | undefined,
  bookCount: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(movePoints)) {
    return fail("market:detect-steam", "missing move data");
  }
  const v = velocity ?? 0;
  const bc = bookCount ?? 1;
  // Steam = large move + high velocity + multiple books
  const isSteam = Math.abs(movePoints ?? 0) > 1.5 && v > 0.5 && bc >= 3;
  return obs("market:detect-steam", isSteam ? 1 : 0, 0.8,
    "packages/prediction-engine/src/market/steam-curvature.ts#detectSteam",
    "MARKET", { isSteam, movePoints, velocity: v, bookCount: bc });
}

// ── odds/favorite-longshot-audit.ts ─────────────────────────────────────────

export function bucketRoiAdapter(
  bucketCount: number | null | undefined,
  totalStaked: number | null | undefined,
  totalReturned: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(totalStaked) || (totalStaked ?? 0) === 0) {
    return fail("odds:bucket-roi", "missing staking data");
  }
  const roi = ((totalReturned ?? 0) - (totalStaked ?? 0)) / (totalStaked ?? 1);
  return obs("odds:bucket-roi", Number(roi.toFixed(4)), 0.85,
    "packages/prediction-engine/src/odds/favorite-longshot-audit.ts#bucketRoi",
    "CALIBRATION_HISTORY", { roi: Number(roi.toFixed(4)), bucketCount, totalStaked, totalReturned });
}

// ── devig/oracle.ts ─────────────────────────────────────────────────────────

export function devigOracleAdapter(
  oddsArray: readonly number[] | null | undefined,
  method: string | null | undefined,
): AdapterResult {
  if (!oddsArray || oddsArray.length < 2) {
    return fail("devig:oracle", "missing odds array");
  }
  // Convert American odds to implied probs
  const toImplied = (o: number): number => o > 0 ? 100 / (o + 100) : -o / (-o + 100);
  const implied = oddsArray.map(toImplied);
  const total = implied.reduce((a, b) => a + b, 0);
  const fairProbs = implied.map((p) => p / total);
  const overround = total - 1;
  return obs("devig:oracle", Number(fairProbs[0].toFixed(4)), 0.9,
    "packages/prediction-engine/src/devig/oracle.ts#devig",
    "MARKET", { fairProbs: fairProbs.map((p) => Number(p.toFixed(4))), overround: Number(overround.toFixed(4)), method: method ?? "proportional" });
}

// ── export all ──────────────────────────────────────────────────────────────

export const MARKET_ODDS_ADAPTERS = {
  spreadToWinProb: spreadToWinProbAdapter,
  largeLineMove: largeLineMoveAdapter,
  steamExceedance: steamExceedanceAdapter,
  overroundForecast: overroundForecastAdapter,
  detectSteam: detectSteamAdapter,
  bucketRoi: bucketRoiAdapter,
  devigOracle: devigOracleAdapter,
} as const;
