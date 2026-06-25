/**
 * GSE GALILEO — Edge Ledger Integration (Invention 11).
 *
 * Re-exports the tested edge-ledger promotion engine (the unforgettable rules: no CLV-only /
 * in-sample-only / one-season-only / settlement-negative / data-quality-warning / future-
 * contamination promotion) and adds the Galileo candidate record with its full provenance:
 * who discovered it, the flesh/market/attention triggers, and the instrument scores
 * (incoherence residual, absorption half-life, book-DNA, role-delta, alt-line geometry).
 *
 * The extra fields are provenance metadata; promotion still runs through the base evaluator,
 * so the discipline is unchanged. Pure.
 */

export * from "../market-physics/edge-ledger.js";
import {
  type EdgeCandidate,
  type LedgerVerdict,
  type LedgerOptions,
  evaluateLedgerStatus,
} from "../market-physics/edge-ledger.js";

export interface GalileoEdgeCandidate extends EdgeCandidate {
  readonly discoveredBy: string;
  readonly fleshStateTrigger?: string;
  readonly marketStateTrigger?: string;
  readonly attentionStateTrigger?: string;
  readonly incoherenceResidual?: string;
  readonly absorptionHalfLifeMinutes?: number | null;
  readonly bookDnaScore?: number;
  readonly roleDeltaScore?: number;
  readonly altLineGeometryScore?: number;
}

/** Evaluate a Galileo candidate through the base promotion engine (provenance is metadata). */
export function evaluateGalileoCandidate(c: GalileoEdgeCandidate, options: LedgerOptions = {}): LedgerVerdict {
  return evaluateLedgerStatus(c, options);
}

/** The Galileo ledger requires a structural reason AND a named discoverer (no anonymous edges). */
export function galileoRecordComplete(c: GalileoEdgeCandidate): boolean {
  return (
    typeof c.discoveredBy === "string" &&
    c.discoveredBy.trim().length > 0 &&
    typeof c.structuralReason === "string" &&
    c.structuralReason.trim().length > 0
  );
}
