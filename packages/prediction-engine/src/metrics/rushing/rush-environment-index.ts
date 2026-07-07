import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp, clamp01, normalizeClamped, round, weightedMean } from "../core/math.js";
import { uncertaintyFromEvidence, type MetricLifecycleStatus, type MetricSourcePolicy, type MetricUncertaintyBand } from "../core/validation.js";

export interface RushEnvironmentInput {
  readonly down: number;
  readonly yardsToGo: number;
  readonly boxPressureProxy?: number;
  readonly offensiveLineContinuityProxy?: number;
  readonly runDirectionLeverageProxy?: number;
  readonly gameScriptRunFriendliness?: number;
  readonly defensiveFrontPressureProxy?: number;
  readonly weatherPenalty?: number;
  readonly sampleSize?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface RushEnvironmentIndex {
  readonly metricId: "rush-environment-index";
  readonly environmentIndex: number;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "EVIDENCE_QUALITY_NOT_RUSH_SUCCESS_PROBABILITY";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function rushEnvironmentIndex(input: RushEnvironmentInput): RushEnvironmentIndex {
  const downStress = normalizeClamped(clamp(input.down, 1, 4), 1, 4);
  const distanceStress = normalizeClamped(clamp(input.yardsToGo, 1, 20), 2, 14);
  const downDistanceEnvironment = clamp01(1 - 0.38 * downStress - 0.28 * distanceStress);
  const boxRelief = 1 - clamp01(input.boxPressureProxy ?? 0.5);
  const frontRelief = 1 - clamp01(input.defensiveFrontPressureProxy ?? 0.5);
  const lineContinuity = clamp01(input.offensiveLineContinuityProxy ?? 0.5);
  const directionLeverage = clamp01(input.runDirectionLeverageProxy ?? 0.5);
  const script = clamp01(input.gameScriptRunFriendliness ?? 0.5);
  const weatherRelief = 1 - clamp01(input.weatherPenalty ?? 0);
  const environment = weightedMean([
    { value: boxRelief, weight: 0.24 },
    { value: lineContinuity, weight: 0.2 },
    { value: frontRelief, weight: 0.16 },
    { value: directionLeverage, weight: 0.14 },
    { value: downDistanceEnvironment, weight: 0.12 },
    { value: script, weight: 0.1 },
    { value: weatherRelief, weight: 0.04 },
  ]);
  const uncertaintyBand = uncertaintyFromEvidence({
    proxyCount: proxyCount([
      input.boxPressureProxy,
      input.offensiveLineContinuityProxy,
      input.runDirectionLeverageProxy,
      input.gameScriptRunFriendliness,
      input.defensiveFrontPressureProxy,
      input.weatherPenalty,
    ]),
    sampleSize: input.sampleSize,
    sourcePolicy: input.sourcePolicy,
  });

  return {
    birthCertificate: requireMetricBirthCertificate("rush-environment-index"),
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_RUSH_SUCCESS_PROBABILITY",
    confidenceScore: confidenceFromEvidence(input.sampleSize ?? 0, uncertaintyBand),
    drivers: sortedDrivers([
      metricDriver({
        contribution: boxRelief * 24,
        direction: "UP",
        explanation: "Lighter box-pressure proxy improves rush environment.",
        name: "box_pressure_relief",
      }),
      metricDriver({
        contribution: lineContinuity * 20,
        direction: "UP",
        explanation: "Offensive-line continuity proxy improves rush environment.",
        name: "offensive_line_continuity",
      }),
      metricDriver({
        contribution: frontRelief * 16,
        direction: "UP",
        explanation: "Lower defensive-front pressure improves rush environment.",
        name: "front_pressure_relief",
      }),
      metricDriver({
        contribution: downDistanceEnvironment * 12,
        direction: "UP",
        explanation: "Down-distance context affects how favorable a rushing lane is expected to be.",
        name: "down_distance_environment",
      }),
      metricDriver({
        contribution: -clamp01(input.weatherPenalty ?? 0) * 4,
        direction: "DOWN",
        explanation: "Weather penalty lowers rush environment quality.",
        name: "weather_penalty",
      }),
    ]),
    environmentIndex: round(environment * 100, 2),
    metricId: "rush-environment-index",
    sourcePolicy: input.sourcePolicy,
    status: "SHADOW",
    uncertaintyBand,
  };
}

function confidenceFromEvidence(sampleSize: number, uncertaintyBand: MetricUncertaintyBand): number {
  const base = uncertaintyBand === "LOW" ? 81 : uncertaintyBand === "MEDIUM" ? 59 : 35;
  return round(Math.min(100, base + Math.min(12, sampleSize / 100)), 2);
}

function proxyCount(values: readonly (number | undefined)[]): number {
  return values.filter((value) => value !== undefined).length;
}
