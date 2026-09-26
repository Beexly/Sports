/**
 * GSE action-score bridge. Fail-closed shell over
 * `gse-score/gse-action-score.ts`. The kernel does the arithmetic. This layer
 * refuses the repairs the kernel performs silently, and it never emits a pick.
 *
 * Measured kernel defects (do not paper over):
 * - `clamp01(marketProbability)` turns 1.4 into 1 and -0.2 into 0, so an
 *   impossible price becomes a probability.
 * - `aggregateModelParliament` drops any vote whose probability is outside
 *   [0,1] or whose confidence is not finite and > 0, then scores the rest
 *   and reports `votesUsed` short. A caller who sent three votes can receive
 *   a probability built from one.
 * - when every vote has zero evidence weight, `modeledProbability` is null
 *   and `probabilityEdge` is published as 0. A missing model is not a zero edge.
 * - `evaluateFeatureContract` does `Math.max(1, maxAgeMinutes)`, so a caller
 *   window of 0 is silently widened to 1 minute.
 * - feature `quality` and no-bet `severity` are clamp01'd. 1.5 and -1 both
 *   become in-range numbers.
 *
 * `publishablePick` is always false. PLAY / LEAN stay on `kernelDecision`
 * so the gate is auditable. They are not a recommendation from this bridge.
 */

import {
  computeGseActionScore,
  type GseActionDecision,
  type GseActionScoreInput,
  type GseActionScoreResult,
} from "@sports/prediction-engine/src/gse-score/gse-action-score.js";
import type { NoBetRiskFactor } from "@sports/prediction-engine/src/gse-score/no-bet-strength.js";

export type GseScoreEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

const PUBLICATION_REFUSAL =
  "GSE action score is an internal gate, not a pick. publishablePick is false for every kernel decision, including PLAY and LEAN.";

const NO_BET_FACTORS: readonly NoBetRiskFactor[] = [
  "MISSING_REQUIRED_DATA",
  "STALE_DATA",
  "MODEL_DISAGREEMENT",
  "CALIBRATION_NOT_VALIDATED",
  "SOURCE_RIGHTS_BLOCKED",
  "LOW_EVIDENCE",
  "MARKET_VOLATILITY",
  "RESPONSIBLE_GAMING",
];

export interface GseActionBridgeData {
  /** Kernel label. Not a published selection. */
  readonly kernelDecision: GseActionDecision;
  /** Always false. This bridge does not publish picks. */
  readonly publishablePick: false;
  readonly publicationRefusal: string;
  /** Action quality on 0–100. Never a probability. */
  readonly score: number;
  readonly scoreIsProbability: false;
  readonly readingKind: "ACTION_QUALITY";
  readonly modeledProbability: number;
  readonly marketProbability: number;
  /** modeled − market, finite. Never substituted with 0 when the model is missing. */
  readonly probabilityEdge: number;
  /** 0–100. Not a win probability. The kernel's field is named confidenceScore. */
  readonly parliamentConfidenceScore: number;
  readonly parliamentConfidenceIsProbability: false;
  readonly probabilityClaimsAllowed: boolean;
  readonly calibrationStatus: GseActionScoreResult["calibration"]["status"];
  readonly featureStatus: GseActionScoreResult["featureContract"]["status"];
  readonly parliamentStatus: GseActionScoreResult["parliament"]["status"];
  readonly noBetDecision: GseActionScoreResult["noBet"]["decision"];
  readonly hardPassReasons: readonly string[];
  readonly votesUsed: number;
}

function fail(reason: string): GseScoreEval<never> {
  return { ok: false, reason };
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function describe(v: unknown): string {
  if (typeof v === "number") {
    if (Number.isNaN(v)) return "NaN";
    if (!Number.isFinite(v)) return String(v);
    return String(v);
  }
  return String(v);
}

function threw(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function isNoBetFactor(v: string): v is NoBetRiskFactor {
  return (NO_BET_FACTORS as readonly string[]).includes(v);
}

/**
 * Refuse inputs the kernel would clamp, drop, or relabel, then refuse a
 * successful-looking kernel result whose edge is not modeled minus market.
 */
export function evalGseActionScore(input: GseActionScoreInput): GseScoreEval<GseActionBridgeData> {
  const market = input.marketProbability;
  if (!isFiniteNumber(market) || !(market > 0) || !(market < 1)) {
    return fail(
      `gse-score: marketProbability must be a finite price in (0, 1), got ${describe(market)}. The kernel clamp01-maps anything outside [0, 1] onto the boundary and would publish that as the market.`,
    );
  }

  const inputError = validateInput(input);
  if (inputError !== null) return fail(inputError);

  let kernel: GseActionScoreResult;
  try {
    kernel = computeGseActionScore(input);
  } catch (e) {
    return fail(`gse-score: computeGseActionScore threw: ${threw(e)}`);
  }

  return acceptKernel(kernel, market);
}

function validateInput(input: GseActionScoreInput): string | null {
  const votes = input.modelParliament.votes;
  if (votes.length === 0) {
    return "gse-score: modelParliament.votes is empty. The kernel answers that with modeledProbability null and probabilityEdge 0.";
  }
  for (let i = 0; i < votes.length; i++) {
    const vote = votes[i];
    if (vote === undefined) return `gse-score: vote ${i} is missing`;
    if (vote.modelId.trim().length === 0) return `gse-score: vote ${i} modelId is empty`;
    if (!isFiniteNumber(vote.probability) || vote.probability < 0 || vote.probability > 1) {
      return `gse-score: vote ${i} (${vote.modelId}) probability must be a finite number in [0, 1], got ${describe(vote.probability)}. The kernel drops out-of-range votes and scores whoever remains.`;
    }
    if (!isFiniteNumber(vote.confidence) || !(vote.confidence > 0) || vote.confidence > 1) {
      return `gse-score: vote ${i} (${vote.modelId}) confidence must be a finite number in (0, 1], got ${describe(vote.confidence)}. The kernel drops confidence <= 0 and clamp01-maps confidence above 1.`;
    }
    if (vote.evidenceWeight !== undefined) {
      if (!isFiniteNumber(vote.evidenceWeight) || vote.evidenceWeight < 0) {
        return `gse-score: vote ${i} (${vote.modelId}) evidenceWeight must be a finite number >= 0, got ${describe(vote.evidenceWeight)}`;
      }
    }
    if (vote.stale !== undefined && typeof vote.stale !== "boolean") {
      return `gse-score: vote ${i} (${vote.modelId}) stale must be a boolean when set`;
    }
  }

  const maxDisagreement = input.modelParliament.maxDisagreement;
  if (maxDisagreement !== undefined && (!isFiniteNumber(maxDisagreement) || !(maxDisagreement > 0))) {
    return `gse-score: maxDisagreement must be a finite number > 0, got ${describe(maxDisagreement)}`;
  }

  const features = input.featureContract.features;
  const maxAge = input.featureContract.maxAgeMinutes;
  if (maxAge !== undefined && (!isFiniteNumber(maxAge) || maxAge < 1)) {
    return `gse-score: maxAgeMinutes must be a finite number >= 1, got ${describe(maxAge)}. The kernel does Math.max(1, maxAgeMinutes) and would silently widen a non-positive window.`;
  }
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    if (feature === undefined) return `gse-score: feature ${i} is missing`;
    if (feature.key.trim().length === 0) return `gse-score: feature ${i} key is empty`;
    if (!isFiniteNumber(feature.value)) {
      return `gse-score: feature ${feature.key} value must be a finite number, got ${describe(feature.value)}`;
    }
    if (feature.quality !== undefined && (!isFiniteNumber(feature.quality) || feature.quality < 0 || feature.quality > 1)) {
      return `gse-score: feature ${feature.key} quality must be a finite number in [0, 1], got ${describe(feature.quality)}. The kernel clamp01-maps quality and would hide the bad input.`;
    }
    if (feature.ageMinutes !== undefined && (!isFiniteNumber(feature.ageMinutes) || feature.ageMinutes < 0)) {
      return `gse-score: feature ${feature.key} ageMinutes must be a finite number >= 0, got ${describe(feature.ageMinutes)}. A negative age is not fresh; the kernel treats it as age 0.`;
    }
    const policy = feature.sourcePolicy;
    if (policy !== undefined) {
      if (policy.sourceId.trim().length === 0) {
        return `gse-score: feature ${feature.key} sourcePolicy.sourceId is empty`;
      }
      if (policy.status !== "allowed" && policy.status !== "restricted" && policy.status !== "unknown") {
        return `gse-score: feature ${feature.key} sourcePolicy.status ${describe(policy.status)} is not allowed|restricted|unknown`;
      }
      if (typeof policy.allowedForModeling !== "boolean") {
        return `gse-score: feature ${feature.key} sourcePolicy.allowedForModeling must be boolean`;
      }
    }
  }

  const cal = input.calibration;
  if (!isFiniteNumber(cal.sampleCount) || cal.sampleCount < 0 || !Number.isInteger(cal.sampleCount)) {
    return `gse-score: calibration.sampleCount must be a finite integer >= 0, got ${describe(cal.sampleCount)}. A negative count is not an insufficient sample; the kernel would label it INSUFFICIENT_SAMPLE.`;
  }
  if (cal.minSampleCount !== undefined && (!isFiniteNumber(cal.minSampleCount) || cal.minSampleCount < 1)) {
    return `gse-score: calibration.minSampleCount must be a finite number >= 1, got ${describe(cal.minSampleCount)}`;
  }
  if (
    cal.expectedCalibrationError !== undefined &&
    (!isFiniteNumber(cal.expectedCalibrationError) || cal.expectedCalibrationError < 0)
  ) {
    return `gse-score: expectedCalibrationError must be a finite number >= 0, got ${describe(cal.expectedCalibrationError)}`;
  }
  if (
    cal.maxExpectedCalibrationError !== undefined &&
    (!isFiniteNumber(cal.maxExpectedCalibrationError) || cal.maxExpectedCalibrationError < 0)
  ) {
    return `gse-score: maxExpectedCalibrationError must be a finite number >= 0, got ${describe(cal.maxExpectedCalibrationError)}`;
  }
  if (cal.brierScore !== undefined && (!isFiniteNumber(cal.brierScore) || cal.brierScore < 0)) {
    return `gse-score: brierScore must be a finite number >= 0, got ${describe(cal.brierScore)}`;
  }
  if (
    cal.baselineBrierScore !== undefined &&
    (!isFiniteNumber(cal.baselineBrierScore) || cal.baselineBrierScore < 0)
  ) {
    return `gse-score: baselineBrierScore must be a finite number >= 0, got ${describe(cal.baselineBrierScore)}`;
  }
  if (cal.driftScore !== undefined && (!isFiniteNumber(cal.driftScore) || cal.driftScore < 0)) {
    return `gse-score: driftScore must be a finite number >= 0, got ${describe(cal.driftScore)}`;
  }
  if (cal.maxDriftScore !== undefined && (!isFiniteNumber(cal.maxDriftScore) || cal.maxDriftScore < 0)) {
    return `gse-score: maxDriftScore must be a finite number >= 0, got ${describe(cal.maxDriftScore)}`;
  }

  const extra = input.additionalNoBetRisks;
  if (extra !== undefined) {
    for (let i = 0; i < extra.length; i++) {
      const risk = extra[i];
      if (risk === undefined) return `gse-score: additionalNoBetRisks[${i}] is missing`;
      if (!isNoBetFactor(risk.factor)) {
        return `gse-score: additionalNoBetRisks[${i}] factor ${describe(risk.factor)} is not a known no-bet factor`;
      }
      if (!isFiniteNumber(risk.severity) || risk.severity < 0 || risk.severity > 1) {
        return `gse-score: additionalNoBetRisks[${i}] severity must be a finite number in [0, 1], got ${describe(risk.severity)}. The kernel clamp01-maps severity.`;
      }
      if (risk.reason.trim().length === 0) {
        return `gse-score: additionalNoBetRisks[${i}] reason is empty`;
      }
      if (risk.hardBlock !== undefined && typeof risk.hardBlock !== "boolean") {
        return `gse-score: additionalNoBetRisks[${i}] hardBlock must be boolean when set`;
      }
    }
  }

  return null;
}

function acceptKernel(kernel: GseActionScoreResult, market: number): GseScoreEval<GseActionBridgeData> {
  if (kernel.modeledProbability === null) {
    return fail(
      `gse-score: kernel published probabilityEdge ${describe(kernel.probabilityEdge)} with modeledProbability null (${kernel.parliament.warnings.join("; ") || kernel.parliament.status}). A missing model is not a zero edge.`,
    );
  }
  if (!isFiniteNumber(kernel.modeledProbability) || kernel.modeledProbability < 0 || kernel.modeledProbability > 1) {
    return fail(
      `gse-score: kernel modeledProbability is not a finite number in [0, 1], got ${describe(kernel.modeledProbability)}`,
    );
  }
  if (!isFiniteNumber(kernel.probabilityEdge)) {
    return fail(`gse-score: kernel probabilityEdge is not finite, got ${describe(kernel.probabilityEdge)}`);
  }
  const edge = kernel.modeledProbability - market;
  if (Math.abs(kernel.probabilityEdge - edge) > 5e-5) {
    return fail(
      `gse-score: kernel probabilityEdge ${kernel.probabilityEdge} is not modeled ${kernel.modeledProbability} minus market ${market}`,
    );
  }
  if (!isFiniteNumber(kernel.score) || kernel.score < 0 || kernel.score > 100) {
    return fail(`gse-score: kernel score is not a finite action quality in [0, 100], got ${describe(kernel.score)}`);
  }
  if (
    (kernel.decision === "PLAY" || kernel.decision === "LEAN") &&
    !(kernel.probabilityEdge > 0)
  ) {
    return fail(
      `gse-score: kernel decision ${kernel.decision} with probabilityEdge ${kernel.probabilityEdge}. PLAY and LEAN require a positive modeled-minus-market edge.`,
    );
  }
  if (kernel.decision === "HARD_PASS" && kernel.score > 24 + 1e-9) {
    return fail(
      `gse-score: kernel HARD_PASS carried score ${kernel.score}, above the kernel's own cap of 24`,
    );
  }
  if (!isFiniteNumber(kernel.confidenceScore) || kernel.confidenceScore < 0 || kernel.confidenceScore > 100) {
    return fail(
      `gse-score: kernel confidenceScore is not a finite 0–100 action-quality term, got ${describe(kernel.confidenceScore)}`,
    );
  }
  if (kernel.marketProbability !== market) {
    return fail(
      `gse-score: kernel rewrote marketProbability from ${market} to ${describe(kernel.marketProbability)}. That is the clamp01 path.`,
    );
  }

  return {
    ok: true,
    data: {
      kernelDecision: kernel.decision,
      publishablePick: false,
      publicationRefusal: PUBLICATION_REFUSAL,
      score: kernel.score,
      scoreIsProbability: false,
      readingKind: "ACTION_QUALITY",
      modeledProbability: kernel.modeledProbability,
      marketProbability: market,
      probabilityEdge: kernel.probabilityEdge,
      parliamentConfidenceScore: kernel.confidenceScore,
      parliamentConfidenceIsProbability: false,
      probabilityClaimsAllowed: kernel.calibration.probabilityClaimsAllowed,
      calibrationStatus: kernel.calibration.status,
      featureStatus: kernel.featureContract.status,
      parliamentStatus: kernel.parliament.status,
      noBetDecision: kernel.noBet.decision,
      hardPassReasons: kernel.noBet.hardPassReasons,
      votesUsed: kernel.parliament.votesUsed,
    },
  };
}
