/**
 * Sealed AI task executor (directive §8.2) — the ONLY production entry point.
 *
 * SEALING MODEL:
 *   - `executeAiTask(request)` is the public surface (re-exported by
 *     index.ts). It runs against a lazily-built SINGLETON whose dependencies
 *     are sealed in this module: a frozen snapshot of the real process env,
 *     the real clock, the versioned in-code policy registry, the fail-closed
 *     emergency receipt store, the §9 ledgered invocation pipeline as the
 *     dispatch seam (atomic claim → exact provider adapters → durable
 *     attempts → recovery queue), and the §9.6 blocked-decision recorder.
 *     Production code has NO parameter through which to inject an alternate
 *     env, policy source, dispatch, store, budget window, or pricing.
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
 *   8. Dispatch through the sealed dependency (§9 pipeline).
 *
 * §9.6: any PolicyBlocked / BudgetBlocked / ConfigurationError raised by the
 * gates is persisted (best-effort, never masking the block) as a durable
 * non-dispatchable BLOCKED invocation via the recordBlocked dependency.
 */

import type {
  AiTaskInvocationRequest,
  AiTaskPolicyDefinition,
  AiTaskResult,
  EffectiveAuthority,
  FundingLabel,
} from "./contracts";
import type { AiEnvClass, CostMode, EnvClassSource, EnvLike } from "./cost-mode";
import { effectiveMode, resolveCostMode, resolveEnvClass } from "./cost-mode";
import type { EmergencyReceiptStore } from "./emergency";
import { failClosedReceiptStore, verifyEmergencyOverride } from "./emergency";
import {
  CONTROL_PLANE_PRICING_VERSION,
  CONTROL_PLANE_PROVIDER_MINIMUM_USD,
  estimateAttemptPlanWorstCaseUsd,
  requiresCashReservation,
} from "./budget";
import type { CreditAuthorizationPort } from "./credit-port";
import { failClosedCreditAuthorizationPort } from "./credit-port";
import {
  BudgetBlocked,
  ConfigurationError,
  PolicyBlocked,
} from "./errors";
import { getTaskPolicy } from "./policy-registry";
import {
  assertPolicyVersionAllowed,
  resolveEffectiveAuthority,
  validateInvocationRequest,
  validatePolicyDefinition,
} from "./validation";

// ─── Dispatch seam (implemented by the invocation pipeline, §9) ───────────────

/** Everything the transport layer is ALLOWED to know about one invocation. */
export interface AiDispatchPlan {
  readonly request: AiTaskInvocationRequest;
  readonly authority: EffectiveAuthority;
  /** The mode actually in effect after env ∩ policy ∩ narrowing. */
  readonly costMode: CostMode;
  /** Cash ceiling after every clamp (policy, narrowing, emergency receipt). */
  readonly maxVendorCashUsd: number;
  readonly fundingLabel: FundingLabel;
  /** Environment class recorded on the durable invocation row (§9.4). */
  readonly envClass: AiEnvClass;
  readonly envClassSource: EnvClassSource;
}

/**
 * Discriminated dispatch outcome (§9.2): a COMPLETED result (fresh or a
 * terminal replay of the original persisted result) or an honest IN_PROGRESS
 * verdict when another live execution already holds the claim — in which
 * case NOTHING was dispatched.
 */
export type AiDispatchOutcome =
  | {
      readonly kind: "COMPLETED";
      readonly invocationId: string;
      readonly output: unknown;
      readonly attempts: AiTaskResult["attempts"];
      /** Separate from execution status — never conflated (§9.1). */
      readonly telemetryStatus: "OK" | "DEGRADED";
      /** True when this is the original result replayed, not a new dispatch. */
      readonly replayed: boolean;
    }
  | { readonly kind: "IN_PROGRESS"; readonly invocationId: string };

export type AiDispatchFn = (plan: AiDispatchPlan) => Promise<AiDispatchOutcome>;

// ─── Blocked-decision persistence seam (§9.6) ─────────────────────────────────

/**
 * A policy/config/budget block that must reach the durable owner queue even
 * though NO provider call occurs (§9.6). Persisted as a non-dispatchable
 * BLOCKED invocation row. Recording is best-effort and must never mask the
 * block itself — implementations may not throw.
 */
export interface BlockedDecisionRecord {
  readonly request: AiTaskInvocationRequest;
  readonly reasonCode: "POLICY_BLOCKED" | "BUDGET_BLOCKED" | "CONFIGURATION_BLOCKED";
  readonly detail: string;
  /** Best-known context at block time; unresolved stages report sentinels. */
  readonly surface: string;
  readonly dataClass: string;
  readonly costMode: string;
  readonly envClass: string;
  readonly envClassSource: string;
  readonly policyVersion: string;
}

export type BlockedDecisionRecorder = (
  record: BlockedDecisionRecord,
) => Promise<void>;

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
  /** §9.6 blocked-decision persistence. MUST be non-throwing (best-effort). */
  readonly recordBlocked: BlockedDecisionRecorder;
  /**
   * §10.8 credit authorization. Production seals the FAIL-CLOSED port
   * (`failClosedCreditAuthorizationPort`) until S5 lands a real NOVA-backed
   * adapter — CONFIRMED_CREDITS_ONLY is therefore unreachable in production.
   */
  readonly credit: CreditAuthorizationPort;
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
      // Best-known context for §9.6 blocked-decision persistence. Stages that
      // have not resolved yet report explicit sentinels, never guesses.
      const blockedContext = {
        surface: "UNRESOLVED",
        dataClass: "UNRESOLVED",
        costMode: "UNRESOLVED",
        envClass: "UNRESOLVED",
        envClassSource: "UNRESOLVED",
        policyVersion: "UNRESOLVED",
      };

      /**
       * §9.6: persist config/policy/budget blocks as durable non-dispatchable
       * incidents even though no provider call occurs. Best-effort — a
       * recorder failure never masks the block itself.
       */
      const recordAndRethrow = async (error: unknown): Promise<never> => {
        const reasonCode =
          error instanceof PolicyBlocked
            ? "POLICY_BLOCKED"
            : error instanceof BudgetBlocked
              ? "BUDGET_BLOCKED"
              : error instanceof ConfigurationError
                ? "CONFIGURATION_BLOCKED"
                : null;
        if (reasonCode !== null) {
          try {
            await deps.recordBlocked({
              request,
              reasonCode,
              detail: error instanceof Error ? error.message : String(error),
              ...blockedContext,
            });
          } catch {
            // Never let telemetry mask the authoritative block.
          }
        }
        throw error;
      };

      try {
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
        blockedContext.surface = policy.surface;
        blockedContext.dataClass = policy.dataPolicy.tags.join(",");
        blockedContext.policyVersion = policy.policyVersion;

        // 2. Environment class + policy-version gate.
        const { envClass, source: envClassSource } = resolveEnvClass(deps.env);
        blockedContext.envClass = envClass;
        blockedContext.envClassSource = envClassSource;
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
        blockedContext.costMode = mode;

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

        // 6.5 (§10.3): a zero-dollar cash cap AUTHORIZES NOTHING BILLABLE.
        // Defense in depth — the §9 pipeline re-checks before reserving.
        if (requiresCashReservation(mode) && maxVendorCashUsd <= 0) {
          throw new BudgetBlocked(
            `Task class "${authority.taskClass}" resolved to billable mode ` +
              `${mode} with maxVendorCashUsd = ${maxVendorCashUsd} — a zero ` +
              "cap means NO cash authorization exists; refusing to dispatch.",
          );
        }

        // 6.6 (§10.8): CONFIRMED_CREDITS_ONLY spend must be atomically
        // reserved against NOVA-owned credit truth through the
        // CreditAuthorizationPort — a fresh snapshot read is not enough under
        // concurrency. Production seals the fail-closed port (no adapter
        // exists yet), so this mode is UNREACHABLE in production until S5
        // lands a real adapter.
        if (mode === "CONFIRMED_CREDITS_ONLY") {
          const worstCaseUsd = estimateAttemptPlanWorstCaseUsd({
            routes: authority.permittedProviderRoutes,
            perAttemptCeilingUsd: maxVendorCashUsd,
            pricingVersion: CONTROL_PLANE_PRICING_VERSION,
            // §10.4: provider per-attempt minimums are wired here too — the
            // credit worst case must cover them just like the cash one.
            providerMinimumUsd: CONTROL_PLANE_PROVIDER_MINIMUM_USD,
          });
          await deps.credit.authorizeAndReserve({
            requestId: request.requestId,
            taskClass: authority.taskClass,
            entity: request.entity,
            worstCaseUsd,
            reservationVersion: 1,
            now,
          });
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

        // 8. Dispatch through the sealed seam (§9: atomic claim, exact
        // provider adapters, durable attempts, recovery queue).
        const outcome = await deps.dispatch({
          request,
          authority,
          costMode: mode,
          maxVendorCashUsd,
          fundingLabel,
          envClass,
          envClassSource,
        });

        if (outcome.kind === "IN_PROGRESS") {
          // Another live execution owns the claim: honest verdict, nothing
          // dispatched, and NO fabricated output under a success claim (§9.2).
          return {
            invocationId: outcome.invocationId,
            output: undefined as TOutput,
            attempts: [],
            fundingLabel,
            policyVersion: authority.policyVersion,
            status: "IN_PROGRESS",
            telemetryStatus: "OK",
            replayed: false,
          };
        }
        return {
          invocationId: outcome.invocationId,
          output: outcome.output as TOutput,
          attempts: outcome.attempts,
          fundingLabel,
          policyVersion: authority.policyVersion,
          status: "SUCCEEDED",
          telemetryStatus: outcome.telemetryStatus,
          replayed: outcome.replayed,
        };
      } catch (error) {
        return recordAndRethrow(error);
      }
    },
  };
}

// ─── Sealed production singleton ──────────────────────────────────────────────

/**
 * Production authoritative store, resolved lazily so importing the control
 * plane never eagerly constructs a Prisma client. FAIL CLOSED (§9.1): in stub
 * mode (no durable DATABASE_URL) `prismaSqlClient` refuses raw SQL and every
 * claim throws `StoreUnavailable` — a pretend store can never authorize a
 * dispatch.
 */
async function productionControlStore(): Promise<
  import("./control-store").AuthoritativeControlStore
> {
  const [{ prismaSqlClient, createPgControlStore }, dbModule] =
    await Promise.all([import("./control-store"), import("@sports/db")]);
  return createPgControlStore(prismaSqlClient(dbModule.db));
}

/** Production dispatch: the full §9 ledgered invocation pipeline. */
const productionDispatch: AiDispatchFn = async (plan) => {
  const [
    { createLedgeredDispatch },
    { createProviderDispatchers },
    controlStoreModule,
    dbModule,
    observabilityModule,
    { createPgCreditAuthorizationPort },
  ] = await Promise.all([
    import("./invocation-pipeline"),
    import("./dispatch"),
    import("./control-store"),
    import("@sports/db"),
    import("./observability"),
    import("./credit-admission"),
  ]);
  const sqlForQueue = controlStoreModule.prismaSqlClient(dbModule.db);
  const store = await productionControlStore();
  const dispatch = createLedgeredDispatch({
    store,
    observability: () => new observabilityModule.ObservabilitySink(sqlForQueue),
    dispatchers: createProviderDispatchers(),
    now: () => new Date(),
    // §10: the budget seam. The engine writes through the real Prisma client;
    // overage incidents surface through the observability sink (non-throwing).
    budget: {
      db: dbModule.db,
      incidents: async (incident) => {
        new observabilityModule.ObservabilitySink(sqlForQueue).markDegraded(
          `BUDGET_OVERAGE_LOCKED: window ${incident.windowId} locked — ` +
            `invocation ${incident.invocationId} actual ${incident.actualUsd} ` +
            `exceeded hold ${incident.heldUsd}`,
          null,
        );
      },
    },
    // Credit authorization (§11.3): the atomic reservation port is wired
    // (dormant — no reservation happens without a matching creditStore), but
    // `creditStore` is deliberately left UNSET here — NOVA's S5 unit has not
    // yet materialized a real `CreditSnapshotStore` implementation. Until it
    // does, CONFIRMED_CREDITS_ONLY fails closed in production (no store
    // configured -> PolicyBlocked, zero dispatch) exactly as designed: a
    // provider/model id alone can never produce credit admission, and
    // neither can an absent store. Wiring the real store is a follow-up PR.
    creditPort: createPgCreditAuthorizationPort(dbModule.db),
  });
  return dispatch(plan);
};

/**
 * §9.6 production blocked-decision recorder: best-effort durable BLOCKED row.
 * Never throws — a telemetry failure must not mask the authoritative block.
 */
const productionRecordBlocked: BlockedDecisionRecorder = async (record) => {
  try {
    const [store, { computeRequestFingerprint }, { randomUUID }] =
      await Promise.all([
        productionControlStore(),
        import("./invocation-pipeline"),
        import("node:crypto"),
      ]);
    await store.recordBlockedInvocation({
      invocationId: randomUUID(),
      requestId: record.request.requestId,
      taskClass: record.request.taskClass,
      surface: record.surface,
      entity: record.request.entity,
      dataClass: record.dataClass,
      costMode: record.costMode,
      envClass: record.envClass,
      envClassSource: record.envClassSource,
      policyVersion: record.policyVersion,
      actorType: record.request.actor.actorType,
      actorSubjectId: record.request.actor.subjectId,
      requestFingerprint: computeRequestFingerprint({
        taskClass: record.request.taskClass,
        entity: record.request.entity,
        input: record.request.input,
        narrowing: record.request.narrowing ?? null,
      }),
      blockedReasonCode: record.reasonCode,
      blockedDetail: record.detail,
    });
  } catch {
    // Best-effort by contract.
  }
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
      dispatch: productionDispatch,
      recordBlocked: productionRecordBlocked,
      // §10.8: no real credit adapter exists — CONFIRMED_CREDITS_ONLY is
      // unreachable in production, fail-closed.
      credit: failClosedCreditAuthorizationPort,
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
