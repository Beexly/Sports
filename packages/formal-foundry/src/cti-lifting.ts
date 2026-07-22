/**
 * GSE Formal Foundry — CTI Lifting & MIC Minimization
 * Soundness role: CTI minimization only. Never weakens a true counterexample.
 * Pure functions. Ready for offline and Heartbeat injection.
 *
 * This is IC3/PDR's generalization step (Bradley, "SAT-Based Model Checking
 * without Unrolling", VMCAI 2011 — the `generalize`/`MIC` procedure), adapted
 * from clause-literal-dropping to variable-assignment-dropping: given a
 * concrete counterexample state and an ORACLE that says whether a given
 * partial assignment still demonstrates the property the concrete state
 * demonstrated, greedily drop as many variable assignments as possible while
 * the oracle keeps saying "yes". Matches this repo's own
 * `formal/INDUCTION_DOCTRINE.md` §4 discipline ("the weakest general
 * predicate that blocks its whole class ... never patch the specific CTI
 * values"), hand-executed there across the real CTIs in
 * `formal/ai-invocation/INDUCTIVE_STRENGTHENING_LOG.md` and
 * `formal/credit-budget/INDUCTIVE_STRENGTHENING_LOG.md` — this module makes
 * that discipline a reusable, tested algorithm.
 *
 * SAFE-BY-DEFAULT: every function below takes the validity oracle as an
 * OPTIONAL parameter. Without one, the default oracle rejects every
 * drop (`() => false`), so calling any of these with just a state is a
 * pure no-op that returns the state unchanged — literally cannot weaken a
 * true counterexample, because it drops nothing. Passing a real oracle
 * (backed, in production, by a genuine relative-inductiveness / transition
 * re-check — e.g. via apalache-client.ts) is what turns this into REAL
 * generalization. `ic3-controller.ts`'s `admitCti` does not yet wire a real
 * oracle through (see that file's docstring) — until it does, its lifting
 * step is the safe no-op, which is honest and intentional, not silently
 * pretended otherwise.
 */

import type { State } from "./types";

/** IMPORTANT — matches real IC3/MIC implementations' well-known caveat:
 *  this is a single greedy pass, so the result is a LOCALLY minimal state
 *  for the given `order` (no single further key can be dropped), NOT
 *  necessarily the globally smallest one that blocks the class — different
 *  orders can yield different (all individually irreducible) results. */
export function micDrop(
  state: State,
  isStillValid: (partial: Partial<State>) => boolean = () => false,
  order: string[] = Object.keys(state),
): State {
  let kept: State = { ...state };
  for (const key of order) {
    if (!(key in kept)) continue; // already dropped, or not part of this state
    const { [key]: _removed, ...rest } = kept;
    if (isStillValid(rest)) {
      kept = rest;
    }
  }
  return kept;
}

/**
 * Lift a raw CTI state: generalize it via `micDrop` (real generalization
 * when `isStillValid` is given; a safe pass-through otherwise — see module
 * docstring). Superseded the previous placeholder, which only tagged the
 * state with `_lifted`/`_liftedAt` bookkeeping fields and never actually
 * dropped anything.
 */
export function liftState(
  state: State,
  isStillValid?: (partial: Partial<State>) => boolean,
  order?: string[],
): State {
  return micDrop(state, isStillValid, order);
}

/**
 * Full pipeline: lift -> MIC drop -> prepare for LLM or proof admission.
 * Soundness role: CTI minimization only. Same safe-by-default posture as
 * `liftState`/`micDrop`.
 */
export function minimizeCtiForLlm(
  cti: State,
  isStillValid?: (partial: Partial<State>) => boolean,
  order?: string[],
): State {
  return liftState(cti, isStillValid, order);
}

/**
 * Lift a full trace of states. `isStillValid`, when given, is indexed
 * (`index`, `partial`) so a caller can use a DIFFERENT oracle per step (a
 * real usage typically needs this: state `i`'s validity concerns whether
 * the SUFFIX of the trace from step `i` onward still reaches the final
 * violation, a different check at each index).
 */
export function liftTrace(
  states: State[],
  isStillValid?: (index: number, partial: Partial<State>) => boolean,
): State[] {
  return states.map((s, i) => micDrop(s, isStillValid ? (partial) => isStillValid(i, partial) : undefined));
}
