/**
 * AI control-plane task & result contracts (blueprint §A.2, directive §8.1/§8.5).
 *
 * AUTHORITY INVERSION (§8.1): the caller no longer carries policy. The old
 * `AiTaskRequest` let the caller name its own providers, cost modes, cash cap,
 * substitutions, validation, and retention — i.e. the caller granted itself
 * authority. That contract is DELETED. It is replaced by:
 *
 *   - `AiTaskInvocationRequest` — what a caller may say: which registered task
 *     it wants, an idempotency handle, the trusted acting identity, the entity,
 *     the input payload, correlation hints, and (optionally) a NARROWING of the
 *     registry-granted authority. Narrowing can only shrink authority — the
 *     executor rejects any attempt to widen it (`PolicyBlocked`).
 *   - `AiTaskPolicyDefinition` — what the OWNER grants per task class, owned by
 *     the versioned in-code policy registry (`policy-registry.ts`). The
 *     executor loads policy by task class; callers cannot supply one.
 *
 * MERGE ORDER (§8.3): this module imports `TrustedActor` from
 * `@/lib/auth/actor`, which lands with PR #159 (branch
 * `security/trusted-actor-model`, merged into this branch as a recorded merge
 * commit). PR #159 MUST merge to `main` before PR #162 — #162 does not build
 * on a main that lacks the Trusted Actor model.
 *
 * These are contract types plus the closed registered-task-class union. No
 * value in this file spends money; the executor (`executor.ts`) is the only
 * production entry point and it is sealed (§8.2).
 */

import type { ClaudeSurface } from "@/lib/claude-api/model-router";
import type { TrustedActor } from "@/lib/auth/actor";
import type { CostMode } from "./cost-mode";

/** Re-export the model-router surface union so callers use one canonical type. */
export type { ClaudeSurface };

/**
 * Control-plane alias for the model surface. The policy registry pins each
 * registered task class to exactly one surface.
 */
export type AiSurface = ClaudeSurface;

/**
 * The CLOSED set of task classes the control plane will execute (§8.1). This
 * replaces the old open branded string `AiTaskClass`: an unregistered class is
 * now unrepresentable at compile time for first-party code, and the registry
 * (`policy-registry.ts`) is a `Record` over this union so a missing policy is
 * a build failure, not a runtime surprise. Runtime callers passing arbitrary
 * strings are rejected by `getTaskPolicy` (fail closed).
 *
 * Grounded in the six real model-router surfaces that exist today.
 */
export type RegisteredAiTaskClass =
  | "studio.brand-creative"
  | "journal.accountability-entry"
  | "insight.calibration-read"
  | "court.model-adjudication"
  | "content.editorial-draft"
  | "brief.daily-summary";

/** Which business entity the task is executed on behalf of. */
export type Entity = "GSE" | "GSN" | "XXX" | "PERSONAL";

// ─── Data policy (§8.5): composable tags, not a single coarse enum ────────────

/**
 * Composable data-policy tags (§8.5). A single coarse enum could not express
 * routing decisions like "internal but training-prohibited" or "user-private
 * and residency-restricted", so classification is now a tag SET:
 *
 *   Base sensitivity (exactly ONE required):
 *     - "public"        — publishable content, no sensitivity.
 *     - "internal"      — first-party operational data.
 *     - "user-private"  — end-user data not for other users.
 *
 *   Modifiers (any combination on top of the base):
 *     - "pii"                  — personally identifiable information present.
 *     - "regulated"            — subject to a regulatory regime.
 *     - "payment-adjacent"     — near payment flows (NEVER card data itself —
 *                                the validator rejects payment-card-like input
 *                                for EVERY task, tagged or not).
 *     - "secret-prohibited"    — secret/credential material must never appear
 *                                (the validator scans and rejects regardless;
 *                                the tag makes the policy explicit/auditable).
 *     - "rights-restricted"    — licensing/rights limits on the content.
 *     - "training-prohibited"  — may not be used for model training.
 *     - "residency-restricted" — data-residency constraints apply.
 *
 * Consistency rules (enforced by `validateDataPolicy` in validation.ts, at
 * registry load AND at request time): exactly one base tag; "public" cannot
 * combine with "pii", "regulated", or "payment-adjacent"; no duplicates.
 */
export type DataPolicyTag =
  | "public"
  | "internal"
  | "user-private"
  | "pii"
  | "regulated"
  | "payment-adjacent"
  | "secret-prohibited"
  | "rights-restricted"
  | "training-prohibited"
  | "residency-restricted";

/** The composable data policy attached to every registered task class. */
export interface DataPolicy {
  readonly tags: readonly DataPolicyTag[];
}

// ─── Provider routes ──────────────────────────────────────────────────────────

/**
 * Provider ROUTE identifiers (renamed from `ProviderId`, §8.1 vocabulary).
 * Explicit list, NO wildcard. One route = one exact dispatch adapter; the
 * control plane alone owns fallback order (directive §9.3).
 */
export type ProviderRouteId =
  | "anthropic-direct"
  | "bedrock"
  | "vertex"
  | "cerebras"
  | "local";

/**
 * @deprecated Renamed to {@link ProviderRouteId} (directive §8.1). Kept as an
 * alias one release so the stacked ledger/budget branches rebase mechanically;
 * remove after they adopt the new name.
 */
export type ProviderId = ProviderRouteId;

// ─── Capability floor & substitutions ─────────────────────────────────────────

/** Coarse reasoning capability tiers a task can require of a model. */
export type ReasoningTier = "fast" | "standard" | "deep";

/** Coarse latency expectation a task can require. */
export type LatencyClass = "interactive" | "batch" | "background";

/**
 * The minimum capabilities a model MUST meet to serve the task. A substitution
 * is only admissible when its capability matrix ≥ this floor.
 */
export interface CapabilityFloor {
  readonly reasoningTier: ReasoningTier;
  readonly contextTokens: number;
  readonly structuredOutput: boolean;
  readonly toolUse: boolean;
  readonly latencyClass: LatencyClass;
}

/** Stable identifier of an OWNER-approved model substitution. */
export type ModelSubstitutionId = string & {
  readonly __brand?: "ModelSubstitutionId";
};

/**
 * An approved model substitution. An EMPTY `approvedSubstitutions` array on a
 * policy means NO substitution is ever permitted for the task.
 */
export interface ModelSubstitution {
  /** Stable id for this approved substitution (FK target in the ledger). */
  readonly id: ModelSubstitutionId;
  readonly fromModelId: string;
  readonly toModelId: string;
  readonly provider: ProviderRouteId;
  /** The capability matrix the substitute model satisfies. */
  readonly capabilities: CapabilityFloor;
  /** Optional human-readable rationale for the audit trail. */
  readonly reason?: string;
}

// ─── Validation / retention / budget-scope policies ───────────────────────────

/**
 * Output validation policy: a reference to a registered zod schema (resolved
 * by name at dispatch time) plus a flag for the numeric-guard pass that
 * catches fabricated numbers.
 */
export interface OutputValidationPolicy {
  /** Registered name of the zod schema the output must satisfy. */
  readonly schemaRef: string;
  /** Run the numeric-guard pass (reject unsupported numbers) when true. */
  readonly numericGuard: boolean;
}

/**
 * Retention policy for prompt/response text. Retention is OFF by default —
 * a policy must opt in explicitly, and only where the data policy allows.
 * Consistency (validated): any `retain*: true` requires a positive integer
 * `ttlDays`; `ttlDays` without any retain flag is malformed.
 */
export interface RetentionPolicy {
  readonly retainPrompt: boolean;
  readonly retainResponse: boolean;
  /** Retention horizon in days; REQUIRED when anything is retained. */
  readonly ttlDays?: number;
}

/**
 * A budget-scope template the executor must resolve and hold before dispatch
 * (consumed by the stacked budgets PR). Placeholder segments are written in
 * braces, e.g. "entity:{entity}:daily". Format is validated at registry load.
 */
export type BudgetScopeTemplate = string & {
  readonly __brand?: "BudgetScopeTemplate";
};

// ─── The inverted contracts (§8.1) ────────────────────────────────────────────

/** Correlation hints for tracing/audit. Never authority-bearing. */
export interface AiInvocationCorrelation {
  readonly traceId?: string;
  readonly parentRequestId?: string;
  readonly runId?: string;
  /** Human-readable origin, e.g. "worker:pick-generation". */
  readonly source?: string;
}

/**
 * OPTIONAL caller narrowing of the registry-granted authority (§8.1: "the
 * caller may request less authority, never more"). Every field is a REDUCTION:
 *
 *   - `permittedProviderRoutes` — must be a non-empty SUBSET of the policy's.
 *   - `permittedModes`          — must be a non-empty SUBSET of the policy's.
 *   - `maxVendorCashUsd`        — must be ≤ the policy cap.
 *   - `approvedSubstitutionIds` — must be a SUBSET of the policy's ids
 *                                 (empty array = "no substitution for this
 *                                 call" — always allowed).
 *   - `retention`               — may only turn retention OFF or shorten the
 *                                 TTL; it can never enable retention the
 *                                 policy did not grant.
 *
 * Any violation is an authority-escalation attempt → `PolicyBlocked`.
 */
export interface AiAuthorityNarrowing {
  readonly permittedProviderRoutes?: readonly ProviderRouteId[];
  readonly permittedModes?: readonly CostMode[];
  readonly maxVendorCashUsd?: number;
  readonly approvedSubstitutionIds?: readonly ModelSubstitutionId[];
  readonly retention?: RetentionPolicy;
}

/**
 * What a caller may say (§8.1). NOTHING here grants authority: policy comes
 * from the registry, identity comes from the Trusted Actor boundary (#159),
 * and `narrowing` can only shrink what the registry granted.
 */
export interface AiTaskInvocationRequest {
  readonly taskClass: RegisteredAiTaskClass;
  /** Caller-supplied idempotency handle (format-validated, §8.4). */
  readonly requestId: string;
  /**
   * The acting identity, produced ONLY by the constructors in
   * `@/lib/auth/actor` (PR #159). Never accepted across an RPC boundary as a
   * plain object — route handlers must resolve the session/service identity
   * server-side and pass the resulting TrustedActor.
   */
  readonly actor: TrustedActor;
  readonly entity: Entity;
  /** The task input payload. Scanned for secret/card material (§8.4/§8.5). */
  readonly input: unknown;
  readonly correlation?: AiInvocationCorrelation;
  /** Optional authority REDUCTION. Escalation attempts are rejected. */
  readonly narrowing?: AiAuthorityNarrowing;
}

/**
 * What the OWNER grants per task class (§8.1) — the single source of policy
 * authority, owned by the versioned in-code registry (`policy-registry.ts`).
 * Callers never construct or supply one of these; the executor resolves it by
 * `taskClass` and intersects it with any caller narrowing.
 */
export interface AiTaskPolicyDefinition {
  readonly taskClass: RegisteredAiTaskClass;
  readonly surface: AiSurface;
  readonly dataPolicy: DataPolicy;
  readonly capabilityFloor: CapabilityFloor;
  /** Explicit permitted provider routes — NO wildcard. */
  readonly permittedProviderRoutes: readonly ProviderRouteId[];
  /** The cost modes this task may run under (intersected with the env mode). */
  readonly permittedModes: readonly CostMode[];
  /**
   * Hard cap on vendor cash in USD; 0 is valid and common. Represented as a
   * `number` validated to ≥ 0, finite, ≤ the global ceiling, and at most 6
   * decimal places (see validation.ts). If sub-cent ledger arithmetic ever
   * needs exact decimals, migrate to a decimal string in one versioned change.
   */
  readonly maxVendorCashUsd: number;
  /** Budget scopes the executor must resolve+hold before dispatch. */
  readonly requiredBudgetScopes: readonly BudgetScopeTemplate[];
  /** Empty array = no substitution ever. */
  readonly approvedSubstitutions: readonly ModelSubstitution[];
  readonly validationPolicy: OutputValidationPolicy;
  readonly retentionPolicy: RetentionPolicy;
  /**
   * Version of THIS policy definition. Production may never run a policy whose
   * version is "unversioned" (§8.4) — enforced fail-closed by the executor.
   */
  readonly policyVersion: string;
}

/**
 * The authority actually in effect for one invocation: the registry policy
 * after caller narrowing has been applied and checked. Produced ONLY by
 * `resolveEffectiveAuthority` (validation.ts).
 */
export interface EffectiveAuthority {
  readonly taskClass: RegisteredAiTaskClass;
  readonly surface: AiSurface;
  readonly dataPolicy: DataPolicy;
  readonly capabilityFloor: CapabilityFloor;
  readonly permittedProviderRoutes: readonly ProviderRouteId[];
  readonly permittedModes: readonly CostMode[];
  readonly maxVendorCashUsd: number;
  readonly requiredBudgetScopes: readonly BudgetScopeTemplate[];
  readonly approvedSubstitutions: readonly ModelSubstitution[];
  readonly validationPolicy: OutputValidationPolicy;
  readonly retentionPolicy: RetentionPolicy;
  readonly policyVersion: string;
}

// ─── Results ──────────────────────────────────────────────────────────────────

/** Pre-call funding intent (blueprint §B.3). Never a claim of settlement. */
export type FundingLabel =
  | "CASH_EXPECTED"
  | "CREDIT_ELIGIBLE_UNCONFIRMED"
  | "CREDIT_EXPECTED_FROM_ACTIVE_GRANT"
  | "LOCAL_RESOURCE"
  | "EXTERNAL_FREE_ALLOWANCE_UNCONFIRMED"
  | "BLOCKED";

/** Per-attempt summary carried back in the result (never a bare string). */
export interface AiAttemptSummary {
  readonly ordinal: number;
  readonly providerRequested: ProviderRouteId;
  /** null until transport actually dispatched (blueprint §B.2). */
  readonly providerUsed: ProviderRouteId | null;
  readonly modelRequested: string;
  readonly modelResolved: string | null;
  readonly status:
    | "DISPATCHED"
    | "SUCCEEDED"
    | "FAILED"
    | "TIMEOUT"
    | "AMBIGUOUS";
  readonly errorCode?: string;
}

/**
 * The result of an AI task. Carries the invocation id, the validated output,
 * per-attempt summaries, and the pre-call funding label — never a bare string.
 *
 * `output` is generic so callers can type the validated shape; it defaults to
 * `unknown` to force explicit narrowing at the boundary.
 */
export interface AiTaskResult<TOutput = unknown> {
  readonly invocationId: string;
  readonly output: TOutput;
  readonly attempts: readonly AiAttemptSummary[];
  readonly fundingLabel: FundingLabel;
  /** The policy version that governed this invocation (audit). */
  readonly policyVersion: string;
}
