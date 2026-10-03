import {
  clamp,
  clamp01,
  normalizeClamped,
  round,
  sigmoid,
  sortedDrivers,
  uncertaintyFromEvidence,
  type MetricDriver,
  type MetricLifecycleStatus,
  type MetricSourcePolicy,
  type MetricUncertaintyBand,
} from "./metric-core.js";

export interface GseExpectedCompletionInput {
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

export interface GseExpectedCompletion {
  readonly metricId: "gse-xcomp";
  readonly probability: number;
  readonly difficultyIndex: number;
  readonly drivers: readonly MetricDriver[];
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function gseExpectedCompletion(input: GseExpectedCompletionInput): GseExpectedCompletion {
  const airDepth = normalizeClamped(input.airYards, -5, 45);
  const yardsPressure = normalizeClamped(input.yardsToGo, 1, 20);
  const sideline = clamp01(input.sidelineProxy ?? 0);
  const pressure = clamp01(input.pressureProxy ?? 0);
  const weather = clamp01(input.weatherPenalty ?? 0);
  const timeToThrow = clamp01(input.timeToThrowProxy ?? 0);
  const qb = clamp01(input.qbPrior ?? 0.5);
  const receiver = clamp01(input.receiverPrior ?? 0.5);
  const defense = clamp01(input.defensePrior ?? 0.5);
  const redZonePenalty = input.redZone ? 0.25 : 0;

  const logit =
    1.35 -
    2.65 * airDepth -
    0.75 * yardsPressure -
    0.42 * sideline -
    0.85 * pressure -
    0.5 * weather -
    0.35 * timeToThrow -
    redZonePenalty +
    1.05 * (qb - 0.5) +
    0.8 * (receiver - 0.5) -
    0.75 * (defense - 0.5);
  const probability = clamp(sigmoid(logit), 0.02, 0.98);
  const difficultyIndex = (1 - probability) * 100;

  const drivers = sortedDrivers([
    driver("air_yards", -round(airDepth * 26, 2), "DOWN", "Deeper targets reduce expected completion."),
    driver("yards_to_go", -round(yardsPressure * 7.5, 2), "DOWN", "Longer yards-to-go increases completion difficulty."),
    driver("pressure_proxy", -round(pressure * 8.5, 2), "DOWN", "Pressure proxy lowers expected completion."),
    driver("weather_penalty", -round(weather * 5, 2), "DOWN", "Weather penalty lowers expected completion."),
    driver("qb_prior", round((qb - 0.5) * 10.5, 2), qb >= 0.5 ? "UP" : "DOWN", "Shrunk quarterback prior adjusts the expectation."),
    driver("receiver_prior", round((receiver - 0.5) * 8, 2), receiver >= 0.5 ? "UP" : "DOWN", "Shrunk receiver prior adjusts the expectation."),
  ]);

  return {
    difficultyIndex: round(difficultyIndex, 2),
    drivers,
    metricId: "gse-xcomp",
    probability: round(probability, 4),
    sourcePolicy: input.sourcePolicy,
    status: "SHADOW",
    uncertaintyBand: uncertaintyFromEvidence({ proxyCount: proxyCount([input.sidelineProxy, input.pressureProxy, input.weatherPenalty, input.timeToThrowProxy]), sampleSize: input.sampleSize, sourcePolicy: input.sourcePolicy }),
  };
}

function driver(name: string, contribution: number, direction: MetricDriver["direction"], explanation: string): MetricDriver {
  return { contribution, direction, explanation, name };
}

function proxyCount(values: readonly (number | undefined)[]): number {
  return values.filter((value) => value !== undefined).length;
}
