/**
 * Hypothesis-to-Instrument v0 (W009) — types.
 *
 * A `HypothesisInstrument` packages ONE already-computed, already-audited
 * result off the backtest harness (`apps/web/lib/backtest/harness.ts`) into
 * a versioned, content-hashed, stably-identified record. It never re-decides
 * anything the harness didn't already decide — see
 * docs/frontier/WORKSTREAM_009_HYPOTHESIS_TO_INSTRUMENT_V0.md.
 */

/**
 * A closed union. v0 has exactly one member because
 * `BacktestHarnessReport.climatology` is the only comparison the harness
 * actually computes today. A new member requires a new already-audited
 * harness signal to wrap, never an invented comparison.
 */
export type HypothesisKind = "MODEL_BEATS_CLIMATOLOGY";

/**
 * `INSUFFICIENT_SAMPLE` and `UNTESTED` are deliberately distinct from
 * `NOT_SUPPORTED` — a thin/empty sample is not evidence against the
 * hypothesis, and collapsing "we don't know yet" into "no" would be exactly
 * the kind of fabricated-stat this repo's non-negotiable rules forbid.
 */
export type HypothesisInstrumentStatus = "SUPPORTED" | "NOT_SUPPORTED" | "INSUFFICIENT_SAMPLE" | "UNTESTED";

export interface HypothesisInstrument {
  readonly schemaVersion: "hypothesis-instrument/v0";
  /** Stable identifier keyed off `hypothesis` — a lookup key, not a value. Identical across every run of the same hypothesis kind. */
  readonly instrumentId: string;
  readonly hypothesis: HypothesisKind;
  readonly status: HypothesisInstrumentStatus;
  /** The binary (WIN/LOSS) sample size the comparison was scored over. 0 when UNTESTED or when the eligible sample was entirely PUSH/VOID. */
  readonly sampleSize: number;
  /** Null whenever `status` is INSUFFICIENT_SAMPLE or UNTESTED — never a fabricated number off a thin/empty sample. */
  readonly modelBrierScore: number | null;
  readonly climatologyBrierScore: number | null;
  readonly edgeOverClimatology: number | null;
  readonly sourceHarnessVersion: string;
  /** The harness report's own `provenance.outputHash` — cited, never re-hashed. */
  readonly sourceReportHash: string;
  readonly generatedAt: string;
  /** This instrument's own content hash — distinct from `sourceReportHash`. */
  readonly digest: string;
}
