import { describe, it, expect } from "vitest";
import { evaluateAgentRun, type AgentRunRecord } from "@/lib/agents/agent-run-contract";

function base(overrides: Partial<AgentRunRecord> = {}): AgentRunRecord {
  return {
    taskId: "t1",
    parentSeat: "SCOUT",
    subagentId: null,
    taskType: "research",
    inputContext: "audit clv coverage",
    sourceRefs: [],
    toolsUsed: ["read"],
    filesChanged: [],
    claimsMade: [],
    uncertainty: "the live DB was not reachable in this run",
    prohibitedActionsChecked: true,
    costEstimate: { usd: 0 },
    verificationCommands: [],
    verificationResults: null,
    reviewStatus: "pending",
    ownerApprovalRequired: false,
    publicImpact: "internal",
    rollbackPlan: "revert commit",
    requestsExternalAction: false,
    ...overrides,
  };
}

describe("agent run contract", () => {
  it("allows a clean, draft/pending, non-external run", () => {
    expect(evaluateAgentRun(base()).decision).toBe("ALLOW");
  });

  it("forbids an external action without owner approval", () => {
    const r = evaluateAgentRun(base({ requestsExternalAction: true, ownerApprovalRequired: false }));
    expect(r.decision).toBe("BLOCK");
    expect(r.violations.join(" ")).toMatch(/external action requires ownerApprovalRequired/i);
  });

  it("forbids an external action that is anything but draft/pending", () => {
    const r = evaluateAgentRun(base({ requestsExternalAction: true, ownerApprovalRequired: true, reviewStatus: "approved" }));
    expect(r.decision).toBe("BLOCK");
  });

  it("an external action may be QUEUED (owner-gated, still pending)", () => {
    const r = evaluateAgentRun(
      base({ requestsExternalAction: true, ownerApprovalRequired: true, reviewStatus: "pending" })
    );
    expect(r.decision).toBe("ALLOW");
  });

  it("agents cannot self-approve or self-reject", () => {
    expect(evaluateAgentRun(base({ reviewStatus: "approved" })).decision).toBe("BLOCK");
    expect(evaluateAgentRun(base({ reviewStatus: "rejected" })).decision).toBe("BLOCK");
  });

  it("requires verification commands for a code-modifying run", () => {
    const noVerify = evaluateAgentRun(base({ filesChanged: ["a.ts"], verificationCommands: [] }));
    expect(noVerify.decision).toBe("BLOCK");
    const withVerify = evaluateAgentRun(base({ filesChanged: ["a.ts"], verificationCommands: ["npm test"] }));
    expect(withVerify.decision).toBe("ALLOW");
  });

  it("requires a non-empty uncertainty statement", () => {
    expect(evaluateAgentRun(base({ uncertainty: "  " })).decision).toBe("BLOCK");
  });

  it("requires the prohibited-action check", () => {
    expect(evaluateAgentRun(base({ prohibitedActionsChecked: false })).decision).toBe("BLOCK");
  });
});
