/**
 * DECISION FIELD RUNTIME — Over Observation (an OVI input).
 *
 * What did GSE INGEST that changed no decision? Facts that were knowable and clean but moved no card,
 * detected no change, and satisfied no required group are pure cost and noise. Naming them is the
 * supply-side discipline of intelligent data hunger: it tells the acquisition governor what to STOP
 * buying. Pure + deterministic.
 */

import type { TemporalFact } from "@sports/data-intelligence";

export interface OverObservation {
  readonly factId: string;
  readonly factType: string;
  readonly sourceId: string;
  readonly note: string;
}

/**
 * Facts in the creditable set that did not contribute to any change, claim, or required group are
 * over-observations. `contributingFactIds` is the set of fact ids that actually moved something.
 */
export function detectOverObservations(
  creditableFacts: readonly TemporalFact[],
  contributingFactIds: ReadonlySet<string>,
): OverObservation[] {
  return creditableFacts
    .filter((f) => !contributingFactIds.has(f.factId))
    .map((f) => ({
      factId: f.factId,
      factType: f.factType,
      sourceId: f.sourceId,
      note: "Knowable and clean but changed no decision this cycle — cost/noise; candidate to stop ingesting.",
    }));
}
