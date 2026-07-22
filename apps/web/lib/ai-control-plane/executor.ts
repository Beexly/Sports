/**
 * Sealed AI task executor (directive §8.2) — the ONLY production entry point.
 *
 * SEALING MODEL:
 *   - `executeAiTask(request)` is the public surface (re-exported by
 *     index.ts). It runs against a lazily-built SINGLETON whose dependencies
 *     are sealed in this module: a frozen snapshot of the real process env,
 *     the real clock, the versioned in-code policy registry, the fail-closed
 *     emergency receipt store, and a dispatch that refuses to run (provider
 *     dispatch is wired by the stacked invocation/attempt PR). Production
 *     code has NO parameter through which to inject an alternate env, policy
 *     source, dispatch, store, budget window, or pricing.
 *   - `createAiExecutor(sealedDependencies)` is the dependency-injected
 *     factory. It is DEFINED here (the singleton needs it) but its sanctioned
 *     import path is `internal.ts` (clearly marked test/internal); index.ts
 *     deliberately does not re-export it or the dependency types. The
 *     boundary is MACHINE-ENFORCED, not convention: the guard
 *     `scripts/guardrails/ai-control-plane-sealing.mjs`
 *     (`npm run guard:ai-control-plane-sealing`, part of `npm run
 *     guardrails`) fails the build if any production module deep-imports
 *     internal.ts, this module, or the env-taking resolvers.
 *
 * AUTHORITY PIPELINE (every call, in order, all fail-closed):
 *   1. Resolve owner policy by registered task class (registry §8.1), then
 *      re-validate it structurally and check key consistency (defense in
 *      depth for any future non-in-code policy source).
 *   2. Resolve env class; production rejects "unversioned" policy (§8.4).
 *   3. Validate the invocation request (§8.4: request-id format, TrustedActor
 *      structure, entity, input size/serializability, secret-material scan,
 *      payment-card scan §8.5).
 *   4. Apply caller narrowing — escalation attempts throw PolicyBlocked.
 *   5. Resolve the environment cost mode (fail-closed matrix) and intersect
 *      with the effective permitted modes.
 *   6. If the effective mode is EMERGENCY_RELIABILITY, verify the durable
 *      owner-decision receipt (§8.6) and clamp spend to its ceiling.
 *   7. Refuse plans with no fundable route (funding label BLOCKED).
 *   8. Dispatch through the sealed dependency.
 */

import type {
  AiTaskInvocationRequest,
  AiTaskPolicyDefinition,
  AiTaskResult,
  EffectiveAuthority,
  FundingLabel,
} from "./contracts";
import type { CostMode, EnvLike } from "./cost-mode";
import { effectiveMode, resolveCostMode, resolveEnvClass } from "./cost-mode";
import type { EmergencyReceiptStore } from "./emergency";
import { failClosedReceiptStore, verifyEmergencyOverride } from "./emergency";
import { ConfigurationError, PolicyBlocked } from "./errors";
import { getTaskPolicy } from "./policy-registry";
import {
  assertPolicyVersionAllowed,
  resolveEffectiveAuthority,
  validateInvocationRequest,
  validatePolicyDefinition,
} from "./validation";

// ─── Dispatch seam (implemented by the stacked invocation/attempt PR) ─────────

/** Everything the transport layer is ALLOWED to know about one invocation. */
export interface AiDispatchPlan {
  readonly request: AiTaskInvocationRequest;
  readonly authority: EffectiveAuthority;
  /** The mode actually in effect after env ∩ policy ∩ narrowing. */
  readonly costMode: CostMode;
  /** Cash ceiling after every clamp (policy, narrowing, emergency receipt). */
  readonly maxVendorCashUsd: number;
  readonly fundingLabel: FundingLabel;
}

export interface AiDispatchOutcome {
  readonly output: unknown;
  readonly attempts: AiTaskResult["attempts"];
}

export type AiDispatchFn = (plan: AiDispatchPlan) => Promise<AiDispatchOutcome>;

// ─── Sealed dependencies ──────────────────────────────────────────────────────

/**
 * Policy resolution seam. Production wires the real versioned registry
 * (`policy-registry.ts`) — the ONLY policy source reachable through
 * `executeAiTask` (§8.1). Tests (via internal.ts, the guard-enforced sole
 * import path) may wire fixture policies to exercise pipeline branches the
 * deliberately-conservative shipped registry cannot reach yet — e.g. a policy
 * opted into EMERGENCY_RELIABILITY. Whatever this returns is STILL structurally
 * re-validated and key-consistency-checked by the executor, so an injected or
 * future non-in-code source can never smuggle a malformed or mislabeled grant.
 */
export interface AiPolicySource {
  getTaskPolicy(taskClass: string): AiTaskPolicyDefinition;
}

/**
 * The complete dependency surface of the executor. Constructed in exactly two
 * places: the sealed production singleton below, and tests via internal.ts.
 */
export interface SealedAiExecutorDependencies {
  readonly env: EnvLike;
  readonly now: () => Date;
  readonly policies: AiPolicySource;
  readonly receipts: EmergencyReceiptStore;
  readonly dispatch: AiDispatchFn;
}

export interface AiExecutor {
  executeAiTask<TOutput = unknown>(
    request: AiTaskInvocationRequest,
  ): Promise<AiTaskResult<TOutput>>;
}

// ─── Funding label derivation (pre-call intent, never settlement) ─────────────

function deriveFundingLabel(
  mode: CostMode,
  authority: EffectiveAuthority,
): FundingLabel {
  switch (mode) {
    case "NO_BILLABLE_EXTERNAL":
      return authority.permittedProviderRoutes.includes("local")
        ? "LOCAL_RESOURCE"
        : "BLOCKED";
    case "CONFIRMED_CREDITS_ONLY":
      return "CREDIT_ELIGIBLE_UNCONFIRMED";
    case "BUDGETED_CASH":
    case "EMERGENCY_RELIABILITY":
      return "CASH_EXPECTED";
  }
}

// ─── Factory (internal/test surface via internal.ts ONLY) ─────────────────────

/**
 * Builds an executor over the given sealed dependencies. NOT exported from
 * index.ts — production reaches the singleton through `executeAiTask` below;
 * tests reach this through internal.ts (the only import path the sealing
 * guard `scripts/guardrails/ai-control-plane-sealing.mjs` permits outside
 * this package).
 */
export function createAiExecutor(
  sealedDependencies: SealedAiExecutorDependencies,
): AiExecutor {
  const deps = sealedDependencies;

  return {
    async executeAiTask<TOutput = unknown>(
      request: AiTaskInvocationRequest,
    ): Promise<AiTaskResult<TOutput>> {
      // 1. Owner policy by registered task class — the ONLY policy source.
      // Defense in depth: whatever the source returns is re-validated
      // structurally, and its key consistency is checked so a policy source
      // can never answer for one task class with another class's grants.
      const policy = deps.policies.getTaskPolicy(request.taskClass);
      if (policy.taskClass !== request.taskClass) {
        throw new ConfigurationError(
          `Policy source returned a policy for task class "${policy.taskClass}" ` +
            `when asked for "${request.taskClass}" — refusing mismatched authority.`,
        );
      }
      validatePolicyDefinition(policy);

      // 2. Environment class + policy-version gate.
      const { envClass } = resolveEnvClass(deps.env);
      assertPolicyVersionAllowed(policy.policyVersion, envClass);

      // 3. Full request validation (§8.4/§8.5).
      validateInvocationRequest(request);

      // 4. Narrowing — less authority OK, more never.
      const authority = resolveEffectiveAuthority(policy, request.narrowing);

      // 5. Environment cost mode ∩ effective permitted modes.
      const now = deps.now();
      const envMode = resolveCostMode({
        envClass,
        rawMode: deps.env.LLM_COST_MODE,
        emergencyUntil: deps.env.EMERGENCY_RELIABILITY_UNTIL,
        emergencyReason: deps.env.EMERGENCY_REASON,
        emergencyOverrideId: deps.env.EMERGENCY_OVERRIDE_ID,
        now,
      });
      const mode = effectiveMode(envMode, authority.permittedModes);

      // 6. Emergency authority requires a verified durable receipt (§8.6).
      let maxVendorCashUsd = authority.maxVendorCashUsd;
      if (mode === "EMERGENCY_RELIABILITY") {
        const receipt = await verifyEmergencyOverride({
          store: deps.receipts,
          overrideId: deps.env.EMERGENCY_OVERRIDE_ID ?? "",
          taskClass: authority.taskClass,
          now,
        });
        maxVendorCashUsd = Math.min(maxVendorCashUsd, receipt.maxSpendUsd);
      }

      // 7. A plan with no fundable route must never reach transport: under
      // NO_BILLABLE_EXTERNAL with no permitted "local" route there is nothing
      // the transport may legally do — fail closed BEFORE the dispatch seam.
      const fundingLabel = deriveFundingLabel(mode, authority);
      if (fundingLabel === "BLOCKED") {
        throw new PolicyBlocked(
          `Task class "${authority.taskClass}" has no fundable provider route ` +
            `under effective cost mode ${mode} (permitted routes: ` +
            `[${authority.permittedProviderRoutes.join(", ")}]). Refusing to dispatch.`,
        );
      }

      // 8. Dispatch through the sealed seam.
      const outcome = await deps.dispatch({
        request,
        authority,
        costMode: mode,
        maxVendorCashUsd,
        fundingLabel,
      });

      return {
        invocationId: `inv:${request.requestId}`,
        output: outcome.output as TOutput,
        attempts: outcome.attempts,
        fundingLabel,
        policyVersion: authority.policyVersion,
      };
    },
  };
}

// ─── Sealed production singleton ──────────────────────────────────────────────

/**
 * Production dispatch is NOT wired in this PR (the stacked invocation/attempt
 * PR owns transport). Until it lands, any request that passes the full
 * authority pipeline still fails closed here — no billable call can occur.
 */
const dispatchNotWired: AiDispatchFn = async () => {
  throw new ConfigurationError(
    "AI control-plane provider dispatch is not wired yet (stacked " +
      "invocation/attempt PR). Failing closed — no provider call was made.",
  );
};

let sealedSingleton: AiExecutor | null = null;

function sealedProductionExecutor(): AiExecutor {
  if (sealedSingleton === null) {
    // Frozen SNAPSHOT of only the env keys the control plane may read —
    // production code cannot hand the executor a synthetic env.
    const env: EnvLike = Object.freeze({
      AI_ENV_CLASS: process.env.AI_ENV_CLASS,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NODE_ENV: process.env.NODE_ENV,
      LLM_COST_MODE: process.env.LLM_COST_MODE,
      EMERGENCY_RELIABILITY_UNTIL: process.env.EMERGENCY_RELIABILITY_UNTIL,
      EMERGENCY_REASON: process.env.EMERGENCY_REASON,
      EMERGENCY_OVERRIDE_ID: process.env.EMERGENCY_OVERRIDE_ID,
    });
    sealedSingleton = createAiExecutor({
      env,
      now: () => new Date(),
      // The versioned in-code registry — production's ONLY policy source.
      policies: { getTaskPolicy },
      receipts: failClosedReceiptStore,
      dispatch: dispatchNotWired,
    });
  }
  return sealedSingleton;
}

/**
 * The single public entry point (§8.2). No dependency parameters exist —
 * env/dispatch/receipts are sealed inside this module.
 */
export function executeAiTask<TOutput = unknown>(
  request: AiTaskInvocationRequest,
): Promise<AiTaskResult<TOutput>> {
  return sealedProductionExecutor().executeAiTask<TOutput>(request);
}
