/**
 * Per-Source Reliability (Pillar D — stub)
 *
 * TODO(v9-D): Full implementation requires SignalLedgerEvent (feat/ledger PR).
 * Until that PR merges, this function always returns INSUFFICIENT_DATA.
 *
 * When the ledger PR lands, replace the stub body with a roll-up of
 * SignalLedgerEvent outcomes grouped by sourceName, computing:
 *   - hitRate over settled records
 *   - CLV lift over the same cohort
 *   - verdict based on sample size and lift magnitude
 *
 * IMPORTANT: This function NEVER auto-applies trust-level changes. The founder
 * reviews every SourceReliabilityReport and decides whether to promote or
 * demote a source's trustLevel in the GameSignal registry.
 */

// ============================================================
// Types
// ============================================================

export type SourceReliabilityVerdict =
  | "INSUFFICIENT_DATA" // < MIN_SAMPLE for this source
  | "NO_EDGE" // sample adequate but CLV ≈ 0
  | "MARGINAL" // positive CLV but within noise
  | "TRUSTED" // consistent positive lift, promote trustLevel
  | "DEMOTE"; // consistent negative lift, demote trustLevel

export interface SourceReliabilityReport {
  sourceName: string;
  verdict: SourceReliabilityVerdict;
  sampleSize: number;
  hitRate: number | null;
  /** 0.0–1.0; null = no recommendation. NEVER auto-applied — founder decides. */
  recommendedTrustLevel: number | null;
  reason: string;
}

// ============================================================
// Public API
// ============================================================

/**
 * Compute per-source reliability by rolling up SignalLedgerEvent outcomes.
 *
 * Stub: always returns INSUFFICIENT_DATA until feat/ledger merges and
 * SignalLedgerEvent is available on this branch.
 */
export async function computeSourceReliability(
  sourceName: string,
): Promise<SourceReliabilityReport> {
  // Stub: v8 SignalLedgerEvent not present on this branch
  return {
    sourceName,
    verdict: "INSUFFICIENT_DATA",
    sampleSize: 0,
    hitRate: null,
    recommendedTrustLevel: null,
    reason:
      "SignalLedgerEvent not available on this branch (pending feat/ledger merge). No source-level grading possible.",
  };
}
