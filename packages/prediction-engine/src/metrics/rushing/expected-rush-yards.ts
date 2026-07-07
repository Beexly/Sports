import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp, clamp01, normalizeClamped, round } from "../core/math.js";
import { shrinkWeightedMean } from "../core/shrinkage.js";
import { uncertaintyFromEvidence, type MetricLifecycleStatus, type MetricSourcePolicy, type MetricUncertaintyBand } from "../core/validation.js";

export interface ExpectedRushYardsInput {
  readonly rushEnvironmentIndex: number;
  readonly yardsToGo: number;
  readonly yardline100?: number;
  readonly rusherYardsPerCarryPrior?: number;
  readonly defenseRushYardsAllowedPrior?: number;
  readonly designedRush?: boolean;
  readonly sampleSize?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface ExpectedRushYardsMetric {
  readonly metricId: "expected-rush-yards-gse";
  readonly expectedRushYards: number;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "EVIDENCE_QUALITY_NOT_RUSH_OUTCOME_CERTAINTY";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export function expectedRushYardsGse(input: ExpectedRushYardsInput): ExpectedRushYardsMetric {
  const environment = normalizeClamped(input.rushEnvironmentIndex, 0, 100);
  const rusherPrior = shrinkWeightedMean(
    [{ value: clamp(input.rusherYardsPerCarryPrior ?? 4.2, 1.5, 8.5), weight: input.sampleSize ?? 0 }],
    4.2,
    140,
  );
  const defensePrior = shrinkWeightedMean(
    [{ value: clamp(input.defenseRushYardsAllowedPrior ?? 4.2, 1.5, 8.5), weight: input.sampleSize ?? 0 }],
    4.2,
    180,
  );
  const distanceStress = normalizeClamped(input.yardsToGo, 2, 15);
  const redZoneCompression = input.yardline100 === undefined ? 0 : 1 - normalizeClamped(input.yardline100, 1, 25);
  const designedRushLift = input.designedRush === false ? -0.45 : 0.15;
  const expected = clamp(
    2.05 + 3.1 * environment + 0.34 * (rusherPrior - 4.2) + 0.22 * (defensePrior - 4.2) - 0.45 * distanceStress - 0.75 * redZoneCompression + designedRushLift,
    -2,
    18,
  );
  const uncertaintyBand = uncertaintyFromEvidence({
    proxyCount: proxyCount([input.rusherYardsPerCarryPrior, input.defenseRushYardsAllowedPrior]),
    sampleSize: input.sampleSize,
    sourcePolicy: input.sourcePolicy,
  });

  return {
    birthCertificate: requireMetricBirthCertificate("expected-rush-yards-gse"),
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_RUSH_OUTCOME_CERTAINTY",
    confidenceScore: confidenceFromEvidence(input.sampleSize ?? 0, uncertaintyBand),
    drivers: sortedDrivers([
      metricDriver({
        contribution: environment * 31,
        direction: "UP",
        explanation: "Rush Environment Index lifts expected rushing yards when context is favorable.",
        name: "rush_environment_index",
      }),
      metricDriver({
        contribution: (rusherPrior - 4.2) * 3.4,
        direction: rusherPrior >= 4.2 ? "UP" : "DOWN",
        explanation: "Shrunk rusher yards-per-carry prior adjusts expected rush yards.",
        name: "rusher_yards_prior",
      }),
      metricDriver({
        contribution: (defensePrior - 4.2) * 2.2,
        direction: defensePrior >= 4.2 ? "UP" : "DOWN",
        explanation: "Shrunk defense rushing allowance prior adjusts expected rush yards.",
        name: "defense_rush_prior",
      }),
      metricDriver({
        contribution: -redZoneCompression * 7.5,
        direction: "DOWN",
        explanation: "Red-zone compression lowers expected raw rushing yards.",
        name: "red_zone_compression",
      }),
    ]),
    expectedRushYards: round(expected, 2),
    metricId: "expected-rush-yards-gse",
    sourcePolicy: input.sourcePolicy,
    status: "SHADOW",
    uncertaintyBand,
  };
}

function confidenceFromEvidence(sampleSize: number, uncertaintyBand: MetricUncertaintyBand): number {
  const base = uncertaintyBand === "LOW" ? 82 : uncertaintyBand === "MEDIUM" ? 60 : 36;
  return round(Math.min(100, base + Math.min(12, sampleSize / 100)), 2);
}

function proxyCount(values: readonly (number | undefined)[]): number {
  return values.filter((value) => value !== undefined).length;
}
