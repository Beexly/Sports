/**
 * DECISION FIELD RUNTIME — Decision Card (the output contract).
 *
 * A card is a proof contract, not a UI object. Its public face answers five things — what changed,
 * what it means, what to do, WHY NOT (the trust trigger), where's the receipt — and it never claims
 * more than `maxPermittedStrength`. The proof drawer makes "Why not" and the Source Race first-class.
 * The autopsy hook is a DEFERRED record: it carries what's needed to grade the decision later,
 * process-over-outcome, without moving any weight automatically. Pure types + a small builder.
 */

import type { CardClaim } from "./card-claim.js";
import type { CardProsecutionTrace } from "./card-prosecution-trace.js";
import type { DecisionState, MaxPermittedStrength } from "./decision-state-stat-contract.js";

export type LightConeStatus = "INSIDE" | "OUTSIDE" | "PARTIAL" | "BLOCKED";
export type EvidenceClass = "DIRECT" | "INFERRED" | "CONFLICTED" | "INSUFFICIENT";
export type ConfidenceLabel = "CLEAN" | "MIXED" | "THIN" | "BLOCKED";
export type RouteTo = "TODAY" | "EDGE" | "GAMEPLAN" | "PROOF" | "ADMIN_ONLY";

/** A deferred, process-over-outcome grading hook attached at emission, settled after the result. */
export interface AutopsyHook {
  readonly hookId: string;
  readonly cardId: string;
  readonly subject: string;
  readonly decisionState: DecisionState;
  readonly maxPermittedStrength: MaxPermittedStrength;
  readonly candidateShape: { readonly marketFamily: string; readonly structure: string; readonly regime?: string };
  readonly decisionTime: string;
  readonly settled: false;
  readonly note: string;
}

export interface ProofDrawer {
  readonly whatChanged: string;
  readonly whatTheMarketDid: string;
  readonly whatFantasyDid: string;
  readonly whatTheCrowdDid: string;
  readonly whyNot: string;
  readonly redFlags: readonly string[];
  readonly dataUsed: readonly string[];
  readonly sourceRaceSummary: string;
  readonly requiredStatStatus: string;
  readonly whatWouldChangeOurMind: string;
  readonly receiptRefs: readonly string[];
  readonly rightsStatus: string;
  readonly lightConeStatus: LightConeStatus;
}

export interface DecisionCard {
  readonly id: string;
  readonly title: string;
  readonly subject: string;
  readonly context: string;

  readonly decisionState: DecisionState;
  // The five-part public face.
  readonly whatChanged: string;
  readonly whatItMeans: string;
  readonly whatToDo: string;
  readonly whyNot: string;
  readonly receiptRef: string;

  readonly maxPermittedStrength: MaxPermittedStrength;
  readonly publicSafe: boolean;
  readonly personalizationRequired: boolean;

  readonly confidenceLabel: ConfidenceLabel;
  readonly evidenceClass: EvidenceClass;
  readonly lightConeStatus: LightConeStatus;
  readonly routeTo: RouteTo;

  readonly decisionTime: string;
  readonly lockTime?: string;

  readonly sourceCount: number;
  readonly ghostSimilarity: number;
  readonly noticeabilityIndex: number;
  readonly cognitiveLoadScore: number;
  readonly regimeTag: string;

  readonly claims: readonly CardClaim[];
  readonly prosecution: CardProsecutionTrace;
  readonly proofDrawer: ProofDrawer;
  readonly autopsyHook: AutopsyHook;

  readonly updatedAt: string;
}

/** A card that was considered but not emitted (or emitted only as INFO_ONLY). */
export interface SuppressedDecision {
  readonly entityId: string;
  readonly decisionState: DecisionState;
  readonly reason: string;
  readonly maxPermittedStrength: MaxPermittedStrength;
}
