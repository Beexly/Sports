import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp, clamp01, normalizeClamped, round } from "../core/math.js";
import { shrinkWeightedMean } from "../core/shrinkage.js";
import { uncertaintyFromEvidence, type MetricLifecycleStatus, type MetricSourcePolicy, type MetricUncertaintyBand } from "../core/validation.js";

export interface ExpectedRushYardsInput {
  /** Rush Environment Index for this carry context, 0–100 (higher = friendlier). Normalized internally to [0, 1]. */
  readonly rushEnvironmentIndex: number;
  /** Yards to go for a first down. Mapped to a 0–1 distance-stress term over the [2, 15] yard range. */
  readonly yardsToGo: number;
  /**
   * Yards from the opponent's goal line (1–99). Optional: when `undefined`, red-zone
   * compression is 0 (no goal-line yardage penalty is applied and uncertainty is not
   * inflated). When present, compression ramps in only inside the opponent 25 (over [1, 25]).
   */
  readonly yardline100?: number;
  /** Rusher yards-per-carry prior (yards/carry). Default 4.2, clamped to [1.5, 8.5], shrunk toward 4.2 with prior strength 140 carries. */
  readonly rusherYardsPerCarryPrior?: number;
  /** Defense yards-per-carry-allowed prior (yards/carry). Default 4.2, clamped to [1.5, 8.5], shrunk toward 4.2 with prior strength 180 carries. */
  readonly defenseRushYardsAllowedPrior?: number;
  /**
   * Designed-rush flag: `true` = designed run, `false` = scramble/broken-play (a distinct,
   * lower-yardage regime per the birth certificate). Optional; an `undefined` (unknown)
   * status defaults to the designed-run lift — see the inline note on `designedRushLift`.
   */
  readonly designedRush?: boolean;
  /** Carries backing the priors. Weights the shrinkage and feeds both confidence and the uncertainty band. Defaults to 0. */
  readonly sampleSize?: number;
  /** Source-rights posture for the backing data. Drives the fail-closed uncertainty band when rights are absent or blocked. */
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

/**
 * GSE Expected Rush Yards (`expected-rush-yards-gse`, SHADOW status).
 *
 * Estimates how many rushing yards a single carry *context* should create before any
 * runner credit is assigned — the environment expectation that {@link rushOverExpectedGse}
 * later subtracts from actual yards to isolate creation. It is a context model, not an
 * outcome prediction: identical evidence always yields the same yardage regardless of
 * confidence.
 *
 * Computation (all terms in yards, summed then clamped): a base intercept plus the
 * normalized Rush Environment Index, the shrunk rusher and defense yards-per-carry priors
 * (as deviations from the 4.2 baseline), a down-distance stress penalty, a red-zone
 * compression penalty, and the designed-rush lift.
 *
 * Output contract:
 * - `expectedRushYards` — expected rushing yards for this carry context, clamped to
 *   [-2, 18] yards and rounded to 2 dp.
 * - `confidenceScore` — 0–100 evidence-quality score (`EVIDENCE_QUALITY_NOT_RUSH_OUTCOME_CERTAINTY`);
 *   it grades how much data backs the estimate, NOT the probability of any yardage outcome,
 *   and is deliberately orthogonal to `expectedRushYards`.
 * - `uncertaintyBand` — LOW/MEDIUM/HIGH from evidence depth. The metric always returns a
 *   value (never null); it fails closed to HIGH uncertainty (and floored confidence) when
 *   source rights are absent or blocked.
 * - `drivers` — a curated factor trail of the primary contributors (environment, rusher
 *   prior, defense prior, red-zone compression) with contributions scaled ×10 relative to
 *   their raw yardage impact for display. It is NOT an exhaustive attribution: the
 *   down-distance stress penalty and the designed-rush lift are intentionally not surfaced
 *   as drivers, so driver contributions do not reconcile to `expectedRushYards`.
 *
 * Honest limitations: goal-line contexts compress yardage but raise touchdown value (not
 * modeled here); scrambles have a different yardage distribution than designed runs; and a
 * thin `sampleSize` makes the priors dominate. See the birth-certificate `failureModes`.
 */
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
  // Designed runs dominate the carry base rate, so an unknown (`undefined`) designed/scramble
  // status is treated as a designed run and takes the same +0.15 yd lift; only an explicit
  // scramble (`false`) takes the -0.45 yd penalty. This defaults absent information to the
  // favorable branch — a small optimistic lean when the play type is unknown.
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
