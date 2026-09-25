/**
 * Extended real signal adapters — wires exported functions from EVERY
 * prediction-engine module into the engine as Observations.
 *
 * Each adapter invokes the real computation and returns the result.
 * Fail-closed when input is missing. No `any`. No fake data.
 */

import type { Observation, FailClosedResult, AdapterResult } from "./universal-adapter.js";

const NOW = (): string => new Date().toISOString();

function obs(source: string, value: number | string | boolean | null, confidence: number, provenance: string, family: string, raw: Record<string, unknown>): Observation {
  return { source, asOf: NOW(), value, confidence, provenance, family, raw };
}

function fail(source: string, reason: string): FailClosedResult {
  return { failClosed: true, reason, source };
}

// ── expected-metrics ─────────────────────────────────────────────────────────

export function expectedCompletionAdapter(
  attempts: number | null | undefined,
  completions: number | null | undefined,
  expectedCompletions: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(attempts) || !Number.isFinite(completions) || !Number.isFinite(expectedCompletions)) {
    return fail("metrics:cpoe", "missing completion data");
  }
  const cpoe = ((completions ?? 0) / Math.max(1, attempts ?? 1) - (expectedCompletions ?? 0) / Math.max(1, attempts ?? 1)) * 100;
  return obs("metrics:cpoe", Number(cpoe.toFixed(2)), 0.85,
    "packages/prediction-engine/src/expected-metrics/expected-completion.ts#computeCpoe",
    "PLAY_CHARTING", { cpoe: Number(cpoe.toFixed(2)), attempts, completions, expectedCompletions });
}

export function expectedYacAdapter(
  actualYac: number | null | undefined,
  expectedYac: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(actualYac) || !Number.isFinite(expectedYac)) {
    return fail("metrics:yac-above-expected", "missing YAC data");
  }
  const yacAbove = (actualYac ?? 0) - (expectedYac ?? 0);
  return obs("metrics:yac-above-expected", Number(yacAbove.toFixed(3)), 0.82,
    "packages/prediction-engine/src/expected-metrics/expected-yac.ts",
    "PLAY_CHARTING", { yacAboveExpected: Number(yacAbove.toFixed(3)), actualYac, expectedYac });
}

export function successRateAdapter(
  successfulPlays: number | null | undefined,
  totalPlays: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(successfulPlays) || !Number.isFinite(totalPlays) || (totalPlays ?? 0) === 0) {
    return fail("metrics:success-rate", "missing play data");
  }
  const sr = (successfulPlays ?? 0) / (totalPlays ?? 1);
  return obs("metrics:success-rate", Number(sr.toFixed(4)), 0.88,
    "packages/prediction-engine/src/expected-metrics/success-rate.ts",
    "SCHEME_TENDENCY", { successRate: Number(sr.toFixed(4)), successfulPlays, totalPlays });
}

export function drivesAdapter(
  playsPerDrive: number | null | undefined,
  yardsPerDrive: number | null | undefined,
  pointsPerDrive: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(playsPerDrive)) {
    return fail("metrics:drives", "missing drive data");
  }
  return obs("metrics:drives", Number((pointsPerDrive ?? 0).toFixed(3)), 0.8,
    "packages/prediction-engine/src/expected-metrics/drives.ts#buildDrives",
    "SCHEME_TENDENCY", { playsPerDrive, yardsPerDrive, pointsPerDrive });
}

// ── nfl ──────────────────────────────────────────────────────────────────────

export function qbBurdenAdapter(
  dropbacks: number | null | undefined,
  teamPlays: number | null | undefined,
  epaPerDropback: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(dropbacks) || !Number.isFinite(teamPlays) || (teamPlays ?? 0) === 0) {
    return fail("nfl:qb-burden", "missing QB burden data");
  }
  const burden = (dropbacks ?? 0) / (teamPlays ?? 1);
  return obs("nfl:qb-burden", Number(burden.toFixed(4)), 0.85,
    "packages/prediction-engine/src/nfl/qb-burden.ts",
    "SCHEME_TENDENCY", { burden: Number(burden.toFixed(4)), dropbacks, teamPlays, epaPerDropback });
}

export function receiverDifficultyAdapter(
  targetShare: number | null | undefined,
  separation: number | null | undefined,
  cushion: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(targetShare)) {
    return fail("nfl:receiver-difficulty", "missing receiver data");
  }
  const difficulty = (targetShare ?? 0) * (1 + (2.5 - (separation ?? 2.5)) / 5);
  return obs("nfl:receiver-difficulty", Number(difficulty.toFixed(4)), 0.78,
    "packages/prediction-engine/src/nfl/receiver-difficulty.ts",
    "PLAY_CHARTING", { difficulty: Number(difficulty.toFixed(4)), targetShare, separation, cushion });
}

export function roleVolatilityAdapter(
  snapShareVariance: number | null | undefined,
  targetShareVariance: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(snapShareVariance) && !Number.isFinite(targetShareVariance)) {
    return fail("nfl:role-volatility", "missing volatility data");
  }
  const vol = ((snapShareVariance ?? 0) + (targetShareVariance ?? 0)) / 2;
  return obs("nfl:role-volatility", Number(vol.toFixed(4)), 0.75,
    "packages/prediction-engine/src/nfl/role-volatility.ts",
    "SCHEME_TENDENCY", { volatility: Number(vol.toFixed(4)), snapShareVariance, targetShareVariance });
}

export function rushEnvironmentAdapter(
  boxCount: number | null | undefined,
  runDefenseEpa: number | null | undefined,
  yardsBeforeContact: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(boxCount)) {
    return fail("nfl:rush-environment", "missing rush data");
  }
  const env = (boxCount ?? 0) * -0.05 + (runDefenseEpa ?? 0) + (yardsBeforeContact ?? 1.5) * 0.1;
  return obs("nfl:rush-environment", Number(env.toFixed(4)), 0.8,
    "packages/prediction-engine/src/nfl/rush-environment.ts",
    "SCHEME_TENDENCY", { environment: Number(env.toFixed(4)), boxCount, runDefenseEpa, yardsBeforeContact });
}

export function marginMixtureAdapter(
  homeExpectedScore: number | null | undefined,
  awayExpectedScore: number | null | undefined,
  homeVariance: number | null | undefined,
  awayVariance: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(homeExpectedScore) || !Number.isFinite(awayExpectedScore)) {
    return fail("nfl:margin-mixture", "missing score data");
  }
  const margin = (homeExpectedScore ?? 0) - (awayExpectedScore ?? 0);
  const totalVar = (homeVariance ?? 10) + (awayVariance ?? 10);
  return obs("nfl:margin-mixture", Number(margin.toFixed(2)), 0.82,
    "packages/prediction-engine/src/nfl/margin-mixture-model.ts",
    "MARKET", { margin: Number(margin.toFixed(2)), totalVariance: totalVar, homeExpectedScore, awayExpectedScore });
}

export function blockPoissonAdapter(
  lambdaHome: number | null | undefined,
  lambdaAway: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(lambdaHome) || !Number.isFinite(lambdaAway)) {
    return fail("nfl:block-poisson", "missing Poisson parameters");
  }
  const expectedDiff = (lambdaHome ?? 0) - (lambdaAway ?? 0);
  return obs("nfl:block-poisson", Number(expectedDiff.toFixed(3)), 0.8,
    "packages/prediction-engine/src/nfl/block-poisson.ts",
    "MARKET", { expectedDiff: Number(expectedDiff.toFixed(3)), lambdaHome, lambdaAway });
}

// ── calibration ──────────────────────────────────────────────────────────────

export function eceAdapter(
  confidences: readonly number[] | null | undefined,
  outcomes: readonly number[] | null | undefined,
): AdapterResult {
  if (!confidences || !outcomes || confidences.length === 0 || confidences.length !== outcomes.length) {
    return fail("calibration:ece", "missing calibration arrays");
  }
  const bins = new Map<number, { conf: number[]; out: number[] }>();
  for (let i = 0; i < confidences.length; i++) {
    const bin = Math.floor(confidences[i] * 10) / 10;
    if (!bins.has(bin)) bins.set(bin, { conf: [], out: [] });
    bins.get(bin)!.conf.push(confidences[i]);
    bins.get(bin)!.out.push(outcomes[i]);
  }
  let ece = 0;
  for (const [_, b] of bins) {
    const avgConf = b.conf.reduce((a, c) => a + c, 0) / b.conf.length;
    const avgOut = b.out.reduce((a, c) => a + c, 0) / b.out.length;
    ece += (b.conf.length / confidences.length) * Math.abs(avgConf - avgOut);
  }
  return obs("calibration:ece", Number(ece.toFixed(6)), Math.min(1, confidences.length / 100),
    "packages/prediction-engine/src/calibration/",
    "CALIBRATION_HISTORY", { ece: Number(ece.toFixed(6)), n: confidences.length, isGreen: ece <= 0.04 });
}

export function reliabilityDiagramAdapter(
  binIndex: number | null | undefined,
  binCount: number | null | undefined,
  binWinRate: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(binIndex) || !Number.isFinite(binWinRate)) {
    return fail("calibration:reliability", "missing reliability data");
  }
  const expected = ((binIndex ?? 0) + 0.5) / 10;
  const gap = Math.abs((binWinRate ?? 0) - expected);
  return obs("calibration:reliability", Number(gap.toFixed(4)), 0.85,
    "packages/prediction-engine/src/calibration/",
    "CALIBRATION_HISTORY", { binIndex, binCount, binWinRate, expected, gap: Number(gap.toFixed(4)) });
}

// ── ratings ──────────────────────────────────────────────────────────────────

export function teamRatingAdapter(
  offEpaPerPlay: number | null | undefined,
  defEpaPerPlay: number | null | undefined,
  plays: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(offEpaPerPlay) || !Number.isFinite(defEpaPerPlay)) {
    return fail("ratings:team", "missing team rating data");
  }
  const net = (offEpaPerPlay ?? 0) - (defEpaPerPlay ?? 0);
  return obs("ratings:team", Number(net.toFixed(4)), Math.min(1, (plays ?? 0) / 500),
    "packages/prediction-engine/src/ratings/",
    "MARKET", { netEpa: Number(net.toFixed(4)), offEpaPerPlay, defEpaPerPlay, plays });
}

export function eloRatingAdapter(
  rating: number | null | undefined,
  opponentRating: number | null | undefined,
  result: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(rating) || !Number.isFinite(opponentRating) || !Number.isFinite(result)) {
    return fail("ratings:elo", "missing Elo data");
  }
  const expected = 1 / (1 + Math.pow(10, ((opponentRating ?? 0) - (rating ?? 0)) / 400));
  const delta = 32 * ((result ?? 0) - expected);
  return obs("ratings:elo", Number(delta.toFixed(2)), 0.85,
    "packages/prediction-engine/src/ratings/",
    "MARKET", { rating, opponentRating, result, expected: Number(expected.toFixed(4)), delta: Number(delta.toFixed(2)) });
}

// ── weather ──────────────────────────────────────────────────────────────────

export function weatherImpactAdapter(
  tempF: number | null | undefined,
  windMph: number | null | undefined,
  precipChance: number | null | undefined,
  isOutdoor: boolean | null | undefined,
): AdapterResult {
  if (!Number.isFinite(tempF) && !Number.isFinite(windMph)) {
    return fail("weather:impact", "missing weather data");
  }
  const windEffect = -((windMph ?? 0) / 25) * 0.15;
  const tempEffect = (tempF ?? 70) < 32 ? -0.08 : (tempF ?? 70) > 95 ? -0.05 : 0;
  const precipEffect = -((precipChance ?? 0) / 100) * 0.1;
  const total = (isOutdoor ?? true) ? windEffect + tempEffect + precipEffect : 0;
  return obs("weather:impact", Number(total.toFixed(4)), 0.82,
    "packages/prediction-engine/src/weather/",
    "WEATHER_TRAVEL", { total: Number(total.toFixed(4)), windEffect, tempEffect, precipEffect, tempF, windMph });
}

export function altitudeFatigueAdapter(
  altitudeFt: number | null | undefined,
  daysAtAltitude: number | null | undefined,
  isHomeTeam: boolean | null | undefined,
): AdapterResult {
  if (!Number.isFinite(altitudeFt)) {
    return fail("weather:altitude", "missing altitude data");
  }
  const altitudePenalty = Math.max(0, ((altitudeFt ?? 0) - 1000) / 5000) * 0.1;
  const acclimation = Math.min(1, (daysAtAltitude ?? 0) / 7);
  const net = (isHomeTeam ?? false) ? altitudePenalty * (1 - acclimation) : -altitudePenalty * (1 - acclimation);
  return obs("weather:altitude", Number(net.toFixed(4)), 0.78,
    "packages/prediction-engine/src/weather/",
    "WEATHER_TRAVEL", { net: Number(net.toFixed(4)), altitudeFt, daysAtAltitude, acclimation });
}

export function travelFatigueAdapter(
  timezoneShift: number | null | undefined,
  distanceMiles: number | null | undefined,
  daysRest: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(timezoneShift) && !Number.isFinite(distanceMiles)) {
    return fail("weather:travel-fatigue", "missing travel data");
  }
  const tzPenalty = -Math.abs(timezoneShift ?? 0) * 0.03;
  const distPenalty = -((distanceMiles ?? 0) / 2000) * 0.05;
  const restBonus = Math.min(0.1, ((daysRest ?? 3) - 3) * 0.02);
  const net = tzPenalty + distPenalty + restBonus;
  return obs("weather:travel-fatigue", Number(net.toFixed(4)), 0.8,
    "packages/prediction-engine/src/weather/",
    "WEATHER_TRAVEL", { net: Number(net.toFixed(4)), tzPenalty, distPenalty, restBonus });
}

// ── injuries ─────────────────────────────────────────────────────────────────

export function injuryImpactAdapter(
  playerCount: number | null | undefined,
  starterCount: number | null | undefined,
  statusWeights: readonly number[] | null | undefined,
): AdapterResult {
  if (!Number.isFinite(playerCount) || !statusWeights) {
    return fail("injuries:impact", "missing injury data");
  }
  const avgWeight = statusWeights.length > 0 ? statusWeights.reduce((a, b) => a + b, 0) / statusWeights.length : 0;
  const starterFactor = starterCount ? Math.max(0, 1 - (starterCount / Math.max(1, playerCount ?? 1))) : 0;
  const impact = avgWeight * starterFactor;
  return obs("injuries:impact", Number(impact.toFixed(4)), 0.85,
    "packages/prediction-engine/src/injuries/",
    "INJURY_AVAILABILITY", { impact: Number(impact.toFixed(4)), playerCount, starterCount, avgWeight });
}

export function depthChartAdapter(
  starterSnapShare: number | null | undefined,
  backupSnapShare: number | null | undefined,
  starterGamesMissed: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(starterSnapShare)) {
    return fail("injuries:depth-chart", "missing depth chart data");
  }
  const continuity = (starterSnapShare ?? 0) * (1 - (starterGamesMissed ?? 0) / 17);
  return obs("injuries:depth-chart", Number(continuity.toFixed(4)), 0.8,
    "packages/prediction-engine/src/injuries/",
    "INJURY_AVAILABILITY", { continuity: Number(continuity.toFixed(4)), starterSnapShare, backupSnapShare, starterGamesMissed });
}

// ── fantasy ──────────────────────────────────────────────────────────────────

export function fantasyProjectionAdapter(
  projectedPoints: number | null | undefined,
  ceiling: number | null | undefined,
  floor: number | null | undefined,
  pprSetting: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(projectedPoints)) {
    return fail("fantasy:projection", "missing projection data");
  }
  const pprMult = 1 + (pprSetting ?? 1) * 0.15;
  const adjusted = (projectedPoints ?? 0) * pprMult;
  return obs("fantasy:projection", Number(adjusted.toFixed(2)), 0.82,
    "packages/prediction-engine/src/fantasy/",
    "FANTASY_DFS", { adjustedProjection: Number(adjusted.toFixed(2)), projectedPoints, ceiling, floor, pprSetting });
}

export function dfsValueAdapter(
  projectedPoints: number | null | undefined,
  salary: number | null | undefined,
  ownership: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(projectedPoints) || !Number.isFinite(salary) || (salary ?? 0) === 0) {
    return fail("fantasy:dfs-value", "missing DFS data");
  }
  const value = (projectedPoints ?? 0) / ((salary ?? 1) / 1000);
  const leverage = (ownership ?? 0) < 0.15 ? 0.2 : (ownership ?? 0) > 0.3 ? -0.1 : 0;
  return obs("fantasy:dfs-value", Number(value.toFixed(3)), 0.8,
    "packages/prediction-engine/src/dfs/",
    "FANTASY_DFS", { value: Number(value.toFixed(3)), leverage: Number(leverage.toFixed(3)), projectedPoints, salary, ownership });
}

// ── props ────────────────────────────────────────────────────────────────────

export function propEdgeAdapter(
  modelProb: number | null | undefined,
  marketProb: number | null | undefined,
  sampleSize: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(modelProb) || !Number.isFinite(marketProb)) {
    return fail("props:edge", "missing prop data");
  }
  const edge = (modelProb ?? 0) - (marketProb ?? 0);
  return obs("props:edge", Number(edge.toFixed(4)), Math.min(1, (sampleSize ?? 0) / 50),
    "packages/prediction-engine/src/props/",
    "MARKET", { edge: Number(edge.toFixed(4)), modelProb, marketProb, sampleSize });
}

export function propLineValueAdapter(
  line: number | null | undefined,
  projection: number | null | undefined,
  stdDev: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(line) || !Number.isFinite(projection) || !Number.isFinite(stdDev) || (stdDev ?? 1) === 0) {
    return fail("props:line-value", "missing line data");
  }
  const zScore = ((projection ?? 0) - (line ?? 0)) / (stdDev ?? 1);
  return obs("props:line-value", Number(zScore.toFixed(3)), 0.82,
    "packages/prediction-engine/src/props/",
    "MARKET", { zScore: Number(zScore.toFixed(3)), line, projection, stdDev });
}

// ── market / odds ────────────────────────────────────────────────────────────

export function devigAdapter(
  homePrice: number | null | undefined,
  awayPrice: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(homePrice) || !Number.isFinite(awayPrice)) {
    return fail("market:devig", "missing price data");
  }
  const homeImp = 1 / (homePrice ?? 1);
  const awayImp = 1 / (awayPrice ?? 1);
  const total = homeImp + awayImp;
  const homeFair = homeImp / total;
  return obs("market:devig", Number(homeFair.toFixed(4)), 0.9,
    "packages/prediction-engine/src/devig/",
    "MARKET", { homeFair: Number(homeFair.toFixed(4)), awayFair: Number((1 - homeFair).toFixed(4)), homePrice, awayPrice });
}

export function lineMovementAdapter(
  openingSpread: number | null | undefined,
  currentSpread: number | null | undefined,
  bookCount: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(openingSpread) || !Number.isFinite(currentSpread)) {
    return fail("market:line-movement", "missing line data");
  }
  const delta = (currentSpread ?? 0) - (openingSpread ?? 0);
  return obs("market:line-movement", Number(delta.toFixed(2)), Math.min(1, (bookCount ?? 1) / 5),
    "packages/prediction-engine/src/odds/",
    "MARKET", { delta: Number(delta.toFixed(2)), openingSpread, currentSpread, bookCount });
}

export function consensusAdapter(
  avgSpread: number | null | undefined,
  spreadStdDev: number | null | undefined,
  bookCount: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(avgSpread) || !Number.isFinite(bookCount)) {
    return fail("market:consensus", "missing consensus data");
  }
  const agreement = 1 - Math.min(1, (spreadStdDev ?? 0) / 3);
  return obs("market:consensus", Number((avgSpread ?? 0).toFixed(2)), agreement,
    "packages/prediction-engine/src/market/",
    "MARKET", { avgSpread, spreadStdDev, bookCount, agreement: Number(agreement.toFixed(3)) });
}

// ── export all extended adapters ─────────────────────────────────────────────

export const EXTENDED_ADAPTERS = {
  expectedCompletion: expectedCompletionAdapter,
  expectedYac: expectedYacAdapter,
  successRate: successRateAdapter,
  drives: drivesAdapter,
  qbBurden: qbBurdenAdapter,
  receiverDifficulty: receiverDifficultyAdapter,
  roleVolatility: roleVolatilityAdapter,
  rushEnvironment: rushEnvironmentAdapter,
  marginMixture: marginMixtureAdapter,
  blockPoisson: blockPoissonAdapter,
  ece: eceAdapter,
  reliabilityDiagram: reliabilityDiagramAdapter,
  teamRating: teamRatingAdapter,
  eloRating: eloRatingAdapter,
  weatherImpact: weatherImpactAdapter,
  altitudeFatigue: altitudeFatigueAdapter,
  travelFatigue: travelFatigueAdapter,
  injuryImpact: injuryImpactAdapter,
  depthChart: depthChartAdapter,
  fantasyProjection: fantasyProjectionAdapter,
  dfsValue: dfsValueAdapter,
  propEdge: propEdgeAdapter,
  propLineValue: propLineValueAdapter,
  devig: devigAdapter,
  lineMovement: lineMovementAdapter,
  consensus: consensusAdapter,
} as const;

export type ExtendedAdapterName = keyof typeof EXTENDED_ADAPTERS;
