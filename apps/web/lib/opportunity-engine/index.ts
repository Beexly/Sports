/**
 * NOVA opportunity engine — S1 deterministic domain contracts, S2 capability
 * governance, and S3 source-registry/evidence domain modules.
 *
 * This barrel exports the S1 split-unit modules of the frozen #146 split
 * (`docs/ai/phase0/NOVA_CONVERGENCE_FREEZE_2026-07-22.md` §5.3), the S2
 * capability-governance surface, and, from the S3 split unit, the pure
 * source-domain modules (`source-registry`, `change-detection`, `evidence`).
 * The operational failed-closed polling runtime lives in `scripts/nova/`
 * (see `docs/ai/nova/S3_SOURCE_RUNTIME.md`) and is deliberately NOT exported
 * here — runtime receipts are artifacts, not importable domain state.
 * Founder OS/agent surfaces (S4) — `founder-command`, `founder-work-seed`,
 * `nova-agent`, `nova-subagents`.
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
export * from "./source-registry";
export * from "./change-detection";
export * from "./evidence";
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
export * from "./founder-command";
export * from "./nova-agent";
export * from "./nova-subagents";
export * from "./founder-work-seed";
