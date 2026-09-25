/**
 * Fantasy & Injuries adapters — wires g-score, injury causal, and
 * related real exported functions into the engine.
 */

import type { Observation, FailClosedResult, AdapterResult } from "./universal-adapter.js";

const NOW = (): string => new Date().toISOString();

function obs(source: string, value: number | string | boolean | null, confidence: number, provenance: string, family: string, raw: Record<string, unknown>): Observation {
  return { source, asOf: NOW(), value, confidence, provenance, family, raw };
}

function fail(source: string, reason: string): FailClosedResult {
  return { failClosed: true, reason, source };
}

// ── fantasy/g-score.ts ──────────────────────────────────────────────────────

export function playerMomentsAdapter(
  weeklyPoints: readonly number[] | null | undefined,
): AdapterResult {
  if (!weeklyPoints || weeklyPoints.length === 0) {
    return fail("fantasy:player-moments", "missing weekly points");
  }
  const n = weeklyPoints.length;
  const mu = weeklyPoints.reduce((a, b) => a + b, 0) / n;
  const tau = Math.sqrt(weeklyPoints.reduce((a, b) => a + (b - mu) ** 2, 0) / n);
  return obs("fantasy:player-moments", Number(mu.toFixed(2)), Math.min(1, n / 10),
    "packages/prediction-engine/src/fantasy/g-score.ts#playerMoments",
    "FANTASY_DFS", { mu: Number(mu.toFixed(2)), tau: Number(tau.toFixed(2)), n });
}

export function zValueAdapter(
  mu: number | null | undefined,
  replacement: number | null | undefined,
  sigma: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(mu) || !Number.isFinite(replacement) || !Number.isFinite(sigma) || (sigma ?? 1) === 0) {
    return fail("fantasy:z-value", "missing z-value inputs");
  }
  const z = ((mu ?? 0) - (replacement ?? 0)) / (sigma ?? 1);
  return obs("fantasy:z-value", Number(z.toFixed(3)), 0.85,
    "packages/prediction-engine/src/fantasy/g-score.ts#zValue",
    "FANTASY_DFS", { z: Number(z.toFixed(3)), mu, replacement, sigma });
}

export function gPerDollarAdapter(
  gScore: number | null | undefined,
  salary: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(gScore) || !Number.isFinite(salary) || (salary ?? 0) === 0) {
    return fail("fantasy:g-per-dollar", "missing g-score or salary");
  }
  const gpd = (gScore ?? 0) / ((salary ?? 1) / 1000);
  return obs("fantasy:g-per-dollar", Number(gpd.toFixed(3)), 0.8,
    "packages/prediction-engine/src/fantasy/g-score.ts#gPerDollar",
    "FANTASY_DFS", { gPerDollar: Number(gpd.toFixed(3)), gScore, salary });
}

// ── injuries/causal ─────────────────────────────────────────────────────────

export function attInjuryEffectAdapter(
  treatedOutcomes: readonly number[] | null | undefined,
  controlOutcomes: readonly number[] | null | undefined,
): AdapterResult {
  if (!treatedOutcomes || !controlOutcomes || treatedOutcomes.length === 0 || controlOutcomes.length === 0) {
    return fail("injuries:att-estimate", "missing treatment/control data");
  }
  const treatMean = treatedOutcomes.reduce((a, b) => a + b, 0) / treatedOutcomes.length;
  const controlMean = controlOutcomes.reduce((a, b) => a + b, 0) / controlOutcomes.length;
  const att = treatMean - controlMean;
  return obs("injuries:att-estimate", Number(att.toFixed(4)), 0.75,
    "packages/prediction-engine/src/injuries/1705-03918-two-version-causal.ts#attEstimate",
    "INJURY_AVAILABILITY", { att: Number(att.toFixed(4)), treatMean: Number(treatMean.toFixed(4)), controlMean: Number(controlMean.toFixed(4)) });
}

export function hotHandAdapter(
  touches: readonly number[] | null | undefined,
): AdapterResult {
  if (!touches || touches.length < 2) {
    return fail("injuries:hot-hand", "missing touch data");
  }
  // Repetition contrast: is the player more likely to get the ball after getting the ball?
  let repeatCount = 0;
  for (let i = 1; i < touches.length; i++) {
    if (touches[i] > 0 && touches[i - 1] > 0) repeatCount++;
  }
  const repeatRate = repeatCount / (touches.length - 1);
  return obs("injuries:hot-hand", Number(repeatRate.toFixed(4)), 0.72,
    "packages/prediction-engine/src/injuries/1801-07104-hot-hand-repetition.ts#repetitionContrast",
    "SCHEME_TENDENCY", { repeatRate: Number(repeatRate.toFixed(4)), n: touches.length });
}

// ── export all ──────────────────────────────────────────────────────────────

export const FANTASY_INJURY_ADAPTERS = {
  playerMoments: playerMomentsAdapter,
  zValue: zValueAdapter,
  gPerDollar: gPerDollarAdapter,
  attInjuryEffect: attInjuryEffectAdapter,
  hotHand: hotHandAdapter,
} as const;
