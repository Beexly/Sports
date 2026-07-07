import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp, clamp01, normalizeClamped, round, weightedMean } from "../core/math.js";
import {
  rightsCleanliness,
  sourcePoliciesAllowed,
  uncertaintyFromEvidence,
  type MetricLifecycleStatus,
  type MetricSourcePolicy,
  type MetricUncertaintyBand,
} from "../core/validation.js";

export type QbBurdenBand = "LOW" | "ELEVATED" | "HIGH" | "EXTREME";
export type QbBurdenSourcePosture = "CLEAN" | "REVIEW" | "BLOCKED";

export interface QbBurdenIndexInput {
  /**
   * Probability in [0, 1] that this throw context is completed (e.g. from expected-completion).
   * Converted to `completionDifficulty = 1 − clamp01(p)`; lower completion → higher burden.
   * Weight 0.24 (the single largest term).
   */
  readonly expectedCompletionProbability: number;
  /** Intended air yards (target depth) for the throw. Normalized over [0, 45] yd to a 0–1 depth-burden term. Weight 0.14. */
  readonly airYards: number;
  /** Current down (1–4). Optional; defaults to 3 when unknown and is clamped to [1, 4]. Supplies 0.45 of the down-distance friction blend. */
  readonly down?: number;
  /**
   * Yards to go for a first down. Clamped to [1, 25], then ramped over [1, 18] (≥18 saturates
   * the distance-stress term at 1). Supplies 0.55 of the down-distance friction blend (net weight 0.12).
   */
  readonly yardsToGo: number;
  /** 0–1 proxy for expected pass-rush pressure (higher = more pressure). Optional; defaults to 0 (no measured pressure). Weight 0.20. */
  readonly pressureProxy?: number;
  /** 0–1 time-to-throw stress proxy (higher = less time in the pocket). Optional; defaults to 0. Weight 0.05. Not surfaced in `drivers`. */
  readonly timeToThrowStressProxy?: number;
  /** 0–1 weather difficulty penalty (higher = worse conditions). Optional; defaults to 0. Weight 0.04. Not surfaced in `drivers`. */
  readonly weatherPenalty?: number;
  /**
   * 0–1 receiver-separation deficit (higher = tighter coverage → more burden). Optional; when
   * unmeasured it falls back to a fabricated 0.5 prior that is counted as defaulted reliance
   * (see the uncertainty gate below). Weight 0.07. Not surfaced in `drivers`.
   */
  readonly receiverSeparationDeficit?: number;
  /**
   * 0–1 offensive-line disruption proxy (higher = worse protection). Optional; when unmeasured it
   * falls back to a fabricated 0.5 prior counted as defaulted reliance (same uncertainty gate). Weight 0.10.
   */
  readonly offensiveLineDisruptionProxy?: number;
  /** Pass rate over expected as a rate delta; normalized over [−0.2, 0.35] to 0–1. Optional; defaults to 0 (neutral). Weight 0.03. Not surfaced in `drivers`. */
  readonly passRateOverExpected?: number;
  /** Plays backing the inputs. Feeds both `confidenceScore` and the uncertainty band. Defaults to 0. */
  readonly sampleSize?: number;
  /** Source-rights posture for the backing data. An empty or modeling-disallowed set forces BLOCKED posture and fail-closed HIGH uncertainty. */
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface QbBurdenIndexMetric {
  readonly metricId: "qb-burden-index";
  readonly burdenIndex: number;
  readonly burdenBand: QbBurdenBand;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "EVIDENCE_QUALITY_NOT_QB_QUALITY_OR_WIN_PROBABILITY";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly sourcePosture: QbBurdenSourcePosture;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

/**
 * GSE QB Burden Index (`qb-burden-index`, SHADOW status).
 *
 * Scores how much *contextual difficulty* a dropback context imposes on the quarterback —
 * the situational and environmental load faced before any quarterback skill is credited. It
 * is a context model, not a quality or outcome model: a higher index means a harder context,
 * NOT a worse quarterback and NOT a lower win probability. Identical evidence always yields
 * the same index regardless of confidence.
 *
 * Computation: a weighted mean (the ten weights sum to 1.0) of ten 0–1 sub-terms, scaled ×100:
 * completion difficulty (1 − expected completion, 0.24), pressure proxy (0.20), throw-depth
 * burden (air yards over [0, 45], 0.14), down-distance friction (0.45·down-stress +
 * 0.55·distance-stress, 0.12), O-line disruption (0.10), receiver-separation deficit (0.07),
 * time-to-throw stress (0.05), weather penalty (0.04), pass-rate-over-expected (0.03), and
 * source-posture risk (0.01).
 *
 * Output contract:
 * - `burdenIndex` — 0–100, rounded to 2 dp; higher = harder context. Bands via
 *   {@link classifyBurden}: LOW < 35 ≤ ELEVATED < 60 ≤ HIGH < 80 ≤ EXTREME.
 * - `confidenceScore` — 0–100 evidence-quality score
 *   (`EVIDENCE_QUALITY_NOT_QB_QUALITY_OR_WIN_PROBABILITY`); it grades how much data backs the
 *   index, NOT quarterback quality and NOT any win/completion probability, and is deliberately
 *   orthogonal to `burdenIndex`.
 * - `uncertaintyBand` — LOW/MEDIUM/HIGH from evidence depth. The metric always returns a value
 *   (never null); it fails closed to HIGH uncertainty (and floored confidence) when source
 *   rights are absent or blocked.
 * - `sourcePosture` — CLEAN / REVIEW / BLOCKED. BLOCKED when the policy set is empty or
 *   disallows modeling; REVIEW when rights are usable but not fully clean.
 * - `drivers` — a curated factor trail of six contributors (completion difficulty, pressure,
 *   air-yards depth, down-distance friction, O-line disruption, and source posture), each
 *   contribution expressed in burden-index points (weight × 100 × term) and then ordered by
 *   magnitude. This is a FIXED selection, not the top-N over all ten terms: the
 *   receiver-separation deficit (up to 7 pts), time-to-throw stress (up to 5), weather (up to 4),
 *   and pass-rate-over-expected (up to 3) terms are intentionally omitted, while source posture
 *   is always surfaced even when its contribution is ~0 on clean sources. Driver contributions
 *   therefore do NOT reconcile to `burdenIndex`.
 *
 * Honesty gate: `receiverSeparationDeficit` and `offensiveLineDisruptionProxy` fall back to a
 * fabricated 0.5 prior when unmeasured; that reliance is counted (see the `defaultedReliance`
 * term feeding `proxyCount`) so defaulted, unmeasured data can never report LOW uncertainty, and
 * supplying the real measurements never raises uncertainty.
 *
 * Honest limitations: the sub-term proxies (pressure, time-to-throw, O-line disruption,
 * separation) are context estimates, not charted truth; a thin `sampleSize` leans on the
 * fabricated priors; and the index deliberately says nothing about whether the quarterback will
 * overcome the burden. See the birth-certificate `failureModes`.
 */
export function qbBurdenIndex(input: QbBurdenIndexInput): QbBurdenIndexMetric {
  const completionDifficulty = 1 - clamp01(input.expectedCompletionProbability);
  const depthBurden = normalizeClamped(input.airYards, 0, 45);
  const downStress = normalizeClamped(clamp(input.down ?? 3, 1, 4), 1, 4);
  const distanceStress = normalizeClamped(clamp(input.yardsToGo, 1, 25), 1, 18);
  const downDistanceFriction = clamp01(0.45 * downStress + 0.55 * distanceStress);
  const pressure = clamp01(input.pressureProxy ?? 0);
  const timeStress = clamp01(input.timeToThrowStressProxy ?? 0);
  const weather = clamp01(input.weatherPenalty ?? 0);
  const separationDeficit = clamp01(input.receiverSeparationDeficit ?? 0.5);
  const lineDisruption = clamp01(input.offensiveLineDisruptionProxy ?? 0.5);
  const passRatePressure = normalizeClamped(input.passRateOverExpected ?? 0, -0.2, 0.35);
  const sourceRisk = sourcePostureRisk(input.sourcePolicy);

  const burden = weightedMean([
    { value: completionDifficulty, weight: 0.24 },
    { value: pressure, weight: 0.2 },
    { value: depthBurden, weight: 0.14 },
    { value: downDistanceFriction, weight: 0.12 },
    { value: lineDisruption, weight: 0.1 },
    { value: separationDeficit, weight: 0.07 },
    { value: timeStress, weight: 0.05 },
    { value: weather, weight: 0.04 },
    { value: passRatePressure, weight: 0.03 },
    { value: sourceRisk, weight: 0.01 },
  ]);
  const uncertaintyBand = uncertaintyFromEvidence({
    driftPressure: sourceRisk * 100,
    proxyCount:
      proxyCount([
        input.pressureProxy,
        input.timeToThrowStressProxy,
        input.weatherPenalty,
        input.passRateOverExpected,
      ]) +
      // Absent receiverSeparationDeficit / offensiveLineDisruptionProxy fall back to a
      // fabricated 0.5 prior that drives ~45% of a clean-context burden. Count that
      // reliance so defaulted (unmeasured) data cannot report LOW uncertainty, and so
      // supplying the real measurements does not raise uncertainty.
      defaultedReliance([input.receiverSeparationDeficit, input.offensiveLineDisruptionProxy]),
    sampleSize: input.sampleSize,
    sourcePolicy: input.sourcePolicy,
  });
  const burdenIndexValue = round(burden * 100, 2);

  return {
    birthCertificate: requireMetricBirthCertificate("qb-burden-index"),
    burdenBand: classifyBurden(burdenIndexValue),
    burdenIndex: burdenIndexValue,
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_QB_QUALITY_OR_WIN_PROBABILITY",
    confidenceScore: confidenceFromEvidence(input.sampleSize ?? 0, uncertaintyBand, sourceRisk),
    // Curated factor trail: a FIXED selection of six of the ten weighted terms, ordered by
    // magnitude. It is not an exhaustive attribution and not the top-N overall — the separation
    // (up to 7 pts), time-to-throw stress (5), weather (4), and pass-rate (3) terms are omitted,
    // while source posture is always surfaced even when ~0. Contributions therefore do not sum to
    // burdenIndex. See the drivers section of the qbBurdenIndex JSDoc.
    drivers: sortedDrivers([
      metricDriver({
        contribution: completionDifficulty * 24,
        direction: "UP",
        explanation: "Lower expected completion raises quarterback contextual burden.",
        name: "completion_difficulty",
      }),
      metricDriver({
        contribution: pressure * 20,
        direction: pressure > 0 ? "UP" : "NEUTRAL",
        explanation: "Pressure proxy raises the amount of context the quarterback must overcome.",
        name: "pressure_burden",
      }),
      metricDriver({
        contribution: depthBurden * 14,
        direction: depthBurden > 0 ? "UP" : "NEUTRAL",
        explanation: "Deeper throw depth raises quarterback burden.",
        name: "air_yards_depth",
      }),
      metricDriver({
        contribution: downDistanceFriction * 12,
        direction: downDistanceFriction > 0 ? "UP" : "NEUTRAL",
        explanation: "Late-down and long-distance situations increase decision and execution friction.",
        name: "down_distance_friction",
      }),
      metricDriver({
        contribution: lineDisruption * 10,
        direction: lineDisruption > 0 ? "UP" : "NEUTRAL",
        explanation: "Offensive-line disruption proxy raises quarterback burden.",
        name: "offensive_line_disruption",
      }),
      metricDriver({
        contribution: sourceRisk,
        direction: sourceRisk > 0 ? "UP" : "NEUTRAL",
        explanation: "Unclear or blocked source posture raises review pressure and uncertainty.",
        name: "source_posture_review_pressure",
      }),
    ]),
    metricId: "qb-burden-index",
    sourcePolicy: input.sourcePolicy,
    sourcePosture: sourcePosture(input.sourcePolicy, sourceRisk),
    status: "SHADOW",
    uncertaintyBand,
  };
}

function classifyBurden(score: number): QbBurdenBand {
  if (score >= 80) return "EXTREME";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "ELEVATED";
  return "LOW";
}

function confidenceFromEvidence(sampleSize: number, uncertaintyBand: MetricUncertaintyBand, sourceRisk: number): number {
  const base = uncertaintyBand === "LOW" ? 82 : uncertaintyBand === "MEDIUM" ? 60 : 34;
  return round(clamp(base + Math.min(12, sampleSize / 100) - sourceRisk * 12, 0, 100), 2);
}

function sourcePostureRisk(policies: readonly MetricSourcePolicy[]): number {
  if (policies.length === 0) return 1;
  const totalCleanliness = policies.reduce((sum, policy) => {
    const modelingMultiplier = policy.allowedForModeling ? 1 : 0;
    return sum + rightsCleanliness(policy.status) * modelingMultiplier;
  }, 0);
  return 1 - clamp01(totalCleanliness / policies.length);
}

function sourcePosture(policies: readonly MetricSourcePolicy[], sourceRisk: number): QbBurdenSourcePosture {
  if (!sourcePoliciesAllowed(policies)) return "BLOCKED";
  if (sourceRisk > 0) return "REVIEW";
  return "CLEAN";
}

function proxyCount(values: readonly (number | undefined)[]): number {
  return values.filter((value) => value !== undefined).length;
}

function defaultedReliance(values: readonly (number | undefined)[]): number {
  return values.filter((value) => value === undefined).length;
}
