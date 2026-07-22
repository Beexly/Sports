/**
 * Metacortex hard-policy gate (docs/genesis/FIRST_BUILD_CONTRACT.md §9.3).
 *
 * CRITICAL: this module RECOMPUTES eligibility from each candidate's raw
 * fields and the contract — it never reads `hardPolicyEligible`/
 * `hardPolicyFailure` from docs/genesis/fixtures/capability-candidates.example.json.
 * Those two fields are EXPECTED-OUTCOME metadata the fixture author
 * annotated for test assertions; treating them as planner input would make
 * the hard-constraint tests vacuous (the planner would just echo the
 * fixture's own answer back).
 *
 * A violation makes a candidate ineligible outright — it is never merely
 * scored lower (§9.3: "no weighted score may compensate for a hard-policy
 * failure").
 */

import type { AudienceClass, ConstraintResult, FixtureCapabilityCandidate, IntelligenceContract } from "./contracts";
import { QUALITY_FLOOR_BY_TIER, isCapabilityStateEligible } from "./contracts";

function ok(constraint: string, reason: string): ConstraintResult {
  return { constraint, satisfied: true, reason };
}

function fail(constraint: string, reason: string): ConstraintResult {
  return { constraint, satisfied: false, reason };
}

/**
 * Optional v0 extension of the fixture shape used ONLY by the temporal-cutoff
 * test (docs/genesis/fixtures/capability-candidates.example.json's four base
 * candidates never set it, so they always pass this check). Represents when a
 * capability revision became knowable/usable.
 */
export interface TemporalCandidate extends FixtureCapabilityCandidate {
  readonly availableFrom?: string;
}

export function evaluateHardConstraints(
  candidate: TemporalCandidate,
  contract: IntelligenceContract,
  audience: AudienceClass = contract.audience,
): readonly ConstraintResult[] {
  const results: ConstraintResult[] = [];

  // 1. Implementation-state eligibility (fail-closed matrix; STRANDED_BRANCH/
  //    DOCTRINE_ONLY/etc. never executable for any audience).
  results.push(
    isCapabilityStateEligible(candidate.implementationState, audience)
      ? ok("IMPLEMENTATION_STATE_ELIGIBLE", `${candidate.implementationState} is eligible for ${audience}.`)
      : fail("IMPLEMENTATION_STATE_ELIGIBLE", `${candidate.implementationState} is not eligible for ${audience}.`),
  );

  // 2. Publication boundary: the candidate must be permitted for the contract's audience.
  results.push(
    candidate.permittedAudiences.includes(audience)
      ? ok("PUBLICATION_BOUNDARY", `${candidate.id} permits ${audience}.`)
      : fail("PUBLICATION_BOUNDARY", `${candidate.id} does not permit ${audience} (permits ${candidate.permittedAudiences.join(", ")}).`),
  );

  // 3. Source/evidence clearance.
  const clearanceRequired = contract.evidencePolicy.requireClearance;
  results.push(
    !clearanceRequired || candidate.requiresVettedEvidence
      ? ok("SOURCE_CLEARANCE_REQUIRED", "Clearance requirement satisfied or not required.")
      : fail("SOURCE_CLEARANCE_REQUIRED", `${candidate.id} does not require vetted evidence, but the contract requires clearance.`),
  );

  // 4. Temporal cutoff — only meaningful for candidates that declare availableFrom.
  const cutoff = Date.parse(contract.temporalCutoff.asOf);
  const availableFrom = candidate.availableFrom ? Date.parse(candidate.availableFrom) : null;
  results.push(
    availableFrom === null || availableFrom <= cutoff
      ? ok("TEMPORAL_CUTOFF", "No post-cutoff capability revision required.")
      : fail("TEMPORAL_CUTOFF", `${candidate.id} became available at ${candidate.availableFrom}, after the contract's cutoff ${contract.temporalCutoff.asOf}.`),
  );

  // 5. Privacy / remote-execution compatibility.
  results.push(
    contract.privacy.remoteExecutionAllowed || !candidate.remoteExecution
      ? ok("PRIVACY_COMPATIBLE", "Execution location compatible with the privacy policy.")
      : fail("PRIVACY_COMPATIBLE", `${candidate.id} requires remote execution, but the contract's privacy policy forbids it.`),
  );

  // 6/7. Budget ceilings.
  results.push(
    candidate.estimatedCostUsd <= contract.budget.maximumCostUsd
      ? ok("BUDGET_COST", `${candidate.estimatedCostUsd} <= ${contract.budget.maximumCostUsd}.`)
      : fail("BUDGET_COST", `${candidate.estimatedCostUsd} exceeds the contract's maximumCostUsd ${contract.budget.maximumCostUsd}.`),
  );
  results.push(
    candidate.estimatedLatencyMs <= contract.budget.maximumLatencyMs
      ? ok("BUDGET_LATENCY", `${candidate.estimatedLatencyMs} <= ${contract.budget.maximumLatencyMs}.`)
      : fail("BUDGET_LATENCY", `${candidate.estimatedLatencyMs} exceeds the contract's maximumLatencyMs ${contract.budget.maximumLatencyMs}.`),
  );

  // 8. A required output type must exist for any plan to be meaningful.
  results.push(
    contract.requiredOutputs.length > 0
      ? ok("REQUIRED_OUTPUT_PRESENT", "The contract declares at least one required output.")
      : fail("REQUIRED_OUTPUT_PRESENT", "The contract declares no required outputs — no plan can satisfy it."),
  );

  // 9. Quality floor (hard constraint, never a utility term — see contracts.ts).
  const floor = QUALITY_FLOOR_BY_TIER[contract.evidencePolicy.minimumTier];
  results.push(
    candidate.qualityClass >= floor
      ? ok("QUALITY_FLOOR", `${candidate.qualityClass} >= tier-${contract.evidencePolicy.minimumTier} floor ${floor}.`)
      : fail("QUALITY_FLOOR", `${candidate.qualityClass} is below the tier-${contract.evidencePolicy.minimumTier} floor ${floor}.`),
  );

  return results;
}

export function isEligible(results: readonly ConstraintResult[]): boolean {
  return results.every((r) => r.satisfied);
}

export function failedConstraintNames(results: readonly ConstraintResult[]): readonly string[] {
  return results.filter((r) => !r.satisfied).map((r) => r.constraint);
}
