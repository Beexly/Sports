/**
 * AUTONOMY — Charter Conformance.
 *
 * The Authority Charter (defined in @sports/decision-field-runtime) is the single source of truth for
 * what the machine may do alone. This module asserts it can never DRIFT out of conformance with the
 * worker/authority audit: every irreversible/outward/spend action stays owner-gated, and only safe,
 * reversible actions are SELF. A test runs this so a future edit that loosens authority fails CI. Pure.
 */

import { AUTHORITY_CHARTER, type AutonomousActionType, type AuthorityLevel } from "@sports/decision-field-runtime";

/** Actions the substrate audit classified as owner-gated — they must NEVER be SELF. */
export const OWNER_GATED_ACTIONS: readonly AutonomousActionType[] = ["PUBLISH_CARD", "SPEND", "ROSTER_WRITE", "FLIP_GATE"];

/** Actions safe to run alone — reversible, no spend, no outward effect. */
export const SELF_ELIGIBLE_ACTIONS: readonly AutonomousActionType[] = ["OBSERVE", "INGEST_FREE", "CLASSIFY", "COMPILE_CARD", "RUN_AUTOPSY"];

export interface ConformanceResult {
  readonly ok: boolean;
  readonly violations: readonly string[];
}

/** Verify the charter matches the audit: owner-gated actions are OWNER_GATE; self actions are SELF. */
export function checkCharterConformance(): ConformanceResult {
  const violations: string[] = [];
  for (const a of OWNER_GATED_ACTIONS) {
    const level: AuthorityLevel = AUTHORITY_CHARTER[a];
    if (level === "SELF") violations.push(`${a} is owner-gated by the audit but the charter grants SELF.`);
    if (level !== "OWNER_GATE") violations.push(`${a} must be OWNER_GATE; charter says ${level}.`);
  }
  for (const a of SELF_ELIGIBLE_ACTIONS) {
    if (AUTHORITY_CHARTER[a] !== "SELF") violations.push(`${a} should be SELF (safe, reversible); charter says ${AUTHORITY_CHARTER[a]}.`);
  }
  return { ok: violations.length === 0, violations };
}

/** Throwing variant for CI/test backstops. */
export function assertCharterConformance(): void {
  const r = checkCharterConformance();
  if (!r.ok) throw new Error(`Charter conformance failed:\n  ${r.violations.join("\n  ")}`);
}
