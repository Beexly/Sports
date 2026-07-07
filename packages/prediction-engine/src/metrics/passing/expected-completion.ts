import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp, clamp01, normalizeClamped, protectedBasis, round, sigmoid, weightedMean } from "../core/math.js";
import { shrinkProbability } from "../core/shrinkage.js";
import { uncertaintyFromEvidence, type MetricLifecycleStatus, type MetricSourcePolicy, type MetricUncertaintyBand } from "../core/validation.js";

export interface ExpectedCompletionInput {
  readonly airYards: number;
  readonly yardsToGo: number;
  readonly redZone?: boolean;
  readonly sidelineProxy?: number;
  readonly pressureProxy?: number;
  readonly weatherPenalty?: number;
  readonly timeToThrowProxy?: number;
  readonly qbPrior?: number;
  readonly receiverPrior?: number;
  readonly defensePrior?: number;
  readonly sampleSize?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface ExpectedCompletionMetric {
  readonly metricId: "expected-completion-gse";
  readonly probability: number;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "EVIDENCE_QUALITY_NOT_COMPLETION_PROBABILITY";
  readonly difficultyIndex: number;
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function expectedCompletionGse(input: ExpectedCompletionInput): ExpectedCompletionMetric {
  const air = normalizeClamped(input.airYards, -5, 45);
  const yards = normalizeClamped(input.yardsToGo, 1, 20);
  const airBasis = protectedBasis(air * 2 - 1);
  const yardsBasis = protectedBasis(yards * 2 - 1);
  const sideline = clamp01(input.sidelineProxy ?? 0);
  const pressure = clamp01(input.pressureProxy ?? 0);
  const weather = clamp01(input.weatherPenalty ?? 0);
  const timeToThrow = clamp01(input.timeToThrowProxy ?? 0);
  const qb = shrinkProbability({ observed: input.qbPrior ?? 0.5, prior: 0.5, priorStrength: 120, sampleSize: input.sampleSize ?? 0 });
  const receiver = shrinkProbability({ observed: input.receiverPrior ?? 0.5, prior: 0.5, priorStrength: 120, sampleSize: input.sampleSize ?? 0 });
  const defense = shrinkProbability({ observed: input.defensePrior ?? 0.5, prior: 0.5, priorStrength: 120, sampleSize: input.sampleSize ?? 0 });
  const redZone = input.redZone ? 1 : 0;
  const nonlinearDepth = weightedMean([
    { value: airBasis[0] ?? 0, weight: 0.55 },
    { value: airBasis[1] ?? 0, weight: 0.25 },
    { value: airBasis[4] ?? 0, weight: 0.2 },
  ]);
  const nonlinearYards = weightedMean([
    { value: yardsBasis[0] ?? 0, weight: 0.7 },
    { value: yardsBasis[1] ?? 0, weight: 0.3 },
  ]);
  const logitValue =
    1.18 -
    1.85 * nonlinearDepth -
    0.55 * nonlinearYards -
    0.34 * redZone -
    0.4 * sideline -
    0.82 * pressure -
    0.48 * weather -
    0.32 * timeToThrow +
    0.95 * (qb - 0.5) +
    0.75 * (receiver - 0.5) -
    0.7 * (defense - 0.5);
  const probability = clamp(sigmoid(logitValue), 0.02, 0.98);
  const uncertaintyBand = uncertaintyFromEvidence({ proxyCount: proxyCount([input.sidelineProxy, input.pressureProxy, input.weatherPenalty, input.timeToThrowProxy]), sampleSize: input.sampleSize, sourcePolicy: input.sourcePolicy });
  const confidenceScore = confidenceFromEvidence(input.sampleSize ?? 0, uncertaintyBand);
  const airContribution = -nonlinearDepth * 18.5;
  const yardsContribution = -nonlinearYards * 5.5;
  const pressureContribution = -pressure * 8.2;
  const weatherContribution = -weather * 4.8;
  const drivers = sortedDrivers([
    metricDriver({
      contribution: airContribution,
      direction: airContribution > 0 ? "UP" : airContribution < 0 ? "DOWN" : "NEUTRAL",
      explanation: "Protected air-yard basis lowers completion expectation as depth rises.",
      name: "air_yards_basis",
    }),
    metricDriver({
      contribution: yardsContribution,
      direction: yardsContribution > 0 ? "UP" : yardsContribution < 0 ? "DOWN" : "NEUTRAL",
      explanation: "Protected yards-to-go basis lowers completion expectation.",
      name: "yards_to_go_basis",
    }),
    metricDriver({ contribution: pressureContribution, direction: pressureContribution > 0 ? "UP" : pressureContribution < 0 ? "DOWN" : "NEUTRAL", explanation: "Pressure proxy lowers completion expectation.", name: "pressure_proxy" }),
    metricDriver({ contribution: weatherContribution, direction: weatherContribution > 0 ? "UP" : weatherContribution < 0 ? "DOWN" : "NEUTRAL", explanation: "Weather penalty lowers completion expectation.", name: "weather_penalty" }),
    metricDriver({
      contribution: (qb - 0.5) * 9.5,
      direction: qb >= 0.5 ? "UP" : "DOWN",
      explanation: "Shrunk quarterback prior adjusts the completion expectation.",
      name: "qb_prior",
    }),
  ]);

  return {
    birthCertificate: requireMetricBirthCertificate("expected-completion-gse"),
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_COMPLETION_PROBABILITY",
    confidenceScore,
    difficultyIndex: round((1 - probability) * 100, 2),
    drivers,
    metricId: "expected-completion-gse",
    probability: round(probability, 4),
    sourcePolicy: input.sourcePolicy,
    status: "SHADOW",
    uncertaintyBand,
  };
}

function confidenceFromEvidence(sampleSize: number, uncertaintyBand: MetricUncertaintyBand): number {
  const base = uncertaintyBand === "LOW" ? 84 : uncertaintyBand === "MEDIUM" ? 62 : 38;
  return round(clamp(base + Math.min(12, sampleSize / 80), 0, 100), 2);
}

function proxyCount(values: readonly (number | undefined)[]): number {
  return values.filter((value) => value !== undefined).length;
}
