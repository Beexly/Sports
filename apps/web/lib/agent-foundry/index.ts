/**
 * Agent Foundry — public module surface.
 *
 * Governs skill packages: identity, permissions, provenance, scan state,
 * lifecycle. Executes nothing. Approves nothing. The owner does both,
 * elsewhere, with evidence from here.
 */

export type {
  DataClass,
  ArtifactType,
  NetworkPolicy,
  ModelRoute,
  ManifestLifecycle,
  ManifestRisk,
  SkillManifest,
  ScanSeverity,
  ScanFinding,
  ScanReport,
  ExternalScannerAdapter,
} from "./types";

export {
  isFoundryEnabled,
  canonicalManifestJson,
  computeContentHash,
  SKILL_MANIFESTS,
  getManifest,
  PRE_APPROVAL_LIFECYCLES,
} from "./registry";

export { getOwningSeat, checkSeatAuthority } from "./derive-council-manifests";
export {
  scanManifest,
  scanAll,
  canExecute,
  SCANNER_RULE_IDS,
  ABSENT_EXTERNAL_SCANNERS,
} from "./scanner";
