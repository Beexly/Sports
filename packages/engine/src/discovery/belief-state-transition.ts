/**
 * DISCOVERY LAYER — Belief-State Transition (Invention 24's atomic object).
 *
 * Re-exports the Einstein-layer belief transition (the time-locked, causal, adversarially-tested
 * record) and extends it with the DISCOVERY outcome: which theory this transition supports or
 * refutes, and what was learned. A pick is just one possible expression of a belief-state
 * transition; a PASS, a WATCHLIST, a "market appears efficient here", or a newly-discovered LAW
 * are others. Pure.
 */

export * from "../einstein/belief-transition.js";
import type { BeliefTransition } from "../einstein/belief-transition.js";
import type { TheoryStatus } from "./epistemic-compression.js";

export interface LearningOutcome {
  /** The theory id this transition bears on, if any. */
  readonly theoryId: string | null;
  /** Did the transition support, refute, or stay neutral toward the theory? */
  readonly effect: "supports" | "refutes" | "neutral";
  /** Resulting theory status if this transition changes it. */
  readonly resultingStatus: TheoryStatus | null;
  readonly note: string;
}

export interface DiscoveryBeliefTransition extends BeliefTransition {
  readonly learning: LearningOutcome;
}

/** Attach a learning outcome to a belief transition (the discovery loop's record). */
export function withLearning(t: BeliefTransition, learning: LearningOutcome): DiscoveryBeliefTransition {
  return { ...t, learning };
}
