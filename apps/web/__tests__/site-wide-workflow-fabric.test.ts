import { describe, expect, it, vi } from "vitest";
import {
  checkCorpusCompletionBeforeSlatePrep,
  getAllSubagentTemplates,
  runSiteWideWorkflowFabric,
} from "@/lib/autonomy/site-wide-workflow-fabric";
import { AGENT_COUNCIL } from "@/lib/jarvis/agent-council";
import { AGENT_OS_REGISTRY } from "@/lib/agents/agent-registry";
import { WORKFLOW_REGISTRY } from "@/lib/workflows/workflow-registry";

describe("site-wide-workflow-fabric", () => {
  it("keeps existing registries truthful while uniting all 23 seats, 21 subagents, 10 destroy seats, 8 war-room watchers, and 14 workflows", async () => {
    expect(AGENT_COUNCIL).toHaveLength(23);
    expect(AGENT_OS_REGISTRY).toHaveLength(23);
    expect(WORKFLOW_REGISTRY).toHaveLength(14);
    expect(getAllSubagentTemplates()).toHaveLength(21);

    const summary = await runSiteWideWorkflowFabric({
      dryRun: true,
      executeInference: false,
      corpusGateInput: {
        pendingTierACount: 131,
        wiredTierACount: 12,
        calibrationVerified: false,
      },
    });

    expect(summary.ok).toBe(true);
    expect(summary.contractViolations).toBe(0);
    expect(summary.census).toEqual({
      councilSeats: 23,
      osAgents: 23,
      subagentTemplates: 21,
      aiCouncilDestroySeats: 10,
      warRoomWatchers: 8,
      workflows: 14,
    });
    expect(summary.corpusGate.slatePrepAllowed).toBe(false);
    expect(summary.corpusGate.status).toBe("WEEK10_HELD_FOR_CORPUS_COMPLETION");
    expect(summary.workflowsHeldByCorpusGate).toBe(1);
    const picksWf = summary.workflowReceipts.find((w) => w.workflowId === "picks-intelligence");
    expect(picksWf?.heldByCorpusGate).toBe(true);
    expect(picksWf?.contractRuling.decision).toBe("ALLOW");
    expect(summary.destroyAudit.surfacesAudited).toBeGreaterThan(0);

    // Static truth invariants remain unchanged
    for (const seat of AGENT_COUNCIL) {
      expect(seat.externalActions).toBe("NONE");
      expect(seat.externalActionsAllowed).toBe(false);
    }
  });

  it("releases Week 10 gate only when pendingTierACount === 0 and calibrationVerified === true", () => {
    const held = checkCorpusCompletionBeforeSlatePrep({
      pendingTierACount: 5,
      wiredTierACount: 20,
      calibrationVerified: true,
    });
    expect(held.slatePrepAllowed).toBe(false);
    expect(held.status).toBe("WEEK10_HELD_FOR_CORPUS_COMPLETION");

    const ready = checkCorpusCompletionBeforeSlatePrep({
      pendingTierACount: 0,
      wiredTierACount: 136,
      calibrationVerified: true,
    });
    expect(ready.slatePrepAllowed).toBe(true);
    expect(ready.status).toBe("READY_FOR_WEEK10_PREP");
  });

  it("executes live workflow subset with pluggable free inference dispatch and enforces contract rulings", async () => {
    const mockDispatch = vi.fn(async () => ({
      text: '{"status":"draft_ok","note":"corpus health verified"}',
      inputTokens: 120,
      outputTokens: 32,
      costUsd: 0,
    }));

    const summary = await runSiteWideWorkflowFabric({
      dryRun: false,
      executeInference: true,
      lane: "free",
      workflowIds: ["daily-intelligence-brief", "calibration"],
      corpusGateInput: {
        pendingTierACount: 10,
        wiredTierACount: 90,
        calibrationVerified: false,
      },
      customDispatch: mockDispatch,
      env: { MODELSCOPE_API_KEY: "test-key" },
    });

    expect(summary.ok).toBe(true);
    expect(summary.workflowsExecuted).toBe(2);
    expect(summary.totalCostUsd).toBe(0);
    expect(mockDispatch).toHaveBeenCalledTimes(2);
    expect(summary.workflowReceipts.every((w) => w.contractRuling.decision === "ALLOW")).toBe(true);
  });
});
