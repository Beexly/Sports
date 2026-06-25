// AUTONOMY — @sports/autonomy
//
// Phase 1C: the nervous system. runAutonomousCycle reads the regime + readiness gates and PROPOSES the
// organism's next move — never executes it. It reuses the Authority Charter and the propose-only
// primitives from @sports/decision-field-runtime, and asserts the charter can never drift out of
// conformance with the worker/authority audit (owner-gated actions stay owner-gated). Fixture-safe.

export * from "./charter-conformance.js";
export * from "./autonomy-cycle.js";
// Re-export the charter primitives so consumers get one canonical authority model.
export {
  AUTHORITY_CHARTER,
  authorityFor,
  assertBoundedAutonomy,
  proposeAction,
  type AuthorityLevel,
  type AutonomousActionType,
  type AutonomousAction,
  type OperatingPlan,
} from "@sports/decision-field-runtime";
