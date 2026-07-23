/**
 * ██ INTERNAL / TEST-ONLY MODULE — NOT PART OF THE PUBLIC SURFACE ██
 *
 * (Directive §8.2.) This module is the ONLY sanctioned path to the
 * dependency-injected executor factory and the env-taking resolver functions.
 * `index.ts` (the public surface) deliberately does NOT re-export anything
 * here: production code importing from `@/lib/ai-control-plane` has no way to
 * hand the executor an alternate env, dispatch function, store, budget
 * window, or pricing registry.
 *
 * Allowed importers:
 *   - tests (apps/web/__tests__/**) — to drive the executor with fake
 *     clocks, fake dispatch, fixture policy sources, and in-memory receipt
 *     stores;
 *   - future control-plane-internal modules within this directory.
 *
 * This boundary is MACHINE-ENFORCED (§8.2 "guard the production export
 * surface"): `scripts/guardrails/ai-control-plane-sealing.mjs` (run as
 * `npm run guard:ai-control-plane-sealing`, part of `npm run guardrails`)
 * fails the build when any module outside apps/web/__tests__/** or this
 * directory imports this file — or deep-imports ./executor, ./cost-mode, or
 * ./emergency. Any such production import is an authority bypass.
 */

export {
  createAiExecutor,
  type AiExecutor,
  type AiPolicySource,
  type SealedAiExecutorDependencies,
  type AiDispatchFn,
  type AiDispatchPlan,
  type AiDispatchOutcome,
} from "./executor";

// Env-taking, deterministic resolver functions (test/tooling use). These were
// public in PR-A; they moved here because exporting them publicly would let
// production code resolve authority against a synthetic env (§8.2).
export {
  resolveEnvClass,
  resolveCostMode,
  effectiveMode,
} from "./cost-mode";
export type { ResolveCostModeInput, ResolvedEnvClass } from "./cost-mode";

// Receipt-store seam for tests (in-memory stores) and the future durable
// store implementation.
export { failClosedReceiptStore, verifyEmergencyOverride } from "./emergency";

// §9 invocation pipeline internals: the authoritative claim store, the
// non-blocking observability sink + recovery queue, the exact per-provider
// dispatch adapters, and the ledgered dispatch factory. Production reaches
// all of this ONLY through the sealed singleton in executor.ts.
export {
  createPgControlStore,
  prismaSqlClient,
  type AuthoritativeControlStore,
  type ControlSqlClient,
  type ClaimInvocationInput,
  type ClaimOutcome,
  type StartAttemptInput,
  type AttemptFailureInput,
  type AttributionCreateInput,
  type FinalizeSuccessInput,
  type FinalizeFailureInput,
  type BlockedInvocationInput,
} from "./control-store";
// Track A (exactly-once runtime handoff 2026-07-22): the idempotent
// event-ledger read helpers. The write side is inline in control-store.ts's
// finalizeSuccess/finalizeFailure/recordAttemptFailure — see event-ledger.ts's
// own doc comment for why it is not duplicated here.
export {
  deriveControlEventId,
  alreadyProcessed,
  markProcessed,
  claimForProcessing,
  readRecentEvents,
  type ControlEventRow,
  type MarkProcessedResult,
  type ClaimForProcessingResult,
} from "./event-ledger";
// Versioned envelope (exactly-once runtime handoff 2026-07-22, on top of
// Track A + Track B): durable FormalIncident row-store writers + the
// human-activated SrqcVersion register. Incident writes reuse Track B's
// existing processed_event exactly-once gate (see formal-incident.ts and
// formal-receipt-job.ts) — detection-only, no ENFORCE path.
export {
  recordFormalIncident,
  getActiveSrqcVersion,
  recordSrqcVersionCandidate,
  activateSrqcVersion,
  type FormalIncidentKind,
  type RecordFormalIncidentInput,
  type ActiveSrqcVersion,
  type RecordSrqcVersionCandidateInput,
} from "./formal-incident";
export {
  ObservabilitySink,
  claimRecoveryBatch,
  markRecoveryDelivered,
  abandonExhaustedRecovery,
  type RecoveryEnqueueInput,
  type RecoveryKind,
  type RecoveryQueueRow,
} from "./observability";
export {
  drainAiTelemetryRecovery,
  type DrainOptions,
  type DrainSummary,
} from "./recovery-drainer";
export {
  dispatchAnthropicDirect,
  dispatchBedrock,
  dispatchVertex,
  dispatchCerebras,
  dispatchLocal,
  createProviderDispatchers,
  type ProviderDispatchFn,
  type ProviderDispatchPayload,
  type ProviderDispatchOutcome,
} from "./dispatch";
export {
  createLedgeredDispatch,
  computeRequestFingerprint,
  canonicalJson,
  sha256Hex,
  deriveProviderPayload,
  type LedgeredDispatchDeps,
  type TaskPromptInput,
} from "./invocation-pipeline";
export type {
  BlockedDecisionRecord,
  BlockedDecisionRecorder,
} from "./executor";

// §10 budget reservation ENGINE (mutating). Internal-only: production cash
// holds happen exclusively inside the sealed executor's §9 pipeline; call
// sites may never choose their own budget windows (§10.5). Tests drive the
// engine directly against in-memory fakes and the disposable Postgres.
export {
  reserve,
  settleProvisional,
  release,
  holdForReconciliation,
  confirmSettlement,
  sweepExpired,
  CONTROL_PLANE_PROVIDER_MINIMUM_USD,
} from "./budget";
export type {
  AttemptUsage,
  AttemptActualPricer,
  BudgetDb,
  ReserveInput,
  ReserveResult,
  ReservationHandle,
  SettleProvisionalInput,
  SettleProvisionalResult,
  ReservationSelector,
  ConfirmSettlementInput,
  SweepResult,
} from "./budget";
export type { BudgetSeam } from "./invocation-pipeline";

// §10.8: the fail-closed credit port VALUE (tests assert its behavior; the
// production executor seals it as the only credit authority at the OUTER
// (§8, whole-plan) gate).
//
// NOTE (unresolved architecture duplication, flagged for owner review): this
// whole-plan-level CreditAuthorizationPort (authorizeAndReserve /
// settleProvisional / reconcile / release, called ONCE before dispatch) and
// credit-admission.ts's PER-ROUTE CreditAuthorizationPort (authorize /
// settle / release, called once per provider attempt inside the §9 walk)
// are two independently-designed solutions to the same CONFIRMED_CREDITS_ONLY
// admission problem. Both remain wired today; production stays fail-closed
// either way (this port is sealed to failClosedCreditAuthorizationPort, and
// the §9 port's creditStore is deliberately left unset), so there is no live
// double-spend risk — but the duplication itself should be resolved by an
// owner decision about which layer is the intended long-term design before
// a real S5 adapter is wired to either one.
export { failClosedCreditAuthorizationPort } from "./credit-port";

// §11.3 credit admission + atomic authorization (PER-ROUTE, §9 pipeline):
// NOVA S1's canonical CreditGrantSnapshot is imported (never redefined) by
// credit-admission.ts, which is itself re-exported here — same sealing
// rationale as budget.ts above. Production reaches this ONLY through the
// ledgered dispatch pipeline, itself sealed inside executor.ts.
export {
  admitCreditFunded,
  createPgCreditAuthorizationPort,
  evaluateCreditAdmission,
  type AdmitCreditFundedInput,
  type AuthorizeCreditInput,
  type CreditAdmissionDecision,
  type CreditAdmissionRefusalReason,
  type CreditAdmissionScope,
  type CreditAuthorizationDecision,
  type CreditAuthorizationHandle,
  type CreditAuthorizationState,
  type CreditLedgerDb,
  type CreditSnapshotStore,
} from "./credit-admission";
export type { CreditAuthorizationPort as RouteCreditAuthorizationPort } from "./credit-admission";
