/**
 * Jarvis Tool Router — the governed registry of external tools.
 *
 * Static, honest registry: what tools exist, what they may do, and whether
 * they can run TODAY. Pure data + accessors — no I/O, no tool execution.
 *
 * Invariants:
 *   - canRunNow is false for every write-capable tool: no approval mechanism
 *     is wired yet, so nothing externally mutating runs.
 *   - approvalRequired is true for every write-capable tool.
 *   - Statuses are never inflated: NOT_WIRED means zero integration exists.
 */

export type ToolCategory =
  | "SOURCE_CONTROL"
  | "DEPLOYMENT"
  | "COMMUNICATION"
  | "CALENDAR"
  | "SEARCH"
  | "VAULT"
  | "DATA"
  | "STUDIO"
  | "BROWSER"
  | "VOICE"
  | "SCHEDULER";

export type ToolStatus = "NOT_WIRED" | "DESIGNED" | "PARTIAL" | "WIRED" | "ACTIVE";

export type ToolRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ToolDefinition {
  readonly id: string;
  readonly name: string;
  readonly category: ToolCategory;
  readonly status: ToolStatus;
  readonly readAllowed: boolean;
  readonly writeAllowed: boolean;
  readonly approvalRequired: boolean;
  readonly canRunNow: boolean;
  readonly riskLevel: ToolRiskLevel;
  readonly nextSetupStep: string;
  readonly auditRequired: boolean;
  readonly scribeRequired: boolean;
  readonly description: string;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const TOOL_REGISTRY: readonly ToolDefinition[] = [
  {
    id: "github",
    name: "GitHub",
    category: "SOURCE_CONTROL",
    status: "DESIGNED",
    readAllowed: true,
    writeAllowed: true,
    approvalRequired: true,
    canRunNow: false,
    riskLevel: "HIGH",
    nextSetupStep:
      "Wire write approval: PRs and pushes go through the action queue with owner sign-off.",
    auditRequired: true,
    scribeRequired: true,
    description:
      "Repo reads work via MCP in Claude Code sessions; writes (PRs, pushes) are designed but the approval gate is not wired.",
  },
  {
    id: "vercel",
    name: "Vercel",
    category: "DEPLOYMENT",
    status: "NOT_WIRED",
    readAllowed: true,
    writeAllowed: true,
    approvalRequired: true,
    canRunNow: false,
    riskLevel: "CRITICAL",
    nextSetupStep: "Connect the Vercel project and define a deploy-approval runbook first.",
    auditRequired: true,
    scribeRequired: true,
    description: "Deployment platform. No integration exists; deploys are manual.",
  },
  {
    id: "gmail",
    name: "Gmail",
    category: "COMMUNICATION",
    status: "NOT_WIRED",
    readAllowed: true,
    writeAllowed: true,
    approvalRequired: true,
    canRunNow: false,
    riskLevel: "HIGH",
    nextSetupStep: "Owner decision required before any email integration; drafts-only mode first.",
    auditRequired: true,
    scribeRequired: true,
    description: "Email. Not wired. If ever wired, draft-only with owner approval per send.",
  },
  {
    id: "calendar",
    name: "Calendar",
    category: "CALENDAR",
    status: "NOT_WIRED",
    readAllowed: true,
    writeAllowed: true,
    approvalRequired: true,
    canRunNow: false,
    riskLevel: "MEDIUM",
    nextSetupStep: "Owner decision required; start with read-only availability checks.",
    auditRequired: true,
    scribeRequired: true,
    description: "Calendar. Not wired. Draft events only when wired.",
  },
  {
    id: "contacts",
    name: "Contacts",
    category: "COMMUNICATION",
    status: "NOT_WIRED",
    readAllowed: true,
    writeAllowed: false,
    approvalRequired: true,
    canRunNow: false,
    riskLevel: "HIGH",
    nextSetupStep: "Privacy review required before any contact data is accessible.",
    auditRequired: true,
    scribeRequired: true,
    description: "Contact directory. Not wired. Personal data — privacy review gate.",
  },
  {
    id: "web-search",
    name: "WebSearch",
    category: "SEARCH",
    status: "PARTIAL",
    readAllowed: true,
    writeAllowed: false,
    approvalRequired: false,
    canRunNow: true,
    riskLevel: "LOW",
    nextSetupStep: "Available in some Claude sessions only; no in-app search API is wired.",
    auditRequired: false,
    scribeRequired: false,
    description: "Web search. Read-only research; availability depends on the session.",
  },
  {
    id: "file-search",
    name: "FileSearch",
    category: "SEARCH",
    status: "PARTIAL",
    readAllowed: true,
    writeAllowed: false,
    approvalRequired: false,
    canRunNow: true,
    riskLevel: "LOW",
    nextSetupStep: "Available in Claude Code sessions (glob/grep); no in-app index exists.",
    auditRequired: false,
    scribeRequired: false,
    description: "Repo and file search. Read-only, session-scoped.",
  },
  {
    id: "vault",
    name: "Vault",
    category: "VAULT",
    status: "WIRED",
    readAllowed: true,
    writeAllowed: true,
    approvalRequired: true,
    canRunNow: false,
    riskLevel: "LOW",
    nextSetupStep: "Add a reviewed write path (job or CLI) that lands formatted scribe entries.",
    auditRequired: true,
    scribeRequired: true,
    description:
      "Obsidian-compatible vault under docs/ai/jarvis/vault/ — file system + git. Reads are free; writes go through review.",
  },
  {
    id: "airwave-data",
    name: "AirwaveData",
    category: "DATA",
    status: "PARTIAL",
    readAllowed: true,
    writeAllowed: false,
    approvalRequired: false,
    canRunNow: true,
    riskLevel: "LOW",
    nextSetupStep: "Wire live claim ingestion; current data is the demo ledger.",
    auditRequired: false,
    scribeRequired: false,
    description: "Airwave pundit-accountability data. Demo ledger reads only.",
  },
  {
    id: "gse-data",
    name: "GSEData",
    category: "DATA",
    status: "WIRED",
    readAllowed: true,
    writeAllowed: false,
    approvalRequired: false,
    canRunNow: true,
    riskLevel: "LOW",
    nextSetupStep: "Already wired for reads via Prisma; keep writes inside existing workers.",
    auditRequired: false,
    scribeRequired: false,
    description: "GSE platform database reads (picks, settlement, ingestion state).",
  },
  {
    id: "gsn-studio",
    name: "GSNStudio",
    category: "STUDIO",
    status: "DESIGNED",
    readAllowed: true,
    writeAllowed: true,
    approvalRequired: true,
    canRunNow: false,
    riskLevel: "MEDIUM",
    nextSetupStep: "Define the studio brief format and the human publish gate.",
    auditRequired: true,
    scribeRequired: true,
    description: "GSN content studio surface. Drafts only; no publish path exists.",
  },
  {
    id: "browser",
    name: "Browser",
    category: "BROWSER",
    status: "NOT_WIRED",
    readAllowed: true,
    writeAllowed: true,
    approvalRequired: true,
    canRunNow: false,
    riskLevel: "CRITICAL",
    nextSetupStep:
      "Requires the approved-domain sandbox design AND scraping clearance engine checks.",
    auditRequired: true,
    scribeRequired: true,
    description:
      "Browser automation. Not wired. Any future use must pass the Scraping Clearance Engine; no evasion tooling ever.",
  },
  {
    id: "voice-stt",
    name: "Voice_STT",
    category: "VOICE",
    status: "NOT_WIRED",
    readAllowed: true,
    writeAllowed: false,
    approvalRequired: false,
    canRunNow: false,
    riskLevel: "MEDIUM",
    nextSetupStep: "Feature-detect browser SpeechRecognition; fall back to push-to-talk UI only.",
    auditRequired: true,
    scribeRequired: false,
    description: "Speech-to-text. Not wired. Browser API is the first candidate.",
  },
  {
    id: "voice-tts",
    name: "Voice_TTS",
    category: "VOICE",
    status: "NOT_WIRED",
    readAllowed: true,
    writeAllowed: false,
    approvalRequired: false,
    canRunNow: false,
    riskLevel: "LOW",
    nextSetupStep: "Evaluate browser speechSynthesis before any external TTS provider.",
    auditRequired: false,
    scribeRequired: false,
    description: "Text-to-speech. Not wired.",
  },
  {
    id: "scheduler",
    name: "Scheduler",
    category: "SCHEDULER",
    status: "PARTIAL",
    readAllowed: true,
    writeAllowed: true,
    approvalRequired: true,
    canRunNow: false,
    riskLevel: "MEDIUM",
    nextSetupStep:
      "BullMQ jobs exist per-worker; a cross-job coordinator with human checkpoints is not built.",
    auditRequired: true,
    scribeRequired: true,
    description: "Background job scheduling (BullMQ + Redis). Individual jobs run; orchestration does not.",
  },
];

// ─── Accessors ────────────────────────────────────────────────────────────────

// Returns one tool definition by stable id, or undefined.
export function getToolById(id: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((t) => t.id === id);
}

// Returns all tools in a category.
export function getToolsByCategory(category: ToolCategory): readonly ToolDefinition[] {
  return TOOL_REGISTRY.filter((t) => t.category === category);
}

// Returns tools whose integration is WIRED or ACTIVE.
export function getWiredTools(): readonly ToolDefinition[] {
  return TOOL_REGISTRY.filter((t) => t.status === "WIRED" || t.status === "ACTIVE");
}

// Returns every tool that requires owner approval before use.
export function getApprovalRequiredTools(): readonly ToolDefinition[] {
  return TOOL_REGISTRY.filter((t) => t.approvalRequired);
}

export interface ToolRouterStatus {
  readonly totalTools: number;
  readonly wiredCount: number;
  readonly partialCount: number;
  readonly notWiredCount: number;
  readonly readyToUseNow: readonly string[];
  readonly requiresApproval: readonly string[];
}

// Honest roll-up of the registry for cockpit display. wired+partial+notWired = total.
export function buildToolRouterStatus(): ToolRouterStatus {
  const wired = TOOL_REGISTRY.filter(
    (t) => t.status === "WIRED" || t.status === "ACTIVE"
  );
  const partial = TOOL_REGISTRY.filter((t) => t.status === "PARTIAL");
  const notWired = TOOL_REGISTRY.filter(
    (t) => t.status === "NOT_WIRED" || t.status === "DESIGNED"
  );

  return {
    totalTools: TOOL_REGISTRY.length,
    wiredCount: wired.length,
    partialCount: partial.length,
    notWiredCount: notWired.length,
    readyToUseNow: TOOL_REGISTRY.filter((t) => t.canRunNow).map((t) => t.name),
    requiresApproval: TOOL_REGISTRY.filter((t) => t.approvalRequired).map((t) => t.name),
  };
}
