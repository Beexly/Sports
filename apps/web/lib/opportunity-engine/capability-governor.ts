/**
 * NOVA S2 — capability governor (inspection-only).
 *
 * Two layers live here:
 *
 * 1. `routeCapabilities` — the #146-extracted, captured-metadata shortlist.
 *    It ranks task-fit candidates from name/author/skill-count capture data
 *    alone and is explicitly pre-governance: it consults no permission
 *    manifests and no supply-chain state.
 * 2. `selectInspectionCandidates` — the hardened, fail-closed governed
 *    selection. It admits a capability only when a governance ledger record
 *    exists with a declared permission manifest, a known supply-chain state,
 *    and a pinned provenance hash that still matches the captured inventory
 *    record. Anything less is INELIGIBLE with an exact reason code.
 *
 * Both layers produce recommendation records only. The governor selects at
 * most three inspection candidates per run (`MAX_INSPECTION_CANDIDATES`) and
 * cannot activate anything: this module — and all of S2 — exports no
 * activation, enablement, connection, or execution API, and every returned
 * record is plain data (no callables). Activation is an owner action
 * performed outside this codebase.
 *
 * Determinism contract: no clocks (`generatedAt` is a caller-supplied
 * parameter), no randomness, no I/O; identical inputs yield identical
 * recommendation records.
 */

import {
  getCapabilityInventory,
  type CapabilityInventoryEntry,
} from "./capability-inventory";
import {
  CAPABILITY_ROLLBACK_PLANS,
  CAPABILITY_STOP_CONDITION_PROFILES,
  CAPABILITY_SUPPLY_CHAIN_STATES,
  CAPABILITY_VERSION_DRIFT_STATES,
  estimateCapabilityContextCost,
  getCapabilityGovernanceRecords,
  validateCapabilityObservedPerformance,
  validateCapabilityPermissionManifest,
  type CapabilityContextCostEstimate,
  type CapabilityGovernanceRecord,
  type CapabilityRollbackPlan,
  type CapabilityStopCondition,
} from "./capability-governance";
import { isWellFormedCapabilityProvenanceHash } from "./capability-provenance";

export type CapabilityTaskClass =
  | "GSE_REPOSITORY_IMPLEMENTATION"
  | "GSE_PR_REVIEW"
  | "GSE_PRODUCT_UI"
  | "NOVA_OBSERVABILITY"
  | "NOVA_RESEARCH"
  | "NOVA_SECURITY"
  | "AWS_ARCHITECTURE_AND_CREDITS"
  | "FIRST_CASH_SERVICE"
  | "LEGAL_AND_AI_GOVERNANCE"
  | "CHATGPT_APP_BUILD"
  | "LOCAL_CODING_CONTINUITY";

export type CapabilityTrustTier =
  | "PLATFORM_FIRST_PARTY"
  | "VENDOR_MAINTAINED"
  | "THIRD_PARTY"
  | "UNKNOWN_AUTHOR";

export type CapabilityRiskFlag =
  | "LARGE_BUNDLE"
  | "MASSIVE_BUNDLE"
  | "EMPTY_SKILL_LIST"
  | "AUTONOMOUS_LOOP"
  | "SELF_MODIFICATION"
  | "WEB_EXTRACTION"
  | "DEPLOYMENT_OR_INFRASTRUCTURE"
  | "SECURITY_SENSITIVE"
  | "LEGAL_OR_COMPLIANCE_JUDGMENT"
  | "FINANCIAL_OR_ACCOUNT_ACTION"
  | "EXTERNAL_COMMUNICATION";

export interface GovernedCapabilityCandidate {
  readonly entry: CapabilityInventoryEntry;
  readonly trustTier: CapabilityTrustTier;
  readonly trustEvidence: "CAPTURED_AUTHOR_LABEL_ONLY";
  readonly riskFlags: readonly CapabilityRiskFlag[];
  readonly taskFitRank: number;
  readonly score: number;
  readonly disposition: "INSPECT_BEFORE_USE" | "HOLD";
  readonly reasons: readonly string[];
  readonly executionAuthority: false;
}

export interface CapabilityRoute {
  readonly taskClass: CapabilityTaskClass;
  readonly selected: readonly GovernedCapabilityCandidate[];
  readonly held: readonly GovernedCapabilityCandidate[];
  readonly maxSelected: number;
  readonly autoActivationAllowed: false;
  readonly externalActionsAllowed: false;
  readonly policy: readonly string[];
}

const PLATFORM_FIRST_PARTY = new Set(["Anthropic", "Anthropic FSI"]);
const VENDOR_MAINTAINED = new Set([
  "42Crunch",
  "Airwallex",
  "Amazon Web Services",
  "aws-samples",
  "Auth0",
  "Canva",
  "ClickHouse",
  "Cloudflare",
  "Cockroach Labs",
  "CrowdStrike",
  "Datadog",
  "Exa",
  "Figma",
  "Firecrawl",
  "GitHub",
  "Google",
  "Google LLC",
  "Grafana Labs",
  "Honeycomb",
  "Hugging Face",
  "Langfuse",
  "Medusa",
  "Microsoft",
  "NVIDIA",
  "PostHog",
  "Prisma",
  "Qdrant",
  "Salesforce",
  "ServiceNow",
  "SigNoz",
  "Snowflake",
  "Tavily Team",
  "Thomson Reuters",
  "TinyFish",
  "Twilio",
  "Vercel",
  "Zapier",
]);

const TASK_PREFERENCES: Readonly<Record<CapabilityTaskClass, readonly string[]>> = {
  GSE_REPOSITORY_IMPLEMENTATION: [
    "Commit commands",
    "Code simplifier",
    "Engineering",
    "Github",
    "Buildkite",
    "Qodo skills",
    "Docker development",
  ],
  GSE_PR_REVIEW: [
    "Pr review toolkit",
    "Commit commands",
    "Qodo skills",
    "Buildkite",
    "Code tour",
    "Security guidance",
  ],
  GSE_PRODUCT_UI: [
    "Frontend design",
    "A11y audit",
    "Figma",
    "Apple hig expert",
    "Canva",
  ],
  NOVA_OBSERVABILITY: [
    "Langfuse",
    "SigNoz",
    "Honeycomb",
    "Grafana Cloud MCP",
    "Grafana Assistant",
    "Posthog",
    "ClickHouse",
  ],
  NOVA_RESEARCH: [
    "Tavily",
    "Exa",
    "Litreview",
    "Dossier",
    "Market Researcher",
    "Firecrawl",
    "Autoresearch agent",
  ],
  NOVA_SECURITY: [
    "42crunch api security testing",
    "Security guidance",
    "Auth0",
    "Vanta",
    "Crowdstrike falcon foundry",
    "Compliance os",
  ],
  AWS_ARCHITECTURE_AND_CREDITS: [
    "AWS Startup Advisor",
    "Aws core",
    "Aws amplify",
    "Aws serverless",
    "Aws dev toolkit",
    "Aws agents for devsecops",
    "Deploy on aws",
  ],
  FIRST_CASH_SERVICE: [
    "Small Business",
    "Commercial skills",
    "Business growth skills",
    "Sales",
    "Pitch Agent",
    "Marketing",
    "Grants",
  ],
  LEGAL_AND_AI_GOVERNANCE: [
    "AI Governance Legal",
    "Product Legal",
    "Commercial Legal",
    "Compliance team iso42001",
    "Compliance team eu ai act",
    "Compliance os",
    "General counsel advisor",
  ],
  CHATGPT_APP_BUILD: [
    "Agent sdk dev",
    "Mcp tunnels",
    "Auth0",
    "Frontend design",
    "Vercel",
    "Github",
  ],
  LOCAL_CODING_CONTINUITY: [
    "Commit commands",
    "Code simplifier",
    "Pr review toolkit",
    "Docker development",
    "Karpathy coder",
    "Ralph loop",
    "Self improving agent",
  ],
};

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

export function classifyCapabilityTrust(entry: CapabilityInventoryEntry): CapabilityTrustTier {
  const author = entry.author?.trim();
  if (!author || author === "—") return "UNKNOWN_AUTHOR";
  if (PLATFORM_FIRST_PARTY.has(author)) return "PLATFORM_FIRST_PARTY";
  if (VENDOR_MAINTAINED.has(author)) return "VENDOR_MAINTAINED";
  return "THIRD_PARTY";
}

export function detectCapabilityRisk(entry: CapabilityInventoryEntry): readonly CapabilityRiskFlag[] {
  const flags = new Set<CapabilityRiskFlag>();
  const text = `${entry.name} ${entry.author ?? ""}`.toLowerCase();
  const skillCount = entry.skillCount ?? 0;

  if (skillCount >= 25) flags.add("LARGE_BUNDLE");
  if (skillCount >= 100) flags.add("MASSIVE_BUNDLE");
  if (entry.surface === "CLAUDE_PLUGIN" && skillCount === 0) flags.add("EMPTY_SKILL_LIST");
  if (/ralph loop|autoresearch|agenthub|superpowers|c level agents/.test(text)) {
    flags.add("AUTONOMOUS_LOOP");
  }
  if (/self improving|write a skill|skill creator|agent sdk dev|workflow builder/.test(text)) {
    flags.add("SELF_MODIFICATION");
  }
  if (/scrap|firecrawl|bright data|zyte|tinyfish|web data|exa|tavily/.test(text)) {
    flags.add("WEB_EXTRACTION");
  }
  if (/deploy|vercel|cloudflare|kubernetes|terraform|docker|aws|azure|amplify|serverless|medusa cloud/.test(text)) {
    flags.add("DEPLOYMENT_OR_INFRASTRUCTURE");
  }
  if (/security|auth0|vanta|crowdstrike|42crunch|devsecops|chaos/.test(text)) {
    flags.add("SECURITY_SENSITIVE");
  }
  if (/legal|compliance|regulatory|litigation|counsel|iso42001|eu ai act/.test(text)) {
    flags.add("LEGAL_OR_COMPLIANCE_JUDGMENT");
  }
  if (/airwallex|carta|finance|investment|grants|cap table/.test(text)) {
    flags.add("FINANCIAL_OR_ACCOUNT_ACTION");
  }
  if (/twilio|slack|prospecting|apollo|lusha|common room|crm/.test(text)) {
    flags.add("EXTERNAL_COMMUNICATION");
  }

  return [...flags];
}

function trustScore(tier: CapabilityTrustTier): number {
  switch (tier) {
    case "PLATFORM_FIRST_PARTY":
      return 30;
    case "VENDOR_MAINTAINED":
      return 22;
    case "THIRD_PARTY":
      return 5;
    case "UNKNOWN_AUTHOR":
      return -10;
  }
}

function riskPenalty(flags: readonly CapabilityRiskFlag[]): number {
  return flags.reduce((total, flag) => {
    switch (flag) {
      case "MASSIVE_BUNDLE":
        return total + 35;
      case "AUTONOMOUS_LOOP":
      case "SELF_MODIFICATION":
        return total + 30;
      case "EXTERNAL_COMMUNICATION":
      case "FINANCIAL_OR_ACCOUNT_ACTION":
        return total + 25;
      case "SECURITY_SENSITIVE":
      case "LEGAL_OR_COMPLIANCE_JUDGMENT":
        return total + 18;
      case "DEPLOYMENT_OR_INFRASTRUCTURE":
      case "WEB_EXTRACTION":
        return total + 12;
      case "LARGE_BUNDLE":
        return total + 10;
      case "EMPTY_SKILL_LIST":
        return total + 8;
    }
  }, 0);
}

function hardHold(
  entry: CapabilityInventoryEntry,
  trustTier: CapabilityTrustTier,
  flags: readonly CapabilityRiskFlag[],
): boolean {
  if (entry.state === "NOT_CONNECTED" || entry.state === "RECONNECT_REQUIRED") return true;
  if (flags.includes("MASSIVE_BUNDLE")) return true;
  if (flags.includes("AUTONOMOUS_LOOP") || flags.includes("SELF_MODIFICATION")) return true;
  if (trustTier === "UNKNOWN_AUTHOR") return true;
  return false;
}

/**
 * #146-extracted, PRE-GOVERNANCE shortlist over captured metadata only.
 * It consults no permission manifests, no supply-chain state, and no
 * provenance hashes. For the fail-closed governed selection, use
 * `selectInspectionCandidates`. Like everything in S2, this returns a
 * recommendation record and can activate nothing.
 */
export function routeCapabilities(
  taskClass: CapabilityTaskClass,
  options: {
    readonly maxSelected?: number;
    readonly allowThirdPartyCandidates?: boolean;
  } = {},
): CapabilityRoute {
  const maxSelected = Math.max(1, Math.min(3, options.maxSelected ?? 3));
  const preferenceOrder = TASK_PREFERENCES[taskClass];
  const plugins = getCapabilityInventory().filter((entry) => entry.surface === "CLAUDE_PLUGIN");
  const byName = new Map(plugins.map((entry) => [normalized(entry.name), entry]));
  const candidates: GovernedCapabilityCandidate[] = [];

  preferenceOrder.forEach((name, index) => {
    const entry = byName.get(normalized(name));
    if (!entry) return;
    const trustTier = classifyCapabilityTrust(entry);
    const riskFlags = detectCapabilityRisk(entry);
    const thirdPartyHeld = trustTier === "THIRD_PARTY" && options.allowThirdPartyCandidates !== true;
    const held = hardHold(entry, trustTier, riskFlags) || thirdPartyHeld;
    const fitScore = Math.max(0, 50 - index * 5);
    const score = fitScore + trustScore(trustTier) - riskPenalty(riskFlags);
    const reasons = [
      `task preference rank ${index + 1}`,
      `captured author tier ${trustTier}`,
      riskFlags.length > 0 ? `risk flags: ${riskFlags.join(", ")}` : "no name-based risk flags detected",
      held ? "held pending explicit inspection or connection decision" : "eligible for source inspection only",
    ];
    candidates.push({
      entry,
      trustTier,
      trustEvidence: "CAPTURED_AUTHOR_LABEL_ONLY",
      riskFlags,
      taskFitRank: index + 1,
      score,
      disposition: held ? "HOLD" : "INSPECT_BEFORE_USE",
      reasons,
      executionAuthority: false,
    });
  });

  const eligible = candidates
    .filter((candidate) => candidate.disposition === "INSPECT_BEFORE_USE")
    .sort((left, right) => right.score - left.score || left.taskFitRank - right.taskFitRank);
  const selected = eligible.slice(0, maxSelected);
  const selectedIds = new Set(selected.map((candidate) => candidate.entry.id));
  const held = candidates.filter((candidate) => !selectedIds.has(candidate.entry.id));

  return {
    taskClass,
    selected,
    held,
    maxSelected,
    autoActivationAllowed: false,
    externalActionsAllowed: false,
    policy: [
      "Inventory presence is not proof of safety, quality, permissions, or usefulness.",
      "Inspect the exact skill files and requested permissions before use.",
      "Load no more than three capabilities for one task and prefer one primary plus one independent reviewer.",
      "Do not activate autonomous loops, self-modifying skills, massive bundles, external communication, deployment, financial, or legal actions without a separate decision gate.",
      "Measure task outcome, context overhead, latency, cost, and repair rate before retaining a capability in the default route.",
    ],
  };
}

// ---------------------------------------------------------------------------
// Hardened, fail-closed governed selection (S2 directive, 2026-07-22).
// ---------------------------------------------------------------------------

/** The governor may never recommend more than three inspection candidates per run. */
export const MAX_INSPECTION_CANDIDATES = 3;

export type CapabilityIneligibilityReason =
  | "NO_GOVERNANCE_RECORD"
  | "DUPLICATE_GOVERNANCE_RECORD"
  | "MISSING_PERMISSION_MANIFEST"
  | "INVALID_PERMISSION_MANIFEST"
  | "UNKNOWN_SUPPLY_CHAIN_STATE"
  | "UNKNOWN_VERSION_DRIFT_STATE"
  | "MISSING_PROVENANCE_HASH"
  | "PROVENANCE_HASH_MISMATCH"
  | "UNKNOWN_STOP_CONDITION_PROFILE"
  | "UNKNOWN_ROLLBACK_PLAN"
  | "MALFORMED_OBSERVED_PERFORMANCE";

export interface CapabilityInspectionCandidate {
  readonly capabilityId: string;
  readonly entry: CapabilityInventoryEntry;
  readonly governance: CapabilityGovernanceRecord;
  readonly trustTier: CapabilityTrustTier;
  readonly trustEvidence: "CAPTURED_AUTHOR_LABEL_ONLY";
  readonly riskFlags: readonly CapabilityRiskFlag[];
  readonly taskFitRank: number;
  readonly score: number;
  readonly contextCostEstimate: CapabilityContextCostEstimate;
  readonly stopConditions: readonly CapabilityStopCondition[];
  readonly rollbackPlan: CapabilityRollbackPlan;
  readonly disposition: "INSPECT_BEFORE_USE" | "HOLD";
  readonly reasons: readonly string[];
  readonly executionAuthority: false;
}

export interface IneligibleCapabilityRecord {
  readonly capabilityId: string;
  readonly name: string;
  readonly taskFitRank: number;
  readonly reasons: readonly CapabilityIneligibilityReason[];
  /** Ineligibility is always fail-closed: no fallback admission path exists. */
  readonly failClosed: true;
}

/**
 * The governor's entire output: a recommendation record. It grants nothing,
 * activates nothing, and contains no callables — consuming it can only ever
 * inform a human inspection decision.
 */
export interface CapabilityInspectionRecommendation {
  readonly recordKind: "CAPABILITY_INSPECTION_RECOMMENDATION";
  readonly schemaVersion: 1;
  readonly runId: string;
  readonly generatedAt: string;
  readonly taskClass: CapabilityTaskClass;
  readonly maxSelected: number;
  readonly selectionCap: typeof MAX_INSPECTION_CANDIDATES;
  readonly selected: readonly CapabilityInspectionCandidate[];
  readonly held: readonly CapabilityInspectionCandidate[];
  readonly ineligible: readonly IneligibleCapabilityRecord[];
  /** Task-preference names with no matching captured inventory entry. */
  readonly unresolvedPreferences: readonly string[];
  readonly autoActivationAllowed: false;
  readonly externalActionsAllowed: false;
  readonly activationApiExported: false;
  readonly policy: readonly string[];
}

export interface InspectionSelectionInput {
  readonly taskClass: CapabilityTaskClass;
  /** Caller-supplied timestamp — the governor never reads a clock. */
  readonly generatedAt: string;
  /** Caller-supplied run identity for the recommendation record. */
  readonly runId: string;
  /** 0..3; requesting more than MAX_INSPECTION_CANDIDATES throws. */
  readonly maxSelected?: number;
  readonly inventory?: readonly CapabilityInventoryEntry[];
  readonly governanceRecords?: readonly CapabilityGovernanceRecord[];
  readonly allowThirdPartyCandidates?: boolean;
}

/**
 * Fail-closed governance eligibility. Every rule that cannot be positively
 * verified produces an exact ineligibility reason; there is no default-allow
 * branch anywhere in this function.
 */
function governanceIneligibilityReasons(
  entry: CapabilityInventoryEntry,
  record: CapabilityGovernanceRecord | undefined,
  hasDuplicateRecords: boolean,
): readonly CapabilityIneligibilityReason[] {
  if (!record) return ["NO_GOVERNANCE_RECORD"];
  const reasons: CapabilityIneligibilityReason[] = [];
  if (hasDuplicateRecords) reasons.push("DUPLICATE_GOVERNANCE_RECORD");
  if (record.permissionManifest === null || record.permissionManifest === undefined) {
    reasons.push("MISSING_PERMISSION_MANIFEST");
  } else if (validateCapabilityPermissionManifest(record.permissionManifest).length > 0) {
    reasons.push("INVALID_PERMISSION_MANIFEST");
  }
  if (
    !CAPABILITY_SUPPLY_CHAIN_STATES.has(record.supplyChainState) ||
    record.supplyChainState === "UNKNOWN"
  ) {
    reasons.push("UNKNOWN_SUPPLY_CHAIN_STATE");
  }
  if (
    !CAPABILITY_VERSION_DRIFT_STATES.has(record.versionDriftState) ||
    record.versionDriftState === "UNKNOWN"
  ) {
    reasons.push("UNKNOWN_VERSION_DRIFT_STATE");
  }
  if (
    !record.sourceProvenanceHash ||
    !isWellFormedCapabilityProvenanceHash(record.sourceProvenanceHash) ||
    !entry.provenanceHash ||
    !isWellFormedCapabilityProvenanceHash(entry.provenanceHash)
  ) {
    reasons.push("MISSING_PROVENANCE_HASH");
  } else if (record.sourceProvenanceHash !== entry.provenanceHash) {
    reasons.push("PROVENANCE_HASH_MISMATCH");
  }
  if (!(record.stopConditionProfile in CAPABILITY_STOP_CONDITION_PROFILES)) {
    reasons.push("UNKNOWN_STOP_CONDITION_PROFILE");
  }
  if (!(record.rollbackPlanId in CAPABILITY_ROLLBACK_PLANS)) {
    reasons.push("UNKNOWN_ROLLBACK_PLAN");
  }
  const performance = record.observedPerformance as
    | CapabilityGovernanceRecord["observedPerformance"]
    | undefined;
  if (
    !performance ||
    typeof performance !== "object" ||
    validateCapabilityObservedPerformance(performance).length > 0
  ) {
    reasons.push("MALFORMED_OBSERVED_PERFORMANCE");
  }
  return reasons;
}

/**
 * Selects at most `MAX_INSPECTION_CANDIDATES` inspection candidates for one
 * task class from the governed capability population.
 *
 * Selection is deterministic: candidates are ranked by score (descending),
 * then task-fit rank (ascending), then capability id (ascending). The order
 * of the supplied governance records never affects the output.
 *
 * The return value is a recommendation record only. Nothing here — or
 * anywhere in S2 — can activate, enable, connect, or execute a capability.
 */
export function selectInspectionCandidates(
  input: InspectionSelectionInput,
): CapabilityInspectionRecommendation {
  if (!(input.taskClass in TASK_PREFERENCES)) {
    throw new TypeError(`Unknown capability task class: ${String(input.taskClass)}`);
  }
  if (typeof input.generatedAt !== "string" || !Number.isFinite(Date.parse(input.generatedAt))) {
    throw new TypeError("generatedAt must be a caller-supplied ISO timestamp string.");
  }
  if (typeof input.runId !== "string" || !input.runId.trim()) {
    throw new TypeError("runId must be a non-empty string.");
  }
  const maxSelected = input.maxSelected ?? MAX_INSPECTION_CANDIDATES;
  if (!Number.isInteger(maxSelected) || maxSelected < 0 || maxSelected > MAX_INSPECTION_CANDIDATES) {
    throw new RangeError(
      `maxSelected must be an integer between 0 and ${MAX_INSPECTION_CANDIDATES}; the governor never selects more than ${MAX_INSPECTION_CANDIDATES} inspection candidates per run.`,
    );
  }

  const inventory = input.inventory ?? getCapabilityInventory();
  const governanceRecords = input.governanceRecords ?? getCapabilityGovernanceRecords();

  const recordsById = new Map<string, CapabilityGovernanceRecord>();
  const duplicateRecordIds = new Set<string>();
  for (const record of governanceRecords) {
    if (recordsById.has(record.capabilityId)) {
      duplicateRecordIds.add(record.capabilityId);
    } else {
      recordsById.set(record.capabilityId, record);
    }
  }

  const preferenceOrder = TASK_PREFERENCES[input.taskClass];
  const plugins = inventory.filter((entry) => entry.surface === "CLAUDE_PLUGIN");
  const byName = new Map(plugins.map((entry) => [normalized(entry.name), entry]));

  const eligibleCandidates: CapabilityInspectionCandidate[] = [];
  const heldCandidates: CapabilityInspectionCandidate[] = [];
  const ineligible: IneligibleCapabilityRecord[] = [];
  const unresolvedPreferences: string[] = [];

  preferenceOrder.forEach((name, index) => {
    const entry = byName.get(normalized(name));
    const taskFitRank = index + 1;
    if (!entry) {
      unresolvedPreferences.push(name);
      return;
    }

    const governance = recordsById.get(entry.id);
    const ineligibilityReasons = governanceIneligibilityReasons(
      entry,
      governance,
      duplicateRecordIds.has(entry.id),
    );
    if (ineligibilityReasons.length > 0 || !governance) {
      ineligible.push({
        capabilityId: entry.id,
        name: entry.name,
        taskFitRank,
        reasons: ineligibilityReasons,
        failClosed: true,
      });
      return;
    }

    const trustTier = classifyCapabilityTrust(entry);
    const riskFlags = detectCapabilityRisk(entry);
    const thirdPartyHeld = trustTier === "THIRD_PARTY" && input.allowThirdPartyCandidates !== true;
    const held = hardHold(entry, trustTier, riskFlags) || thirdPartyHeld;
    const fitScore = Math.max(0, 50 - index * 5);
    const score = fitScore + trustScore(trustTier) - riskPenalty(riskFlags);
    const candidate: CapabilityInspectionCandidate = {
      capabilityId: entry.id,
      entry,
      governance,
      trustTier,
      trustEvidence: "CAPTURED_AUTHOR_LABEL_ONLY",
      riskFlags,
      taskFitRank,
      score,
      contextCostEstimate: estimateCapabilityContextCost(entry),
      stopConditions: CAPABILITY_STOP_CONDITION_PROFILES[governance.stopConditionProfile],
      rollbackPlan: CAPABILITY_ROLLBACK_PLANS[governance.rollbackPlanId],
      disposition: held ? "HOLD" : "INSPECT_BEFORE_USE",
      reasons: [
        `task preference rank ${taskFitRank}`,
        `captured author tier ${trustTier}`,
        `permission manifest basis ${governance.permissionManifest?.basis ?? "MISSING"}`,
        `supply-chain state ${governance.supplyChainState}`,
        `version drift state ${governance.versionDriftState}`,
        riskFlags.length > 0
          ? `risk flags: ${riskFlags.join(", ")}`
          : "no name-based risk flags detected",
        held
          ? "held pending explicit inspection or connection decision"
          : "eligible for source inspection only",
      ],
      executionAuthority: false,
    };
    if (held) {
      heldCandidates.push(candidate);
    } else {
      eligibleCandidates.push(candidate);
    }
  });

  const ranked = [...eligibleCandidates].sort(
    (left, right) =>
      right.score - left.score ||
      left.taskFitRank - right.taskFitRank ||
      left.capabilityId.localeCompare(right.capabilityId, "en"),
  );
  const selected = ranked.slice(0, maxSelected);
  const selectedIds = new Set(selected.map((candidate) => candidate.capabilityId));
  const held = [
    ...heldCandidates,
    ...ranked.filter((candidate) => !selectedIds.has(candidate.capabilityId)),
  ].sort(
    (left, right) =>
      left.taskFitRank - right.taskFitRank ||
      left.capabilityId.localeCompare(right.capabilityId, "en"),
  );

  return {
    recordKind: "CAPABILITY_INSPECTION_RECOMMENDATION",
    schemaVersion: 1,
    runId: input.runId,
    generatedAt: input.generatedAt,
    taskClass: input.taskClass,
    maxSelected,
    selectionCap: MAX_INSPECTION_CANDIDATES,
    selected,
    held,
    ineligible,
    unresolvedPreferences,
    autoActivationAllowed: false,
    externalActionsAllowed: false,
    activationApiExported: false,
    policy: [
      "This record is a recommendation for human inspection only; it grants no authority and activates nothing.",
      "A capability without a declared permission manifest, a known supply-chain state, and a matching pinned provenance hash is ineligible — fail closed, no exceptions.",
      "The governor never selects more than three inspection candidates per run.",
      "Activation, connection, and execution are owner actions performed outside this codebase; S2 exports no API that can perform them.",
      "Observed-performance fields start at zero observations and may only ever be filled by real measurements.",
    ],
  };
}
