/**
 * ============================================================================
 * DORMANT / LAB-ONLY — Wave 3 batch (Decision-A-independent pieces).
 * NOT wired into production. Pure types + a couple of pure helpers.
 * ============================================================================
 *
 * The abstract state shape that `formal/live-sports/LiveModelDispatchUnderAmbiguity.tla`
 * checks its invariants over. Field names and value domains correspond 1:1 to
 * that module's VARIABLES / CONSTANTS (composed from InvocationClaim.tla and
 * CreditReservation.tla). See the spec's VARIABLES block:
 *
 *   claimOwner, invocationFp, dispatched, attemptOf, attemptOutcome,
 *   invocationStatus, rejectedRequests,        (InvocationClaim)
 *   reserved, state, admittedCount,             (CreditReservation)
 *   releaseReason, releaseBy                     (the composed module's new vars)
 *
 * plus the CONSTANTS the invariants close over (VerifiedBalance, RequestCost,
 * TrustedActors). This is the projection TARGET type for projection.ts and the
 * input type the Formal Heartbeat re-checks invariants against.
 */

/** IC!NoOwner / IC!NoFp / IC!NoInv sentinels from InvocationClaim.tla. */
export const NO_OWNER = "NoOwner";
export const NO_FP = "NoFp";
export const NO_INV = "NoInv";

/** attemptOutcome domain (InvocationClaim.tla). */
export type AttemptOutcome = "Pending" | "Succeeded" | "Failed" | "Ambiguous";

/** invocationStatus domain (InvocationClaim.tla). */
export type InvocationStatus = "Open" | "Ambiguous" | "Terminal";

/** state domain (CreditReservation.tla). */
export type ReservationState =
  | "Unstarted"
  | "HELD"
  | "SETTLED"
  | "RELEASED"
  | "REFUSED";

/** releaseReason domain (LiveModelDispatchUnderAmbiguity.tla). */
export type ReleaseReason =
  | "NotReleased"
  | "CleanFailure"
  | "TrustedAmbiguousResolution";

/**
 * ==========================================================================
 * EXTENSION (Wave 3 batch1-ext): projected shapes for two additional
 * RUNTIME-ONLY heartbeat invariants. These are NOT variables of the
 * LiveModelDispatchUnderAmbiguity.tla spec (they are not TLC-checked); they
 * are projected observation streams the Formal Heartbeat re-checks at runtime,
 * grounded in real repo code (see events.ts citations).
 * ==========================================================================
 */

/** Projected authority/grant decision (from events.ts ObservedAuthorityDecision;
 *  founder-command.ts FounderQueueDecision + autonomy-ladder owner-only boundary). */
export type AuthorityDecisionKind =
  | "ACKNOWLEDGED"
  | "ASSIGNED_TO_AGENT"
  | "APPROVED"
  | "REJECTED"
  | "DEFERRED"
  | "DISMISSED"
  | "AUTONOMY_GRANT";

export interface AuthorityDecisionRecord {
  readonly decisionId: string;
  readonly workItemId: string;
  readonly decisionKind: AuthorityDecisionKind;
  /** Actor subjectId that approved/granted (FounderQueueActorReceipt.subjectId). */
  readonly approver: string;
  /** Identity the authority was conferred to. */
  readonly grantee: string;
  readonly approverActorType: "OWNER" | "SYSTEM";
  /** Owner-only action kind authorized, or null. */
  readonly actionKind: string | null;
}

/** Projected settlement-outbox delivery status (from events.ts
 *  ObservedDeliveryStatus; settlement-outbox worker.ts state machine). */
export type DeliveryStatus =
  | "PENDING"
  | "CLAIMED"
  | "RETRYABLE_FAILED"
  | "DELIVERED"
  | "SUPPRESSED"
  | "NO_RECIPIENT"
  | "PERMANENT_FAILED"
  | "DEAD_LETTER";

export interface DeliveryObservationRecord {
  readonly deliveryId: string;
  readonly status: DeliveryStatus;
  readonly sequence: number;
}

/**
 * One projected abstract state == one observed composed snapshot of the AI
 * control plane, expressed in the spec's variables. Records are keyed by the
 * (symbolic) invocation / attempt / actor identifiers.
 */
export interface AbstractState {
  // ---- InvocationClaim variables ----
  /** [Invocations -> Actors \cup {NoOwner}] */
  readonly claimOwner: Readonly<Record<string, string>>;
  /** [Invocations -> Fingerprints \cup {NoFp}] */
  readonly invocationFp: Readonly<Record<string, string>>;
  /** [Attempts -> BOOLEAN] */
  readonly dispatched: Readonly<Record<string, boolean>>;
  /** [Attempts -> Invocations \cup {NoInv}] */
  readonly attemptOf: Readonly<Record<string, string>>;
  /** [Attempts -> AttemptOutcome] */
  readonly attemptOutcome: Readonly<Record<string, AttemptOutcome>>;
  /** [Invocations -> InvocationStatus] */
  readonly invocationStatus: Readonly<Record<string, InvocationStatus>>;
  /** subset of <<Invocation, Fingerprint>> pairs that were rejected. */
  readonly rejectedRequests: readonly (readonly [string, string])[];

  // ---- CreditReservation variables ----
  /** Nat: sum of currently HELD + SETTLED reservation amounts. */
  readonly reserved: number;
  /** [Attempts -> ReservationState] */
  readonly state: Readonly<Record<string, ReservationState>>;
  /** Nat: count of attempts ever admitted (HELD or later, not REFUSED). */
  readonly admittedCount: number;

  // ---- composed-module new variables ----
  /** [Attempts -> ReleaseReason] */
  readonly releaseReason: Readonly<Record<string, ReleaseReason>>;
  /** [Attempts -> Actors \cup {NoOwner}] */
  readonly releaseBy: Readonly<Record<string, string>>;

  // ---- CONSTANTS the invariants close over ----
  /** VerifiedBalance: the budget window's verified spendable cap. */
  readonly verifiedBalance: number;
  /** RequestCost: cost of a single admitted dispatch against the cap. */
  readonly requestCost: number;
  /** TrustedActors: subset of actors permitted to resolve an ambiguous hold. */
  readonly trustedActors: readonly string[];
  /** Universe of invocation ids present in this snapshot (spec CONSTANT Invocations). */
  readonly invocations: readonly string[];
  /** Universe of attempt ids present in this snapshot (spec CONSTANT Attempts). */
  readonly attempts: readonly string[];
  /** Universe of fingerprints present (spec CONSTANT Fingerprints). */
  readonly fingerprints: readonly string[];
  /** Universe of actors present (spec CONSTANT Actors). */
  readonly actors: readonly string[];

  // ---- EXTENSION: runtime-only observation streams (not spec variables) ----
  /** Observed authority/grant decisions (NoSelfApproval). Empty when none. */
  readonly authorityDecisions: readonly AuthorityDecisionRecord[];
  /** Observed settlement-outbox delivery states
   *  (OutboxDeliveryFailureCannotBecomeDelivered). Empty when none. */
  readonly deliveryObservations: readonly DeliveryObservationRecord[];
}
