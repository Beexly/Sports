import { describe, it, expect } from "vitest";
import type { CockpitTask, CockpitTaskStatus } from "@prisma/client";
import {
  advanceCockpitTask,
  advanceCockpitBatch,
  nextAutomatedStatus,
  isDispatchable,
  resolveOwningAgent,
  runSelfAudit,
  DISPATCH_REVIEWER,
  DISPATCHABLE_STATUSES,
  type DispatchTransitionExecutor,
  type DispatchTransitionRequest,
  type DispatchableTask,
} from "@/lib/cockpit/dispatch";

// ─────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────

function makeTask(overrides: Partial<DispatchableTask> = {}): DispatchableTask {
  return {
    id: "task_1",
    status: "NEW",
    assignedAgent: "TAL",
    source: "stale-ingestion:nfl:STALE",
    title: "nfl ingestion stale",
    decisionNotes: null,
    ...overrides,
  };
}

/** Records every transition request; resolves so the move "succeeds". */
function recordingExecutor() {
  const calls: DispatchTransitionRequest[] = [];
  const executor: DispatchTransitionExecutor = async (req) => {
    calls.push(req);
  };
  return { calls, executor };
}

/** Always rejects — simulates a refused/failed transition. */
const failingExecutor: DispatchTransitionExecutor = async () => {
  throw new Error("simulated transition failure");
};

const ALL_STATUSES: readonly CockpitTaskStatus[] = [
  "NEW",
  "ROUTED",
  "DRAFTED",
  "NEEDS_REVIEW",
  "APPROVED",
  "REJECTED",
  "BLOCKED",
  "ARCHIVED",
];

// ─────────────────────────────────────────────
// HARD CONSTRAINT: the loop can NEVER emit APPROVED
// ─────────────────────────────────────────────

describe("dispatch loop — APPROVED is structurally unreachable", () => {
  it("nextAutomatedStatus never yields APPROVED or REJECTED for ANY status", () => {
    for (const s of ALL_STATUSES) {
      const next = nextAutomatedStatus(s);
      expect(next).not.toBe("APPROVED");
      expect(next).not.toBe("REJECTED");
    }
  });

  it("the only forward hops are ROUTED, DRAFTED, NEEDS_REVIEW", () => {
    expect(nextAutomatedStatus("NEW")).toBe("ROUTED");
    expect(nextAutomatedStatus("ROUTED")).toBe("DRAFTED");
    expect(nextAutomatedStatus("DRAFTED")).toBe("NEEDS_REVIEW");
  });

  it("never requests a transition to APPROVED/REJECTED across the whole state space", async () => {
    // Drive a task in every possible status through the advancer and assert the
    // executor is NEVER asked to move anything to APPROVED or REJECTED.
    for (const status of ALL_STATUSES) {
      const { calls, executor } = recordingExecutor();
      // Give it a complete task so a DRAFTED task would actually advance.
      await advanceCockpitTask(
        makeTask({ status, decisionNotes: "a draft note exists" }),
        executor
      );
      for (const call of calls) {
        expect(call.toStatus).not.toBe("APPROVED");
        expect(call.toStatus).not.toBe("REJECTED");
      }
    }
  });

  it("a DRAFTED task parks at NEEDS_REVIEW and stops — it does not chain to APPROVED", async () => {
    const { calls, executor } = recordingExecutor();
    const outcome = await advanceCockpitTask(
      makeTask({ status: "DRAFTED", decisionNotes: "draft plan present" }),
      executor
    );
    expect(outcome.kind).toBe("advanced");
    expect(outcome.toStatus).toBe("NEEDS_REVIEW");
    expect(calls).toHaveLength(1); // exactly one hop; no second move toward APPROVED
    expect(calls[0]?.toStatus).toBe("NEEDS_REVIEW");
  });
});

// ─────────────────────────────────────────────
// Owner-owned / terminal statuses are never touched
// ─────────────────────────────────────────────

describe("dispatch loop — only advances NEW/ROUTED/DRAFTED", () => {
  it("DISPATCHABLE_STATUSES is exactly the automation-owned segment", () => {
    expect([...DISPATCHABLE_STATUSES]).toEqual(["NEW", "ROUTED", "DRAFTED"]);
  });

  it("isDispatchable rejects owner-owned and terminal statuses", () => {
    expect(isDispatchable("NEEDS_REVIEW")).toBe(false);
    expect(isDispatchable("APPROVED")).toBe(false);
    expect(isDispatchable("REJECTED")).toBe(false);
    expect(isDispatchable("BLOCKED")).toBe(false);
    expect(isDispatchable("ARCHIVED")).toBe(false);
    expect(isDispatchable("NEW")).toBe(true);
    expect(isDispatchable("ROUTED")).toBe(true);
    expect(isDispatchable("DRAFTED")).toBe(true);
  });

  it.each(["NEEDS_REVIEW", "APPROVED", "REJECTED", "BLOCKED", "ARCHIVED"] as const)(
    "skips %s without calling the executor",
    async (status) => {
      const { calls, executor } = recordingExecutor();
      const outcome = await advanceCockpitTask(makeTask({ status }), executor);
      expect(outcome.kind).toBe("skipped");
      expect(calls).toHaveLength(0);
    }
  );
});

// ─────────────────────────────────────────────
// One step per run + correct notes/evidence
// ─────────────────────────────────────────────

describe("dispatch loop — one safe step per run", () => {
  it("NEW -> ROUTED: routes to the owning agent with rationale + reviewer system:dispatch", async () => {
    const { calls, executor } = recordingExecutor();
    const outcome = await advanceCockpitTask(makeTask({ status: "NEW" }), executor);
    expect(outcome.kind).toBe("advanced");
    expect(outcome.fromStatus).toBe("NEW");
    expect(outcome.toStatus).toBe("ROUTED");
    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(call.reviewer).toBe(DISPATCH_REVIEWER);
    expect(call.toStatus).toBe("ROUTED");
    expect(call.note).toContain("Tal"); // TAL display name from the AGENTS roster
    // Evidence is structured + records no external action.
    const ev = call.evidence as Record<string, unknown>;
    expect(ev["step"]).toBe("NEW->ROUTED");
    expect(ev["owningAgent"]).toBe("TAL");
    expect(ev["externalActions"]).toBe("NONE");
  });

  it("ROUTED -> DRAFTED: attaches a deterministic (non-LLM) draft note from the charter", async () => {
    const { calls, executor } = recordingExecutor();
    const outcome = await advanceCockpitTask(
      makeTask({ status: "ROUTED" }),
      executor
    );
    expect(outcome.toStatus).toBe("DRAFTED");
    const call = calls[0]!;
    expect(call.note).toContain("Draft plan");
    const ev = call.evidence as Record<string, unknown>;
    expect(ev["draftingMethod"]).toBe("deterministic-charter");
    expect(ev["llmBackedDrafting"]).toBe("future-follow-up");
  });

  it("DRAFTED -> NEEDS_REVIEW only when self-audit passes", async () => {
    const { calls, executor } = recordingExecutor();
    // No draft note => self-audit fails => skipped, no executor call.
    const skipped = await advanceCockpitTask(
      makeTask({ status: "DRAFTED", decisionNotes: null }),
      executor
    );
    expect(skipped.kind).toBe("skipped");
    expect(calls).toHaveLength(0);

    // With a draft note => self-audit passes => advances + parks.
    const advanced = await advanceCockpitTask(
      makeTask({ status: "DRAFTED", decisionNotes: "draft present" }),
      executor
    );
    expect(advanced.kind).toBe("advanced");
    expect(advanced.toStatus).toBe("NEEDS_REVIEW");
    expect(calls).toHaveLength(1);
    const ev = calls[0]!.evidence as Record<string, unknown>;
    expect(ev["parkedForHuman"]).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Routing + self-audit unit pieces
// ─────────────────────────────────────────────

describe("routing + self-audit primitives", () => {
  it("resolveOwningAgent confirms a known seat and falls back to JARVIS otherwise", () => {
    expect(resolveOwningAgent({ assignedAgent: "SCOUT" })).toBe("SCOUT");
    expect(resolveOwningAgent({ assignedAgent: "AVA" })).toBe("AVA");
    // An unexpected value (cast) falls back to the orchestration seat.
    expect(
      resolveOwningAgent({ assignedAgent: "GHOST" as CockpitTask["assignedAgent"] })
    ).toBe("JARVIS");
  });

  it("runSelfAudit requires owning agent + draft note + title", () => {
    expect(
      runSelfAudit({ assignedAgent: "TAL", decisionNotes: "x", title: "t" }).passed
    ).toBe(true);
    expect(
      runSelfAudit({ assignedAgent: "TAL", decisionNotes: "   ", title: "t" }).passed
    ).toBe(false);
    expect(
      runSelfAudit({ assignedAgent: "TAL", decisionNotes: "x", title: "" }).passed
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Error isolation + idempotence
// ─────────────────────────────────────────────

describe("dispatch loop — error isolation + idempotence", () => {
  it("a failing transition is captured as an error outcome, not thrown", async () => {
    const outcome = await advanceCockpitTask(makeTask({ status: "NEW" }), failingExecutor);
    expect(outcome.kind).toBe("error");
    expect(outcome.reason).toContain("simulated transition failure");
  });

  it("one bad task does not abort the batch", async () => {
    const calls: DispatchTransitionRequest[] = [];
    // Executor fails ONLY for the poisoned task id, succeeds otherwise.
    const executor: DispatchTransitionExecutor = async (req) => {
      if (req.taskId === "bad") throw new Error("boom");
      calls.push(req);
    };
    const tasks: DispatchableTask[] = [
      makeTask({ id: "good_1", status: "NEW" }),
      makeTask({ id: "bad", status: "NEW" }),
      makeTask({ id: "good_2", status: "ROUTED" }),
    ];
    const summary = await advanceCockpitBatch(tasks, executor);
    expect(summary.considered).toBe(3);
    expect(summary.advanced).toBe(2);
    expect(summary.errors).toBe(1);
    expect(calls.map((c) => c.taskId).sort()).toEqual(["good_1", "good_2"]);
  });

  it("batch summary buckets advances by destination status and never includes APPROVED", async () => {
    const { executor } = recordingExecutor();
    const tasks: DispatchableTask[] = [
      makeTask({ id: "a", status: "NEW" }),
      makeTask({ id: "b", status: "ROUTED" }),
      makeTask({ id: "c", status: "DRAFTED", decisionNotes: "draft" }),
      makeTask({ id: "d", status: "NEEDS_REVIEW" }), // skipped (owner-owned)
    ];
    const summary = await advanceCockpitBatch(tasks, executor);
    expect(summary.advanced).toBe(3);
    expect(summary.skipped).toBe(1);
    expect(summary.byStatus).toEqual({ ROUTED: 1, DRAFTED: 1, NEEDS_REVIEW: 1 });
    expect(Object.keys(summary.byStatus)).not.toContain("APPROVED");
  });

  it("re-running is harmless: a parked NEEDS_REVIEW task is not advanced again", async () => {
    const { calls, executor } = recordingExecutor();
    // Simulate the second run: the task is now NEEDS_REVIEW. It must be skipped.
    const outcome = await advanceCockpitTask(
      makeTask({ status: "NEEDS_REVIEW", decisionNotes: "draft" }),
      executor
    );
    expect(outcome.kind).toBe("skipped");
    expect(calls).toHaveLength(0);
  });
});
