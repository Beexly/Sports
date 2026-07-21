import {
  getCapabilityInventory,
  type CapabilityInventoryEntry,
} from "./capability-inventory";

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
