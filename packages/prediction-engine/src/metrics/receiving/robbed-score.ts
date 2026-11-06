import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { round } from "../core/math.js";
import { uncertaintyFromEvidence, type MetricLifecycleStatus, type MetricSourcePolicy, type MetricUncertaintyBand } from "../core/validation.js";

export interface RobbedScoreInput {
  readonly routeWinRate: number;
  readonly tprr: number;
  readonly uncatchableTargetPercent: number;
  readonly expectedFantasyPoints: number;
  readonly actualFantasyPoints: number;
  readonly sampleSize?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface RobbedScoreMetric {
  readonly metricId: "robbed-score";
  readonly robbedScore: number;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "EVIDENCE_QUALITY_NOT_PLAYER_TALENT";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function robbedScoreMetric(input: RobbedScoreInput): RobbedScoreMetric {
  const { routeWinRate, tprr, uncatchableTargetPercent, expectedFantasyPoints, actualFantasyPoints, sampleSize = 0, sourcePolicy } = input;

  // Formula: (Route Win Rate - TPRR) + uncatchable target percent + (XFPTS - FPTS)
  const rateDelta = routeWinRate - tprr;
  const pointsDelta = expectedFantasyPoints - actualFantasyPoints;
  const robbedScore = rateDelta + uncatchableTargetPercent + pointsDelta;

  const uncertaintyBand = uncertaintyFromEvidence({
    sampleSize,
    sourcePolicy,
  });

  return {
    birthCertificate: requireMetricBirthCertificate("robbed-score"),
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_PLAYER_TALENT",
    confidenceScore: confidenceFromEvidence(sampleSize, uncertaintyBand),
    drivers: sortedDrivers([
      metricDriver({
        contribution: rateDelta,
        direction: rateDelta > 0 ? "UP" : "DOWN",
        explanation: "Difference between route win rate and targets per route run.",
        name: "rate_delta",
      }),
      metricDriver({
        contribution: uncatchableTargetPercent,
        direction: "UP",
        explanation: "Proportion of targets that were deemed uncatchable.",
        name: "uncatchable_target_percent",
      }),
      metricDriver({
        contribution: pointsDelta,
        direction: pointsDelta > 0 ? "UP" : "DOWN",
        explanation: "Expected fantasy points minus actual fantasy points.",
        name: "points_delta",
      }),
    ]),
    metricId: "robbed-score",
    robbedScore: round(robbedScore, 4),
    sourcePolicy,
    status: "SHADOW",
    uncertaintyBand,
  };
}

function confidenceFromEvidence(sampleSize: number, uncertaintyBand: MetricUncertaintyBand): number {
  const base = uncertaintyBand === "LOW" ? 82 : uncertaintyBand === "MEDIUM" ? 60 : 36;
  return round(Math.min(100, base + Math.min(12, sampleSize / 90)), 2);
}
