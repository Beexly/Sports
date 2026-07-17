/**
 * Intelligence Watch v0 (W005) — the pure evaluator.
 *
 * Decides whether an already-computed W002 `WorldDelta` is worth surfacing
 * to a user for one watched entity, per their `IntelligenceWatchContract`.
 * Mirrors `watchlist/alert-eligibility.ts`'s exact discipline: a
 * discriminated result (never a bare boolean), entitlement checked FIRST
 * and fail-closed before any delta work, no I/O, no dispatch — this module
 * produces a decision only. Nothing here sends anything.
 *
 * NO GRADED-ONLY GUARD (unlike alert-eligibility.ts's isGradedEvent check):
 * `WorldDeltaEntry` carries no settled/graded marker, so this function
 * cannot distinguish a settled fact from speculative/unsettled data. Safe
 * today only because no Worldline producer and no caller of this function
 * exist in production. Before wiring a live caller or any send path to
 * `surface: true`, a graded/settled filter MUST be added upstream — see
 * docs/frontier/WORKSTREAM_005_INTELLIGENCE_WATCH_V0.md's "REQUIRED before
 * any live wiring" note (gse-red-team finding, DEC-021).
 */

import type { WorldDelta } from "@/lib/worldline";
import type { IntelligenceWatchContract, IntelligenceWatchOutcome } from "./types";

export interface IntelligenceWatchInput {
  readonly contract: IntelligenceWatchContract;
  readonly delta: WorldDelta;
  /** Reuses the existing watchlist alert entitlement (`Entitlements.canGetAlerts`,
   *  Elite-exclusive) — v0 does not introduce a second alerting dimension. */
  readonly canGetAlerts: boolean;
}

/**
 * Entries in `delta` for the contract's entity, narrowed to
 * `watchedAttributes` when the user specified any (empty = all attributes).
 */
function matchingEntries(input: IntelligenceWatchInput) {
  const { contract, delta } = input;
  return delta.entries.filter(
    (entry) =>
      entry.entityId === contract.entityId &&
      (contract.watchedAttributes.length === 0 || contract.watchedAttributes.includes(entry.attribute)),
  );
}

export function evaluateIntelligenceWatch(input: IntelligenceWatchInput): IntelligenceWatchOutcome {
  if (!input.canGetAlerts) {
    return { surface: false, reason: "not_entitled" };
  }
  const matches = matchingEntries(input);
  if (matches.length < input.contract.materialityThreshold) {
    return { surface: false, reason: "no_material_change" };
  }
  return { surface: true, matchingEntries: matches };
}
