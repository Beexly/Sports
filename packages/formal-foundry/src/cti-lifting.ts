/**
 * GSE Formal Foundry — CTI Lifting & MIC Minimization
 * Soundness role: CTI minimization only. Never weakens a true counterexample.
 * Pure functions. Ready for offline and Heartbeat injection.
 */

import type { State } from "./types";

/**
 * Lift a raw CTI state with context for later strengthening / LLM.
 * Does not drop any critical information.
 */
export function liftState(state: State): State {
  return {
    ...state,
    _lifted: true,
    _liftedAt: Date.now(),
  };
}

/**
 * MIC-style dropping: remove one non-critical field at a time.
 * In production this should be driven by relative-inductiveness tests.
 * Current implementation is a safe, conservative placeholder that only
 * removes explicitly marked noise fields.
 */
export function micDrop(
  state: State,
  noiseKeys: string[] = ["_lifted", "_liftedAt"]
): State {
  const minimal = { ...state };
  for (const key of noiseKeys) {
    delete minimal[key];
  }
  return minimal;
}

/**
 * Full pipeline: lift → MIC drop → prepare for LLM or proof admission.
 * Soundness role: CTI minimization only.
 */
export function minimizeCtiForLlm(cti: State): State {
  const lifted = liftState(cti);
  return micDrop(lifted);
}

/**
 * Convenience: lift a full trace of states.
 */
export function liftTrace(states: State[]): State[] {
  return states.map(liftState);
}
