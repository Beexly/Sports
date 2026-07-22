/**
 * GSE Formal Foundry — Inductive Tuning Profile
 * Authoritative stance from research: stay linear, leave all NL at defaults.
 * Do not tune Gröbner / NLSat / interval / tangent parameters.
 *
 * WHY nonlinear stays untouched (closed research — do not reopen): Z3
 * nonlinear arithmetic / Gröbner bases / NLSat / F4-F5-etc signature
 * algorithms are explicitly OUT OF SCOPE for this package. Every formula
 * this package's IC3 controller / Apalache client constructs is meant to
 * stay in the LINEAR integer fragment (matching this repo's real specs,
 * `formal/credit-budget/CreditReservation.tla` /
 * `formal/ai-invocation/InvocationClaim.tla`, both pure Presburger
 * arithmetic + finite enumerations — no multiplication of two variables
 * anywhere). If a candidate/frame/transition formula ever NEEDS nonlinear
 * reasoning to check, that is a MODELING bug to fix upstream, not a solver
 * parameter to tune here.
 */

export const INDUCTIVE_PROFILE = {
  /** Restart strategy for inductive queries */
  restart: "static" as const,

  /** Phase selection */
  phase: "caching" as const,

  /** Linear arithmetic propagation */
  linearPropagation: true,

  /** Encoding — keep repo default */
  encoding: "default" as const,

  /** Strong typing invariants required on every state */
  requireTypeOK: true,

  /** All nonlinear engines left at defaults — never tuned. See the module
   *  header: this is a closed-research constraint, not an oversight. */
  nonlinear: "defaults-only" as const,

  /** Fail-closed on unknown / timeout */
  failClosed: true,
} as const;

export type InductiveProfile = typeof INDUCTIVE_PROFILE;

/**
 * Documents exactly how this profile would be threaded through to a real
 * Apalache/Z3 invocation (even though this environment cannot invoke a real
 * one — see apalache-client.ts's header). Two real surfaces this maps to:
 *
 * 1. CLI flags to `apalache-mc check` (batch mode): the closest real
 *    Apalache CLI knob for this profile's intent is `--smt=<key>=<value>,...`
 *    (the form Apalache's public docs describe for forwarding Z3
 *    parameters), e.g. `--smt=smt.arith.solver=2,smt.phase_selection=5`.
 *    UNVERIFIED — this environment cannot invoke a real `apalache-mc` to
 *    confirm these flag names/values against a live version.
 * 2. This package's own RPC surface (verified only against the mock server
 *    in this repo's tests, see apalache-client.test.ts): as a
 *    `solverOptions`-style field forwarded through `loadSpec`'s `sources`/
 *    params to a real server's underlying Z3 session configuration — this
 *    client does not yet have a dedicated `solverOptions` parameter (its
 *    `loadSpec(sources, invariants, exports)` signature is fixed by this
 *    package's existing public API), so `toRpcSolverHints` below produces a
 *    plain string-keyed hint object a caller can fold into an `exports`
 *    entry or a future dedicated parameter without an API break.
 */
export function toRpcSolverHints(profile: InductiveProfile): Readonly<Record<string, string | boolean>> {
  return {
    "solver.restart.strategy": profile.restart,
    "solver.phase_selection": profile.phase,
    "solver.arith.propagate": String(profile.linearPropagation),
    "solver.encoding": profile.encoding,
    "solver.require_typeok": String(profile.requireTypeOK),
    "solver.fail_closed": String(profile.failClosed),
    // nonlinear params deliberately absent -> a real backend keeps its defaults
  };
}
