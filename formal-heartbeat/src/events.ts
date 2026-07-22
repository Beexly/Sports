/**
 * ============================================================================
 * DORMANT / LAB-ONLY — Wave 3 batch (Decision-A-independent pieces).
 * NOT wired into production. Pure types only.
 * ============================================================================
 *
 * The REAL event/record shape this lab projects FROM.
 *
 * The canonical per-attempt record that the AI control plane already emits is
 * `AiAttemptSummary`, defined in
 *   apps/web/lib/ai-control-plane/contracts.ts   (branch feat/ai-control-plane-ledger)
 * and carried back on every `AiTaskResult.attempts` (same file). Its exact
 * fields as of that file are reproduced here (structurally identical) so this
 * lab package stays self-contained and dormant — it does NOT import across the
 * real-code worktree (which may not exist at review time) and it does NOT
 * modify any control-plane file. If the real interface drifts, this local
 * mirror is the single place to reconcile.
 *
 *   // contracts.ts, verbatim field set:
 *   export interface AiAttemptSummary {
 *     readonly ordinal: number;
 *     readonly providerRequested: ProviderRouteId;
 *     readonly providerUsed: ProviderRouteId | null;  // null until dispatched
 *     readonly modelRequested: string;
 *     readonly modelResolved: string | null;
 *     readonly status: "DISPATCHED" | "SUCCEEDED" | "FAILED" | "TIMEOUT" | "AMBIGUOUS";
 *     readonly errorCode?: string;
 *   }
 *
 * The credit-ledger side is projected from the reservation record shape in
 *   apps/web/lib/ai-control-plane/credit-admission.ts   (branch feat/ai-control-plane-credit-admission)
 *   export interface InMemoryCreditReservationRecord {
 *     ... state: "HELD" | "PROVISIONALLY_SETTLED" | "RECONCILED" | "RELEASED";
 *         heldMinorUnits: number; ...
 *   }
 * (plus the REFUSED outcome the port returns when authorize is denied).
 *
 * These are READ shapes only — nothing here is a production API.
 */

/** Mirror of contracts.ts AiAttemptSummary["status"]. */
export type ObservedAttemptStatus =
  | "DISPATCHED"
  | "SUCCEEDED"
  | "FAILED"
  | "TIMEOUT"
  | "AMBIGUOUS";

/**
 * Mirror of credit-admission.ts InMemoryCreditReservationState, plus the
 * REFUSED terminal the port surfaces when an authorize is denied for lack of
 * headroom (that outcome is not a stored record state but is observable from
 * the port's return value / decision log).
 */
export type ObservedReservationState =
  | "HELD"
  | "PROVISIONALLY_SETTLED"
  | "RECONCILED"
  | "RELEASED"
  | "REFUSED";

/** One observed AI-model-dispatch attempt (real AiAttemptSummary + its credit hold). */
export interface ObservedAttempt {
  /** Stable attempt id (control-store attemptId). */
  readonly attemptId: string;
  readonly ordinal: number;
  readonly providerRequested: string;
  /** null until transport actually dispatched (contracts.ts §B.2). */
  readonly providerUsed: string | null;
  readonly modelRequested: string;
  readonly modelResolved: string | null;
  readonly status: ObservedAttemptStatus;
  readonly errorCode?: string;

  // ---- credit-ledger side (credit-admission.ts reservation record) ----
  /** Reservation lifecycle for this attempt's credit hold; absent = never authorized. */
  readonly reservationState?: ObservedReservationState;
  /** The hold in integer minor units (heldMinorUnits). Absent = 0. */
  readonly heldMinorUnits?: number;
  /** Trusted-actor id that performed an ambiguous-hold release, if any. */
  readonly releasedByActor?: string;
}

/** One observed invocation (control-store claim record) with its attempts. */
export interface ObservedInvocation {
  readonly invocationId: string;
  /** requestFingerprint bound to this id (control-store). */
  readonly requestFingerprint: string;
  /** Current active claim owner (actorSubjectId / ownerToken), or null. */
  readonly owner: string | null;
  /** Fingerprints seen for this id that were rejected as conflicting (FINGERPRINT_CONFLICT). */
  readonly rejectedFingerprints?: readonly string[];
  readonly attempts: readonly ObservedAttempt[];
}

/**
 * A window of observed control-plane records to project into ONE composed
 * abstract snapshot, together with the budget-window constants in force.
 */
export interface ObservedWindow {
  readonly invocations: readonly ObservedInvocation[];
  /** VerifiedBalance for the window (minor units). */
  readonly verifiedBalanceMinorUnits: number;
  /** RequestCost per admitted dispatch (minor units). */
  readonly requestCostMinorUnits: number;
  /** Actors permitted to resolve an ambiguous exposure hold. */
  readonly trustedActors: readonly string[];
}
