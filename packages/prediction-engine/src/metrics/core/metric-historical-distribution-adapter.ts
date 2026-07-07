/**
 * Historical distribution adapter — replays historical-shaped GSE metric records
 * (calibration-integrity-grade, conformal-uncertainty-width, drift-pressure-index,
 * portfolio-fit-score) through the live metric implementations under the same
 * source- and payload-rights gates the production path enforces, then classifies
 * each replay as drift versus its recorded baseline.
 *
 * This is a SHADOW / validation surface, not a public feed: every result carries
 * `publicApiAllowed: false` and no record is ever surfaced through a public metric
 * API. Its job is to answer "would this metric still clear rights on this split, and
 * how far has its score drifted from the baseline we recorded?" without re-exposing
 * any raw source payload.
 *
 * Rights are enforced in two ordered, fail-closed gates
 * (see {@link adaptHistoricalDistributionRecord}):
 *   1. Source rights  — reviewHistoricalValidationSources over record.sourceIds.
 *   2. Payload rights — reviewHistoricalDistributionPayload at the requested exposure.
 * A failure at either gate returns a blocked result (score/band null,
 * driftStatus "MISSING"); the metric itself is only executed once both gates pass.
 *
 * Sibling module: metric-historical-validation-adapter.ts applies the identical
 * two-gate contract to the decision/market/role metric family.
 */
import {
  calibrationIntegrityGrade,
  type CalibrationIntegrityGradeInput,
} from "../calibration/calibration-integrity-grade.js";
import {
  conformalUncertaintyWidth,
  type ConformalUncertaintyWidthInput,
} from "../calibration/conformal-uncertainty-width.js";
import { driftPressureIndex, type DriftPressureIndexInput } from "../calibration/drift-pressure-index.js";
import { portfolioFitScore, type PortfolioFitScoreInput } from "../decision/portfolio-fit-score.js";
import {
  requireMetricAsset,
  type MetricApiExposure,
  type MetricDriftCardStatus,
  type MetricLicensingStatus,
} from "./metric-asset.js";
import {
  type MetricPayloadExposure,
  type MetricPayloadRightsDecision,
} from "./payload-rights.js";
import { reviewHistoricalDistributionPayload } from "./metric-historical-distribution-payload.js";
import { GSE_METRIC_SOURCE_RIGHTS_POLICIES, type MetricSourceRightsPolicy } from "./source-rights.js";
import {
  reviewHistoricalValidationSources,
  type HistoricalValidationAdapterStatus,
  type HistoricalValidationSourceReview,
} from "./metric-historical-validation-adapter.js";
import type { MetricLifecycleStatus, MetricSourcePolicy } from "./validation.js";

export type HistoricalDistributionMetricId =
  | "calibration-integrity-grade"
  | "conformal-uncertainty-width"
  | "drift-pressure-index"
  | "portfolio-fit-score";
export type HistoricalDistributionPayloadProfile =
  | "safe_derived"
  | "raw_input_leak"
  | "unsupported_probability_claim";
export type HistoricalDistributionAdapterStatus =
  | HistoricalValidationAdapterStatus
  | "BLOCKED_BY_PAYLOAD_RIGHTS";

export interface HistoricalCalibrationDistributionRecord {
  readonly metricId: "calibration-integrity-grade";
  readonly splitId: string;
  readonly description: string;
  readonly sourceIds: readonly string[];
  readonly input: Omit<CalibrationIntegrityGradeInput, "sourcePolicy">;
  readonly baselineScore: number;
  readonly watchDelta: number;
  readonly severeDelta: number;
  readonly payloadProfile: HistoricalDistributionPayloadProfile;
}

export interface HistoricalPortfolioDistributionRecord {
  readonly metricId: "portfolio-fit-score";
  readonly splitId: string;
  readonly description: string;
  readonly sourceIds: readonly string[];
  readonly input: Omit<PortfolioFitScoreInput, "sourcePolicy">;
  readonly baselineScore: number;
  readonly watchDelta: number;
  readonly severeDelta: number;
  readonly payloadProfile: HistoricalDistributionPayloadProfile;
}

export interface HistoricalDriftPressureDistributionRecord {
  readonly metricId: "drift-pressure-index";
  readonly splitId: string;
  readonly description: string;
  readonly sourceIds: readonly string[];
  readonly input: Omit<DriftPressureIndexInput, "sourcePolicy">;
  readonly baselineScore: number;
  readonly watchDelta: number;
  readonly severeDelta: number;
  readonly payloadProfile: HistoricalDistributionPayloadProfile;
}

export interface HistoricalConformalUncertaintyDistributionRecord {
  readonly metricId: "conformal-uncertainty-width";
  readonly splitId: string;
  readonly description: string;
  readonly sourceIds: readonly string[];
  readonly input: Omit<ConformalUncertaintyWidthInput, "sourcePolicy">;
  readonly baselineScore: number;
  readonly watchDelta: number;
  readonly severeDelta: number;
  readonly payloadProfile: HistoricalDistributionPayloadProfile;
}

export type HistoricalDistributionRecord =
  | HistoricalCalibrationDistributionRecord
  | HistoricalConformalUncertaintyDistributionRecord
  | HistoricalDriftPressureDistributionRecord
  | HistoricalPortfolioDistributionRecord;

export interface HistoricalDistributionAdapterResult {
  readonly metricId: HistoricalDistributionMetricId;
  readonly splitId: string;
  readonly status: HistoricalDistributionAdapterStatus;
  readonly lifecycleStatus: MetricLifecycleStatus;
  readonly apiExposure: MetricApiExposure;
  readonly licensingStatus: MetricLicensingStatus;
  readonly publicApiAllowed: false;
  readonly observedBand: string | null;
  readonly score: number | null;
  readonly allowed: boolean;
  readonly driftStatus: MetricDriftCardStatus;
  readonly scoreDelta: number | null;
  readonly sourceReview: HistoricalValidationSourceReview;
  readonly payloadRights: MetricPayloadRightsDecision | null;
  readonly notes: readonly string[];
}

interface BlockedHistoricalDistributionInput {
  readonly base: Omit<
    HistoricalDistributionAdapterResult,
    "allowed" | "driftStatus" | "notes" | "observedBand" | "payloadRights" | "score" | "scoreDelta" | "status"
  >;
  readonly description: string;
  readonly status: HistoricalDistributionAdapterStatus;
  readonly payloadRights: MetricPayloadRightsDecision | null;
}

/**
 * Adapt a single historical distribution record: run its metric locally under the
 * two rights gates and report the observed score, band, and drift versus baseline.
 *
 * Gate order (fail closed):
 *  1. Source rights — reviewHistoricalValidationSources(record.sourceIds). If the
 *     review is not "ADAPTED" (NEEDS_MANUAL_REVIEW or BLOCKED_BY_SOURCE_RIGHTS), a
 *     blocked result is returned with payloadRights === null; payload rights are NOT
 *     evaluated when source clearance is incomplete.
 *  2. Payload rights — reviewHistoricalDistributionPayload(record, policies, exposure).
 *     If disallowed, a blocked result is returned with status
 *     "BLOCKED_BY_PAYLOAD_RIGHTS" and the payload-rights decision attached.
 * The underlying metric is executed only when both gates pass.
 *
 * @param policies Source-rights policies used by both gates and by the metric's own
 *   sourcePolicy; defaults to the frozen GSE registry.
 * @param exposure Payload exposure tier the record's fields are tested against.
 *   Defaults to "API", the broadest/most-public tier and therefore the STRICTEST
 *   payload-rights bar (e.g. raw source values that a CONTENT/INTERNAL tier would
 *   permit are blocked at API, and derived fields are checked under the tightest
 *   source-use). Lower tiers (CONTENT/INTERNAL) are more permissive.
 *
 * Output units/semantics (all "*_when_blocked" fields fail closed):
 *  - score:        the underlying GSE metric's own numeric score (each metric defines
 *                  its own scale); null when either gate blocks.
 *  - observedBand: the metric's own band/letter grade; null when blocked.
 *  - allowed:      the metric's OWN usability/veto gate (e.g. calibrationUsable,
 *                  !downstreamVetoRecommended, portfolioActionAllowed), not a rights
 *                  decision — rights are already reflected in `status`.
 *  - scoreDelta:   round(score - record.baselineScore, 2); null when blocked.
 *  - driftStatus:  STABLE/WATCH/SEVERE from |score - baselineScore| against this
 *                  record's own watchDelta/severeDelta; "MISSING" when blocked.
 *  - publicApiAllowed: always false — this adapter never opens a public API path.
 */
export function adaptHistoricalDistributionRecord(
  record: HistoricalDistributionRecord,
  policies: readonly MetricSourceRightsPolicy[] = GSE_METRIC_SOURCE_RIGHTS_POLICIES,
  exposure: MetricPayloadExposure = "API",
): HistoricalDistributionAdapterResult {
  const sourceReview = reviewHistoricalValidationSources(record.sourceIds, policies);
  const asset = requireMetricAsset(record.metricId);
  const base = {
    apiExposure: asset.apiExposure,
    lifecycleStatus: asset.birthCertificate.status,
    licensingStatus: asset.licensingStatus,
    metricId: record.metricId,
    publicApiAllowed: false as const,
    sourceReview,
    splitId: record.splitId,
  };
  if (sourceReview.status !== "ADAPTED") {
    return blockedResult({
      base,
      description: record.description,
      payloadRights: null,
      status: sourceReview.status,
    });
  }

  const payloadRights = reviewHistoricalDistributionPayload(record, policies, exposure);
  if (!payloadRights.allowed) {
    return blockedResult({
      base,
      description: record.description,
      payloadRights,
      status: "BLOCKED_BY_PAYLOAD_RIGHTS",
    });
  }

  const observed = runDistributionMetric(record, policies);
  return {
    ...base,
    allowed: observed.allowed,
    driftStatus: classifyDistributionDrift(observed.score, record),
    notes: [record.description, "Source and payload rights cleared before local historical adaptation."],
    observedBand: observed.band,
    payloadRights,
    score: observed.score,
    scoreDelta: roundDelta(observed.score - record.baselineScore),
    status: "ADAPTED",
  };
}

/**
 * Batch-adapt a set of historical distribution records under shared source-rights
 * policies. Thin map over {@link adaptHistoricalDistributionRecord}; each record is
 * gated and scored independently, so one blocked record never affects the others.
 *
 * Known asymmetry / limitation: unlike its sibling
 * runHistoricalValidationAdapterRecords (metric-historical-validation-adapter.ts),
 * which threads an `exposure` argument through to every record, this batch runner
 * does not accept an exposure parameter — it evaluates every record at the default
 * "API" payload-exposure tier. "API" is the strictest payload-rights bar (e.g. raw
 * source values that a CONTENT/INTERNAL tier would permit are blocked at API), so
 * defaulting the batch to API is the conservative choice. The trade-off is that a
 * caller wanting to batch-evaluate distribution payload rights at CONTENT/INTERNAL
 * exposure must map over the single-record adapter directly (which does accept an
 * `exposure` argument).
 */
export function runHistoricalDistributionAdapterRecords(
  records: readonly HistoricalDistributionRecord[],
  policies: readonly MetricSourceRightsPolicy[] = GSE_METRIC_SOURCE_RIGHTS_POLICIES,
): readonly HistoricalDistributionAdapterResult[] {
  return records.map((record) => adaptHistoricalDistributionRecord(record, policies));
}

/**
 * Execute the record's underlying GSE metric locally and normalize its
 * metric-specific outputs onto the adapter's common shape. `allowed` is each
 * metric's own usability/veto gate (calibrationUsable, !downstreamVetoRecommended,
 * portfolioActionAllowed), `band` its own band/letter grade, `score` its own score.
 * Callers reach this only after both rights gates have passed.
 */
function runDistributionMetric(
  record: HistoricalDistributionRecord,
  policies: readonly MetricSourceRightsPolicy[],
): { readonly allowed: boolean; readonly band: string; readonly score: number } {
  const sourcePolicy: readonly MetricSourcePolicy[] = record.sourceIds.map((sourceId): MetricSourcePolicy => {
    const policy = policies.find((candidate) => candidate.sourceId === sourceId);
    return {
      allowedForModeling: policy?.permissions.derivedMetric ?? false,
      attributionRequired: policy?.attribution.text ?? undefined,
      sourceId,
      status: "approved",
    };
  });
  switch (record.metricId) {
    case "calibration-integrity-grade": {
      const metric = calibrationIntegrityGrade({ ...record.input, sourcePolicy });
      return { allowed: metric.calibrationUsable, band: metric.letterGrade, score: metric.score };
    }
    case "conformal-uncertainty-width": {
      const metric = conformalUncertaintyWidth({ ...record.input, sourcePolicy });
      return { allowed: !metric.downstreamVetoRecommended, band: metric.band, score: metric.score };
    }
    case "drift-pressure-index": {
      const metric = driftPressureIndex({ ...record.input, sourcePolicy });
      return { allowed: !metric.downstreamVetoRecommended, band: metric.band, score: metric.score };
    }
    case "portfolio-fit-score": {
      const metric = portfolioFitScore({ ...record.input, sourcePolicy });
      return { allowed: metric.portfolioActionAllowed, band: metric.band, score: metric.score };
    }
    default:
      return assertNever(record);
  }
}

/**
 * Classify score drift against the record's recorded baseline using the absolute
 * deviation |score - baselineScore|: SEVERE at/above severeDelta, WATCH at/above
 * watchDelta, otherwise STABLE. Thresholds are per-record (each split carries its
 * own watchDelta/severeDelta). "MISSING" is reserved for blocked results and is set
 * by blockedResult, not here.
 */
function classifyDistributionDrift(
  score: number,
  record: HistoricalDistributionRecord,
): MetricDriftCardStatus {
  const delta = Math.abs(score - record.baselineScore);
  if (delta >= record.severeDelta) return "SEVERE";
  if (delta >= record.watchDelta) return "WATCH";
  return "STABLE";
}

/**
 * Build the fail-closed result returned when either rights gate blocks a record:
 * allowed=false, driftStatus="MISSING", and score/observedBand/scoreDelta all null,
 * so a blocked record can never be mistaken for an adapted one. `payloadRights` is
 * null when source rights blocked (payload was never evaluated) and carries the
 * payload-rights decision when the payload gate blocked.
 */
function blockedResult(input: BlockedHistoricalDistributionInput): HistoricalDistributionAdapterResult {
  return {
    ...input.base,
    allowed: false,
    driftStatus: "MISSING",
    notes: [
      input.description,
      "Historical distribution input was not adapted because required rights gates did not pass.",
    ],
    observedBand: null,
    payloadRights: input.payloadRights,
    score: null,
    scoreDelta: null,
    status: input.status,
  };
}

/** Round a score delta to 2 decimal places for stable, reproducible reporting. */
function roundDelta(value: number): number {
  return Math.round(value * 100) / 100;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled historical distribution record: ${JSON.stringify(value)}`);
}
