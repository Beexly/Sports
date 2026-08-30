/**
 * CONSTELLATION foundation — Proof-Carrying Action envelope.
 *
 * STATUS: LAB-ONLY / DORMANT. Pure library code. No production wiring, no
 * database calls, no side effects, no network I/O. Nothing in this module
 * is imported by any production route, worker, or cron job. It exists so a
 * later CONSTELLATION increment has a real, tested foundation type to build
 * an actual verifier/persistence layer against — this module is NOT that
 * verifier.
 *
 * WHAT THIS IS
 * ------------
 * `ProofCarryingAction<TAction>` wraps "an action plus the evidence that
 * justifies it" — generalizing a pattern that is already real in this repo:
 *   - `apps/web/lib/auth/actor-receipt.ts` — an immutable, append-only
 *     receipt persisted BEFORE the audit row it vouches for; the audit row
 *     stores only the receipt id, never re-derives the actor.
 *   - `apps/web/lib/opportunity-engine/credit-snapshot.ts` —
 *     `CreditGrantSnapshot.sourceReceiptId` / `sourceReceiptHash`: "no
 *     receipt, no snapshot" — a snapshot is only ever trusted alongside the
 *     receipt id and content hash that produced it.
 *   - `packages/ingestion-pipeline/src/settlement-decisions.ts` (branch
 *     `settlement/evidence-outbox`, PR #161) — append-only
 *     `SettlementDecisionEvent` rows, each carrying an `OwnerActorReceipt`
 *     (OWNER vs SYSTEM, never impersonated).
 *
 * This module does NOT redefine any of those record shapes. `EvidenceRef`
 * below is a thin, structurally-checkable POINTER at a real record — a
 * `kind` discriminant naming which existing module/table owns the record,
 * plus the id (and, where the source record itself carries one, the
 * receipt/hash) that a later verifier would use to look the real record up.
 * The pointer is deliberately NOT a copy of the record's full payload: a
 * proof-carrying envelope that duplicated evidence content would immediately
 * drift from the source of truth. It also does not import those modules'
 * runtime code — only `TrustedActor` (a pure type, `apps/web/lib/auth/
 * actor.ts`) and `FounderWorkAuthority` (a pure type, `apps/web/lib/
 * opportunity-engine/founder-command.ts`) are imported, both via
 * `import type`, so this file has zero runtime dependency on `@sports/db`,
 * `next-auth`, or anything else actor.ts pulls in for its real constructors.
 *
 * WHY NOT JUST REUSE ActorReceiptRecord AS "THE" EVIDENCE SHAPE
 * ---------------------------------------------------------------
 * A proof-carrying action typically cites MULTIPLE kinds of evidence (the
 * actor who requested it, a credit snapshot that funded it, an AI attempt
 * summary that executed it, ...). `EvidenceRef` is therefore a discriminated
 * union over the real evidence-bearing record kinds that already exist in
 * this repo, not a single record type.
 */

import type { TrustedActor } from "../auth/actor";
import type { FounderWorkAuthority } from "../opportunity-engine/founder-command";

// ─────────────────────────────────────────────────────────────────────────────
// Evidence references — pointers at real records, never fabricated payloads.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every evidence kind here names a record type that is REAL in this repo
 * today (see the file header for the exact source module of each). Adding a
 * new kind requires the corresponding record type to actually exist —
 * this union is not a place to speculate about future receipt types.
 */
export type EvidenceKind =
  /** `apps/web/lib/auth/actor-receipt.ts` — `ActorReceiptRecord`, persisted
   *  via `persistActorReceipt()`. `id` = the `actor_receipts` row id
   *  returned by that function. */
  | "ACTOR_RECEIPT"
  /** `apps/web/lib/opportunity-engine/credit-snapshot.ts` —
   *  `CreditGrantSnapshot`. `id` = `grantId`; `sourceReceiptId` /
   *  `sourceReceiptHash` mirror that interface's own "no receipt, no
   *  snapshot" fields. */
  | "CREDIT_GRANT_SNAPSHOT"
  /** `apps/web/lib/ai-control-plane/credit-port.ts` — `CreditReservation`.
   *  `id` = `creditReservationId`. */
  | "CREDIT_RESERVATION"
  /** `apps/web/lib/ai-control-plane/contracts.ts` — `AiAttemptSummary`,
   *  carried on `AiTaskResult.attempts`. `id` is the invocation id the
   *  attempt belongs to, scoped by `ordinal` (the attempt's position in
   *  that invocation's attempt list). */
  | "AI_ATTEMPT_SUMMARY"
  /** `apps/web/lib/opportunity-engine/founder-command.ts` —
   *  `FounderQueueDecision`. `id` = `FounderQueueDecision.id`. */
  | "FOUNDER_QUEUE_DECISION"
  /** `packages/ingestion-pipeline/src/settlement-decisions.ts` (branch
   *  `settlement/evidence-outbox`, PR #161) — append-only
   *  `SettlementDecisionEvent` row, carrying an `OwnerActorReceipt`. `id` =
   *  the event row id. Not yet merged into this branch's dependency graph,
   *  so this kind is a documented pointer only — no type import. */
  | "SETTLEMENT_DECISION_EVENT";

interface BaseEvidenceRef {
  readonly kind: EvidenceKind;
  /** The id of the real record this points at. Never empty. */
  readonly id: string;
  /** ISO-8601 instant the referenced fact was observed/recorded — mirrors
   *  the `observedAt` discipline already real in `actor.ts` /
   *  `credit-snapshot.ts`. Not a fabricated "now"; the value the referenced
   *  record itself claims. */
  readonly observedAtIso: string;
}

export interface ActorReceiptEvidenceRef extends BaseEvidenceRef {
  readonly kind: "ACTOR_RECEIPT";
}

export interface CreditGrantSnapshotEvidenceRef extends BaseEvidenceRef {
  readonly kind: "CREDIT_GRANT_SNAPSHOT";
  /** Mirrors `CreditGrantSnapshot.sourceReceiptId` — "no receipt, no
   *  snapshot" is enforced at the source; this ref just carries it through. */
  readonly sourceReceiptId: string;
  readonly sourceReceiptHash: string;
}

export interface CreditReservationEvidenceRef extends BaseEvidenceRef {
  readonly kind: "CREDIT_RESERVATION";
  /** Mirrors `CreditReservation.grantAllocationRef`. */
  readonly grantAllocationRef: string;
}

export interface AiAttemptSummaryEvidenceRef extends BaseEvidenceRef {
  readonly kind: "AI_ATTEMPT_SUMMARY";
  /** The attempt's position within the invocation's attempt list, mirroring
   *  `AiAttemptSummary.ordinal`. */
  readonly ordinal: number;
}

export interface FounderQueueDecisionEvidenceRef extends BaseEvidenceRef {
  readonly kind: "FOUNDER_QUEUE_DECISION";
  /** Mirrors `FounderQueueDecision.workItemId`. */
  readonly workItemId: string;
}

export interface SettlementDecisionEventEvidenceRef extends BaseEvidenceRef {
  readonly kind: "SETTLEMENT_DECISION_EVENT";
  /** Mirrors `SettlementDecisionTx`'s anomaly id the event was recorded
   *  against. */
  readonly anomalyId: string;
}

export type EvidenceRef =
  | ActorReceiptEvidenceRef
  | CreditGrantSnapshotEvidenceRef
  | CreditReservationEvidenceRef
  | AiAttemptSummaryEvidenceRef
  | FounderQueueDecisionEvidenceRef
  | SettlementDecisionEventEvidenceRef;

export const EVIDENCE_KINDS: readonly EvidenceKind[] = [
  "ACTOR_RECEIPT",
  "CREDIT_GRANT_SNAPSHOT",
  "CREDIT_RESERVATION",
  "AI_ATTEMPT_SUMMARY",
  "FOUNDER_QUEUE_DECISION",
  "SETTLEMENT_DECISION_EVENT",
];

// ─────────────────────────────────────────────────────────────────────────────
// The envelope
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verification lifecycle for one envelope. Purely a data state here — this
 * module ships no verifier; a later increment decides how UNVERIFIED moves
 * to VERIFIED (and against what store). `VERIFIED` is, however, given one
 * real teeth here: {@link validateProofCarryingAction} refuses to call an
 * envelope well-formed if it claims `VERIFIED` with zero evidence refs (see
 * that function's doc).
 */
export type VerificationStatus =
  | "UNVERIFIED"
  | "EVIDENCE_ATTACHED"
  | "VERIFIED"
  | "REJECTED";

export const VERIFICATION_STATUSES: readonly VerificationStatus[] = [
  "UNVERIFIED",
  "EVIDENCE_ATTACHED",
  "VERIFIED",
  "REJECTED",
];

/**
 * "An action plus the evidence that justifies it." Generic over the action
 * payload so callers can carry their own real domain action shapes (a
 * settlement decision, an AI dispatch request, a moderation action, ...)
 * without this module needing to know about them.
 *
 * `authority` reuses `FounderWorkAuthority` verbatim (`AGENT_INTERNAL |
 * OWNER_ONLY | AGENT_THEN_OWNER`, `apps/web/lib/opportunity-engine/
 * founder-command.ts`) rather than minting a parallel vocabulary — the same
 * "one vocabulary per concept" rule that module's own header cites.
 */
export interface ProofCarryingAction<TAction> {
  readonly actionId: string;
  readonly action: TAction;
  /** The real `TrustedActor` that authorized/requested this action — never
   *  a caller-supplied string, never re-derived; the caller must have
   *  already resolved it via `requireSessionActor` / `requireAdminActor` /
   *  `resolveServiceActor` (`apps/web/lib/auth/actor.ts`). */
  readonly actor: TrustedActor;
  readonly evidence: readonly EvidenceRef[];
  readonly authority: FounderWorkAuthority;
  readonly verificationStatus: VerificationStatus;
  readonly createdAtIso: string;
  /** Why this action exists and why it was classified the way it was —
   *  mirrors `FounderWorkItem.reasons`' "never a vague 'flagged for
   *  review'" discipline. Must be non-empty (enforced by the validator). */
  readonly reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure builder
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildProofCarryingActionParams<TAction> {
  readonly actionId: string;
  readonly action: TAction;
  readonly actor: TrustedActor;
  readonly evidence: readonly EvidenceRef[];
  readonly authority: FounderWorkAuthority;
  readonly reason: string;
  readonly createdAtIso: string;
  /** Defaults to "UNVERIFIED" — a builder never promotes itself to VERIFIED;
   *  that requires an actual verification step this module does not ship. */
  readonly verificationStatus?: VerificationStatus;
}

/**
 * Pure constructor. Does not validate — call {@link validateProofCarryingAction}
 * on the result if the caller needs a well-formedness guarantee before use.
 * Kept separate so callers that already trust their inputs (e.g. round-
 * tripping an already-validated envelope) do not pay a redundant validation
 * pass on every construction.
 */
export function buildProofCarryingAction<TAction>(
  params: BuildProofCarryingActionParams<TAction>,
): ProofCarryingAction<TAction> {
  return {
    actionId: params.actionId,
    action: params.action,
    actor: params.actor,
    evidence: params.evidence,
    authority: params.authority,
    verificationStatus: params.verificationStatus ?? "UNVERIFIED",
    createdAtIso: params.createdAtIso,
    reason: params.reason,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure validator
// ─────────────────────────────────────────────────────────────────────────────

export type ProofCarryingActionValidationIssue =
  | "ACTION_ID_EMPTY"
  | "ACTOR_MALFORMED"
  | "AUTHORITY_INVALID"
  | "VERIFICATION_STATUS_INVALID"
  | "CREATED_AT_INVALID"
  | "REASON_EMPTY"
  | "EVIDENCE_KIND_INVALID"
  | "EVIDENCE_ID_EMPTY"
  | "EVIDENCE_OBSERVED_AT_INVALID"
  | "EVIDENCE_FIELD_EMPTY"
  | "VERIFIED_WITHOUT_EVIDENCE";

export type ProofCarryingActionValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly issues: readonly ProofCarryingActionValidationIssue[] };

const ACTOR_TYPES: ReadonlySet<string> = new Set(["HUMAN", "SERVICE", "SYSTEM"]);
const AUTHORITIES: ReadonlySet<string> = new Set([
  "AGENT_INTERNAL",
  "OWNER_ONLY",
  "AGENT_THEN_OWNER",
] satisfies FounderWorkAuthority[]);
const EVIDENCE_KIND_SET: ReadonlySet<string> = new Set(EVIDENCE_KINDS);
const VERIFICATION_STATUS_SET: ReadonlySet<string> = new Set(VERIFICATION_STATUSES);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isValidIso(v: unknown): v is string {
  if (typeof v !== "string" || v.trim() === "") return false;
  const t = Date.parse(v);
  return Number.isFinite(t);
}

/**
 * Structural well-formedness check ONLY. This is a pure function: no
 * database, no network, no clock reads (it never compares against "now").
 * It does NOT confirm the referenced evidence records actually exist —
 * that requires a store and is explicitly out of scope for this lab
 * foundation layer (see file header).
 *
 * The one substantive (non-shape) rule enforced: an envelope claiming
 * `verificationStatus: "VERIFIED"` with zero evidence refs is rejected
 * (`VERIFIED_WITHOUT_EVIDENCE`) — "verified" against nothing is not a
 * meaningful claim.
 */
export function validateProofCarryingAction<TAction>(
  pca: ProofCarryingAction<TAction>,
): ProofCarryingActionValidationResult {
  const issues: ProofCarryingActionValidationIssue[] = [];

  if (!isNonEmptyString(pca.actionId)) issues.push("ACTION_ID_EMPTY");

  const actor = pca.actor as TrustedActor | null | undefined;
  if (
    !actor ||
    typeof actor !== "object" ||
    !ACTOR_TYPES.has(actor.actorType) ||
    !isNonEmptyString(actor.subjectId) ||
    !(actor.observedAt instanceof Date) ||
    Number.isNaN(actor.observedAt.getTime()) ||
    typeof actor.policyVersion !== "string" ||
    actor.policyVersion.trim() === ""
  ) {
    issues.push("ACTOR_MALFORMED");
  }

  if (!AUTHORITIES.has(pca.authority)) issues.push("AUTHORITY_INVALID");
  if (!VERIFICATION_STATUS_SET.has(pca.verificationStatus)) {
    issues.push("VERIFICATION_STATUS_INVALID");
  }
  if (!isValidIso(pca.createdAtIso)) issues.push("CREATED_AT_INVALID");
  if (!isNonEmptyString(pca.reason)) issues.push("REASON_EMPTY");

  if (!Array.isArray(pca.evidence)) {
    issues.push("EVIDENCE_KIND_INVALID");
  } else {
    for (const ev of pca.evidence) {
      if (!ev || typeof ev !== "object" || !EVIDENCE_KIND_SET.has(ev.kind)) {
        issues.push("EVIDENCE_KIND_INVALID");
        continue;
      }
      if (!isNonEmptyString(ev.id)) issues.push("EVIDENCE_ID_EMPTY");
      if (!isValidIso(ev.observedAtIso)) issues.push("EVIDENCE_OBSERVED_AT_INVALID");

      switch (ev.kind) {
        case "CREDIT_GRANT_SNAPSHOT":
          if (!isNonEmptyString(ev.sourceReceiptId) || !isNonEmptyString(ev.sourceReceiptHash)) {
            issues.push("EVIDENCE_FIELD_EMPTY");
          }
          break;
        case "CREDIT_RESERVATION":
          if (!isNonEmptyString(ev.grantAllocationRef)) issues.push("EVIDENCE_FIELD_EMPTY");
          break;
        case "AI_ATTEMPT_SUMMARY":
          if (typeof ev.ordinal !== "number" || !Number.isInteger(ev.ordinal) || ev.ordinal < 0) {
            issues.push("EVIDENCE_FIELD_EMPTY");
          }
          break;
        case "FOUNDER_QUEUE_DECISION":
          if (!isNonEmptyString(ev.workItemId)) issues.push("EVIDENCE_FIELD_EMPTY");
          break;
        case "SETTLEMENT_DECISION_EVENT":
          if (!isNonEmptyString(ev.anomalyId)) issues.push("EVIDENCE_FIELD_EMPTY");
          break;
        case "ACTOR_RECEIPT":
          break;
      }
    }
  }

  if (pca.verificationStatus === "VERIFIED" && pca.evidence.length === 0) {
    issues.push("VERIFIED_WITHOUT_EVIDENCE");
  }

  return issues.length === 0 ? { valid: true } : { valid: false, issues };
}
