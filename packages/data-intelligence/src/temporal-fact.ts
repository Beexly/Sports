/**
 * DATA INTELLIGENCE MESH — Temporal Fact Graph.
 *
 * GSE's proof spine depends on WHEN something was knowable, not merely whether it is true. Every
 * derived fact is time-locked: when it was observed, when it became valid, when GSE first saw it,
 * which source/endpoint produced it, a payload hash, and its rights status. Point-in-time queries
 * fail closed — a fact GSE could not have seen at decision time can never earn decision credit.
 * Pure + deterministic (Date.parse of provided ISO strings only).
 */

import type { FactType } from "./fact-type.js";
import type { EntityRef } from "./entity-spine.js";
import type { LegalVerdict } from "./source-genome.js";

export interface TemporalFact<T = unknown> {
  readonly factId: string;
  readonly entityIds: readonly EntityRef[];
  readonly factType: FactType;
  readonly value: T;
  readonly sourceId: string;
  readonly endpointId: string;
  readonly observedAt: string;       // when reality changed / the fact was observed (ISO)
  readonly validFrom?: string;
  readonly validTo?: string;
  readonly fetchedAt: string;        // when GSE fetched it (ISO)
  readonly firstSeenByGseAt: string; // when GSE first could have known it (ISO)
  readonly sourcePayloadHash: string;
  readonly confidence: number;       // 0..1
  readonly rightsStatus: LegalVerdict;
  readonly attribution?: string;
}

const ms = (iso: string): number => Date.parse(iso);

export type KnowabilityVerdict = "KNOWABLE" | "NOT_YET_KNOWABLE" | "RIGHTS_BLOCKED" | "SOURCE_UNCLEAR";

export interface KnowabilityResult {
  readonly verdict: KnowabilityVerdict;
  readonly creditable: boolean;
  readonly reason: string;
}

/**
 * Could GSE have known this fact at a decision time, and may it be used? Fails closed: unparseable
 * timestamps or a future first-seen time are NOT creditable; rights-blocked facts are never used.
 */
export function knowableAt(fact: TemporalFact, decisionTimeIso: string): KnowabilityResult {
  const decision = ms(decisionTimeIso);
  const firstSeen = ms(fact.firstSeenByGseAt);
  if (!Number.isFinite(decision) || !Number.isFinite(firstSeen)) {
    return { verdict: "SOURCE_UNCLEAR", creditable: false, reason: "Unparseable decision/first-seen timestamp — cannot certify knowability; fail closed." };
  }
  if (fact.rightsStatus === "DO_NOT_USE" || fact.rightsStatus === "RIGHTS_REVIEW") {
    return { verdict: "RIGHTS_BLOCKED", creditable: false, reason: `Rights status ${fact.rightsStatus} — fact cannot be used for a decision.` };
  }
  if (firstSeen > decision) {
    return { verdict: "NOT_YET_KNOWABLE", creditable: false, reason: `First knowable at ${fact.firstSeenByGseAt}, after the decision at ${decisionTimeIso} — future leakage; no decision credit.` };
  }
  return { verdict: "KNOWABLE", creditable: true, reason: "Knowable before the decision and rights-cleared — creditable." };
}

/** Filter a fact set to only those creditable at a decision time (point-in-time safe). */
export function pointInTimeFacts(facts: readonly TemporalFact[], decisionTimeIso: string): TemporalFact[] {
  return facts.filter((f) => knowableAt(f, decisionTimeIso).creditable);
}
