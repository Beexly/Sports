/**
 * DATA INTELLIGENCE MESH — Source Conflict Court.
 *
 * When sources disagree, do NOT average blindly. Classify the disagreement — a late source, a bad
 * source, a different entity mapping, a different stat definition, a projection-vs-reality gap, a
 * fantasy-platform lag, a rumor — and route it. A disagreement is not always a problem; sometimes
 * the disagreement IS the edge (a fantasy projection lagging confirmed role truth). Pure +
 * deterministic.
 */

import { factClassOf, type FactType } from "./fact-type.js";

export type ConflictClass =
  | "LATE_SOURCE" | "BAD_SOURCE" | "ENTITY_MAPPING_COLLISION" | "TIMESTAMP_MISMATCH"
  | "STAT_DEFINITION_MISMATCH" | "MANUAL_CORRECTION" | "PROJECTION_MODEL_DIFFERENCE"
  | "RUMOR_OR_UNCONFIRMED" | "MARKET_POLICY_DISTORTION" | "FANTASY_PLATFORM_LAG";

export type ConflictVerdict =
  | "TRUST_SOURCE_A" | "TRUST_SOURCE_B" | "WAIT_FOR_CONFIRMATION" | "QUARANTINE" | "USE_AS_CONTRADICTION_SIGNAL";

export interface ConflictParty {
  readonly sourceId: string;
  readonly factType: FactType;
  readonly observedAt: string;     // ISO
  readonly reliability: number;    // 0..1
  readonly gseEntityId: string;
  readonly statDefinition?: string;
  readonly isProjection?: boolean;
  readonly isRumor?: boolean;
  readonly isManualCorrection?: boolean;
  readonly bookPolicyDistorted?: boolean;
}

export interface ConflictInput {
  readonly a: ConflictParty;
  readonly b: ConflictParty;
  /** Minutes apart to treat as a staleness (late-source) gap. */
  readonly staleGapMinutes?: number;
}

export interface ConflictResult {
  readonly conflictClass: ConflictClass;
  readonly verdict: ConflictVerdict;
  readonly note: string;
}

const ms = (iso: string): number => Date.parse(iso);

/** Classify and route a disagreement between two sources reporting the "same" fact. */
export function classifyConflict(input: ConflictInput): ConflictResult {
  const { a, b } = input;
  const staleGap = (input.staleGapMinutes ?? 30) * 60_000;

  // 1. Different canonical entity → this is not the same fact at all. Quarantine.
  if (a.gseEntityId !== b.gseEntityId) {
    return { conflictClass: "ENTITY_MAPPING_COLLISION", verdict: "QUARANTINE", note: "Sources resolved to different canonical entities — not comparable; quarantine until the spine reconciles them." };
  }
  // 2. A rumor/unconfirmed report is never truth on its own.
  if (a.isRumor || b.isRumor) {
    return { conflictClass: "RUMOR_OR_UNCONFIRMED", verdict: "WAIT_FOR_CONFIRMATION", note: "One side is a rumor/unconfirmed — wait for independent confirmation; never publish." };
  }
  // 3. A manual correction supersedes the automated feed.
  if (a.isManualCorrection || b.isManualCorrection) {
    const trust = a.isManualCorrection ? "TRUST_SOURCE_A" : "TRUST_SOURCE_B";
    return { conflictClass: "MANUAL_CORRECTION", verdict: trust as ConflictVerdict, note: "A manual correction supersedes the automated value." };
  }
  // 4. Different stat definitions are not a contradiction — they measure different things.
  if (a.statDefinition && b.statDefinition && a.statDefinition !== b.statDefinition) {
    return { conflictClass: "STAT_DEFINITION_MISMATCH", verdict: "WAIT_FOR_CONFIRMATION", note: `Different stat definitions (${a.statDefinition} vs ${b.statDefinition}) — reconcile definitions before comparing; do not average.` };
  }
  // 5. Fantasy projection vs football reality (e.g. injury/role truth) — the lag is the edge, not noise.
  const classA = factClassOf(a.factType), classB = factClassOf(b.factType);
  const fantasyVsReality = (classA === "fantasy_market" && classB === "football_reality") || (classB === "fantasy_market" && classA === "football_reality");
  if (fantasyVsReality) {
    return { conflictClass: "FANTASY_PLATFORM_LAG", verdict: "USE_AS_CONTRADICTION_SIGNAL", note: "A fantasy-market belief disagrees with football reality — classify as platform lag (a signal), not as truth to average." };
  }
  // 6. A projection disagreeing with another projection/observation → model difference, not truth.
  if (a.isProjection || b.isProjection) {
    return { conflictClass: "PROJECTION_MODEL_DIFFERENCE", verdict: "USE_AS_CONTRADICTION_SIGNAL", note: "Projection-model difference — surface as a disagreement signal, not a settled value." };
  }
  // 7. Book-policy distortion (limits/shading) in a market fact.
  if (a.bookPolicyDistorted || b.bookPolicyDistorted) {
    return { conflictClass: "MARKET_POLICY_DISTORTION", verdict: "USE_AS_CONTRADICTION_SIGNAL", note: "Book-policy distortion — the off side reflects policy, not fair value; treat as a signal." };
  }
  // 8. Staleness: one source observed materially earlier → late source, trust the fresher.
  const ta = ms(a.observedAt), tb = ms(b.observedAt);
  if (Number.isFinite(ta) && Number.isFinite(tb) && Math.abs(ta - tb) >= staleGap) {
    const fresher = ta > tb ? "TRUST_SOURCE_A" : "TRUST_SOURCE_B";
    return { conflictClass: "LATE_SOURCE", verdict: fresher as ConflictVerdict, note: `Observations are ${Math.round(Math.abs(ta - tb) / 60_000)} min apart — trust the fresher source, not the stale one.` };
  }
  // 9. Reliability gap → the weaker source is likely just wrong.
  if (Math.abs(a.reliability - b.reliability) >= 0.3) {
    const better = a.reliability > b.reliability ? "TRUST_SOURCE_A" : "TRUST_SOURCE_B";
    return { conflictClass: "BAD_SOURCE", verdict: better as ConflictVerdict, note: "A clear reliability gap — trust the more reliable source." };
  }
  // 10. Two comparably-reliable, fresh, same-definition sources still disagree → the disagreement is information.
  return { conflictClass: "TIMESTAMP_MISMATCH", verdict: "USE_AS_CONTRADICTION_SIGNAL", note: "Comparable sources disagree with no clear cause — preserve as a contradiction signal, do not average." };
}
