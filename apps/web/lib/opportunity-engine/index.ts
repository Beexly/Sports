/**
 * NOVA opportunity engine — S1 domain contracts + S2 capability governance.
 *
 * This barrel intentionally exports ONLY the S1 and S2 split-unit modules of
 * the frozen #146 split (`docs/ai/phase0/NOVA_CONVERGENCE_FREEZE_2026-07-22.md`
 * §5.3). Source registry/runtime/evidence (S3) and Founder OS/agent surfaces
 * (S4) land in their own split units and are re-added here as they merge.
 */
export * from "./types";
export * from "./lifecycle";
export * from "./credit";
export * from "./credit-snapshot";
export * from "./scoring";
export * from "./policy";
export * from "./pipeline";
export * from "./experiment";
export * from "./learning";
export * from "./monetization";
export * from "./capability-provenance";
export * from "./capability-source-schema";
export * from "./capability-inventory";
export * from "./capability-governance";
// capability-governor: explicit re-export list. The legacy pre-governance
// shortlist `routeCapabilities` (and its record types) is deliberately NOT on
// the public barrel — it consults no permission manifests, no supply-chain
// state, and no provenance hashes, so only the fail-closed
// `selectInspectionCandidates` path is the public governance surface.
// `routeCapabilities` stays importable solely from
// "./capability-governor" for its documented pre-governance tests.
export {
  classifyCapabilityTrust,
  detectCapabilityRisk,
  MAX_INSPECTION_CANDIDATES,
  selectInspectionCandidates,
  type CapabilityIneligibilityReason,
  type CapabilityInspectionCandidate,
  type CapabilityInspectionRecommendation,
  type CapabilityRiskFlag,
  type CapabilityTaskClass,
  type CapabilityTrustTier,
  type IneligibleCapabilityRecord,
  type InspectionSelectionInput,
} from "./capability-governor";
