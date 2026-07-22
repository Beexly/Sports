/**
 * PUBLIC surface of the provider-neutral AI control plane (directive §8).
 *
 * AUTHORITY INVERSION (§8.1): callers describe WHAT they want
 * (`AiTaskInvocationRequest`); the versioned in-code policy registry decides
 * WHAT THEY MAY DO (`AiTaskPolicyDefinition`). A caller can narrow its
 * granted authority, never widen it.
 *
 * SEALED SURFACE (§8.2): this index deliberately does NOT export:
 *   - `createAiExecutor` / `SealedAiExecutorDependencies` (DI factory),
 *   - the env-taking resolvers (`resolveEnvClass`, `resolveCostMode`,
 *     `effectiveMode`),
 *   - the receipt store seam.
 * Those live in `internal.ts` (clearly marked test/internal). Production code
 * gets exactly one executable entry point: `executeAiTask(request)`, whose
 * env, dispatch, and receipt store are sealed inside `executor.ts`.
 *
 * MERGE ORDER: PR #159 (Trusted Actor model) must merge to main before this
 * PR — `AiTaskInvocationRequest.actor` is a `TrustedActor` from
 * `@/lib/auth/actor` (see contracts.ts).
 */

// The inverted task contracts (§8.1) + data policy tags (§8.5).
export type {
  AiSurface,
  ClaudeSurface,
  RegisteredAiTaskClass,
  Entity,
  DataPolicy,
  DataPolicyTag,
  ProviderRouteId,
  ProviderId, // deprecated alias of ProviderRouteId — see contracts.ts
  ReasoningTier,
  LatencyClass,
  CapabilityFloor,
  ModelSubstitution,
  ModelSubstitutionId,
  OutputValidationPolicy,
  RetentionPolicy,
  BudgetScopeTemplate,
  AiInvocationCorrelation,
  AiAuthorityNarrowing,
  AiTaskInvocationRequest,
  AiTaskPolicyDefinition,
  EffectiveAuthority,
  FundingLabel,
  AiAttemptSummary,
  AiTaskResult,
} from "./contracts";

// The versioned owner policy registry (§8.1).
export {
  POLICY_REGISTRY_VERSION,
  REGISTERED_AI_TASK_CLASSES,
  getTaskPolicy,
  isRegisteredTaskClass,
  assertPolicyRegistryWellFormed,
} from "./policy-registry";

// Emergency authority receipts (§8.6) — types only; the store seam and
// verification live in internal.ts / the sealed executor.
export type {
  EmergencyOverrideReceipt,
  EmergencyReceiptStore,
} from "./emergency";

// The single sealed production entry point (§8.2).
export { executeAiTask } from "./executor";

// §9.7 recovery-queue drain (cron route entry point). Grants no authority and
// performs no provider dispatch — it only completes already-authorized
// finalizations stranded by post-dispatch store failures, so exporting it does
// not widen the sealed executor boundary.
export {
  drainAiTelemetryRecoveryProduction,
  type DrainSummary,
} from "./recovery-drainer";

// Validation helpers that are safe to expose (pure, no env/dispatch access).
export {
  validateInvocationRequest,
  resolveEffectiveAuthority,
  scanForSecretMaterial,
  containsPaymentCardLikeNumber,
  REQUEST_ID_PATTERN,
  MAX_INPUT_BYTES,
} from "./validation";

// Cost-mode VOCABULARY (types + pure recognizers). The env-taking resolvers
// are intentionally NOT exported here (§8.2) — see internal.ts.
export type {
  CostMode,
  OrderedCostMode,
  AiEnvClass,
  EnvClassSource,
  EnvLike,
} from "./cost-mode";
export { isRecognizedCostMode, LEGACY_COST_MODE_ALIASES } from "./cost-mode";

// Budget VOCABULARY + pure helpers (§10). The MUTATING reservation engine
// (reserve/settle/release/confirm/sweep) is deliberately NOT exported here:
// call sites may never choose their own budget windows (§10.5) — cash holds
// happen ONLY inside the sealed executor's §9 pipeline. Tests and future
// control-plane-internal wiring reach the engine through internal.ts.
export {
  requiresCashReservation,
  estimateAttemptPlanWorstCaseUsd,
  resolveRequiredBudgetWindows,
  usdToMicros,
  microsToUsd,
  toUsdString,
  CONTROL_PLANE_PRICING_VERSION,
  KNOWN_PRICING_VERSIONS,
} from "./budget";
export type {
  BudgetScopeKind,
  ReservationState,
  BudgetWindowState,
  ConfirmedSettlementKind,
  BudgetScopeContext,
  ResolvedBudgetWindow,
  AttemptPlanWorstCaseInput,
  BudgetOverageIncident,
  OwnerIncidentSink,
} from "./budget";

// §10.8: the credit-authorization PORT — the contract S5 implements against
// NOVA-owned persistence. Only the fail-closed port exists in this repo, and
// it is sealed into the production executor (never exported as a value here).
export type {
  CreditAuthorizationPort,
  CreditAuthorizationRequest,
  CreditReservation,
} from "./credit-port";

// Typed errors (§A.4).
export type { AiErrorCode } from "./errors";
export {
  AiControlPlaneError,
  Unauthenticated,
  Forbidden,
  InvalidInput,
  ConfigurationError,
  PolicyBlocked,
  BudgetBlocked,
  ProviderUnavailable,
  ProviderRejected,
  AmbiguousCharge,
  TelemetryDegraded,
  StoreUnavailable,
  isAiControlPlaneError,
} from "./errors";
