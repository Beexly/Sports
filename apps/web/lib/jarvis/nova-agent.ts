/**
 * NOVA — AI Opportunity Intelligence & Venture Engine.
 *
 * This file defines NOVA's governed GSE agent contract. It is intentionally not
 * inserted into the canonical council registry until its scheduler, persistence,
 * receipts, and review surface are wired. Declared status must follow runtime
 * evidence; the existence of this contract alone does not make NOVA active.
 */

export const NOVA_ALLOWED_ACTIONS = [
  "FETCH_ALLOWLISTED_PUBLIC_METADATA",
  "VALIDATE_SOURCE",
  "NORMALIZE_CHANGE",
  "DETECT_CONTRADICTION",
  "SCORE_OPPORTUNITY",
  "MAP_PROJECT_FIT",
  "BUILD_DRAFT_PACKET",
  "RUN_DETERMINISTIC_REPLAY",
  "RUN_OWNER_APPROVED_LOCAL_EXPERIMENT",
  "RECORD_INTERNAL_OUTCOME",
  "PROPOSE_POLICY_CHANGE",
] as const;

export const NOVA_FORBIDDEN_ACTIONS = [
  "BROWSE_UNALLOWLISTED_SOURCE",
  "INSTALL_DISCOVERED_PACKAGE",
  "EXECUTE_DISCOVERED_CODE",
  "CLONE_DISCOVERED_REPOSITORY",
  "WRITE_EXTERNAL_SYSTEM",
  "SEND_MESSAGE",
  "SUBMIT_APPLICATION",
  "MAKE_PURCHASE",
  "ACTIVATE_BILLING",
  "USE_BILLABLE_FALLBACK",
  "ALTER_CREDENTIALS",
  "MUTATE_PRODUCTION_DATA",
  "MERGE_CODE",
  "DEPLOY_CODE",
  "PUBLISH_CONTENT",
  "MODIFY_GOVERNANCE",
  "SELF_APPROVE_OUTPUT",
  "COUNT_ESTIMATE_AS_REVENUE",
  "COUNT_DISCOVERY_AS_USABLE_CREDIT",
] as const;

export type NovaAllowedAction = (typeof NOVA_ALLOWED_ACTIONS)[number];
export type NovaForbiddenAction = (typeof NOVA_FORBIDDEN_ACTIONS)[number];
export type NovaAction = NovaAllowedAction | NovaForbiddenAction;

export type NovaRunMode = "SCHEDULED_READ_ONLY_DRAFT_ONLY";
export type NovaRuntimeStatus = "DESIGNED" | "DRAFT_ONLY" | "MANUAL";

export interface NovaAgentProfile {
  readonly codename: "NOVA";
  readonly role: "AI Opportunity Intelligence & Venture Analyst";
  readonly department: "Command & Governance";
  readonly reportsTo: "JARVIS";
  readonly runtimeStatus: NovaRuntimeStatus;
  readonly runMode: NovaRunMode;
  readonly mission: string;
  readonly ownedCapability: "ai-opportunity-intelligence";
  readonly externalActions: false;
  readonly canInstall: false;
  readonly canMerge: false;
  readonly canDeploy: false;
  readonly canPublish: false;
  readonly canSpend: false;
  readonly canContactThirdParties: false;
  readonly canModifyGovernance: false;
  readonly allowedActions: readonly NovaAllowedAction[];
  readonly forbiddenActions: readonly NovaForbiddenAction[];
}

export const NOVA_AGENT_PROFILE: NovaAgentProfile = Object.freeze({
  codename: "NOVA",
  role: "AI Opportunity Intelligence & Venture Analyst",
  department: "Command & Governance",
  reportsTo: "JARVIS",
  runtimeStatus: "DESIGNED",
  runMode: "SCHEDULED_READ_ONLY_DRAFT_ONLY",
  mission:
    "Detect verified AI ecosystem changes, map them to Galaxy projects, rank economic and strategic value, design bounded experiments, and learn from measured outcomes without acquiring external authority.",
  ownedCapability: "ai-opportunity-intelligence",
  externalActions: false,
  canInstall: false,
  canMerge: false,
  canDeploy: false,
  canPublish: false,
  canSpend: false,
  canContactThirdParties: false,
  canModifyGovernance: false,
  allowedActions: NOVA_ALLOWED_ACTIONS,
  forbiddenActions: NOVA_FORBIDDEN_ACTIONS,
});

export type NovaSubagentCodename = "RADAR" | "VET" | "MARGIN" | "FORGE" | "WATCHTOWER";

export interface NovaSubagentProfile {
  readonly codename: NovaSubagentCodename;
  readonly responsibility: string;
  readonly output: string;
  readonly mayApproveOwnOutput: false;
  readonly externalActions: false;
}

export const NOVA_SUBAGENTS: readonly NovaSubagentProfile[] = Object.freeze([
  Object.freeze({
    codename: "RADAR",
    responsibility: "Monitor approved official changelogs, registries, packages, models, protocols, and release feeds.",
    output: "Unverified or primary-source-backed change candidates with complete source receipts.",
    mayApproveOwnOutput: false,
    externalActions: false,
  }),
  Object.freeze({
    codename: "VET",
    responsibility: "Verify primary evidence, detect contradictions, and classify rights, terms, freshness, and uncertainty.",
    output: "Evidence packet separating fact, inference, assumption, contradiction, and unknown.",
    mayApproveOwnOutput: false,
    externalActions: false,
  }),
  Object.freeze({
    codename: "MARGIN",
    responsibility: "Evaluate credits, grants, pricing, partnerships, marketplaces, direct revenue, cost reduction, and attention cost.",
    output: "Economic estimate with truth-state separation, ranges, dependencies, and no premature revenue or credit claims.",
    mayApproveOwnOutput: false,
    externalActions: false,
  }),
  Object.freeze({
    codename: "FORGE",
    responsibility: "Design isolated, falsifiable prototypes and relevant workload benchmarks after evidence and policy gates pass.",
    output: "Draft experiment contract with budget, baseline, metrics, kill criteria, rollback, and owner approval gate.",
    mayApproveOwnOutput: false,
    externalActions: false,
  }),
  Object.freeze({
    codename: "WATCHTOWER",
    responsibility: "Prioritize security, deprecation, breaking-change, pricing, quota, license, terms, and credit-expiration exposure.",
    output: "Avoided-loss alert and minimum safe response packet.",
    mayApproveOwnOutput: false,
    externalActions: false,
  }),
]);

const allowedActionSet: ReadonlySet<NovaAction> = new Set(NOVA_ALLOWED_ACTIONS);
const forbiddenActionSet: ReadonlySet<NovaAction> = new Set(NOVA_FORBIDDEN_ACTIONS);

export interface NovaActionContext {
  readonly ownerApproved?: boolean;
  readonly sourceAllowlisted?: boolean;
  readonly zeroCashOnly?: boolean;
  readonly isolatedEnvironment?: boolean;
  readonly deterministicInput?: boolean;
}

export interface NovaActionDecision {
  readonly action: NovaAction;
  readonly allowed: boolean;
  readonly reason: string;
  readonly requiresOwnerApproval: boolean;
  readonly externalActionsAllowed: false;
}

export function decideNovaAction(action: NovaAction, context: NovaActionContext = {}): NovaActionDecision {
  if (forbiddenActionSet.has(action)) {
    return {
      action,
      allowed: false,
      reason: `${action} is outside NOVA's authority.`,
      requiresOwnerApproval: true,
      externalActionsAllowed: false,
    };
  }
  if (!allowedActionSet.has(action)) {
    return {
      action,
      allowed: false,
      reason: "Unknown actions default closed.",
      requiresOwnerApproval: true,
      externalActionsAllowed: false,
    };
  }
  if (action === "FETCH_ALLOWLISTED_PUBLIC_METADATA" && context.sourceAllowlisted !== true) {
    return {
      action,
      allowed: false,
      reason: "Public metadata fetch requires an allowlisted source.",
      requiresOwnerApproval: false,
      externalActionsAllowed: false,
    };
  }
  if (action === "RUN_DETERMINISTIC_REPLAY" && context.deterministicInput !== true) {
    return {
      action,
      allowed: false,
      reason: "Replay requires deterministic captured input.",
      requiresOwnerApproval: false,
      externalActionsAllowed: false,
    };
  }
  if (action === "RUN_OWNER_APPROVED_LOCAL_EXPERIMENT") {
    const allowed =
      context.ownerApproved === true &&
      context.isolatedEnvironment === true &&
      context.zeroCashOnly === true;
    return {
      action,
      allowed,
      reason: allowed
        ? "Owner-approved, isolated, zero-cash local experiment satisfies NOVA's experiment gate."
        : "Local experiments require owner approval, isolation, and zero-cash execution.",
      requiresOwnerApproval: true,
      externalActionsAllowed: false,
    };
  }
  return {
    action,
    allowed: true,
    reason: "Internal read-only or draft-only action is within NOVA's designed authority.",
    requiresOwnerApproval: false,
    externalActionsAllowed: false,
  };
}

export type NovaEventClass =
  | "SECURITY"
  | "BREAKING_CHANGE"
  | "DEPRECATION"
  | "TERMS_CHANGE"
  | "PRICE_CHANGE"
  | "LIMIT_CHANGE"
  | "ELIGIBILITY_CHANGE"
  | "CREDIT_PROGRAM"
  | "MODEL_RELEASE"
  | "SDK_RELEASE"
  | "AGENT_TOOL_RELEASE"
  | "PROTOCOL_CHANGE"
  | "REGISTRY_CHANGE"
  | "PLATFORM_CHANGE"
  | "WORKFLOW_CHANGE";

export interface NovaReviewRoute {
  readonly eventClass: NovaEventClass;
  readonly reviewers: readonly string[];
  readonly immediate: boolean;
  readonly ownerDecisionRequired: boolean;
  readonly externalActionsAllowed: false;
}

export function buildNovaReviewRoute(eventClass: NovaEventClass, urgency: number): NovaReviewRoute {
  const reviewers = new Set<string>(["NOVA", "JARVIS"]);
  if (["SECURITY", "BREAKING_CHANGE", "DEPRECATION", "TERMS_CHANGE"].includes(eventClass)) {
    reviewers.add("TAL");
    reviewers.add("GAUGE");
  }
  if (["PRICE_CHANGE", "LIMIT_CHANGE", "ELIGIBILITY_CHANGE", "CREDIT_PROGRAM"].includes(eventClass)) {
    reviewers.add("METER");
    reviewers.add("BOBBY");
  }
  if (["MODEL_RELEASE", "SDK_RELEASE", "AGENT_TOOL_RELEASE", "PROTOCOL_CHANGE", "REGISTRY_CHANGE"].includes(eventClass)) {
    reviewers.add("TAL");
    reviewers.add("RELAY");
  }
  return Object.freeze({
    eventClass,
    reviewers: Object.freeze([...reviewers]),
    immediate: urgency >= 85,
    ownerDecisionRequired: true,
    externalActionsAllowed: false,
  });
}

export interface NovaCouncilPacket {
  readonly packetId: string;
  readonly agent: "NOVA";
  readonly status: "DRAFT";
  readonly eventClass: NovaEventClass;
  readonly title: string;
  readonly verifiedFacts: readonly string[];
  readonly assumptions: readonly string[];
  readonly unknowns: readonly string[];
  readonly projectIds: readonly string[];
  readonly estimatedValueUsd: number;
  readonly realizedRevenueUsd: 0;
  readonly usableCreditsUsd: 0;
  readonly nextSmallestTest: string;
  readonly route: NovaReviewRoute;
  readonly externalActionsAllowed: false;
}

export function buildNovaCouncilPacket(input: {
  readonly packetId: string;
  readonly eventClass: NovaEventClass;
  readonly urgency: number;
  readonly title: string;
  readonly verifiedFacts?: readonly string[];
  readonly assumptions?: readonly string[];
  readonly unknowns?: readonly string[];
  readonly projectIds?: readonly string[];
  readonly estimatedValueUsd?: number;
  readonly nextSmallestTest: string;
}): NovaCouncilPacket {
  const estimatedValueUsd = Number.isFinite(input.estimatedValueUsd)
    ? Math.max(0, input.estimatedValueUsd ?? 0)
    : 0;
  return Object.freeze({
    packetId: input.packetId,
    agent: "NOVA",
    status: "DRAFT",
    eventClass: input.eventClass,
    title: input.title,
    verifiedFacts: Object.freeze([...(input.verifiedFacts ?? [])]),
    assumptions: Object.freeze([...(input.assumptions ?? [])]),
    unknowns: Object.freeze([...(input.unknowns ?? [])]),
    projectIds: Object.freeze([...(input.projectIds ?? [])]),
    estimatedValueUsd,
    realizedRevenueUsd: 0,
    usableCreditsUsd: 0,
    nextSmallestTest: input.nextSmallestTest,
    route: buildNovaReviewRoute(input.eventClass, input.urgency),
    externalActionsAllowed: false,
  });
}
