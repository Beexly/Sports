/**
 * Structural clearance proof — the package-side half of the Scraping Clearance
 * Engine contract.
 *
 * The Clearance Engine itself lives in apps/web/lib/scraping (it owns the
 * Source Rights Registry), and this package must not depend on the app. But
 * the CLAUDE.md invariant — checkClearance() before EVERY extraction job —
 * still has to be unforgeable at this layer. So every network fetcher in the
 * rights-gated adapters REQUIRES a SourceClearanceProof parameter: the caller
 * (an app-side gate such as apps/web/lib/ingestion/fantasy-mlb-gate.ts)
 * produces one only from a granted ClearanceResult. There is no default value
 * and no optional variant — an ungated call site does not compile (the M-F13
 * lesson: optional safety parameters are fail-open).
 *
 * assertCleared() adds the runtime half: the proof must be for the exact
 * source the fetcher serves, so a proof granted for one source cannot be
 * replayed against another.
 */

export interface SourceClearanceProof {
  /** Registry source_id this proof was granted for. */
  readonly sourceId: string;
  /** Literal true — the type is only constructible from a granted clearance. */
  readonly allowed: true;
  /** ISO timestamp of the clearance check. */
  readonly checkedAt: string;
  /** Attribution text from the registry; must propagate to derived outputs. */
  readonly attributionText: string | null;
}

/** Throws unless the proof is a granted clearance for exactly `sourceId`. */
export function assertCleared(
  proof: SourceClearanceProof,
  sourceId: string,
): void {
  if (proof.allowed !== true) {
    throw new Error(
      `Clearance proof for "${proof.sourceId}" is not a granted clearance; refusing to fetch.`,
    );
  }
  if (proof.sourceId !== sourceId) {
    throw new Error(
      `Clearance proof is for source "${proof.sourceId}" but this fetcher serves "${sourceId}"; ` +
        "refusing to fetch. Run the correct gate before calling.",
    );
  }
}
