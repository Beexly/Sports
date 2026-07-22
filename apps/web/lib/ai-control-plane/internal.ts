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
 *     clocks, fake dispatch, and in-memory receipt stores;
 *   - future control-plane-internal modules within this directory.
 *
 * If an import-boundary guard is added for this package (see the stacked
 * import-guard branch), THIS file's test-only importers are the only entries
 * that belong on its allowlist. Any production `import ... from
 * ".../ai-control-plane/internal"` (or a deep import of ./executor,
 * ./cost-mode resolvers) is a review-rejectable authority bypass.
 */

export {
  createAiExecutor,
  type AiExecutor,
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
