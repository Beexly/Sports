/**
 * Agent Foundry — the GSE-native skill supply chain (types).
 *
 * A skill manifest is a governed executable contract: identity, provenance,
 * permissions, budgets, evals, license evidence, and lifecycle. The Foundry
 * does NOT duplicate the Agent Council — seat identity and authority derive
 * from agent-council.ts (see derive-council-manifests.ts). The Foundry adds
 * what the council deliberately leaves out: executable-package governance.
 *
 * Two invariants hold everywhere:
 *   1. Nothing in the Foundry can approve itself. The scanner produces
 *      findings; lifecycle promotion to APPROVED is an owner code review.
 *   2. No manifest may authorize an external action. Council seats carry
 *      externalActionsAllowed: false as a literal — manifests inherit it.
 */

// ─── Permissions ──────────────────────────────────────────────────────────────

/** Data classes a skill may read. `sensitive_*` classes trigger scanner rules. */
export type DataClass =
  | "public_repo_code"
  | "public_sports_facts"
  | "internal_telemetry"
  | "internal_docs"
  | "sensitive_customer"
  | "sensitive_financial"
  | "sensitive_credentials";

export type ArtifactType =
  | "markdown_report"
  | "structured_json"
  | "test_file"
  | "code_diff_proposal"
  | "dossier";

/** Network policy: NONE (default) or an explicit allowlist. Never "*". */
export type NetworkPolicy =
  | { readonly mode: "none" }
  | { readonly mode: "allowlist"; readonly domains: readonly string[] };

export type ModelRoute =
  | "NO_MODEL"
  | "PLAN_FRONTIER"
  | "EXECUTE_BOUNDED"
  | "EXTRACT_STRUCTURED"
  | "VERIFY_INDEPENDENT";

export type ManifestLifecycle =
  | "DRAFT"        // authored, unscanned
  | "SCANNED"      // baseline scanner ran; findings recorded
  | "OWNER_REVIEW" // queued for the owner
  | "APPROVED"     // owner approved via code review — never set programmatically
  | "RETIRED";     // withdrawn; kept for provenance

export type ManifestRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

// ─── Manifest ─────────────────────────────────────────────────────────────────

export interface SkillManifest {
  /** Stable id, kebab-case, unique across the registry. */
  readonly id: string;
  /** Semver. A content change without a version bump is a scanner finding. */
  readonly version: string;
  /**
   * sha256 over the canonical manifest JSON (hash field excluded).
   * Computed by registry code — a mismatch is tampering, not a warning.
   */
  readonly contentHash: string;
  /** Council seat id (agent-council.ts) that owns this skill. */
  readonly owningSeatId: string;
  readonly purpose: string;
  readonly risk: ManifestRisk;
  readonly allowedInputDataClasses: readonly DataClass[];
  readonly allowedOutputArtifacts: readonly ArtifactType[];
  /** Tool names, explicit. "*" is a scanner finding, not a convenience. */
  readonly allowedTools: readonly string[];
  readonly networkPolicy: NetworkPolicy;
  /** True when the skill touches shell/filesystem-write tools. */
  readonly sandboxRequired: boolean;
  readonly modelRoute: ModelRoute;
  /** Ceilings — enforced by the future runner; declared now for review. */
  readonly budgetCeilingUsd: number;
  readonly runtimeCeilingMinutes: number;
  readonly prohibitedActions: readonly string[];
  readonly humanApprovalRequired: boolean;
  /** Eval suite id(s) that must pass before promotion. Empty = finding. */
  readonly evalSuites: readonly string[];
  /** License evidence for any external material the skill embeds. */
  readonly licenseEvidence: string;
  readonly auditLogEnabled: boolean;
  readonly lifecycle: ManifestLifecycle;
  /** Repo path that proves the skill's claims (spec, tests, or module). */
  readonly proofSource: string;
}

// ─── Scanner ──────────────────────────────────────────────────────────────────

export type ScanSeverity = "INFO" | "WARN" | "BLOCK";

export interface ScanFinding {
  readonly manifestId: string;
  readonly rule: string;
  readonly severity: ScanSeverity;
  readonly detail: string;
}

export interface ScanReport {
  readonly manifestId: string;
  readonly manifestVersion: string;
  readonly contentHash: string;
  readonly findings: readonly ScanFinding[];
  /** BLOCK findings present → the manifest cannot leave DRAFT/SCANNED. */
  readonly blocked: boolean;
  /** Which rule ids ran — coverage is part of the report, honestly. */
  readonly rulesRun: readonly string[];
  /**
   * External scanners (e.g. SARIF importers) that did NOT run. Absence is
   * shown, never papered over: a baseline pass is not a safety proof.
   */
  readonly externalScannersAbsent: readonly string[];
}

/** Adapter boundary for future external scanners (SARIF et al.). */
export interface ExternalScannerAdapter {
  readonly id: string;
  readonly available: boolean;
  scan(manifest: SkillManifest): Promise<readonly ScanFinding[]>;
}
