/**
 * @sports/epistemic-twin — pure core.
 *
 * Implements docs/frontier/OPERATIONAL_EPISTEMIC_TWIN_CONTRACT.md (FV-003) §3
 * composition law over a typed capability dependency graph. Pure, unwired:
 * no consumer wiring (no /api/health, no cockpit) — that lands in a later PR.
 */
export {
  SEVERITY_RANK,
  TwinCycleError,
  decayEvidence,
  composeOne,
  composeGraph,
  toCapabilityStatus,
  canActAsIf,
} from "./axes.js";
export type {
  Severity,
  SeverityTag,
  Certainty,
  Intent,
  GatedIntent,
  DepKind,
  CapabilityEdge,
  OwnEvidence,
  CapabilityNode,
  OwnState,
  ComposedState,
  CapabilityStatus,
} from "./axes.js";

export { buildSeedRegistry, SEED_CAPABILITY_IDS } from "./seed-registry.js";
export type { SeedCapabilityId } from "./seed-registry.js";
