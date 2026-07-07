import {
  clamp,
  clamp01,
  normalizeClamped,
  round,
  sortedDrivers,
  uncertaintyFromEvidence,
  type MetricDriver,
  type MetricLifecycleStatus,
  type MetricSourcePolicy,
  type MetricUncertaintyBand,
} from "./metric-core.js";

export interface GseExpectedYacInput {
  readonly airYards: number;
  readonly separationYards?: number;
  readonly cushionYards?: number;
  readonly receiverYacPrior?: number;
  readonly inSpaceProxy?: number;
  readonly defenderLeverageProxy?: number;
  readonly redZone?: boolean;
  readonly sampleSize?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface GseExpectedYac {
  readonly metricId: "gse-xyac";
  readonly expectedYac: number;
  readonly drivers: readonly MetricDriver[];
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function gseExpectedYac(input: GseExpectedYacInput): GseExpectedYac {
  const separation = normalizeClamped(input.separationYards ?? 2.5, 0, 7);
  const cushion = normalizeClamped(input.cushionYards ?? 5, 0, 10);
  const receiverPrior = clamp01(input.receiverYacPrior ?? 0.5);
  const inSpace = clamp01(input.inSpaceProxy ?? 0.5);
  const defenderLeverage = clamp01(input.defenderLeverageProxy ?? 0.5);
  const depthPenalty = normalizeClamped(input.airYards, 0, 30);
  const redZonePenalty = input.redZone ? 0.9 : 0;
  const expectedYac = clamp(
    2.2 + 3.2 * inSpace + 3.1 * receiverPrior + 1.4 * separation + 0.8 * cushion - 1.8 * defenderLeverage - 0.7 * depthPenalty - redZonePenalty,
    0,
    18,
  );

  const drivers = sortedDrivers([
    driver("space_proxy", round(inSpace * 3.2, 2), "UP", "Space proxy increases expected yards after catch."),
    driver("receiver_yac_prior", round((receiverPrior - 0.5) * 6.2, 2), receiverPrior >= 0.5 ? "UP" : "DOWN", "Shrunk receiver YAC prior adjusts expected YAC."),
    driver("separation_proxy", round(separation * 1.4, 2), "UP", "Separation proxy increases expected YAC."),
    driver("defender_leverage", -round(defenderLeverage * 1.8, 2), "DOWN", "Defender leverage proxy lowers expected YAC."),
  ]);

  return {
    drivers,
    expectedYac: round(expectedYac, 2),
    metricId: "gse-xyac",
    sourcePolicy: input.sourcePolicy,
    status: "SHADOW",
    uncertaintyBand: uncertaintyFromEvidence({ proxyCount: proxyCount([input.separationYards, input.cushionYards, input.inSpaceProxy, input.defenderLeverageProxy]), sampleSize: input.sampleSize, sourcePolicy: input.sourcePolicy }),
  };
}

function driver(name: string, contribution: number, direction: MetricDriver["direction"], explanation: string): MetricDriver {
  return { contribution, direction, explanation, name };
}

function proxyCount(values: readonly (number | undefined)[]): number {
  return values.filter((value) => value !== undefined).length;
}
