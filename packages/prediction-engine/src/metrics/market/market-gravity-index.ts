import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { normalizeClamped, round, sigmoid } from "../core/math.js";
import type { MetricLifecycleStatus } from "../core/validation.js";

export type MarketGravitySignal = "NO_SIGNAL" | "SOFT_DRIFT" | "WATCH" | "STRONG_PULL" | "GRAVITY_EVENT";

export interface MarketGravityInput {
  readonly openingLine: number;
  readonly currentLine: number;
  readonly bookLines: readonly number[];
  readonly hoursToStart: number;
  readonly marketType?: "spread" | "total" | "moneyline" | "prop";
  readonly sourceAgeMinutes: number;
  readonly freshnessTtlMinutes: number;
  readonly injuryExplainability?: number;
  readonly crossedKeyNumber?: boolean;
  readonly bookDispersionPenalty?: number;
}

export interface MarketGravityIndex {
  readonly metricId: "market-gravity-index";
  readonly score: number;
  readonly signal: MarketGravitySignal;
  readonly stale: boolean;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
}

export function marketGravityIndex(input: MarketGravityInput): MarketGravityIndex {
  const marketScale = scaleForMarket(input.marketType ?? "spread");
  const lineMoveStrength = normalizeClamped(Math.abs(input.currentLine - input.openingLine), 0, marketScale);
  const consensusAlignment = 1 - normalizeClamped(standardDeviation(input.bookLines), 0, marketScale / 2);
  const timingWeight = Math.exp(-Math.max(0, input.hoursToStart) / 24);
  const freshnessPenalty = normalizeClamped(input.sourceAgeMinutes, 0, Math.max(1, input.freshnessTtlMinutes));
  const injuryExplainability = normalizeClamped(input.injuryExplainability ?? 0, 0, 1);
  const keyNumberBonus = input.crossedKeyNumber ? 1 : 0;
  const dispersionPenalty = normalizeClamped(input.bookDispersionPenalty ?? 1 - consensusAlignment, 0, 1);
  const raw =
    -1.3 +
    2.2 * lineMoveStrength +
    1.35 * consensusAlignment +
    0.75 * timingWeight +
    0.55 * injuryExplainability +
    0.35 * keyNumberBonus -
    1.8 * freshnessPenalty -
    1.1 * dispersionPenalty;
  const score = 100 * sigmoid(raw);
  const stale = freshnessPenalty >= 1;
  const signal = stale ? "NO_SIGNAL" : classify(score);
  const drivers = sortedDrivers([
    metricDriver({
      contribution: lineMoveStrength * 22,
      direction: "UP",
      explanation: "Line movement raises market gravity only when normalized by market type.",
      name: "line_move_strength",
    }),
    metricDriver({ contribution: consensusAlignment * 13.5, direction: "UP", explanation: "Book consensus raises market gravity.", name: "consensus_alignment" }),
    metricDriver({ contribution: timingWeight * 7.5, direction: "UP", explanation: "Closer market movement receives more timing weight.", name: "timing_weight" }),
    metricDriver({
      contribution: -freshnessPenalty * 18,
      direction: freshnessPenalty > 0 ? "DOWN" : "NEUTRAL",
      explanation: "Stale market data suppresses market gravity.",
      name: "freshness_penalty",
    }),
    metricDriver({
      contribution: -dispersionPenalty * 11,
      direction: dispersionPenalty > 0 ? "DOWN" : "NEUTRAL",
      explanation: "Book dispersion suppresses clean signal classification.",
      name: "book_dispersion",
    }),
  ]);

  return {
    birthCertificate: requireMetricBirthCertificate("market-gravity-index"),
    drivers,
    metricId: "market-gravity-index",
    score: round(score, 2),
    signal,
    stale,
    status: "SHADOW",
  };
}

function classify(score: number): MarketGravitySignal {
  if (score >= 85) return "GRAVITY_EVENT";
  if (score >= 70) return "STRONG_PULL";
  if (score >= 55) return "WATCH";
  if (score >= 35) return "SOFT_DRIFT";
  return "NO_SIGNAL";
}

function scaleForMarket(marketType: NonNullable<MarketGravityInput["marketType"]>): number {
  if (marketType === "moneyline") return 80;
  if (marketType === "prop") return 2.5;
  if (marketType === "total") return 5;
  return 4;
}

function standardDeviation(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
