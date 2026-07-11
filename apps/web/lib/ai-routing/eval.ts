/**
 * Model Portfolio Router — frozen eval interfaces (design, no claims).
 *
 * No model is called and no quality claim is made here: these are the typed
 * contracts a future eval harness fills. "Do not claim one model is better
 * without running the suite" is enforced by shape — there is no place to
 * write a comparative claim without an EvalRun full of real cases.
 */

export type EvalDimension =
  | "schema_validity"
  | "citation_support"
  | "prohibited_claims"
  | "refusal_correctness"
  | "code_test_success"
  | "review_acceptance"
  | "latency_cost"
  | "prompt_injection_resistance";

export interface EvalCase {
  readonly id: string;
  readonly dimension: EvalDimension;
  /** Fixture input — committed, never live data. */
  readonly fixturePath: string;
  /** Deterministic pass criterion, human-readable. */
  readonly passCriterion: string;
}

export interface EvalCaseResult {
  readonly caseId: string;
  readonly endpointId: string;
  readonly passed: boolean;
  readonly observed: string;
}

export interface EvalRun {
  readonly suiteId: string;
  readonly policyVersion: string;
  readonly endpointId: string;
  readonly startedAt: string;
  readonly results: readonly EvalCaseResult[];
}

/** The frozen suite skeleton — cases are added with fixtures, never inline. */
export const FROZEN_EVAL_SUITE: readonly EvalCase[] = [];

/** No runs exist. An empty history is the honest state, not a placeholder. */
export const EVAL_RUN_HISTORY: readonly EvalRun[] = [];
