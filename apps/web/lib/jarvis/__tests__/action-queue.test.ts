import { describe, it, expect } from "vitest";
import {
  createActionItem,
  validateActionItem,
  canExecuteWithoutApproval,
  requiresApproval,
  transitionActionState,
  buildActionQueueSummary,
  type ActionItem,
  type ActionType,
} from "../action-queue";

const NOW = "2026-06-12T10:00:00.000Z";

function makeItem(overrides: Partial<Parameters<typeof createActionItem>[0]> = {}): ActionItem {
  return createActionItem({
    type: "CODE_CHANGE_PROPOSAL",
    title: "Wire the audit store",
    reason: "Action transitions need a durable trail.",
    risk: "MEDIUM",
    expectedOutput: "Prisma model + write-on-transition",
    affectedFiles: ["packages/db/schema.prisma"],
    toolsRequired: ["github"],
    approvalRequired: true,
    rollbackPlan: "Revert the migration and the commit.",
    scribeEntryRequired: true,
    proposedAt: NOW,
    proposedBy: "jarvis",
    ...overrides,
  });
}

describe("createActionItem", () => {
  it("creates a PROPOSED item with a deterministic id", () => {
    const item = makeItem();
    expect(item.state).toBe("PROPOSED");
    expect(item.id).toContain("code_change_proposal");
    expect(item.proposedAt).toBe(NOW);
  });

  it("force-sets approvalRequired for non-read-only types", () => {
    const item = makeItem({ type: "EMAIL_DRAFT", approvalRequired: false });
    expect(item.approvalRequired).toBe(true);
  });
});

describe("approval boundary — only READ_ONLY_CHECK can skip approval", () => {
  const WRITE_TYPES: readonly ActionType[] = [
    "DESIGN_PROPOSAL",
    "CODE_CHANGE_PROPOSAL",
    "DOC_UPDATE_PROPOSAL",
    "TEST_RUN",
    "DEPLOYMENT_PROPOSAL",
    "EMAIL_DRAFT",
    "CALENDAR_DRAFT",
    "GITHUB_PR_REVIEW",
    "AIRWAVE_REVIEW",
    "GSE_DATA_CHECK",
    "GSN_STUDIO_BRIEF",
  ];

  it("every non-read-only type requires approval", () => {
    for (const type of WRITE_TYPES) {
      const item = makeItem({ type, approvalRequired: false });
      expect(canExecuteWithoutApproval(item), `${type} must not skip approval`).toBe(false);
      expect(requiresApproval(item)).toBe(true);
    }
  });

  it("READ_ONLY_CHECK without the approval flag can execute", () => {
    const item = makeItem({ type: "READ_ONLY_CHECK", approvalRequired: false });
    expect(canExecuteWithoutApproval(item)).toBe(true);
    expect(requiresApproval(item)).toBe(false);
  });
});

describe("validateActionItem", () => {
  it("requires rollbackPlan", () => {
    const item = makeItem({ rollbackPlan: "" });
    const { valid, errors } = validateActionItem(item);
    expect(valid).toBe(false);
    expect(errors).toContain("rollbackPlan is required");
  });

  it("accepts a complete item", () => {
    const { valid, errors } = validateActionItem(makeItem());
    expect(errors).toEqual([]);
    expect(valid).toBe(true);
  });
});

describe("transitionActionState", () => {
  it("rejects invalid transitions", () => {
    const item = makeItem();
    const result = transitionActionState(item, "COMPLETED");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid transition/);
    expect(result.item.state).toBe("PROPOSED");
  });

  it("blocks PROPOSED → RUNNING for approval-gated actions", () => {
    const result = transitionActionState(makeItem(), "RUNNING");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/requires approval/i);
  });

  it("allows the approved lifecycle path", () => {
    let item = makeItem();
    for (const state of ["NEEDS_APPROVAL", "APPROVED", "RUNNING", "COMPLETED", "SCRIBED"] as const) {
      const result = transitionActionState(item, state);
      expect(result.success, `transition to ${state}`).toBe(true);
      item = result.item;
    }
    expect(item.state).toBe("SCRIBED");
  });

  it("allows PROPOSED → RUNNING for unflagged read-only checks", () => {
    const item = makeItem({ type: "READ_ONLY_CHECK", approvalRequired: false });
    expect(transitionActionState(item, "RUNNING").success).toBe(true);
  });
});

describe("buildActionQueueSummary", () => {
  it("totals correctly by state", () => {
    const a = makeItem();
    const b = transitionActionState(makeItem({ title: "Second" }), "NEEDS_APPROVAL").item;
    const summary = buildActionQueueSummary([a, b]);
    expect(summary.proposed).toBe(1);
    expect(summary.needsApproval).toBe(1);
    expect(summary.approved).toBe(0);
    expect(summary.running).toBe(0);
    expect(summary.completed).toBe(0);
    expect(summary.failed).toBe(0);
  });
});
