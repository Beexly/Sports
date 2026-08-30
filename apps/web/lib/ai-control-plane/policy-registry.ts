/**
 * Versioned in-code AI task policy registry (directive §8.1) — the SINGLE
 * source of policy authority for the control plane.
 *
 * OWNERSHIP MODEL: every entry here is an OWNER grant. Callers cannot supply,
 * extend, or override a policy at runtime — the executor resolves policy by
 * registered task class and the only runtime influence a caller has is
 * NARROWING (requesting less authority; see `resolveEffectiveAuthority`).
 * Changing what a task class is allowed to do is a reviewed code change that
 * bumps `policyVersion` (per policy) and `POLICY_REGISTRY_VERSION` (whole
 * registry), so authority changes are diff-visible and auditable.
 *
 * FAIL-CLOSED AT LOAD (§8.7 "malformed policy fails build/startup"): every
 * policy is structurally validated at module initialization. A malformed
 * entry throws `ConfigurationError` the moment anything imports this module —
 * in CI (tests/typecheck import it) and at process startup — never lazily at
 * request time.
 *
 * INITIAL GRANTS ARE DELIBERATELY MINIMAL: all six registered classes are
 * capped at $0 vendor cash and modes {NO_BILLABLE_EXTERNAL,
 * CONFIRMED_CREDITS_ONLY}, with no substitutions and retention OFF. Nothing
 * in this file makes the system spend-capable; raising any cap is a future
 * versioned owner change.
 */

import type {
  AiTaskPolicyDefinition,
  RegisteredAiTaskClass,
} from "./contracts";
import { ConfigurationError, InvalidInput } from "./errors";
import { validatePolicyDefinition } from "./validation";

/**
 * Version of the registry as a whole. Bump on ANY policy change so ledger
 * rows can pin exactly which grant set governed an invocation.
 */
export const POLICY_REGISTRY_VERSION = "2026-07-22.1" as const;

/** Shared minimal grants for the initial registry (documented above). */
const ZERO_CASH = 0;
const CONSERVATIVE_MODES = [
  "NO_BILLABLE_EXTERNAL",
  "CONFIRMED_CREDITS_ONLY",
] as const;
const NO_RETENTION = { retainPrompt: false, retainResponse: false } as const;
const V1 = "2026-07-22.1";

/**
 * The registry. `Record<RegisteredAiTaskClass, …>` makes a MISSING policy a
 * compile error and `assertPolicyRegistryWellFormed()` (below) makes a
 * MALFORMED one a startup error.
 */
const AI_TASK_POLICY_REGISTRY: Readonly<
  Record<RegisteredAiTaskClass, AiTaskPolicyDefinition>
> = {
  "studio.brand-creative": {
    taskClass: "studio.brand-creative",
    surface: "studio",
    dataPolicy: {
      tags: ["internal", "secret-prohibited", "training-prohibited"],
    },
    capabilityFloor: {
      reasoningTier: "standard",
      contextTokens: 32_000,
      structuredOutput: false,
      toolUse: false,
      latencyClass: "interactive",
    },
    permittedProviderRoutes: ["anthropic-direct", "bedrock"],
    permittedModes: CONSERVATIVE_MODES,
    maxVendorCashUsd: ZERO_CASH,
    requiredBudgetScopes: ["entity:{entity}:daily"],
    approvedSubstitutions: [],
    validationPolicy: {
      schemaRef: "studio.brand-creative.output.v1",
      numericGuard: false,
    },
    retentionPolicy: NO_RETENTION,
    policyVersion: V1,
  },
  "journal.accountability-entry": {
    taskClass: "journal.accountability-entry",
    surface: "journal",
    dataPolicy: {
      tags: ["internal", "secret-prohibited", "training-prohibited"],
    },
    capabilityFloor: {
      reasoningTier: "standard",
      contextTokens: 32_000,
      structuredOutput: false,
      toolUse: false,
      latencyClass: "batch",
    },
    permittedProviderRoutes: ["anthropic-direct", "bedrock"],
    permittedModes: CONSERVATIVE_MODES,
    maxVendorCashUsd: ZERO_CASH,
    requiredBudgetScopes: ["entity:{entity}:daily"],
    approvedSubstitutions: [],
    validationPolicy: {
      schemaRef: "journal.accountability-entry.output.v1",
      numericGuard: true,
    },
    retentionPolicy: NO_RETENTION,
    policyVersion: V1,
  },
  "insight.calibration-read": {
    taskClass: "insight.calibration-read",
    surface: "calibration-insight",
    dataPolicy: { tags: ["internal", "secret-prohibited"] },
    capabilityFloor: {
      reasoningTier: "fast",
      contextTokens: 16_000,
      structuredOutput: true,
      toolUse: false,
      latencyClass: "interactive",
    },
    permittedProviderRoutes: ["anthropic-direct", "bedrock"],
    permittedModes: CONSERVATIVE_MODES,
    maxVendorCashUsd: ZERO_CASH,
    requiredBudgetScopes: ["entity:{entity}:daily"],
    approvedSubstitutions: [],
    validationPolicy: {
      schemaRef: "insight.calibration-read.output.v1",
      numericGuard: true,
    },
    retentionPolicy: NO_RETENTION,
    policyVersion: V1,
  },
  "court.model-adjudication": {
    taskClass: "court.model-adjudication",
    surface: "model-court",
    dataPolicy: { tags: ["internal", "secret-prohibited"] },
    capabilityFloor: {
      reasoningTier: "deep",
      contextTokens: 64_000,
      structuredOutput: true,
      toolUse: false,
      latencyClass: "batch",
    },
    permittedProviderRoutes: ["anthropic-direct", "bedrock"],
    permittedModes: CONSERVATIVE_MODES,
    maxVendorCashUsd: ZERO_CASH,
    requiredBudgetScopes: ["entity:{entity}:daily"],
    approvedSubstitutions: [],
    validationPolicy: {
      schemaRef: "court.model-adjudication.output.v1",
      numericGuard: true,
    },
    retentionPolicy: NO_RETENTION,
    policyVersion: V1,
  },
  "content.editorial-draft": {
    taskClass: "content.editorial-draft",
    surface: "content",
    dataPolicy: {
      tags: ["internal", "secret-prohibited", "rights-restricted"],
    },
    capabilityFloor: {
      reasoningTier: "standard",
      contextTokens: 32_000,
      structuredOutput: false,
      toolUse: false,
      latencyClass: "batch",
    },
    permittedProviderRoutes: ["anthropic-direct", "bedrock"],
    permittedModes: CONSERVATIVE_MODES,
    maxVendorCashUsd: ZERO_CASH,
    requiredBudgetScopes: ["entity:{entity}:daily"],
    approvedSubstitutions: [],
    validationPolicy: {
      schemaRef: "content.editorial-draft.output.v1",
      numericGuard: false,
    },
    retentionPolicy: NO_RETENTION,
    policyVersion: V1,
  },
  "brief.daily-summary": {
    taskClass: "brief.daily-summary",
    surface: "brief",
    dataPolicy: { tags: ["internal", "secret-prohibited"] },
    capabilityFloor: {
      reasoningTier: "fast",
      contextTokens: 16_000,
      structuredOutput: true,
      toolUse: false,
      latencyClass: "background",
    },
    permittedProviderRoutes: ["anthropic-direct", "bedrock"],
    permittedModes: CONSERVATIVE_MODES,
    maxVendorCashUsd: ZERO_CASH,
    requiredBudgetScopes: ["entity:{entity}:daily"],
    approvedSubstitutions: [],
    validationPolicy: {
      schemaRef: "brief.daily-summary.output.v1",
      numericGuard: true,
    },
    retentionPolicy: NO_RETENTION,
    policyVersion: V1,
  },
};

/** All registered task classes (stable order for tooling/docs). */
export const REGISTERED_AI_TASK_CLASSES: readonly RegisteredAiTaskClass[] =
  Object.keys(AI_TASK_POLICY_REGISTRY).sort() as RegisteredAiTaskClass[];

/** Runtime narrowing for strings arriving from outside first-party code. */
export function isRegisteredTaskClass(
  taskClass: string,
): taskClass is RegisteredAiTaskClass {
  return Object.prototype.hasOwnProperty.call(
    AI_TASK_POLICY_REGISTRY,
    taskClass,
  );
}

/**
 * Resolves the owner policy for a task class. Fail closed: an unregistered
 * class is `InvalidInput` — there is no default policy and no fallback grant.
 */
export function getTaskPolicy(taskClass: string): AiTaskPolicyDefinition {
  if (!isRegisteredTaskClass(taskClass)) {
    throw new InvalidInput(
      `Task class "${taskClass}" is not registered in the AI task policy ` +
        `registry (${POLICY_REGISTRY_VERSION}). Registered classes: ` +
        REGISTERED_AI_TASK_CLASSES.join(", "),
    );
  }
  return AI_TASK_POLICY_REGISTRY[taskClass];
}

/**
 * Validates every registry entry. Exported for tests; ALSO executed at module
 * load (below) so a malformed policy fails build/startup, never request time.
 * Throws `ConfigurationError` naming the offending task class and field.
 */
export function assertPolicyRegistryWellFormed(): void {
  for (const taskClass of REGISTERED_AI_TASK_CLASSES) {
    const policy = AI_TASK_POLICY_REGISTRY[taskClass];
    if (policy.taskClass !== taskClass) {
      // Key/value drift would silently mis-grant authority — hard stop.
      throw new ConfigurationError(
        `Policy registry key "${taskClass}" maps to a policy declaring ` +
          `taskClass "${policy.taskClass}"`,
      );
    }
    validatePolicyDefinition(policy);
  }
}

// Fail-closed at import time (§8.7).
assertPolicyRegistryWellFormed();
