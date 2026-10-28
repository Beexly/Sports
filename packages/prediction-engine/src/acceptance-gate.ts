/**
 * @file acceptance-gate.ts
 * Shared acceptance-gate factory for disabled model modules.
 *
 * Why this exists
 * ---------------
 * 196 production modules in this package declare `ENABLED = false`. Only five of
 * them documented an ACCEPTANCE_GATE. The other 191 are disabled with no stated
 * promotion condition, which means "disabled" carries no information: a reviewer
 * cannot tell whether a module is off because it is unvalidated, because it is
 * superseded, or because someone forgot to flip a flag.
 *
 * Rather than hand-write 191 gate blocks (mechanical work that guarantees drift),
 * every disabled module can call `acceptanceGate()` and state its promotion
 * condition in one call. The ratchet test in
 * `__tests__/acceptance-gate-coverage.test.ts` counts how many disabled modules
 * still lack a gate and fails if that count ever INCREASES. Coverage can only go
 * up; new disabled modules cannot be added without a gate.
 *
 * The gate is inert metadata. Importing this module changes no prediction.
 */

/** Default promotion thresholds, deliberately conservative. */
export const DEFAULT_GATE_THRESHOLDS = {
  minSettledObservations: 100,
  maxBrierScore: 0.22,
  maxDebiasedEce: 0.05,
  requiredConsecutiveGreenRuns: 3,
} as const;

export type GateAction = "none" | "refuse";

export interface AcceptanceGate {
  /** Why the module is off and what would turn it on. */
  readonly status: string;
  /** Minimum settled fixtures/picks before promotion is even considered. */
  readonly minSettledObservations: number;
  /** Optional Brier ceiling for the promotion decision. */
  readonly maxBrierScore?: number;
  /** Optional de-biased ECE ceiling. */
  readonly maxDebiasedEce?: number;
  /** How many consecutive green runs are required. */
  readonly requiredConsecutiveGreenRuns: number;
  /** What a disabled module does when called: nothing, or a named refusal. */
  readonly gateActionWhenDisabled: GateAction;
  /** The paper or spec this module implements, when one exists. */
  readonly paperId?: string;
}

/**
 * Build a frozen acceptance gate.
 *
 * Call with the module's own promotion condition; unspecified numeric thresholds
 * fall back to DEFAULT_GATE_THRESHOLDS so every gate is at least as strict as the
 * house default. Omitting `status` is a type error: a gate with no stated reason
 * is not a gate.
 */
export function acceptanceGate(
  spec: Pick<AcceptanceGate, "status"> & Partial<Omit<AcceptanceGate, "status">>,
): AcceptanceGate {
  return Object.freeze({
    minSettledObservations: DEFAULT_GATE_THRESHOLDS.minSettledObservations,
    maxBrierScore: DEFAULT_GATE_THRESHOLDS.maxBrierScore,
    maxDebiasedEce: DEFAULT_GATE_THRESHOLDS.maxDebiasedEce,
    requiredConsecutiveGreenRuns: DEFAULT_GATE_THRESHOLDS.requiredConsecutiveGreenRuns,
    gateActionWhenDisabled: "none" as GateAction,
    ...spec,
  });
}
