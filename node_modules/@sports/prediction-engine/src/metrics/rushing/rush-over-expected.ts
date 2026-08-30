import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp, clampScore, round } from "../core/math.js";
import { shrinkWeightedMean } from "../core/shrinkage.js";
import { uncertaintyFromEvidence, type MetricLifecycleStatus, type MetricSourcePolicy, type MetricUncertaintyBand } from "../core/validation.js";

/**
 * Single-carry inputs for the rush-over-expected (RYOE) metric.
 *
 * All yardage fields are PER-CARRY, not per-game. Optional fields default to a
 * neutral 0 and are clamped to the ranges noted below. Only the optional proxy
 * fields that are actually supplied raise the proxy count that feeds the
 * evidence/uncertainty gate (`uncertaintyFromEvidence`).
 */
export interface RushOverExpectedInput {
  /** Actual rushing yards gained on this carry (per-carry). Clamped to [-10, 99]. */
  readonly actualRushYards: number;
  /** GSE expected rush yards for this carry's context (per-carry, from expected-rush-yards-gse). Clamped to [-2, 18]. */
  readonly expectedRushYards: number;
  /** Rusher's shrunk RYOE prior, in yards. Clamped to [-8, 8]. Default 0; weighted by `sampleSize` and shrunk toward 0. */
  readonly rusherRushOverExpectedPrior?: number;
  /** Broken-tackle rate proxy, dimensionless 0-1. Clamped to [0,1]. Default 0. Contributes up to +0.95 yards. */
  readonly brokenTackleProxy?: number;
  /** Yards-after-contact proxy, in yards. Clamped to [0,8]. Default 0. Contributes up to +1.28 yards (8 * 0.16). */
  readonly yardsAfterContactProxy?: number;
  /** Carries backing the prior/proxies. Drives both the prior's shrinkage weight and the evidence/confidence gate. Default 0. */
  readonly sampleSize?: number;
  /** Source rights/modeling policies. Empty or disallowed fails the metric closed to HIGH uncertainty. */
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface RushOverExpectedMetric {
  readonly metricId: "rush-over-expected-gse";
  readonly rushYardsOverExpected: number;
  readonly creationIndex: number;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "EVIDENCE_QUALITY_NOT_REPEATABLE_RUSH_TALENT";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

/**
 * Rush yards over expected (RYOE) for a single carry — isolates ball-carrier
 * creation beyond the expected rush environment. This is a post-outcome credit
 * signal (it consumes the actual result), not a pre-play prediction, and it
 * measures the carry, not the runner's repeatable talent.
 *
 * Output (`rushYardsOverExpected`): in YARDS, clamped to [-24, 55]. It is a
 * weighted sum of four terms:
 *   - carry residual   0.76 * clamp(actual - expected, -20, 50)
 *   - rusher prior     0.18 * shrunk RYOE prior (shrunk toward 0, strength 140)
 *   - broken-tackle    clamp(proxy, 0, 1) * 0.95
 *   - after-contact    clamp(proxy, 0, 8) * 0.16
 * The shrinkage on the prior (via `shrinkWeightedMean`, priorStrength 140)
 * stabilizes noisy single-carry residuals: a thin sample pulls the prior toward
 * 0 so a lucky/unlucky one-carry result cannot dominate.
 *
 * Output (`creationIndex`): a 0-100 band centered at 50 (= `clampScore(50 +
 * rushYardsOverExpected * 4)`). 50 is neutral; roughly +4 index points per yard
 * of RYOE, saturating at 0/100 once |rushYardsOverExpected| reaches ~12.5 yards.
 * Higher = more rushing creation.
 *
 * Confidence (`confidenceScore`, 0-100) measures EVIDENCE QUALITY — how much we
 * trust the inputs — and is explicitly NOT repeatable rush talent or a yardage
 * probability (see `confidenceMeaning`). It rises with sample size but is
 * capped, and the source-rights gate can floor it.
 *
 * Honesty gate: this metric ALWAYS returns a value; it never returns null. When
 * source rights are uncleared or the sample is thin, `uncertaintyBand` fails
 * closed to HIGH and `confidenceScore` is capped low (rather than suppressing
 * the output) so consumers see a computed-but-untrusted signal, not a gap.
 *
 * `status` is always SHADOW — this metric is computed and audited but not priced.
 *
 * Factor trail (`drivers`): all four score components are surfaced, but their
 * contributions use per-driver display scales (residual*4, prior*3, lifts*10)
 * rather than the exact index weights, so the entries are directional and do
 * NOT sum to `creationIndex`.
 *
 * Limitations: single-carry residuals are inherently noisy; broken-play and
 * scramble regimes can distort designed-rush residuals; the contact proxies are
 * only credited when source-cleared (see the metric birth certificate).
 */
export function rushOverExpectedGse(input: RushOverExpectedInput): RushOverExpectedMetric {
  const actual = clamp(input.actualRushYards, -10, 99);
  const expected = clamp(input.expectedRushYards, -2, 18);
  const residual = clamp(actual - expected, -20, 50);
  const priorResidual = shrinkWeightedMean(
    [{ value: clamp(input.rusherRushOverExpectedPrior ?? 0, -8, 8), weight: input.sampleSize ?? 0 }],
    0,
    140,
  );
  const brokenTackleLift = clamp(input.brokenTackleProxy ?? 0, 0, 1) * 0.95;
  const contactLift = clamp(input.yardsAfterContactProxy ?? 0, 0, 8) * 0.16;
  const rushYardsOverExpected = clamp(0.76 * residual + 0.18 * priorResidual + brokenTackleLift + contactLift, -24, 55);
  const uncertaintyBand = uncertaintyFromEvidence({
    proxyCount: proxyCount([input.rusherRushOverExpectedPrior, input.brokenTackleProxy, input.yardsAfterContactProxy]),
    sampleSize: input.sampleSize,
    sourcePolicy: input.sourcePolicy,
  });

  return {
    birthCertificate: requireMetricBirthCertificate("rush-over-expected-gse"),
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_REPEATABLE_RUSH_TALENT",
    confidenceScore: confidenceFromEvidence(input.sampleSize ?? 0, uncertaintyBand),
    creationIndex: round(clampScore(50 + rushYardsOverExpected * 4), 2),
    drivers: sortedDrivers([
      metricDriver({
        contribution: residual * 4,
        direction: residual >= 0 ? "UP" : "DOWN",
        explanation: "Actual rushing yards above GSE expected rush yards raises RYOE; below expectation lowers it.",
        name: "rush_yards_residual",
      }),
      metricDriver({
        contribution: priorResidual * 3,
        direction: priorResidual >= 0 ? "UP" : "DOWN",
        explanation: "Shrunk rusher RYOE prior stabilizes noisy one-carry residuals.",
        name: "rusher_ryoe_prior",
      }),
      metricDriver({
        contribution: brokenTackleLift * 10,
        direction: "UP",
        explanation: "Broken-tackle proxy can add rushing creation credit when source-cleared.",
        name: "broken_tackle_proxy",
      }),
      metricDriver({
        contribution: contactLift * 10,
        direction: "UP",
        explanation: "Yards-after-contact proxy can add creation credit when source-cleared.",
        name: "yards_after_contact_proxy",
      }),
    ]),
    metricId: "rush-over-expected-gse",
    rushYardsOverExpected: round(rushYardsOverExpected, 2),
    sourcePolicy: input.sourcePolicy,
    status: "SHADOW",
    uncertaintyBand,
  };
}

/**
 * Maps evidence into an evidence-quality confidence score (0-100).
 *
 * The uncertainty band sets the base (LOW->80, MEDIUM->58, HIGH->34); sample
 * size adds at most +12 (1 point per 100 carries, capped). Because HIGH caps at
 * 46, a large sample cannot rescue confidence once the rights/sample gate has
 * failed closed. This is evidence quality, not repeatable rush talent.
 */
function confidenceFromEvidence(sampleSize: number, uncertaintyBand: MetricUncertaintyBand): number {
  const base = uncertaintyBand === "LOW" ? 80 : uncertaintyBand === "MEDIUM" ? 58 : 34;
  return round(Math.min(100, base + Math.min(12, sampleSize / 100)), 2);
}

/** Counts how many proxy inputs were actually supplied (undefined = not observed). */
function proxyCount(values: readonly (number | undefined)[]): number {
  return values.filter((value) => value !== undefined).length;
}
