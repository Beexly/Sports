import { describe, expect, it } from "vitest";
import { createPrismaAgentTaskStore, toOperatorAgentBucket, toCockpitStatus, toCockpitRisk, toCockpitPriority } from "@/lib/tasks/agent-task-store";
import { persistRoutedTask, canTransitionTask } from "@/lib/tasks/agent-task-runtime";
import { persistAgentOSTaskSeed } from "@/lib/tasks/agent-task-seed-runtime";
import { listSeedAgentTasks } from "@/lib/tasks/agent-task-router";
import { runSafeWorkflowRuntime, isForbiddenWorkflowAction } from "@/lib/workflows/workflow-runtime";
import { createMemoryWorkflowEventStore } from "@/lib/workflows/workflow-event-store";
import { enqueueSafeAgentTask } from "@/lib/agents/agent-queue";
import { enqueueSafeWorkflow } from "@/lib/workflows/workflow-queue";
import { detectStaleSource } from "@/lib/data-reliability/stale-data-detector";
import { summarizeIngestionHealth } from "@/lib/data-reliability/ingestion-health";
import { freshnessStatusToTask, sourceRightsBlockTask } from "@/lib/data-reliability/data-reliability-tasks";
import { createMemoryCandidate } from "@/lib/memory/memory-candidate-runtime";
import { approveMemory, countMemoryReviewQueue, rejectMemory, summarizeApprovedMemory } from "@/lib/memory/memory-review-queue";
import { preserveOpeningLine, canSetClosingLine } from "@/lib/market/line-snapshot";
import { impliedProbability, lineMovement, noVigProbabilities } from "@/lib/market/line-movement";
import { computeClvCandidate } from "@/lib/market/clv-candidate";
import { blockPublicSharpLabel, marketMovementToTask } from "@/lib/market/market-tasks";
import { brierScore } from "@/lib/calibration/brier";
import { expectedCalibrationError, maximumCalibrationError, confidenceBuckets } from "@/lib/calibration/ece";
import { isDisplaySafe } from "@/lib/calibration/display-safety";
import { buildCalibrationReport } from "@/lib/calibration/calibration-report";
import { groupCalibrationByModelVersion } from "@/lib/calibration/model-version-report";

describe("persisted task runtime", () => {
  it("persists seed tasks in stub/no-DB mode and dedupes updates", async () => {
    const store = createPrismaAgentTaskStore({});
    const results = await persistAgentOSTaskSeed(store);
    expect(results.length).toBeGreaterThan(5);
    const first = listSeedAgentTasks()[0]!;
    await persistRoutedTask(store, { ...first, title: "Updated" });
    const stored = await store.list();
    expect(stored.filter((task) => task.id === first.id)).toHaveLength(1);
    expect(stored.find((task) => task.id === first.id)?.title).toBe("Updated");
  });

  it("holds transition rules for owner approval and blocked tasks", () => {
    const ownerTask = listSeedAgentTasks().find((task) => task.id === "public-picks-gate")!;
    const blockedTask = listSeedAgentTasks().find((task) => task.id === "score-source-rights-review")!;
    expect(canTransitionTask(ownerTask, "COMPLETED")).toBe(false);
    expect(canTransitionTask(blockedTask, "COMPLETED")).toBe(false);
    expect(canTransitionTask(blockedTask, "NEEDS_OWNER_APPROVAL")).toBe(true);
  });

  it("maps every Agent OS agent into a valid 6-role OperatorAgent bucket for persistence", () => {
    const valid = new Set(["JARVIS", "SARAH", "TAL", "SCOUT", "AVA", "BOBBY"]);
    for (const task of listSeedAgentTasks()) {
      expect(valid.has(toOperatorAgentBucket(task.assignedAgent))).toBe(true);
    }
    expect(toOperatorAgentBucket("prism")).toBe("SCOUT");
    expect(toOperatorAgentBucket("unknown-agent")).toBe("JARVIS"); // safe default
    // Status/risk/priority must persist truthfully, not as NEW · LOW · 50 defaults.
    expect(toCockpitStatus("BLOCKED_BY_RIGHTS")).toBe("BLOCKED");
    expect(toCockpitStatus("NEEDS_OWNER_APPROVAL")).toBe("NEEDS_REVIEW");
    expect(toCockpitRisk("CRITICAL")).toBe("HIGH");
    expect(toCockpitPriority("P0")).toBeGreaterThan(toCockpitPriority("P3"));
  });
});

describe("workflow event runtime and queues", () => {
  it("creates events and tasks for safe workflows", async () => {
    const result = await runSafeWorkflowRuntime({ workflowId: "source-intelligence", events: [{ workflowId: "source-intelligence", kind: "STALE_DATA", message: "odds stale", createdAt: "2026-06-14T00:00:00.000Z" }], eventStore: createMemoryWorkflowEventStore(), taskStore: createPrismaAgentTaskStore({}), now: "2026-06-14T00:00:00.000Z" });
    expect(result?.eventsCreated).toHaveLength(1);
    expect(result?.tasksCreated.some((task) => task.assignedAgent === "tal")).toBe(true);
  });

  it("blocks protected actions, owner gates, and unsettled historical runs", async () => {
    expect(isForbiddenWorkflowAction("PUBLISH")).toBe(true);
    const result = await runSafeWorkflowRuntime({ workflowId: "historical-intelligence", events: [{ workflowId: "historical-intelligence", kind: "UNSETTLED_SEASON", message: "current season not settled", createdAt: "2026-06-14T00:00:00.000Z" }], taskStore: createPrismaAgentTaskStore({}) });
    expect(result?.status).toBe("BLOCKED");
    expect(result?.completedAt).toBeNull();
  });

  it("pauses unsafe queue work truthfully when Redis or approvals are missing", () => {
    const draftTask = listSeedAgentTasks().find((task) => task.id === "content-review-before-newsletter")!;
    const ownerTask = listSeedAgentTasks().find((task) => task.id === "public-picks-gate")!;
    const notWiredTask = listSeedAgentTasks().find((task) => task.id === "clv-tracking-foundation")!;
    expect(enqueueSafeAgentTask(draftTask, false).state).toBe("PAUSED_OWNER_APPROVAL");
    expect(enqueueSafeAgentTask(ownerTask, true).state).toBe("BLOCKED");
    expect(enqueueSafeAgentTask(notWiredTask, true).state).toBe("BLOCKED");
    // Every workflow carries the owner-approval gate, so none may auto-enqueue past it.
    expect(enqueueSafeWorkflow("daily-intelligence-brief", false).state).toBe("PAUSED_OWNER_APPROVAL");
  });
});

describe("data reliability and memory runtime", () => {
  it("detects stale/unknown ingestion without external calls", () => {
    const fresh = detectStaleSource({ sourceId: "odds", lastSuccessAt: "2026-06-14T10:00:00.000Z", now: "2026-06-14T11:00:00.000Z" });
    const stale = detectStaleSource({ sourceId: "odds", lastSuccessAt: "2026-06-14T01:00:00.000Z", now: "2026-06-14T11:00:00.000Z", critical: true });
    const unknown = detectStaleSource({ sourceId: "scores", lastSuccessAt: null, now: "2026-06-14T11:00:00.000Z" });
    expect(freshnessStatusToTask(fresh)).toBeNull();
    expect(freshnessStatusToTask(stale)?.assignedAgent).toBe("tal");
    expect(freshnessStatusToTask(stale)?.risk).toBe("CRITICAL");
    expect(summarizeIngestionHealth([unknown])).toBe("UNKNOWN");
    expect(sourceRightsBlockTask("protected-feed").status).toBe("BLOCKED_BY_RIGHTS");
    // An unparsable timestamp must never read as FRESH (fake-green guard).
    expect(detectStaleSource({ sourceId: "odds", lastSuccessAt: "not-a-date", now: "2026-06-14T11:00:00.000Z" }).status).toBe("UNKNOWN");
  });

  it("keeps memory candidates review-gated and excludes rejected memory", () => {
    const candidate = createMemoryCandidate({ id: "m1", type: "OWNER_DECISION", title: "Decision", summary: "Owner kept public picks closed.", source: "sprint", sensitivity: "HIGH", now: "2026-06-14T00:00:00.000Z" });
    expect(candidate.status).toBe("NEEDS_OWNER_REVIEW");
    expect(countMemoryReviewQueue([candidate])).toBe(1);
    expect(summarizeApprovedMemory([rejectMemory(candidate, "2026-06-14T01:00:00.000Z", "duplicate")])).toHaveLength(0);
    expect(summarizeApprovedMemory([approveMemory(candidate, "2026-06-14T01:00:00.000Z")])).toEqual(["Owner kept public picks closed."]);
  });
});

describe("market/CLV and calibration runtime", () => {
  it("preserves opening line and blocks premature CLV/public labels", () => {
    const open = { gameId: "g1", market: "spread" as const, line: -3, price: -110, capturedAt: "2026-01-01T00:00:00.000Z", kind: "OPEN" as const };
    const duplicate = { ...open, line: -4 };
    expect(preserveOpeningLine([open], duplicate)[0]?.line).toBe(-3);
    expect(canSetClosingLine("2026-01-01T19:00:00.000Z", "2026-01-01T18:00:00.000Z")).toBe(true);
    expect(computeClvCandidate(open, null, true).status).toBe("BLOCKED");
    expect(marketMovementToTask("g1", lineMovement(-3, -5))?.assignedAgent).toBe("delta");
    expect(blockPublicSharpLabel("sharp steam")).toBe(true);
    // Open/close from different games must not produce a CLV candidate.
    expect(computeClvCandidate(open, { ...open, gameId: "g2", kind: "CLOSE" as const }, true).status).toBe("BLOCKED");
  });

  it("calculates implied/no-vig probabilities and calibration metrics", () => {
    expect(impliedProbability(-110)).toBeCloseTo(0.5238, 3);
    expect(noVigProbabilities(-110, -110).home).toBeCloseTo(0.5, 3);
    const samples = [{ probability: 0.75, outcome: 1 as const }, { probability: 0.25, outcome: 0 as const }];
    expect(brierScore(samples)).toBeCloseTo(0.0625, 4);
    expect(expectedCalibrationError(samples, 2)).toBeGreaterThanOrEqual(0);
    expect(maximumCalibrationError(samples, 2)).toBeGreaterThanOrEqual(0);
    expect(confidenceBuckets(samples, 2)).toHaveLength(2);
    expect(isDisplaySafe({ sampleSize: 24, displaySafe: true })).toBe(false);
    expect(buildCalibrationReport(samples, false).displaySafe).toBe(false);
    expect(groupCalibrationByModelVersion([{ modelVersion: "v1", probability: 0.5, outcome: 1, season: 2026 }], 2026)).toHaveLength(0);
  });
});
