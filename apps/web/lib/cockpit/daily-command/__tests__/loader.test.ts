import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB so we can drive the Approval-Queue and Signals lanes through both
// their live and degraded paths without a real database.
const findMany = vi.fn();
const stubMode = vi.fn();

vi.mock("@sports/db", () => ({
  db: { cockpitTask: { findMany: (...args: unknown[]) => findMany(...args) } },
  isStubMode: () => stubMode(),
}));

// Mock the Claude costs dashboard so we control the Signals lane's data mode.
const loadCosts = vi.fn();
vi.mock("@/lib/claude-api/dashboard", () => ({
  loadClaudeApiCostsDashboard: (...args: unknown[]) => loadCosts(...args),
}));

import { loadDailyCommand } from "../loader";

const LANE_KEYS = ["money_next", "approval_queue", "agent_activity", "signals", "lessons"] as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadDailyCommand — composition + honesty", () => {
  it("always returns the five lanes in order, never throws (DB outage)", async () => {
    stubMode.mockReturnValue(false);
    findMany.mockRejectedValue(new Error("connection refused"));
    loadCosts.mockRejectedValue(new Error("usage store down"));

    const command = await loadDailyCommand();

    expect(command.success).toBe(true);
    expect(command.noFakeLiveData).toBe(true);
    expect(command.lanes.map((l) => l.key)).toEqual([...LANE_KEYS]);
    // Approval queue degrades to unavailable with a labeled reason.
    const queue = command.lanes.find((l) => l.key === "approval_queue");
    expect(queue?.dataMode).toBe("unavailable");
    expect(queue?.fallbackReason).toMatch(/unreachable/i);
    // Signals degrades to a labeled fallback (no fabricated gauge).
    const signals = command.lanes.find((l) => l.key === "signals");
    expect(signals?.dataMode).toBe("labeled_fallback");
    expect(command.signalGauges).toHaveLength(0);
  });

  it("treats stub mode as unavailable for DB-backed lanes (no fake live data)", async () => {
    stubMode.mockReturnValue(true);

    const command = await loadDailyCommand();

    expect(findMany).not.toHaveBeenCalled();
    expect(loadCosts).not.toHaveBeenCalled();
    const queue = command.lanes.find((l) => l.key === "approval_queue");
    expect(queue?.dataMode).toBe("unavailable");
  });

  it("labels Money Next and Lessons as unavailable (no fabricated revenue/lessons)", async () => {
    stubMode.mockReturnValue(false);
    findMany.mockResolvedValue([]);
    loadCosts.mockResolvedValue({ totalSpentUsd: 0, totalBudgetUsd: 0, surfaces: [] });

    const command = await loadDailyCommand();

    const money = command.lanes.find((l) => l.key === "money_next");
    const lessons = command.lanes.find((l) => l.key === "lessons");
    expect(money?.dataMode).toBe("unavailable");
    expect(money?.fallbackReason).toMatch(/telemetry not wired/i);
    expect(lessons?.dataMode).toBe("unavailable");
    expect(lessons?.fallbackReason).toMatch(/no lessons store/i);
    // Agent Activity is honest live static.
    const agents = command.lanes.find((l) => l.key === "agent_activity");
    expect(agents?.dataMode).toBe("live");
  });

  it("marks the Approval Queue live and builds action buttons when DB is reachable", async () => {
    stubMode.mockReturnValue(false);
    findMany.mockResolvedValue([
      {
        id: "task_1",
        title: "Review pick draft",
        description: "Scout drafted a context note awaiting review.",
        status: "NEEDS_REVIEW",
        priority: 80,
        riskLevel: "LOW",
        assignedAgent: "scout",
        complianceStatus: "NOT_APPLICABLE",
        decisions: [],
      },
    ]);
    loadCosts.mockResolvedValue({
      totalSpentUsd: 5,
      totalBudgetUsd: 10,
      surfaces: [{ surface: "content", ratio: 0.5, spentUsd: 5, budgetUsd: 10, status: "OK" }],
    });

    const command = await loadDailyCommand();

    const queue = command.lanes.find((l) => l.key === "approval_queue");
    expect(queue?.dataMode).toBe("live");
    const taskCard = queue?.cards.find((c) => c.taskId === "task_1");
    expect(taskCard).toBeDefined();
    // From NEEDS_REVIEW, Approve is enabled.
    const approve = taskCard?.actionButtons.find((a) => a.action === "APPROVE");
    expect(approve?.enabled).toBe(true);

    // Signals lane is live with a budget gauge derived from real spend.
    const signals = command.lanes.find((l) => l.key === "signals");
    expect(signals?.dataMode).toBe("live");
    expect(command.signalGauges.some((g) => g.label === "Claude budget")).toBe(true);
  });

  it("rolls up to live_with_labeled_fallbacks when some lanes are not live", async () => {
    stubMode.mockReturnValue(false);
    findMany.mockResolvedValue([]);
    loadCosts.mockResolvedValue({ totalSpentUsd: 0, totalBudgetUsd: 0, surfaces: [] });

    const command = await loadDailyCommand();
    // Money Next + Lessons are unavailable, so the rollup is not pure "live".
    expect(command.dataMode).toBe("live_with_labeled_fallbacks");
  });
});
