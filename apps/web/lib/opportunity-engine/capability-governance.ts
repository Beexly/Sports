/**
 * NOVA S2 — capability governance ledger.
 *
 * The capability inventory (capability-inventory.ts) records what was
 * captured; this module records the governance posture declared for each
 * captured capability:
 *
 * - an exact skill permission manifest (network / file-read / file-write /
 *   external-communication / secrets scopes as structured fields, not prose);
 * - the supply-chain review state;
 * - the version drift state relative to the pinned capture;
 * - a maintenance owner;
 * - structured stop conditions and a rollback plan;
 * - honest observed-performance fields (zero observations until a real
 *   measurement pipeline exists — never fabricated);
 * - a pinned provenance hash of the exact inventory record the declaration
 *   was made against, so capture drift invalidates the declaration.
 *
 * The shipped ledger (`data/nova/capability-governance-2026-07-22.json`) is a
 * baseline: every scope is a worst-case assumption pending inspection and
 * every supply-chain state is UNREVIEWED. That is deliberate honesty — the
 * ledger asserts what has NOT been verified, and the governor treats those
 * assumptions as binding risk posture, not as approval.
 *
 * Pure TypeScript + JSON data. No Prisma, no I/O, no clocks, no randomness.
 * Nothing in this module (or anywhere in S2) can activate a capability.
 */

import governanceData from "../../../../data/nova/capability-governance-2026-07-22.json";
import {
  getCapabilityInventory,
  type CapabilityInventoryEntry,
  type CapabilityInventorySurface,
} from "./capability-inventory";
import { isWellFormedCapabilityProvenanceHash } from "./capability-provenance";

// ---------------------------------------------------------------------------
// Permission manifest — structured scopes, never prose.
// ---------------------------------------------------------------------------

export type CapabilityNetworkScope = "NONE" | "ALLOWLISTED_HOSTS" | "ASSUME_UNRESTRICTED";
export type CapabilityFileReadScope = "NONE" | "WORKSPACE_READ" | "ASSUME_UNRESTRICTED";
export type CapabilityFileWriteScope = "NONE" | "WORKSPACE_WRITE" | "ASSUME_UNRESTRICTED";
export type CapabilityExternalCommunicationScope = "NONE" | "DRAFT_ONLY" | "ASSUME_POSSIBLE";
export type CapabilitySecretsScope = "NONE" | "ASSUME_POSSIBLE";
export type CapabilityPermissionBasis =
  | "OWNER_SOURCE_INSPECTION"
  | "VENDOR_DOCUMENTATION"
  | "WORST_CASE_ASSUMPTION_PENDING_INSPECTION";

export interface CapabilityPermissionManifest {
  readonly basis: CapabilityPermissionBasis;
  readonly network: CapabilityNetworkScope;
  /** Non-empty exactly when `network` is ALLOWLISTED_HOSTS. */
  readonly allowedHosts: readonly string[];
  readonly fileRead: CapabilityFileReadScope;
  readonly fileWrite: CapabilityFileWriteScope;
  readonly externalCommunication: CapabilityExternalCommunicationScope;
  readonly secretsAccess: CapabilitySecretsScope;
}

const NETWORK_SCOPES: ReadonlySet<string> = new Set([
  "NONE",
  "ALLOWLISTED_HOSTS",
  "ASSUME_UNRESTRICTED",
]);
const FILE_READ_SCOPES: ReadonlySet<string> = new Set(["NONE", "WORKSPACE_READ", "ASSUME_UNRESTRICTED"]);
const FILE_WRITE_SCOPES: ReadonlySet<string> = new Set(["NONE", "WORKSPACE_WRITE", "ASSUME_UNRESTRICTED"]);
const EXTERNAL_COMMUNICATION_SCOPES: ReadonlySet<string> = new Set(["NONE", "DRAFT_ONLY", "ASSUME_POSSIBLE"]);
const SECRETS_SCOPES: ReadonlySet<string> = new Set(["NONE", "ASSUME_POSSIBLE"]);
const PERMISSION_BASES: ReadonlySet<string> = new Set([
  "OWNER_SOURCE_INSPECTION",
  "VENDOR_DOCUMENTATION",
  "WORST_CASE_ASSUMPTION_PENDING_INSPECTION",
]);

/** Structural + coherence validation for a permission manifest. */
export function validateCapabilityPermissionManifest(
  manifest: CapabilityPermissionManifest,
): readonly string[] {
  const errors: string[] = [];
  if (!PERMISSION_BASES.has(manifest.basis)) errors.push(`unknown permission basis: ${manifest.basis}`);
  if (!NETWORK_SCOPES.has(manifest.network)) errors.push(`unknown network scope: ${manifest.network}`);
  if (!FILE_READ_SCOPES.has(manifest.fileRead)) errors.push(`unknown fileRead scope: ${manifest.fileRead}`);
  if (!FILE_WRITE_SCOPES.has(manifest.fileWrite)) {
    errors.push(`unknown fileWrite scope: ${manifest.fileWrite}`);
  }
  if (!EXTERNAL_COMMUNICATION_SCOPES.has(manifest.externalCommunication)) {
    errors.push(`unknown externalCommunication scope: ${manifest.externalCommunication}`);
  }
  if (!SECRETS_SCOPES.has(manifest.secretsAccess)) {
    errors.push(`unknown secretsAccess scope: ${manifest.secretsAccess}`);
  }
  if (!Array.isArray(manifest.allowedHosts) || manifest.allowedHosts.some((host) => typeof host !== "string" || !host.trim())) {
    errors.push("allowedHosts must be an array of non-empty host strings.");
  } else if (manifest.network === "ALLOWLISTED_HOSTS" && manifest.allowedHosts.length === 0) {
    errors.push("network ALLOWLISTED_HOSTS requires at least one allowed host.");
  } else if (manifest.network !== "ALLOWLISTED_HOSTS" && manifest.allowedHosts.length > 0) {
    errors.push("allowedHosts must be empty unless network is ALLOWLISTED_HOSTS.");
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Supply-chain, drift, and observed-performance state.
// ---------------------------------------------------------------------------

export type CapabilitySupplyChainState =
  | "VENDOR_ATTESTED"
  | "SOURCE_REVIEWED"
  | "UNREVIEWED"
  | "UNKNOWN";

export type CapabilityVersionDriftState =
  | "NONE_OBSERVED_SINCE_CAPTURE"
  | "UPDATE_OBSERVED"
  | "STALE_CAPTURE"
  | "UNKNOWN";

export const CAPABILITY_SUPPLY_CHAIN_STATES: ReadonlySet<string> = new Set([
  "VENDOR_ATTESTED",
  "SOURCE_REVIEWED",
  "UNREVIEWED",
  "UNKNOWN",
]);
export const CAPABILITY_VERSION_DRIFT_STATES: ReadonlySet<string> = new Set([
  "NONE_OBSERVED_SINCE_CAPTURE",
  "UPDATE_OBSERVED",
  "STALE_CAPTURE",
  "UNKNOWN",
]);

/**
 * Honest performance record. `NO_OBSERVATIONS` with zero counters is the only
 * legal state until a real measurement pipeline records runs — no fabricated
 * statistics, ever.
 */
export interface CapabilityObservedPerformance {
  readonly state: "NO_OBSERVATIONS" | "OBSERVED";
  readonly runsObserved: number;
  readonly successes: number;
  readonly failures: number;
  readonly lastObservedAt: string | null;
}

export function validateCapabilityObservedPerformance(
  performance: CapabilityObservedPerformance,
): readonly string[] {
  const errors: string[] = [];
  const counters: ReadonlyArray<readonly [string, number]> = [
    ["runsObserved", performance.runsObserved],
    ["successes", performance.successes],
    ["failures", performance.failures],
  ];
  for (const [label, value] of counters) {
    if (!Number.isInteger(value) || value < 0) {
      errors.push(`${label} must be a non-negative integer.`);
    }
  }
  if (performance.successes + performance.failures > performance.runsObserved) {
    errors.push("successes + failures cannot exceed runsObserved.");
  }
  if (performance.state === "NO_OBSERVATIONS") {
    if (performance.runsObserved !== 0 || performance.lastObservedAt !== null) {
      errors.push("NO_OBSERVATIONS requires zero runs and a null lastObservedAt.");
    }
  } else if (performance.state === "OBSERVED") {
    if (performance.runsObserved < 1) errors.push("OBSERVED requires at least one recorded run.");
    if (typeof performance.lastObservedAt !== "string" || !Number.isFinite(Date.parse(performance.lastObservedAt))) {
      errors.push("OBSERVED requires an ISO lastObservedAt timestamp.");
    }
  } else {
    errors.push(`unknown observed-performance state: ${String(performance.state)}`);
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Stop conditions and rollback plans — structured, versioned, owner-executed.
// ---------------------------------------------------------------------------

export interface CapabilityStopCondition {
  readonly code:
    | "CONTEXT_BUDGET_EXCEEDED"
    | "UNDECLARED_NETWORK_ATTEMPT"
    | "PERMISSION_ESCALATION_REQUEST"
    | "REPEATED_TASK_FAILURE"
    | "SOURCE_DRIFT_DETECTED"
    | "OWNER_STOP_ORDER";
  readonly trigger: string;
  readonly requiredResponse: "UNLOAD_CAPABILITY" | "HALT_TASK_AND_ESCALATE_TO_OWNER";
}

export type CapabilityStopConditionProfileId = "DEFAULT_CAPABILITY_V1";

export const CAPABILITY_STOP_CONDITION_PROFILES: Readonly<
  Record<CapabilityStopConditionProfileId, readonly CapabilityStopCondition[]>
> = {
  DEFAULT_CAPABILITY_V1: [
    {
      code: "CONTEXT_BUDGET_EXCEEDED",
      trigger: "Loaded capability material exceeds the task's context budget.",
      requiredResponse: "UNLOAD_CAPABILITY",
    },
    {
      code: "UNDECLARED_NETWORK_ATTEMPT",
      trigger: "The capability attempts network access outside its declared manifest scope.",
      requiredResponse: "HALT_TASK_AND_ESCALATE_TO_OWNER",
    },
    {
      code: "PERMISSION_ESCALATION_REQUEST",
      trigger: "The capability requests broader file, write, or secret scope than declared.",
      requiredResponse: "HALT_TASK_AND_ESCALATE_TO_OWNER",
    },
    {
      code: "REPEATED_TASK_FAILURE",
      trigger: "Two consecutive task runs using this capability fail or require repair.",
      requiredResponse: "UNLOAD_CAPABILITY",
    },
    {
      code: "SOURCE_DRIFT_DETECTED",
      trigger: "The pinned provenance hash no longer matches the captured inventory record.",
      requiredResponse: "HALT_TASK_AND_ESCALATE_TO_OWNER",
    },
    {
      code: "OWNER_STOP_ORDER",
      trigger: "The owner instructs that this capability stop being used.",
      requiredResponse: "HALT_TASK_AND_ESCALATE_TO_OWNER",
    },
  ],
};

export type CapabilityRollbackPlanId =
  | "DISABLE_PLUGIN_V1"
  | "DISCONNECT_CONNECTOR_V1"
  | "REMOVE_SKILL_V1"
  | "DISCONNECT_CHATGPT_TOOL_V1";

export interface CapabilityRollbackPlan {
  readonly id: CapabilityRollbackPlanId;
  readonly appliesToSurfaces: readonly CapabilityInventorySurface[];
  readonly steps: readonly string[];
  /** Rollback is performed by the owner in the host platform's UI — S2 exposes no API that performs it. */
  readonly ownerActionRequired: true;
  readonly dataLossRisk: "NONE_EXPECTED";
}

export const CAPABILITY_ROLLBACK_PLANS: Readonly<
  Record<CapabilityRollbackPlanId, CapabilityRollbackPlan>
> = {
  DISABLE_PLUGIN_V1: {
    id: "DISABLE_PLUGIN_V1",
    appliesToSurfaces: ["CLAUDE_PLUGIN"],
    steps: [
      "Open the Claude plugin manager and disable the plugin.",
      "Record the disable action and reason in the governance ledger.",
      "Re-run the affected task without the plugin to confirm clean behavior.",
    ],
    ownerActionRequired: true,
    dataLossRisk: "NONE_EXPECTED",
  },
  DISCONNECT_CONNECTOR_V1: {
    id: "DISCONNECT_CONNECTOR_V1",
    appliesToSurfaces: ["CLAUDE_CONNECTOR"],
    steps: [
      "Open the Claude connector settings and disconnect the connector.",
      "Revoke the connector's OAuth grant at the provider if one exists.",
      "Record the disconnect action and reason in the governance ledger.",
    ],
    ownerActionRequired: true,
    dataLossRisk: "NONE_EXPECTED",
  },
  REMOVE_SKILL_V1: {
    id: "REMOVE_SKILL_V1",
    appliesToSurfaces: ["CLAUDE_SKILL"],
    steps: [
      "Remove the skill from the personal skill library.",
      "Record the removal action and reason in the governance ledger.",
    ],
    ownerActionRequired: true,
    dataLossRisk: "NONE_EXPECTED",
  },
  DISCONNECT_CHATGPT_TOOL_V1: {
    id: "DISCONNECT_CHATGPT_TOOL_V1",
    appliesToSurfaces: ["CHATGPT_APP", "CHATGPT_SKILL"],
    steps: [
      "Open the ChatGPT apps/skills settings and disconnect or uninstall the tool.",
      "Revoke any provider-side grant the tool held.",
      "Record the disconnect action and reason in the governance ledger.",
    ],
    ownerActionRequired: true,
    dataLossRisk: "NONE_EXPECTED",
  },
};

export function expectedRollbackPlanIdForSurface(
  surface: CapabilityInventorySurface,
): CapabilityRollbackPlanId {
  switch (surface) {
    case "CLAUDE_PLUGIN":
      return "DISABLE_PLUGIN_V1";
    case "CLAUDE_CONNECTOR":
      return "DISCONNECT_CONNECTOR_V1";
    case "CLAUDE_SKILL":
      return "REMOVE_SKILL_V1";
    case "CHATGPT_APP":
    case "CHATGPT_SKILL":
      return "DISCONNECT_CHATGPT_TOOL_V1";
  }
}

// ---------------------------------------------------------------------------
// Context-cost estimate — a declared heuristic, never a fabricated measurement.
// ---------------------------------------------------------------------------

export const PLUGIN_CONTEXT_BASE_TOKENS = 600;
export const PLUGIN_CONTEXT_TOKENS_PER_SKILL = 400;

export interface CapabilityContextCostEstimate {
  readonly basis: "SKILL_COUNT_HEURISTIC_V1" | "UNMEASURED_SURFACE";
  readonly estimatedTokens: number | null;
  /** Always false until a real measurement pipeline exists. */
  readonly measured: false;
  readonly assumption: string;
}

/**
 * Deterministic context-cost estimate. Plugins get a declared skill-count
 * heuristic (base + per-skill), clearly labeled as an assumption; other
 * surfaces are honestly UNMEASURED with a null token estimate.
 */
export function estimateCapabilityContextCost(
  entry: Pick<CapabilityInventoryEntry, "surface" | "skillCount">,
): CapabilityContextCostEstimate {
  if (entry.surface === "CLAUDE_PLUGIN" && entry.skillCount !== undefined) {
    return {
      basis: "SKILL_COUNT_HEURISTIC_V1",
      estimatedTokens: PLUGIN_CONTEXT_BASE_TOKENS + entry.skillCount * PLUGIN_CONTEXT_TOKENS_PER_SKILL,
      measured: false,
      assumption: `Assumes ~${PLUGIN_CONTEXT_BASE_TOKENS} base tokens plus ~${PLUGIN_CONTEXT_TOKENS_PER_SKILL} tokens per captured skill; no measurement has been taken.`,
    };
  }
  return {
    basis: "UNMEASURED_SURFACE",
    estimatedTokens: null,
    measured: false,
    assumption: "No context-cost heuristic is declared for this surface; treat the cost as unknown.",
  };
}

// ---------------------------------------------------------------------------
// Governance records — the per-capability review ledger.
// ---------------------------------------------------------------------------

export interface CapabilityGovernanceRecord {
  readonly capabilityId: string;
  /** Provenance hash of the exact inventory record this declaration reviewed. */
  readonly sourceProvenanceHash: string;
  /** Null means no manifest was declared — the governor must fail closed. */
  readonly permissionManifest: CapabilityPermissionManifest | null;
  readonly supplyChainState: CapabilitySupplyChainState;
  readonly versionDriftState: CapabilityVersionDriftState;
  readonly maintenanceOwner: string;
  readonly stopConditionProfile: CapabilityStopConditionProfileId;
  readonly rollbackPlanId: CapabilityRollbackPlanId;
  readonly observedPerformance: CapabilityObservedPerformance;
  readonly declaredBy: string;
  readonly declaredAt: string;
}

const GOVERNANCE_DOCUMENT_ALLOWED_KEYS = [
  "schemaVersion",
  "declaredAt",
  "declaredBy",
  "policy",
  "baseline",
  "recordTuple",
  "records",
] as const;

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Structural validation of the governance ledger document
 * (`data/nova/capability-governance-2026-07-22.json`). Fails closed on
 * unknown keys, malformed tuples, duplicate capability ids, malformed
 * hashes, unknown enum values, and incoherent baseline declarations.
 */
export function validateCapabilityGovernanceDocument(input: unknown): readonly string[] {
  const errors: string[] = [];
  if (!isRecordObject(input)) return ["document: must be a JSON object."];

  for (const key of Object.keys(input)) {
    if (!(GOVERNANCE_DOCUMENT_ALLOWED_KEYS as readonly string[]).includes(key)) {
      errors.push(`document.${key}: unexpected key — the governance ledger may not carry unvalidated content.`);
    }
  }
  if (input.schemaVersion !== 1) errors.push("schemaVersion: must be 1.");
  if (typeof input.declaredAt !== "string" || !Number.isFinite(Date.parse(input.declaredAt))) {
    errors.push("declaredAt: must be an ISO timestamp.");
  }
  if (typeof input.declaredBy !== "string" || !input.declaredBy.trim()) {
    errors.push("declaredBy: must be a non-empty principal string.");
  }

  const policy = input.policy;
  if (!isRecordObject(policy)) {
    errors.push("policy: must be an object.");
  } else if (policy.autoActivationAllowed !== false) {
    errors.push("policy.autoActivationAllowed: must be exactly false.");
  }

  const baseline = input.baseline;
  if (!isRecordObject(baseline)) {
    errors.push("baseline: must be an object.");
  } else {
    const manifest = baseline.permissionManifest;
    if (!isRecordObject(manifest)) {
      errors.push("baseline.permissionManifest: must be an object.");
    } else {
      for (const issue of validateCapabilityPermissionManifest(
        manifest as unknown as CapabilityPermissionManifest,
      )) {
        errors.push(`baseline.permissionManifest: ${issue}`);
      }
    }
    if (!CAPABILITY_SUPPLY_CHAIN_STATES.has(String(baseline.supplyChainState))) {
      errors.push(`baseline.supplyChainState: unknown state ${String(baseline.supplyChainState)}.`);
    }
    if (!CAPABILITY_VERSION_DRIFT_STATES.has(String(baseline.versionDriftState))) {
      errors.push(`baseline.versionDriftState: unknown state ${String(baseline.versionDriftState)}.`);
    }
    if (typeof baseline.maintenanceOwner !== "string" || !baseline.maintenanceOwner.trim()) {
      errors.push("baseline.maintenanceOwner: must be a non-empty principal string.");
    }
    if (!(String(baseline.stopConditionProfile) in CAPABILITY_STOP_CONDITION_PROFILES)) {
      errors.push(`baseline.stopConditionProfile: unknown profile ${String(baseline.stopConditionProfile)}.`);
    }
    const performance = baseline.observedPerformance;
    if (!isRecordObject(performance)) {
      errors.push("baseline.observedPerformance: must be an object.");
    } else {
      for (const issue of validateCapabilityObservedPerformance(
        performance as unknown as CapabilityObservedPerformance,
      )) {
        errors.push(`baseline.observedPerformance: ${issue}`);
      }
    }
  }

  const records = input.records;
  if (!Array.isArray(records)) {
    errors.push("records: must be an array of [capabilityId, sourceProvenanceHash, rollbackPlanId] tuples.");
  } else {
    const seenIds = new Set<string>();
    records.forEach((tuple, index) => {
      if (!Array.isArray(tuple) || tuple.length !== 3) {
        errors.push(`records[${index}]: must be a 3-item [capabilityId, sourceProvenanceHash, rollbackPlanId] tuple.`);
        return;
      }
      const [capabilityId, sourceProvenanceHash, rollbackPlanId] = tuple as readonly unknown[];
      if (typeof capabilityId !== "string" || !capabilityId.trim()) {
        errors.push(`records[${index}][0]: capabilityId must be a non-empty string.`);
      } else if (seenIds.has(capabilityId)) {
        errors.push(`records[${index}][0]: duplicate governance record for ${capabilityId}.`);
      } else {
        seenIds.add(capabilityId);
      }
      if (
        typeof sourceProvenanceHash !== "string" ||
        !isWellFormedCapabilityProvenanceHash(sourceProvenanceHash)
      ) {
        errors.push(`records[${index}][1]: sourceProvenanceHash must match fnv1a64:<16 hex>.`);
      }
      if (!(String(rollbackPlanId) in CAPABILITY_ROLLBACK_PLANS)) {
        errors.push(`records[${index}][2]: unknown rollback plan ${String(rollbackPlanId)}.`);
      }
    });
  }

  return errors;
}

interface GovernanceLedgerDocument {
  readonly schemaVersion: number;
  readonly declaredAt: string;
  readonly declaredBy: string;
  readonly baseline: {
    readonly permissionManifest: CapabilityPermissionManifest;
    readonly supplyChainState: CapabilitySupplyChainState;
    readonly versionDriftState: CapabilityVersionDriftState;
    readonly maintenanceOwner: string;
    readonly stopConditionProfile: CapabilityStopConditionProfileId;
    readonly observedPerformance: CapabilityObservedPerformance;
  };
  readonly records: ReadonlyArray<readonly string[]>;
}

/**
 * Loads and expands the shipped governance ledger. Fails closed: if the
 * document does not validate, this throws instead of returning a partial or
 * guessed ledger.
 */
export function getCapabilityGovernanceRecords(): readonly CapabilityGovernanceRecord[] {
  const issues = validateCapabilityGovernanceDocument(governanceData);
  if (issues.length > 0) {
    throw new Error(
      `NOVA capability governance ledger failed validation (${issues.length} issue(s)): ${issues
        .slice(0, 5)
        .join(" | ")}`,
    );
  }
  const document = governanceData as unknown as GovernanceLedgerDocument;
  return document.records.map((tuple) => {
    const [capabilityId, sourceProvenanceHash, rollbackPlanId] = tuple;
    if (capabilityId === undefined || sourceProvenanceHash === undefined || rollbackPlanId === undefined) {
      // Unreachable after validation; kept as a fail-closed invariant.
      throw new Error("NOVA capability governance ledger contains a malformed record tuple.");
    }
    return {
      capabilityId,
      sourceProvenanceHash,
      permissionManifest: document.baseline.permissionManifest,
      supplyChainState: document.baseline.supplyChainState,
      versionDriftState: document.baseline.versionDriftState,
      maintenanceOwner: document.baseline.maintenanceOwner,
      stopConditionProfile: document.baseline.stopConditionProfile,
      rollbackPlanId: rollbackPlanId as CapabilityRollbackPlanId,
      observedPerformance: document.baseline.observedPerformance,
      declaredBy: document.declaredBy,
      declaredAt: document.declaredAt,
    };
  });
}

export function findCapabilityGovernanceRecord(
  capabilityId: string,
  records: readonly CapabilityGovernanceRecord[] = getCapabilityGovernanceRecords(),
): CapabilityGovernanceRecord | undefined {
  return records.find((record) => record.capabilityId === capabilityId);
}

/**
 * Cross-validates the governance ledger against the captured inventory:
 * every inventory entry must be covered exactly once, no orphan records may
 * exist, every pinned provenance hash must match the sealed inventory hash,
 * and every rollback plan must match the capability's surface.
 */
export function validateCapabilityGovernanceCoverage(
  records: readonly CapabilityGovernanceRecord[] = getCapabilityGovernanceRecords(),
  inventory: readonly CapabilityInventoryEntry[] = getCapabilityInventory(),
): readonly string[] {
  const errors: string[] = [];
  const entriesById = new Map(inventory.map((entry) => [entry.id, entry]));
  const coveredIds = new Set<string>();

  for (const record of records) {
    if (coveredIds.has(record.capabilityId)) {
      errors.push(`${record.capabilityId}: duplicate governance record.`);
      continue;
    }
    coveredIds.add(record.capabilityId);
    const entry = entriesById.get(record.capabilityId);
    if (!entry) {
      errors.push(`${record.capabilityId}: governance record has no matching inventory entry.`);
      continue;
    }
    if (record.sourceProvenanceHash !== entry.provenanceHash) {
      errors.push(
        `${record.capabilityId}: pinned provenance hash does not match the captured inventory record.`,
      );
    }
    if (record.rollbackPlanId !== expectedRollbackPlanIdForSurface(entry.surface)) {
      errors.push(
        `${record.capabilityId}: rollback plan ${record.rollbackPlanId} does not match surface ${entry.surface}.`,
      );
    }
  }

  for (const entry of inventory) {
    if (!coveredIds.has(entry.id)) {
      errors.push(`${entry.id}: inventory entry has no governance record.`);
    }
  }

  return errors;
}
