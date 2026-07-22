/**
 * AI control-plane task & result contracts (blueprint §A.2).
 *
 * Every field is explicit — there are NO defaults that spend money. These are
 * PURE, additive type declarations. This module is imported by NOBODY at
 * runtime yet; it defines the shape that PR B's `executeAiTask` will validate.
 */

import type { ClaudeSurface } from "@/lib/claude-api/model-router";
import type { CostMode } from "./cost-mode";

/**
 * Logical class of AI task, distinct from the model `surface`. Drives policy,
 * validation, and ledger grouping. Kept as a branded string (not a closed
 * union) so new task classes are additive without a contract change here; the
 * validator (PR B) enforces the registered set at the boundary.
 */
export type AiTaskClass = string & { readonly __brand?: "AiTaskClass" };

/** Re-export the model-router surface union so callers use one canonical type. */
export type { ClaudeSurface };

/** Which business entity the task is executed on behalf of. */
export type Entity = "GSE" | "GSN" | "XXX" | "PERSONAL";

/** Sensitivity of the data flowing through the task (drives retention/routing). */
export type DataClassification =
  | "PUBLIC"
  | "INTERNAL"
  | "USER_PRIVATE"
  | "REGULATED";

/**
 * Provider identifiers. Explicit list, NO wildcard (blueprint §A.2). Aligned by
 * name with the existing provider surface (`bedrock` | `vertex` | `anthropic`
 * in claude-api), plus the additional routes the control plane will admit.
 * `anthropic-direct` distinguishes the first-party direct API from a hosted
 * route, matching the ledger's provider naming (blueprint §B.2).
 */
export type ProviderId =
  | "anthropic-direct"
  | "bedrock"
  | "vertex"
  | "cerebras"
  | "local";

/** Coarse reasoning capability tiers a task can require of a model. */
export type ReasoningTier = "fast" | "standard" | "deep";

/** Coarse latency expectation a task can require. */
export type LatencyClass = "interactive" | "batch" | "background";

/**
 * The minimum capabilities a model MUST meet to serve the task. A substitution
 * is only admissible when its capability matrix ≥ this floor (enforced in PR E).
 */
export interface CapabilityFloor {
  readonly reasoningTier: ReasoningTier;
  readonly contextTokens: number;
  readonly structuredOutput: boolean;
  readonly toolUse: boolean;
  readonly latencyClass: LatencyClass;
}

/**
 * An approved model substitution. An EMPTY `approvedSubstitutions` array means
 * NO substitution is ever permitted for the task (blueprint §A.2 / §E). Capability
 * fields are captured so PR E can enforce floor ≥ requirement per pair.
 */
export interface ModelSubstitution {
  /** Stable id for this approved substitution (FK target in the ledger). */
  readonly id: string;
  readonly fromModelId: string;
  readonly toModelId: string;
  readonly provider: ProviderId;
  /** The capability matrix the substitute model satisfies. */
  readonly capabilities: CapabilityFloor;
  /** Optional human-readable rationale for the audit trail. */
  readonly reason?: string;
}

/**
 * Output validation policy: a reference to a zod schema (resolved by name in
 * PR B, kept as an opaque ref here to avoid a runtime import) plus a flag for
 * the numeric-guard pass that catches fabricated numbers.
 */
export interface OutputValidationPolicy {
  /** Registered name of the zod schema the output must satisfy. */
  readonly schemaRef: string;
  /** Run the numeric-guard pass (reject unsupported numbers) when true. */
  readonly numericGuard: boolean;
}

/**
 * Retention policy for prompt/response text. Retention is OFF by default —
 * callers must opt in explicitly, and only where the data classification allows.
 */
export interface RetentionPolicy {
  readonly retainPrompt: boolean;
  readonly retainResponse: boolean;
  /** Optional retention horizon in days; absent = do not retain / infra default. */
  readonly ttlDays?: number;
}

/**
 * Minimal structural reference to the acting identity.
 *
 * TODO(#159): replace `ActorRef` with the real `TrustedActor` type once
 * PR #159 (branch `security/trusted-actor-model`) lands on main. It is NOT on
 * main yet, so PR A intentionally does NOT depend on it — this local structural
 * stub keeps PR A independent. The field names mirror the ledger columns
 * (`actorType` / `actorSubjectId`) so the swap is mechanical.
 */
export interface ActorRef {
  /** Kind of actor. SERVICE/SYSTEM are used by background workers. */
  readonly type: "USER" | "SERVICE" | "SYSTEM";
  /** Server-derived stable subject id for the actor. */
  readonly subjectId: string;
}

/**
 * The one task contract every AI invocation is described by (blueprint §A.2).
 * No field carries a money-spending default; `maxVendorCashUsd: 0` is valid and
 * common.
 */
export interface AiTaskRequest {
  readonly taskClass: AiTaskClass;
  /** Reuses the model-router surface union. */
  readonly surface: ClaudeSurface;
  readonly entity: Entity;
  readonly dataClassification: DataClassification;
  readonly capabilityFloor: CapabilityFloor;
  /** Explicit permitted providers — NO wildcard. */
  readonly permittedProviders: readonly ProviderId[];
  /** Request-level cap on cost modes, intersected with the env mode. */
  readonly permittedModes: readonly CostMode[];
  /** Hard cap on vendor cash; 0 is valid and common. */
  readonly maxVendorCashUsd: number;
  /** Optional cap on total economic cost (local/electricity accounting), later. */
  readonly maxTotalEconomicCostUsd?: number;
  /** Empty array = no substitution ever. */
  readonly approvedSubstitutions: readonly ModelSubstitution[];
  readonly validation: OutputValidationPolicy;
  readonly retention: RetentionPolicy;
  /** Caller-supplied idempotency handle. */
  readonly requestId: string;
  /**
   * Acting identity. Structural `ActorRef` stub today; swaps to `TrustedActor`
   * from PR #159 once it lands (see ActorRef TODO).
   */
  readonly actor: ActorRef;
}

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
  readonly providerRequested: ProviderId;
  /** null until transport actually dispatched (blueprint §B.2). */
  readonly providerUsed: ProviderId | null;
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
 * per-attempt summaries, and the pre-call funding label — never a bare string
 * (blueprint §A.2).
 *
 * `output` is generic so callers can type the validated shape; it defaults to
 * `unknown` to force explicit narrowing at the boundary.
 */
export interface AiTaskResult<TOutput = unknown> {
  readonly invocationId: string;
  readonly output: TOutput;
  readonly attempts: readonly AiAttemptSummary[];
  readonly fundingLabel: FundingLabel;
}

/**
 * The single mandatory entry point (blueprint §A.1).
 *
 * DEFERRED TO PR B: this is a typed stub only. PR A ships CONTRACTS, the
 * cost-mode resolver, and typed errors — it does NOT wire the ledger or provider
 * dispatch. Calling this throws until PR B implements it. It is exported so the
 * signature is reviewable and stable, but it is imported by NOBODY yet.
 */
export function executeAiTask(_task: AiTaskRequest): Promise<AiTaskResult> {
  throw new Error(
    "not implemented — PR B wires the ledger and dispatch (executeAiTask)",
  );
}
