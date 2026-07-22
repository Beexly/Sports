/**
 * Public surface of the provider-neutral AI control plane (Phase 2 PR-A).
 *
 * PR A ships CONTRACTS + the fail-closed cost-mode resolver + typed errors,
 * with exhaustive unit tests. It is PURE and additive — imported by NOBODY at
 * runtime yet, so it changes zero runtime behavior. Later PRs (B–E) wire the
 * ledger, budget reservations, credit truth, and provider hardening.
 */

// Task & result contracts (§A.2).
export type {
  AiTaskClass,
  ClaudeSurface,
  Entity,
  DataClassification,
  ProviderId,
  ReasoningTier,
  LatencyClass,
  CapabilityFloor,
  ModelSubstitution,
  OutputValidationPolicy,
  RetentionPolicy,
  ActorRef,
  AiTaskRequest,
  FundingLabel,
  AiAttemptSummary,
  AiTaskResult,
} from "./contracts";
export { executeAiTask } from "./contracts";

// Cost modes + fail-closed resolver (§A.3).
export type {
  CostMode,
  OrderedCostMode,
  AiEnvClass,
  EnvClassSource,
  ResolvedEnvClass,
  EnvLike,
  ResolveCostModeInput,
} from "./cost-mode";
export {
  resolveEnvClass,
  resolveCostMode,
  effectiveMode,
  isRecognizedCostMode,
  LEGACY_COST_MODE_ALIASES,
} from "./cost-mode";

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
