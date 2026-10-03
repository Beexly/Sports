/**
 * Typed errors for the provider-neutral AI control plane (blueprint §A.4).
 *
 * Every error carries a stable `code` literal (for structured logging /
 * ledger recording) and a `retriable` boolean that encodes the ONE safety
 * invariant that matters for money: a failure that could have moved funds
 * must never be auto-retried with the same funds.
 *
 * Mapping rule (from the blueprint):
 *   - AmbiguousCharge and ProviderRejected are NEVER auto-retried with the
 *     same funds  → retriable = false.
 *   - PolicyBlocked / BudgetBlocked are never retried at all → retriable = false.
 *   - The remaining classes describe transient/infra conditions where a retry
 *     (with fresh funds/attempt accounting) is safe → retriable = true, EXCEPT
 *     the input/config/auth classes which are deterministic and pointless to
 *     retry (retriable = false).
 *
 * These are PURE, additive contract types. This module is imported by NOBODY
 * at runtime yet (PR A ships the module; PR B wires it).
 */

/** The stable string discriminant recorded for each control-plane error. */
export type AiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "CONFIGURATION_ERROR"
  | "POLICY_BLOCKED"
  | "BUDGET_BLOCKED"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_REJECTED"
  | "AMBIGUOUS_CHARGE"
  | "TELEMETRY_DEGRADED"
  | "STORE_UNAVAILABLE";

/**
 * Base class for every control-plane error. Concrete subclasses fix `code` and
 * `retriable` as readonly literals so callers can branch exhaustively.
 */
export abstract class AiControlPlaneError extends Error {
  abstract readonly code: AiErrorCode;
  abstract readonly retriable: boolean;

  constructor(message: string, options?: { readonly cause?: unknown }) {
    super(message);
    // Preserve a stable, subclass-specific name for logs.
    this.name = new.target.name;
    if (options && "cause" in options) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

/** No verified actor identity was presented. Deterministic → not retriable. */
export class Unauthenticated extends AiControlPlaneError {
  readonly code = "UNAUTHENTICATED" as const;
  readonly retriable = false as const;
}

/** Actor is authenticated but not permitted for this task. Not retriable. */
export class Forbidden extends AiControlPlaneError {
  readonly code = "FORBIDDEN" as const;
  readonly retriable = false as const;
}

/** The task request failed structural/semantic validation. Not retriable. */
export class InvalidInput extends AiControlPlaneError {
  readonly code = "INVALID_INPUT" as const;
  readonly retriable = false as const;
}

/**
 * The runtime is misconfigured (e.g. production with no explicit cost mode).
 * This is the deploy-failing, fail-closed case. Deterministic → not retriable;
 * a human must fix the configuration.
 */
export class ConfigurationError extends AiControlPlaneError {
  readonly code = "CONFIGURATION_ERROR" as const;
  readonly retriable = false as const;
}

/** A policy (mode/provider/substitution) forbids the request. Never retried. */
export class PolicyBlocked extends AiControlPlaneError {
  readonly code = "POLICY_BLOCKED" as const;
  readonly retriable = false as const;
}

/** A budget cap would be exceeded. Never retried at all. */
export class BudgetBlocked extends AiControlPlaneError {
  readonly code = "BUDGET_BLOCKED" as const;
  readonly retriable = false as const;
}

/**
 * The selected provider is temporarily unavailable (no charge occurred).
 * Safe to retry (e.g. against a fallback provider) → retriable.
 */
export class ProviderUnavailable extends AiControlPlaneError {
  readonly code = "PROVIDER_UNAVAILABLE" as const;
  readonly retriable = true as const;
}

/**
 * The provider actively rejected the request (bad request, content, auth at the
 * provider). Retrying with the same funds/params would just re-reject and could
 * mask a real charge — NEVER auto-retried with the same funds.
 */
export class ProviderRejected extends AiControlPlaneError {
  readonly code = "PROVIDER_REJECTED" as const;
  readonly retriable = false as const;
}

/**
 * We cannot prove whether the vendor charged us (timeout/disconnect after
 * dispatch). The single most dangerous state for double-spend — NEVER
 * auto-retried with the same funds; it must be reconciled from a receipt.
 */
export class AmbiguousCharge extends AiControlPlaneError {
  readonly code = "AMBIGUOUS_CHARGE" as const;
  readonly retriable = false as const;
}

/**
 * Telemetry/ledger writing degraded but the provider call itself succeeded.
 * This never converts a successful paid call into a retry — the caller keeps
 * the result. Surfaced for observability; the operation may be retried at a
 * higher level once telemetry recovers.
 */
export class TelemetryDegraded extends AiControlPlaneError {
  readonly code = "TELEMETRY_DEGRADED" as const;
  readonly retriable = true as const;
}

/** A backing store (ledger/budget/credit) is unavailable. Infra → retriable. */
export class StoreUnavailable extends AiControlPlaneError {
  readonly code = "STORE_UNAVAILABLE" as const;
  readonly retriable = true as const;
}

/** Narrowing helper: is this a control-plane error? */
export function isAiControlPlaneError(err: unknown): err is AiControlPlaneError {
  return err instanceof AiControlPlaneError;
}
