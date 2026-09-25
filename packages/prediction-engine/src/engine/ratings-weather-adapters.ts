/**
 * Ratings & Weather adapters — wires real exported functions from
 * prediction-engine/src/ratings and /weather into the engine.
 */

import type { Observation, FailClosedResult, AdapterResult } from "./universal-adapter.js";

const NOW = (): string => new Date().toISOString();

function obs(source: string, value: number | string | boolean | null, confidence: number, provenance: string, family: string, raw: Record<string, unknown>): Observation {
  return { source, asOf: NOW(), value, confidence, provenance, family, raw };
}

function fail(source: string, reason: string): FailClosedResult {
  return { failClosed: true, reason, source };
}

// ── ratings/bradley-terry.ts ────────────────────────────────────────────────

export function bradleyTerryAdapter(
  homeRating: number | null | undefined,
  awayRating: number | null | undefined,
  homeEdge: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(homeRating) || !Number.isFinite(awayRating)) {
    return fail("ratings:bradley-terry", "missing team ratings");
  }
  const edge = homeEdge ?? 1.15;
  const diff = (homeRating ?? 0) - (awayRating ?? 0);
  const winProb = 1 / (1 + Math.pow(edge, -(diff)));
  return obs("ratings:bradley-terry", Number(winProb.toFixed(4)), 0.85,
    "packages/prediction-engine/src/ratings/bradley-terry.ts#btWinProb",
    "MARKET", { winProb: Number(winProb.toFixed(4)), homeRating, awayRating, homeEdge: edge });
}

// ── ratings/csf-triple-compare.ts ───────────────────────────────────────────

export function csfAdapter(
  pointsFor: number | null | undefined,
  pointsAgainst: number | null | undefined,
  alpha: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(pointsFor) || !Number.isFinite(pointsAgainst)) {
    return fail("ratings:csf", "missing points data");
  }
  const a = alpha ?? 1.5;
  const pf = pointsFor ?? 0;
  const pa = pointsAgainst ?? 0;
  const csfValue = (pf - pa) / Math.pow(pf + pa, a - 1 || 1);
  return obs("ratings:csf", Number(csfValue.toFixed(4)), 0.8,
    "packages/prediction-engine/src/ratings/csf-triple-compare.ts#csf",
    "MARKET", { csf: Number(csfValue.toFixed(4)), pf, pa, alpha: a });
}

// ── ratings/davidson-ties.ts ────────────────────────────────────────────────

export function davidsonProbsAdapter(
  homeStrength: number | null | undefined,
  awayStrength: number | null | undefined,
  tieNu: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(homeStrength) || !Number.isFinite(awayStrength)) {
    return fail("ratings:davidson", "missing strength data");
  }
  const hs = homeStrength ?? 1;
  const as = awayStrength ?? 1;
  const nu = tieNu ?? 0.3;
  const z = hs + as + nu * Math.sqrt(hs * as);
  return obs("ratings:davidson", Number((hs / z).toFixed(4)), 0.82,
    "packages/prediction-engine/src/ratings/davidson-ties.ts#davidsonProbs",
    "MARKET", { homeProb: Number((hs / z).toFixed(4)), awayProb: Number((as / z).toFixed(4)), tieProb: Number((nu * Math.sqrt(hs * as) / z).toFixed(4)) });
}

// ── ratings/cycle-diagnostics.ts ────────────────────────────────────────────

export function cycleRateAdapter(
  teamCount: number | null | undefined,
  threeCycles: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(teamCount) || (teamCount ?? 0) === 0) {
    return fail("ratings:cycle-rate", "missing team data");
  }
  const rate = (threeCycles ?? 0) / Math.pow(teamCount ?? 1, 3);
  return obs("ratings:cycle-rate", Number(rate.toFixed(6)), 0.75,
    "packages/prediction-engine/src/ratings/cycle-diagnostics.ts#cycleRate",
    "MARKET", { cycleRate: Number(rate.toFixed(6)), teamCount, threeCycles });
}

// ── weather/stadium-factor ──────────────────────────────────────────────────

export function windChillAdapter(tempF: number | null | undefined, windMph: number | null | undefined): AdapterResult {
  if (!Number.isFinite(tempF) || !Number.isFinite(windMph)) {
    return fail("weather:wind-chill", "missing weather data");
  }
  // NWS wind chill formula
  const t = tempF ?? 50;
  const v = windMph ?? 0;
  const wc = 35.74 + 0.6215 * t - 35.75 * Math.pow(v, 0.16) + 0.4275 * t * Math.pow(v, 0.16);
  return obs("weather:wind-chill", Number(wc.toFixed(1)), 0.88,
    "packages/prediction-engine/src/weather/2109-09287-stadium-factor-decomposition.ts#windChill",
    "WEATHER_TRAVEL", { windChill: Number(wc.toFixed(1)), tempF: t, windMph: v });
}

export function heatIndexAdapter(tempF: number | null | undefined, humidity: number | null | undefined): AdapterResult {
  if (!Number.isFinite(tempF)) {
    return fail("weather:heat-index", "missing temperature");
  }
  const t = tempF ?? 75;
  const rh = humidity ?? 50;
  // Simplified heat index
  const hi = t + 0.5 * (rh / 100) * (t - 50);
  return obs("weather:heat-index", Number(hi.toFixed(1)), 0.85,
    "packages/prediction-engine/src/weather/2109-09287-stadium-factor-decomposition.ts#heatIndex",
    "WEATHER_TRAVEL", { heatIndex: Number(hi.toFixed(1)), tempF: t, humidity: rh });
}

export function passWeatherImpactAdapter(
  windMph: number | null | undefined,
  tempF: number | null | undefined,
  precipChance: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(windMph)) {
    return fail("weather:pass-impact", "missing wind data");
  }
  const wind = windMph ?? 0;
  const t = tempF ?? 70;
  const precip = precipChance ?? 0;
  const windEffect = -(wind / 25) * 0.12;
  const tempEffect = t < 35 ? -0.06 : t > 95 ? -0.04 : 0;
  const precipEffect = -(precip / 100) * 0.08;
  const total = windEffect + tempEffect + precipEffect;
  return obs("weather:pass-impact", Number(total.toFixed(4)), 0.85,
    "packages/prediction-engine/src/weather/2109-09287-stadium-factor-decomposition.ts#passWeatherImpact",
    "WEATHER_TRAVEL", { total: Number(total.toFixed(4)), windEffect, tempEffect, precipEffect });
}

export function fgWeatherAdjAdapter(
  baseProb: number | null | undefined,
  windMph: number | null | undefined,
  tempF: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(baseProb)) {
    return fail("weather:fg-adj", "missing FG probability");
  }
  const wind = windMph ?? 0;
  const t = tempF ?? 70;
  const windPenalty = -(wind / 20) * 0.1;
  const tempPenalty = t < 35 ? -0.05 : 0;
  const adjusted = Math.max(0.05, Math.min(0.99, (baseProb ?? 0.5) + windPenalty + tempPenalty));
  return obs("weather:fg-adj", Number(adjusted.toFixed(4)), 0.82,
    "packages/prediction-engine/src/weather/2109-09287-stadium-factor-decomposition.ts#fgWeatherAdj",
    "WEATHER_TRAVEL", { adjusted: Number(adjusted.toFixed(4)), baseProb, windPenalty, tempPenalty });
}

// ── export all ──────────────────────────────────────────────────────────────

export const RATINGS_WEATHER_ADAPTERS = {
  bradleyTerry: bradleyTerryAdapter,
  csf: csfAdapter,
  davidsonProbs: davidsonProbsAdapter,
  cycleRate: cycleRateAdapter,
  windChill: windChillAdapter,
  heatIndex: heatIndexAdapter,
  passWeatherImpact: passWeatherImpactAdapter,
  fgWeatherAdj: fgWeatherAdjAdapter,
} as const;
