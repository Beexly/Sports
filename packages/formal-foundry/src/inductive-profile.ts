/**
 * GSE Formal Foundry — Inductive Tuning Profile
 * Authoritative stance from research: stay linear, leave all NL at defaults.
 * Do not tune Gröbner / NLSat / interval / tangent parameters.
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

  /** All nonlinear engines left at defaults — never tuned */
  nonlinear: "defaults-only" as const,

  /** Fail-closed on unknown / timeout */
  failClosed: true,
} as const;

export type InductiveProfile = typeof INDUCTIVE_PROFILE;
