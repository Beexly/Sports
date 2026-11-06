/**
 * Data Genesis adapter — SHADOW infrastructure (NOT wired into live scoring).
 *
 * Bridges prediction-engine outputs into the Data Genesis Engine so every derived, modeled object can
 * be wrapped as a receipted `SyntheticSignal` and later (only after doubt + meta-doubt + calibration)
 * promoted. This file is the integration seam, in the correct direction: prediction-engine depends on
 * data-genesis, never the reverse. Nothing here mutates the live score, bumps MODEL_VERSION, or
 * publishes anything — building a signal is inert until something explicitly promotes it.
 *
 * The hash function is injected end to end (same discipline as proof-of-record). Timestamps are passed
 * in by the caller; this module reads no wall clock.
 */

import {
  wrapAsSyntheticSignal,
  createGenesisReceipt,
  expectedCalibrationErrorFromPoints,
  maxCalibrationErrorFromPoints,
  reliabilityLabel,
  curveIdFrom,
  type HashFn,
  type GenesisReceipt,
  type SyntheticSignal,
  type CalibrationCurveResult,
  type CalibrationPoint,
  type LicenseScope,
} from "@sports/data-genesis";
import type { EdgeAssessment } from "./edge-engine.js";
import type { ClvGrade } from "./clv-capture.js";
import type { ReliabilityBin } from "./probability-calibration.js";
import type { PickSignalSnapshotData } from "./signal-snapshot.js";

/** What the caller injects so the engine stays pure (no clock, no global version reads). */
export interface GenesisAdapterContext {
  /** Version string of the producing engine (e.g. the prediction-engine build id). */
  engineVersion: string;
  /** Injected ISO timestamp — when the signal was generated. */
  generatedAt: string;
  modelVersion?: string;
  sport?: string;
  eventId?: string;
  sourceRefs?: readonly string[];
  /** Defaults to `internal_only` — these are shadow signals, never public by default. */
  licenseScope?: LicenseScope;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function discriminator(ctx: GenesisAdapterContext): string | undefined {
  return ctx.eventId ?? undefined;
}

/**
 * Wrap an EdgeAssessment as a draft SyntheticSignal. Confidence mirrors the glass-box conviction
 * (0–100 → [0,1]); uncertainty is the complement of independent-estimator agreement.
 */
export function edgeAssessmentToSyntheticSignal(
  edge: EdgeAssessment,
  ctx: GenesisAdapterContext,
  hash: HashFn,
): SyntheticSignal<EdgeAssessment> {
  return wrapAsSyntheticSignal<EdgeAssessment>(
    {
      domain: "edge",
      name: `edge-${edge.decision.toLowerCase()}`,
      value: edge,
      confidence: clamp01(edge.conviction / 100),
      uncertainty: clamp01(1 - edge.agreementRatio),
      engineVersion: ctx.engineVersion,
      modelVersion: ctx.modelVersion,
      generatedAt: ctx.generatedAt,
      inputs: { marketFairProb: edge.marketFairProb, trueProb: edge.trueProb, rawEdge: edge.rawEdge },
      transformation: { method: "assessEdge", agreement: edge.agreement, decision: edge.decision },
      sourceKinds: ["edge", "market"],
      sourceRefs: ctx.sourceRefs ?? (ctx.eventId ? [ctx.eventId] : []),
      licenseScope: ctx.licenseScope ?? "internal_only",
      discriminator: discriminator(ctx),
      tags: ["shadow", "edge", edge.decision, edge.agreement],
    },
    hash,
  );
}

/**
 * Wrap a realized ClvGrade as a draft SyntheticSignal. CLV is a measurement of beating the close, not a
 * forecast — confidence stays neutral; the verdict/kind ride along as tags.
 */
export function clvGradeToSyntheticSignal(
  clv: ClvGrade,
  ctx: GenesisAdapterContext,
  hash: HashFn,
): SyntheticSignal<ClvGrade> {
  return wrapAsSyntheticSignal<ClvGrade>(
    {
      domain: "clv",
      name: `clv-${clv.kind.toLowerCase()}`,
      value: clv,
      confidence: 0.5, // a realized CLV grade is evidence, not a probability forecast
      uncertainty: 0.5,
      engineVersion: ctx.engineVersion,
      modelVersion: ctx.modelVersion,
      generatedAt: ctx.generatedAt,
      inputs: { value: clv.value, closeLine: clv.closeLine, closePrice: clv.closePrice },
      transformation: { method: "gradePickClv", kind: clv.kind, verdict: clv.verdict },
      sourceKinds: ["clv", "market"],
      sourceRefs: ctx.sourceRefs ?? (ctx.eventId ? [ctx.eventId] : []),
      licenseScope: ctx.licenseScope ?? "internal_only",
      discriminator: discriminator(ctx),
      tags: ["shadow", "clv", clv.kind, clv.verdict],
    },
    hash,
  );
}

/**
 * Convert an ALREADY-COMPUTED reliability curve (from prediction-engine's `reliabilityCurve`) into a
 * Data Genesis `CalibrationCurveResult`. This deliberately reuses prediction-engine's binning rather
 * than recomputing it — the data-genesis curve builder competes with nothing here.
 */
export function calibrationCurveToGenesisResult(
  bins: readonly ReliabilityBin[],
  totalSamples: number,
  ctx: Pick<GenesisAdapterContext, "sport" | "eventId">,
): CalibrationCurveResult {
  const points: CalibrationPoint[] = bins.map((b) => ({
    binStart: b.binStart,
    binEnd: b.binEnd,
    predictedProbability: b.meanForecast,
    observedFrequency: b.observedRate,
    sampleCount: b.count,
    binAccuracy: b.count > 0 ? Math.round((1 - Math.abs(b.meanForecast - b.observedRate)) * 1e4) / 1e4 : 0,
  }));
  const expectedCalibrationError = expectedCalibrationErrorFromPoints(points);
  const maxCalibrationError = maxCalibrationErrorFromPoints(points);
  const tag = `${ctx.sport ?? "all"}-${ctx.eventId ?? "agg"}-n${totalSamples}-ece${Math.round(expectedCalibrationError * 1000)}`;
  return {
    points,
    expectedCalibrationError,
    maxCalibrationError,
    totalSamples,
    overallReliability: reliabilityLabel(expectedCalibrationError, totalSamples),
    curveId: curveIdFrom(tag),
  };
}

/**
 * Build a GenesisReceipt over a PickSignalSnapshot — the immutable record of what was known at
 * prediction time becomes a content-addressed, tamper-evident receipt.
 */
export function pickSignalSnapshotToGenesisReceipt(
  snapshot: PickSignalSnapshotData,
  ctx: Pick<GenesisAdapterContext, "engineVersion" | "generatedAt">,
  hash: HashFn,
): GenesisReceipt {
  return createGenesisReceipt(
    {
      createdAt: ctx.generatedAt,
      engineVersion: ctx.engineVersion,
      modelVersion: snapshot.modelVersion,
      inputs: snapshot,
      transformation: { method: "buildPickSignalSnapshot" },
      output: snapshot,
      sourceKinds: ["pick-signal-snapshot"],
      sourceRefs: [snapshot.pickId, snapshot.gameId],
      licenseScope: "internal_only",
    },
    hash,
  );
}
