import type { AgentRunRecord } from "./agent-run-contract";

export type RepoAssistantId = "repomaster" | "ponytail";

export interface RepoAssistantProfile {
  readonly id: RepoAssistantId;
  readonly displayName: string;
  readonly fit: string;
  readonly invocation: string;
  readonly allowedUse: string;
  readonly prohibitedUse: string;
  readonly sourceUrl: string;
}

export interface RepoAssistantPlan {
  readonly profile: RepoAssistantProfile;
  readonly workspace: string;
  readonly task: string;
  readonly commands: readonly string[];
  readonly runRecord: AgentRunRecord;
}

const PROFILES: Readonly<Record<RepoAssistantId, RepoAssistantProfile>> = {
  repomaster: {
    id: "repomaster",
    displayName: "RepoMaster",
    fit: "Offline repository investigation, source research, and draft patch planning.",
    invocation:
      "python launcher.py --mode backend --backend-mode repository_agent",
    allowedUse:
      "Use against a disposable or read-only checkout with production credentials absent.",
    prohibitedUse:
      "Do not connect it to live databases, secrets, publishing, billing, odds ingestion, or pick scoring.",
    sourceUrl: "https://github.com/QuantaAlpha/RepoMaster",
  },
  ponytail: {
    id: "ponytail",
    displayName: "Ponytail",
    fit: "A prompt/plugin guard that favors the smallest native implementation after the code is understood.",
    invocation: "Install only in the operator's coding-agent environment.",
    allowedUse:
      "Use for code changes that still retain validation, accessibility, security, and existing review gates.",
    prohibitedUse:
      "Do not treat terseness as permission to remove tests, error handling, rights checks, or approval gates.",
    sourceUrl: "https://github.com/DietrichGebert/ponytail",
  },
};

const UNSAFE_WORKSPACE_MARKERS = [
  ".env",
  "production",
  "prod",
  "credentials",
  "secrets",
];

export function getRepoAssistantProfile(
  id: RepoAssistantId,
): RepoAssistantProfile {
  return PROFILES[id];
}

export function createRepoAssistantPlan(
  id: RepoAssistantId,
  task: string,
  workspace: string,
): RepoAssistantPlan {
  const normalizedWorkspace = workspace.trim();
  const normalizedTask = task.trim();
  if (!normalizedWorkspace) throw new Error("workspace is required");
  if (!normalizedTask) throw new Error("task is required");

  const workspaceLower = normalizedWorkspace.toLowerCase();
  if (UNSAFE_WORKSPACE_MARKERS.some((marker) => workspaceLower.includes(marker))) {
    throw new Error(
      "repo assistants require a disposable workspace without production or credential markers",
    );
  }

  const profile = getRepoAssistantProfile(id);
  const commands =
    id === "repomaster"
      ? [
          `cd ${shellQuote(normalizedWorkspace)}`,
          `${profile.invocation} --work-dir ${shellQuote(normalizedWorkspace)}`,
        ]
      : [
          "Install Ponytail only in the operator coding-agent environment.",
          "Review its lifecycle hooks before enabling them.",
        ];

  const runRecord: AgentRunRecord = {
    taskId: `repo-assistant:${id}`,
    parentSeat: "tal",
    subagentId: id,
    taskType: "repository-assistance",
    inputContext: normalizedTask,
    sourceRefs: [profile.sourceUrl],
    toolsUsed: [profile.displayName],
    filesChanged: [],
    claimsMade: [],
    uncertainty:
      "The external tool's output and any proposed patch require operator review.",
    prohibitedActionsChecked: true,
    costEstimate: {
      usd: 0,
      note: "No external invocation is performed by this planner.",
    },
    verificationCommands: [
      "npm run typecheck",
      "npm run lint",
      "npx vitest run <task-test-file>",
    ],
    verificationResults: null,
    reviewStatus: "draft",
    ownerApprovalRequired: true,
    publicImpact: "none",
    rollbackPlan: "Discard the disposable workspace and apply no unreviewed patch.",
    requestsExternalAction: false,
  };

  return {
    profile,
    workspace: normalizedWorkspace,
    task: normalizedTask,
    commands,
    runRecord,
  };
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
