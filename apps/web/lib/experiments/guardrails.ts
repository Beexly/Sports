/**
 * Experiment guardrails — invariants every experiment must respect,
 * irrespective of its declared metrics.
 *
 * If an experiment violates any of these, it must roll back regardless
 * of primary lift.
 */

import type { Experiment } from "./experiments";

export interface PolicyViolation {
  readonly code: string;
  readonly experimentId: string;
  readonly detail: string;
}

const FORBIDDEN_PRIMARY_PREFIXES = ["confusion.", "restraint."];
const REQUIRED_GUARDRAILS_BY_SURFACE: ReadonlyArray<{
  readonly surface: string;
  readonly guardrail: string;
}> = [
  { surface: "picks", guardrail: "restraint.responsible_play_followed" },
  { surface: "today", guardrail: "restraint.responsible_play_followed" },
  { surface: "no-bet", guardrail: "restraint.disclosure_shown" },
  { surface: "parlay-mri", guardrail: "restraint.disclosure_shown" },
];

/**
 * Run policy checks across every experiment. Empty array means clean.
 */
export function checkPolicies(experiments: ReadonlyArray<Experiment>): ReadonlyArray<PolicyViolation> {
  const violations: PolicyViolation[] = [];
  for (const exp of experiments) {
    if (FORBIDDEN_PRIMARY_PREFIXES.some((p) => exp.primary.event.startsWith(p))) {
      violations.push({
        code: "PRIMARY_IS_GUARDRAIL_FAMILY",
        experimentId: exp.id,
        detail: `Primary event ${exp.primary.event} belongs to a guardrail family and cannot be a success metric.`,
      });
    }
    if (exp.guardrails.length === 0) {
      violations.push({
        code: "NO_GUARDRAILS",
        experimentId: exp.id,
        detail: "Every experiment must declare at least one guardrail.",
      });
    }
    if (exp.riskClass === "high" && !exp.guardrails.some((g) => g.blocking)) {
      violations.push({
        code: "HIGH_RISK_NO_BLOCKING_GUARDRAIL",
        experimentId: exp.id,
        detail: "High-risk experiments must have at least one blocking guardrail.",
      });
    }
    for (const required of REQUIRED_GUARDRAILS_BY_SURFACE) {
      if (exp.surfaces.includes(required.surface)) {
        const has = exp.guardrails.some((g) => g.event === required.guardrail);
        if (!has) {
          violations.push({
            code: "MISSING_REQUIRED_GUARDRAIL",
            experimentId: exp.id,
            detail: `Experiment touches ${required.surface}; must include guardrail ${required.guardrail}.`,
          });
        }
      }
    }
  }
  return violations;
}

/** Disallowed experiment categories — never run, no matter the metrics. */
export const FORBIDDEN_EXPERIMENT_PATTERNS: ReadonlyArray<{
  readonly name: string;
  readonly reason: string;
}> = [
  { name: "scarcity-countdown", reason: "Manufactures urgency around a betting decision." },
  { name: "bandwagon-social-proof", reason: "Implies consensus to drive a betting action." },
  { name: "hide-no-bet-list", reason: "Suppresses restraint disclosure." },
  { name: "obscure-tier-locks", reason: "Hides paywall before the user can compare." },
  { name: "default-larger-stake", reason: "Nudges stake-up by default." },
  { name: "remove-responsible-play-link", reason: "Removes compliance disclosure." },
];
