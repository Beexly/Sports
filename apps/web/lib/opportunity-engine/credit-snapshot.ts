/**
 * NOVA credit-grant SNAPSHOT contract — S1 (directive §11.2).
 *
 * The rich, receipted read model of one awarded credit grant. NOVA-side
 * reconcilers/attestation WRITE snapshots; the AI control plane's PR-D
 * admission layer READS them through the S1 index and composes the pure
 * validators below into its fail-closed `CreditAuthorizationPort` (directive
 * §11.3). S5 owns table materialization — this module is pure TypeScript
 * with zero persistence and zero clock reads (every time comparison takes the
 * evaluation instant as a parameter).
 *
 * Governing rules (directive §11.2), all fail-closed:
 *   - "No receipt, no snapshot."      -> `validateCreditGrantSnapshot`
 *   - "No covering scope, no admission." -> `creditScopeCovers`
 *   - Expiry/freshness checks         -> `isCreditGrantSnapshotExpired`,
 *                                        `isCreditGrantSnapshotFresh`
 *   - Composed, reason-coded          -> `evaluateCreditSnapshotAdmissibility`
 *
 * Amount fields are integer MINOR units of `currency` (e.g. cents for USD) so
 * arithmetic stays exact; `remainingMinorUnits` INCLUDES the reserved amount
 * (spendable = remaining - reserved). Timestamps are ISO-8601 strings, like
 * every other S1 contract.
 */

import type { CreditGrantState } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Contract types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * What happens at the provider when usage exceeds the credit balance —
 * required knowledge before any admission decision can bound cash exposure.
 * `unknown` is representable (it is an honest observation) but PR-D treats it
 * as fail-closed input.
 */
export type CreditCashOverageBehavior =
  | "blocks_usage_at_zero"
  | "converts_to_paid_usage"
  | "requires_prepaid_topup"
  | "unknown";

/**
 * Reconciliation posture of the snapshot against the provider's own records.
 * `failed_closed` mirrors the S3 receipt vocabulary: a reconciliation run
 * that could not prove anything records exactly that.
 */
export type CreditSnapshotReconciliationState =
  | "unreconciled"
  | "reconciled"
  | "drifted"
  | "failed_closed";

/**
 * Rich credit-grant snapshot (directive §11.2 field list, complete).
 * Immutable observation: `observedAt` is when the provider-side fact was
 * seen, `recordedAt` when NOVA persisted it, and the snapshot stays
 * admissible only within `freshnessHorizonMs` of `observedAt`.
 *
 * SOLE CANONICAL SNAPSHOT CONTRACT. This interface — exported, with its
 * validators, through the S1 barrel (`lib/opportunity-engine/index.ts`) — is
 * the ONE definition of a credit-grant snapshot. Known consumer:
 * `feat/ai-control-plane-credit-admission` (PR-D), which must IMPORT this
 * type and its validators from the S1 index and must never redefine,
 * re-declare, or structurally clone them. S3's evidence/reconciler
 * implementation writes snapshots that must validate against the shared
 * conformance fixtures in
 * `fixtures/credit-grant-snapshot.conformance.json`.
 */
export interface CreditGrantSnapshot {
  /** Credit program the grant came from (e.g. "gcp-startup-credits"). */
  readonly programId: string;
  /** Application that produced the grant. */
  readonly applicationId: string;
  /** The awarded grant itself. */
  readonly grantId: string;
  /** Provider operating the program (e.g. "google_cloud"). */
  readonly provider: string;
  /** Billing account the grant is attached to. */
  readonly billingAccountId: string;
  /** Optional narrower billing project/scope within the account. */
  readonly billingProjectId: string | null;
  /** Uppercase ISO-4217 code for every amount field (e.g. "USD"). */
  readonly currency: string;
  /** Original award, integer minor units of `currency`. */
  readonly originalAwardMinorUnits: number;
  /** Unconsumed amount, integer minor units. INCLUDES `reservedMinorUnits`. */
  readonly remainingMinorUnits: number;
  /** Currently reserved (earmarked, unsettled) amount, integer minor units. */
  readonly reservedMinorUnits: number;
  /** NOVA's `CreditGrantState` — imported, never redefined (freeze §5.2). */
  readonly grantState: CreditGrantState;
  /** Effective/activation instant (ISO-8601); null before activation. */
  readonly activatedAt: string | null;
  /** Expiration instant (ISO-8601); null = no expiry OBSERVED (admission fails closed on unknown expiry). */
  readonly expiresAt: string | null;
  /** Products/services the credits apply to. Empty = scope unknown = covers nothing; "*" = attested unrestricted. */
  readonly eligibleProducts: readonly string[];
  /** Models the credits apply to; same empty/wildcard semantics. */
  readonly eligibleModels: readonly string[];
  /** Regions the credits apply to; same empty/wildcard semantics. */
  readonly eligibleRegions: readonly string[];
  /** Explicitly excluded products/models/regions — an exclusion beats any wildcard. */
  readonly exclusions: readonly string[];
  /** Provider behavior once the balance is exceeded. */
  readonly cashOverageBehavior: CreditCashOverageBehavior;
  /** When the provider-side fact was observed (ISO-8601). */
  readonly observedAt: string;
  /** When NOVA recorded the observation (ISO-8601); never before `observedAt`. */
  readonly recordedAt: string;
  /** How long past `observedAt` the snapshot may still admit, in ms (> 0). */
  readonly freshnessHorizonMs: number;
  /** Source receipt id — "no receipt, no snapshot". */
  readonly sourceReceiptId: string;
  /** Content hash of the source receipt payload. */
  readonly sourceReceiptHash: string;
  /** Reconciliation posture against provider records. */
  readonly reconciliationState: CreditSnapshotReconciliationState;
  /** Actor/system attesting the observation (e.g. "nova-reconciler@1"). */
  readonly attestedBy: string;
  /** Snapshot schema version (this contract's shape). */
  readonly schemaVersion: string;
  /** Policy version the snapshot was recorded under. */
  readonly policyVersion: string;
}

/** Scope one admission request asks a grant to cover. */
export interface CreditScopeRequest {
  /** Product/service being charged (required — an unscoped request never covers). */
  readonly product: string;
  /** Model, when the charge is model-scoped; null = dimension not applicable. */
  readonly model: string | null;
  /** Region, when the charge is region-scoped; null = dimension not applicable. */
  readonly region: string | null;
}

/** Explicitly attested "unrestricted" marker for an eligibility dimension. */
export const CREDIT_SCOPE_WILDCARD = "*";

/** Stable machine-readable invariant-violation codes. */
export type CreditSnapshotViolation =
  | "missing_program_id"
  | "missing_application_id"
  | "missing_grant_id"
  | "missing_provider"
  | "missing_billing_account"
  | "invalid_currency"
  | "invalid_original_award"
  | "invalid_remaining"
  | "invalid_reserved"
  | "reserved_exceeds_remaining"
  | "remaining_exceeds_original"
  | "exhausted_with_remaining"
  | "missing_activation_for_state"
  | "invalid_activated_at"
  | "invalid_expires_at"
  | "invalid_observed_at"
  | "invalid_recorded_at"
  | "recorded_before_observed"
  | "non_positive_freshness_horizon"
  | "missing_source_receipt"
  | "missing_attestor"
  | "missing_schema_version"
  | "missing_policy_version";

export interface CreditSnapshotValidationResult {
  readonly valid: boolean;
  /** All violations found, in a deterministic field order; empty when valid. */
  readonly violations: readonly CreditSnapshotViolation[];
}

/** Reason codes for a fail-closed non-admissibility verdict. */
export type CreditAdmissibilityReason =
  | "snapshot_invalid"
  | "grant_state_not_consumable"
  | "grant_expiry_unknown"
  | "grant_expired"
  | "snapshot_stale"
  | "scope_not_covered"
  | "reconciliation_drifted"
  | "reconciliation_failed_closed"
  | "no_spendable_balance";

export interface CreditSnapshotAdmissibility {
  readonly admissible: boolean;
  /** All refusal reasons, in a deterministic check order; empty when admissible. */
  readonly reasons: readonly CreditAdmissibilityReason[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers (pure)
// ─────────────────────────────────────────────────────────────────────────────

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

/** Parses an ISO-8601 timestamp; null when unparsable (callers fail closed). */
function parseIsoMs(value: string): number | null {
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function isValidMinorUnitAmount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

/** Grant states whose semantics require an activation instant on record. */
const STATES_REQUIRING_ACTIVATION: ReadonlySet<CreditGrantState> = new Set([
  "activated",
  "partially_consumed",
  "exhausted",
]);

/** The only grant states that can ever admit spend (freeze §3.1/§5.2). */
const CONSUMABLE_GRANT_STATES: ReadonlySet<CreditGrantState> = new Set([
  "activated",
  "partially_consumed",
]);

function dimensionCovers(eligible: readonly string[], value: string): boolean {
  return eligible.includes(CREDIT_SCOPE_WILDCARD) || eligible.includes(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// Invariant validators (directive §11.2) — all pure
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Structural invariant validation. "No receipt, no snapshot": a blank
 * `sourceReceiptId` OR `sourceReceiptHash` makes the snapshot invalid, full
 * stop. Amount invariants: each amount is a non-negative safe integer and
 * `reserved <= remaining <= original`; an `exhausted` grant must show zero
 * remaining and zero reserved. Time invariants: `observedAt`/`recordedAt`
 * parse and `recordedAt >= observedAt`; a consuming state requires a
 * non-null, parsable `activatedAt`. Violations are collected exhaustively
 * (not short-circuited) in a deterministic order.
 */
export function validateCreditGrantSnapshot(
  snapshot: CreditGrantSnapshot,
): CreditSnapshotValidationResult {
  const violations: CreditSnapshotViolation[] = [];

  if (isBlank(snapshot.programId)) violations.push("missing_program_id");
  if (isBlank(snapshot.applicationId)) violations.push("missing_application_id");
  if (isBlank(snapshot.grantId)) violations.push("missing_grant_id");
  if (isBlank(snapshot.provider)) violations.push("missing_provider");
  if (isBlank(snapshot.billingAccountId)) violations.push("missing_billing_account");
  if (!CURRENCY_PATTERN.test(snapshot.currency)) violations.push("invalid_currency");

  const originalValid = isValidMinorUnitAmount(snapshot.originalAwardMinorUnits);
  const remainingValid = isValidMinorUnitAmount(snapshot.remainingMinorUnits);
  const reservedValid = isValidMinorUnitAmount(snapshot.reservedMinorUnits);
  if (!originalValid) violations.push("invalid_original_award");
  if (!remainingValid) violations.push("invalid_remaining");
  if (!reservedValid) violations.push("invalid_reserved");
  if (remainingValid && reservedValid && snapshot.reservedMinorUnits > snapshot.remainingMinorUnits) {
    violations.push("reserved_exceeds_remaining");
  }
  if (originalValid && remainingValid && snapshot.remainingMinorUnits > snapshot.originalAwardMinorUnits) {
    violations.push("remaining_exceeds_original");
  }
  if (
    snapshot.grantState === "exhausted" &&
    remainingValid &&
    reservedValid &&
    (snapshot.remainingMinorUnits > 0 || snapshot.reservedMinorUnits > 0)
  ) {
    violations.push("exhausted_with_remaining");
  }

  if (STATES_REQUIRING_ACTIVATION.has(snapshot.grantState) && snapshot.activatedAt === null) {
    violations.push("missing_activation_for_state");
  }
  if (snapshot.activatedAt !== null && parseIsoMs(snapshot.activatedAt) === null) {
    violations.push("invalid_activated_at");
  }
  if (snapshot.expiresAt !== null && parseIsoMs(snapshot.expiresAt) === null) {
    violations.push("invalid_expires_at");
  }

  const observedMs = parseIsoMs(snapshot.observedAt);
  const recordedMs = parseIsoMs(snapshot.recordedAt);
  if (observedMs === null) violations.push("invalid_observed_at");
  if (recordedMs === null) violations.push("invalid_recorded_at");
  if (observedMs !== null && recordedMs !== null && recordedMs < observedMs) {
    violations.push("recorded_before_observed");
  }

  if (!Number.isSafeInteger(snapshot.freshnessHorizonMs) || snapshot.freshnessHorizonMs <= 0) {
    violations.push("non_positive_freshness_horizon");
  }

  if (isBlank(snapshot.sourceReceiptId) || isBlank(snapshot.sourceReceiptHash)) {
    violations.push("missing_source_receipt");
  }
  if (isBlank(snapshot.attestedBy)) violations.push("missing_attestor");
  if (isBlank(snapshot.schemaVersion)) violations.push("missing_schema_version");
  if (isBlank(snapshot.policyVersion)) violations.push("missing_policy_version");

  return { valid: violations.length === 0, violations };
}

/**
 * Freshness check, fail-closed. Fresh iff every timestamp parses, the
 * horizon is a positive safe integer, and
 * `0 <= evaluationAt - observedAt <= freshnessHorizonMs`. An evaluation
 * instant BEFORE `observedAt` is a clock inconsistency and reads as stale.
 * Pure: the evaluation instant is a parameter, never a clock read.
 */
export function isCreditGrantSnapshotFresh(
  snapshot: CreditGrantSnapshot,
  evaluationAtIso: string,
): boolean {
  if (!Number.isSafeInteger(snapshot.freshnessHorizonMs) || snapshot.freshnessHorizonMs <= 0) {
    return false;
  }
  const observedMs = parseIsoMs(snapshot.observedAt);
  const evaluationMs = parseIsoMs(evaluationAtIso);
  if (observedMs === null || evaluationMs === null) return false;
  const elapsedMs = evaluationMs - observedMs;
  return elapsedMs >= 0 && elapsedMs <= snapshot.freshnessHorizonMs;
}

/**
 * Expiry check, fail-closed on ambiguity: an unparsable `expiresAt` or
 * evaluation instant reads as EXPIRED. A null `expiresAt` reads as NOT
 * known-expired here — the admissibility evaluator separately fails closed on
 * unknown expiry (`grant_expiry_unknown`), keeping "not known to be expired"
 * and "safe to admit" distinct facts.
 */
export function isCreditGrantSnapshotExpired(
  snapshot: CreditGrantSnapshot,
  evaluationAtIso: string,
): boolean {
  if (snapshot.expiresAt === null) return false;
  const expiresMs = parseIsoMs(snapshot.expiresAt);
  const evaluationMs = parseIsoMs(evaluationAtIso);
  if (expiresMs === null || evaluationMs === null) return true;
  return evaluationMs >= expiresMs;
}

/**
 * "No covering scope, no admission." Every requested dimension must be
 * POSITIVELY covered: an empty eligibility list means the scope was never
 * observed and covers NOTHING (fail closed); the explicit
 * `CREDIT_SCOPE_WILDCARD` entry ("*") is the only way to attest an
 * unrestricted dimension; an entry in `exclusions` beats any wildcard.
 * A null `model`/`region` means the request has no such dimension, so that
 * dimension is not checked. Matching is exact and case-sensitive —
 * normalization is the writer's job, and a sloppy writer must lose coverage,
 * never gain it.
 */
export function creditScopeCovers(
  snapshot: CreditGrantSnapshot,
  request: CreditScopeRequest,
): boolean {
  if (isBlank(request.product)) return false;
  if (snapshot.exclusions.includes(request.product)) return false;
  if (!dimensionCovers(snapshot.eligibleProducts, request.product)) return false;

  if (request.model !== null) {
    if (snapshot.exclusions.includes(request.model)) return false;
    if (!dimensionCovers(snapshot.eligibleModels, request.model)) return false;
  }

  if (request.region !== null) {
    if (snapshot.exclusions.includes(request.region)) return false;
    if (!dimensionCovers(snapshot.eligibleRegions, request.region)) return false;
  }

  return true;
}

/**
 * Composed, reason-coded admissibility of ONE snapshot for ONE scope request
 * at ONE evaluation instant. Fail-closed and exhaustive: every failing check
 * contributes its reason (deterministic order below); `admissible` is true
 * only when NO reason fires.
 *
 * Check order: structural validity -> consumable grant state
 * (`activated`/`partially_consumed` only) -> expiry (unknown expiry fails
 * closed as `grant_expiry_unknown`) -> freshness -> scope coverage ->
 * reconciliation posture (`drifted` and `failed_closed` refuse;
 * `unreconciled` is admissible — a first receipted observation must be able
 * to bootstrap) -> spendable balance (`remaining - reserved > 0`).
 *
 * AMOUNT sufficiency versus a specific charge estimate is deliberately NOT
 * decided here — that is PR-D's `CreditAuthorizationPort` (directive §11.3),
 * which composes this primitive with reservation semantics.
 */
export function evaluateCreditSnapshotAdmissibility(
  snapshot: CreditGrantSnapshot,
  request: CreditScopeRequest,
  evaluationAtIso: string,
): CreditSnapshotAdmissibility {
  const reasons: CreditAdmissibilityReason[] = [];

  const validation = validateCreditGrantSnapshot(snapshot);
  if (!validation.valid) reasons.push("snapshot_invalid");

  if (!CONSUMABLE_GRANT_STATES.has(snapshot.grantState)) {
    reasons.push("grant_state_not_consumable");
  }

  if (snapshot.expiresAt === null) {
    reasons.push("grant_expiry_unknown");
  } else if (isCreditGrantSnapshotExpired(snapshot, evaluationAtIso)) {
    reasons.push("grant_expired");
  }

  if (!isCreditGrantSnapshotFresh(snapshot, evaluationAtIso)) {
    reasons.push("snapshot_stale");
  }

  if (!creditScopeCovers(snapshot, request)) {
    reasons.push("scope_not_covered");
  }

  if (snapshot.reconciliationState === "drifted") {
    reasons.push("reconciliation_drifted");
  } else if (snapshot.reconciliationState === "failed_closed") {
    reasons.push("reconciliation_failed_closed");
  }

  const spendableMinorUnits = snapshot.remainingMinorUnits - snapshot.reservedMinorUnits;
  if (!Number.isSafeInteger(spendableMinorUnits) || spendableMinorUnits <= 0) {
    reasons.push("no_spendable_balance");
  }

  return { admissible: reasons.length === 0, reasons };
}
