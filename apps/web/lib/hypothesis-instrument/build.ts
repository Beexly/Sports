/**
 * Hypothesis-to-Instrument v0 (W009) — the pure builder.
 *
 * Wraps `BacktestHarnessReport.climatology` (an already-computed,
 * already-audited signal — see harness.ts's own "reuse, not reimplementation"
 * discipline) into a versioned, content-hashed `HypothesisInstrument`. This
 * module makes zero statistical judgments of its own: every field is either
 * copied straight off the report or derived by a status mapping that never
 * touches the underlying numbers.
 */

import { canonicalJson } from "@/lib/intelligence-playback/canonical-json";
import type { BacktestHarnessReport } from "@/lib/backtest/harness";
import type { HypothesisInstrument, HypothesisInstrumentStatus, HypothesisKind } from "./types";

export type HypothesisInstrumentHash = (payload: string) => string;

const INSTRUMENT_ID_BY_HYPOTHESIS: Record<HypothesisKind, string> = {
  MODEL_BEATS_CLIMATOLOGY: "instrument:model-beats-climatology",
};

/**
 * Reads `climatology.modelBeatsClimatology` directly rather than trusting
 * the harness's coarser top-level `status` string. The two can diverge: an
 * eligible sample that is entirely PUSH clears the `settledSampleSize` floor
 * (harness `status` reads "ok") but has zero binary samples to compare, so
 * the harness itself withholds `climatology` (all its fields are `null`).
 * Reading the field this instrument actually depends on is what keeps that
 * edge case honest instead of silently reporting a fabricated SUPPORTED.
 */
function statusFor(report: BacktestHarnessReport): HypothesisInstrumentStatus {
  if (report.coverage.settledSampleSize === 0) return "UNTESTED";
  if (report.climatology.modelBeatsClimatology === null) return "INSUFFICIENT_SAMPLE";
  return report.climatology.modelBeatsClimatology ? "SUPPORTED" : "NOT_SUPPORTED";
}

export function buildModelBeatsClimatologyInstrument(
  report: BacktestHarnessReport,
  hash: HypothesisInstrumentHash,
): HypothesisInstrument {
  const hypothesis: HypothesisKind = "MODEL_BEATS_CLIMATOLOGY";
  const status = statusFor(report);

  const body = {
    schemaVersion: "hypothesis-instrument/v0" as const,
    instrumentId: INSTRUMENT_ID_BY_HYPOTHESIS[hypothesis],
    hypothesis,
    status,
    sampleSize: report.coverage.binarySampleSize,
    modelBrierScore: report.climatology.modelBrierScore,
    climatologyBrierScore: report.climatology.climatologyBrierScore,
    edgeOverClimatology: report.climatology.edgeOverClimatology,
    sourceHarnessVersion: report.provenance.harnessVersion,
    sourceReportHash: report.provenance.outputHash,
    generatedAt: report.generatedAt,
  };

  const digest = hash(canonicalJson(body));
  return { ...body, digest };
}
