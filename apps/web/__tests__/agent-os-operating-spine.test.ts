import { describe, expect, it } from "vitest";
import { AGENT_OS_REGISTRY, assertAgentCanReceiveExecutableTask, getAgent } from "@/lib/agents/agent-registry";
import { summarizeAgentHealth } from "@/lib/agents/agent-health";
import { routeAgentTask, routeSeedAgentTasks, upsertAgentTask, listSeedAgentTasks } from "@/lib/tasks/agent-task-router";
import { FORBIDDEN_WITHOUT_OWNER_APPROVAL } from "@/lib/tasks/agent-task-types";
import { WORKFLOW_REGISTRY } from "@/lib/workflows/workflow-registry";
import { planWorkflowRun } from "@/lib/workflows/workflow-runner";
import { workflowCanChangeModelWeights, workflowCanPublish, workflowRequiresOwnerApproval } from "@/lib/workflows/workflow-gates";
import { COCKPIT_OPERATING_MAP } from "@/lib/cockpit/cockpit-operating-map";
import { buildJarvisOperatingAssessment } from "@/lib/jarvis/jarvis-operating-assessment";
import { normalizePlayerName, resolvePlayerByGsis, unsafeNameOnlyMergeAttempt } from "@/lib/nfl/player-identity-resolver";
import { normalizeTeamAlias } from "@/lib/nfl/team-resolver";
import { resolveGameIdentity } from "@/lib/nfl/game-resolver";
import { isSettledHistoricalSeason } from "@/lib/nfl/season-week";
import { auditStatCoverage, coverageGapToTask } from "@/lib/statking/stat-coverage-auditor";
import { PROJECTION_FEATURE_REGISTRY } from "@/lib/projections/projection-feature-registry";

describe("Agent OS registry", () => {
  it("contains the full 23-seat council without duplicate IDs", () => {
    const ids = AGENT_OS_REGISTRY.map((agent) => agent.id);
    expect(ids).toHaveLength(23);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every agent has operating metadata, cockpit ownership, actions, and escalation", () => {
    for (const agent of AGENT_OS_REGISTRY) {
      expect(agent.department).toBeTruthy();
      expect(agent.status).toBeTruthy();
      expect(agent.cockpitSurfacesOwned.length).toBeGreaterThan(0);
      expect(agent.allowedActions.length).toBeGreaterThan(0);
      expect(agent.forbiddenActions).toEqual(expect.arrayContaining([...FORBIDDEN_WITHOUT_OWNER_APPROVAL]));
      expect(agent.escalatesTo).toContain("jarvis");
      expect(agent.externalActionsAllowed).toBe(false);
    }
  });

  it("enforces truthful execution state for not-wired, draft-only, and manual agents", () => {
    expect(assertAgentCanReceiveExecutableTask("delta")).toBe(false);
    expect(getAgent("ava")?.allowedActions).toContain("DRAFT");
    expect(getAgent("ava")?.forbiddenActions).toContain("PUBLISH");
    expect(getAgent("ledger")?.status).toBe("MANUAL");
    expect(getAgent("ledger")?.cadence).toBe("human-triggered");
  });

  it("keeps scoring, browser, voice, and tool governance blocked behind approvals", () => {
    expect(getAgent("prism")?.ownerApprovalRequired).toBe(true);
    expect(getAgent("ascend")?.reviewGates).toEqual(expect.arrayContaining(["audit-review", "claude-review"]));
    expect(getAgent("pilot")?.nextExecutableAction).toMatch(/blocked until RELAY\/tool bus/i);
    expect(getAgent("echo")?.nextExecutableAction).toMatch(/blocked until Ask Jarvis/i);
    expect(getAgent("relay")?.ownerApprovalRequired).toBe(true);
  });

  it("does not count not-wired agents as operational capacity", () => {
    const summary = summarizeAgentHealth();
    expect(summary.operationalCapacity).toBe(0);
    expect(summary.notWired).toBeGreaterThan(0);
  });
});

describe("Agent task router", () => {
  it("routes blocked tasks as blocked and draft tasks to draft-only agents", () => {
    const results = routeSeedAgentTasks();
    expect(results.find((result) => result.task.id === "score-source-rights-review")?.accepted).toBe(false);
    expect(results.find((result) => result.task.id === "content-review-before-newsletter")?.reason).toBe("DRAFT_ACCEPTED");
  });

  it("does not allow not-wired agents to receive executable tasks", () => {
    const task = listSeedAgentTasks().find((seedTask) => seedTask.id === "clv-tracking-foundation");
    expect(task).toBeDefined();
    expect(routeAgentTask(task!).reason).toBe("NOT_WIRED_CANNOT_EXECUTE");
  });

  it("dedupes repeated tasks by updating instead of spamming", () => {
    const task = listSeedAgentTasks()[0]!;
    const updated = { ...task, title: "Updated gate task", updatedAt: "2026-06-14T01:00:00.000Z" };
    const queue = upsertAgentTask([task], updated);
    expect(queue).toHaveLength(1);
    expect(queue[0]!.title).toBe("Updated gate task");
    expect(queue[0]!.createdAt).toBe(task.createdAt);
  });
});

describe("Workflow coordinator", () => {
  it("registers the 14 governed workflows with cockpit outputs", () => {
    expect(WORKFLOW_REGISTRY).toHaveLength(14);
    for (const workflow of WORKFLOW_REGISTRY) {
      expect(workflow.cockpitSurface).toBeTruthy();
      expect(workflow.stages.length).toBeGreaterThan(0);
      expect(workflowCanPublish(workflow)).toBe(false);
      expect(workflowCanChangeModelWeights(workflow)).toBe(false);
    }
  });

  it("owner-gated workflows cannot skip owner gates", () => {
    const content = WORKFLOW_REGISTRY.find((workflow) => workflow.id === "content")!;
    expect(workflowRequiresOwnerApproval(content)).toBe(true);
    expect(content.ownerApprovalRules).toContain("publish");
  });

  it("protected sources and unsettled seasons block workflow run plans", () => {
    const plan = planWorkflowRun("historical-intelligence", [{ workflowId: "historical-intelligence", kind: "UNSETTLED_SEASON", message: "2026 is not settled", createdAt: "2026-06-14T00:00:00.000Z" }], listSeedAgentTasks());
    expect(plan?.canRunSafely).toBe(false);
    expect(plan?.blockedReason).toBe("2026 is not settled");
  });
});

describe("Cockpit operating map and Jarvis manager", () => {
  it("maps every cockpit surface to owner agent, workflow, and gates", () => {
    expect(COCKPIT_OPERATING_MAP.length).toBeGreaterThanOrEqual(24);
    for (const surface of COCKPIT_OPERATING_MAP) {
      expect(surface.owningAgent).toBeTruthy();
      expect(surface.primaryWorkflow).toBeTruthy();
      if (surface.audience === "public-adjacent") expect(surface.reviewGates.length).toBeGreaterThan(0);
      if (surface.pageName === "Memory") expect(surface.owningAgent).toBe("archive");
      if (surface.pageName === "Market Twin") expect(surface.owningAgent).toBe("delta");
      if (surface.pageName === "Calibration") expect(["audit", "ledger"]).toContain(surface.owningAgent);
      if (surface.pageName === "Sources") expect([surface.owningAgent, ...surface.supportingAgents]).toEqual(expect.arrayContaining(["tal"]));
    }
  });

  it("builds a truthful Jarvis operating assessment with critical risks above vanity green", () => {
    const assessment = buildJarvisOperatingAssessment();
    expect(assessment.companyHealth).toBe("CRITICAL");
    expect(assessment.topRisks.length).toBeGreaterThan(0);
    expect(assessment.publicGateStatus).toMatch(/cannot self-enable/i);
    expect(assessment.calibrationStatus).toMatch(/cannot change automatically/i);
    expect(assessment.memoryStatus).toMatch(/NOT_WIRED/i);
    expect(assessment.ownerDecisions).not.toEqual(assessment.claudeReview);
  });
});

describe("Historical NFL intelligence tasking", () => {
  it("normalizes suffixes and punctuation but refuses name-only merges", () => {
    expect(normalizePlayerName("Odell Beckham Jr.")).toBe("odell beckham");
    const result = unsafeNameOnlyMergeAttempt("John Smith", [{ playerId: "p1", gsisId: "00-1", displayName: "John Smith" }]);
    expect(result.status).toBe("AMBIGUOUS");
  });

  it("resolves players by GSIS only", () => {
    expect(resolvePlayerByGsis("00-1", [{ playerId: "p1", gsisId: "00-1", displayName: "John Smith" }]).playerId).toBe("p1");
    expect(resolvePlayerByGsis("00-2", [{ playerId: "p1", gsisId: "00-1", displayName: "John Smith" }]).status).toBe("NO_MATCH");
  });

  it("normalizes team aliases and blocks commence-time-only game joins", () => {
    expect(normalizeTeamAlias("Kansas City")).toBe("KC");
    expect(resolveGameIdentity({ commenceTime: "2025-09-01T00:00:00.000Z" }, []).status).toBe("UNSAFE_COMMENCE_TIME_ONLY");
    expect(resolveGameIdentity({ season: 2024, week: 1, homeTeam: "Kansas City", awayTeam: "Ravens" }, [{ gameId: "g1", season: 2024, week: 1, homeTeam: "KC", awayTeam: "BAL" }]).gameId).toBe("g1");
  });

  it("excludes unsettled seasons and routes stat gaps to PRISM/ASCEND with review", () => {
    expect(isSettledHistoricalSeason(2025, 2026)).toBe(true);
    expect(isSettledHistoricalSeason(2026, 2026)).toBe(false);
    const gaps = auditStatCoverage(["projection-volume", "snap-share"], ["snap-share"]);
    expect(gaps[0]?.ownerAgent).toBe("prism");
    expect(coverageGapToTask(gaps[0]!).claudeReviewRequired).toBe(true);
    expect(PROJECTION_FEATURE_REGISTRY.every((feature) => feature.requiresOwnerApprovalForWeightChange && feature.excludesUnsettledSeasons)).toBe(true);
  });
});
