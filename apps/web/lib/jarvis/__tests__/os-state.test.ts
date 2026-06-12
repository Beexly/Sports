import { describe, it, expect } from "vitest";
import { buildJarvisOSState, buildStubOwnerSummaryForOS } from "../os-state";
import { createScribeEntry } from "../scribe";
import { createActionItem } from "../action-queue";
import { buildToolRouterStatus } from "../tool-router";

const NOW = "2026-06-12T10:00:00.000Z";

function makeState() {
  return buildJarvisOSState(buildStubOwnerSummaryForOS(NOW));
}

describe("buildJarvisOSState — composition", () => {
  it("composes all sub-systems into non-empty summaries", () => {
    const state = makeState();
    expect(state.assessedAt).toBe(NOW);
    expect(state.operatingLoopPhases.length).toBeGreaterThan(8);
    expect(state.scribeSummary.length).toBeGreaterThan(0);
    expect(state.memorySummary.length).toBeGreaterThan(0);
    expect(state.agentSummary.length).toBeGreaterThan(0);
    expect(state.toolSummary.length).toBeGreaterThan(0);
    expect(state.voiceSummary.length).toBeGreaterThan(0);
    expect(state.promptLibrarySummary.length).toBeGreaterThan(0);
    expect(state.actionQueueSummary.length).toBeGreaterThan(0);
    expect(state.auditSummary.length).toBeGreaterThan(0);
    expect(state.improvementSummary.length).toBeGreaterThan(0);
  });

  it("wiredCount + partialCount + notWiredCount = operatingLoopPhases.length", () => {
    const state = makeState();
    expect(state.wiredCount + state.partialCount + state.notWiredCount).toBe(
      state.operatingLoopPhases.length
    );
  });

  it("is honest: MEMORY, VOICE, IMPROVEMENT_LOOP are NOT_WIRED; AUDIT_LEDGER is PARTIAL", () => {
    const state = makeState();
    const byPhase = new Map(state.operatingLoopPhases.map((p) => [p.phase, p.status]));
    expect(byPhase.get("MEMORY")).toBe("NOT_WIRED");
    expect(byPhase.get("VOICE")).toBe("NOT_WIRED");
    expect(byPhase.get("IMPROVEMENT_LOOP")).toBe("NOT_WIRED");
    expect(byPhase.get("AUDIT_LEDGER")).toBe("PARTIAL");
    expect(byPhase.get("SCRIBE")).toBe("WIRED");
    expect(byPhase.get("PROMPT_LIBRARY")).toBe("WIRED");
    expect(byPhase.get("TOOL_ROUTER")).toBe("WIRED");
    expect(byPhase.get("ACTION_QUEUE")).toBe("WIRED");
  });

  it("safeToRunNow lists the read-only tools plus the read-only action lane", () => {
    const state = makeState();
    const tools = buildToolRouterStatus();
    for (const name of tools.readyToUseNow) {
      expect(state.safeToRunNow.join(" ")).toContain(name);
    }
    expect(state.safeToRunNow.join(" ")).toContain("READ_ONLY_CHECK");
    // Nothing write-shaped sneaks into the safe list.
    expect(state.safeToRunNow.join(" ")).not.toMatch(/deploy|publish|Gmail/i);
  });

  it("requiresApproval covers every approval-gated tool", () => {
    const state = makeState();
    const tools = buildToolRouterStatus();
    for (const name of tools.requiresApproval) {
      expect(state.requiresApproval.join(" ")).toContain(name);
    }
  });

  it("incorporates scribe entries and pending actions when provided", () => {
    const entry = createScribeEntry({
      createdAt: NOW,
      source: "claude",
      actor: "claude",
      project: "JARVIS",
      type: "RESULT",
      title: "Built OS state",
      summary: "Composed all layers.",
      tags: [],
      relatedFiles: [],
      relatedRoutes: [],
      approvalStatus: "NOT_REQUIRED",
      visibility: "INTERNAL",
      riskLevel: "LOW",
    });
    const action = createActionItem({
      type: "READ_ONLY_CHECK",
      title: "Check ingestion freshness",
      reason: "Daily check",
      risk: "LOW",
      expectedOutput: "Freshness report",
      affectedFiles: [],
      toolsRequired: ["gse-data"],
      approvalRequired: false,
      rollbackPlan: "None needed — read-only.",
      scribeEntryRequired: false,
      proposedAt: NOW,
      proposedBy: "jarvis",
    });

    const state = buildJarvisOSState(buildStubOwnerSummaryForOS(NOW), [entry], [action]);
    expect(state.scribeSummary).toContain("1 scribe entry");
    expect(state.actionQueueSummary).toContain("1 proposed");
  });

  it("surfaces honest blockers and next actions", () => {
    const state = makeState();
    expect(state.topBlockers.join(" ")).toMatch(/memory store not wired/i);
    expect(state.nextBestActions.length).toBeGreaterThan(0);
  });
});
