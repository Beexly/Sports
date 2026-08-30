import { describe, expect, it } from "vitest";
import { cockpitCheckoutRepairOwnerQueue } from "@/lib/billing/checkout-repair-owner-queue";

/**
 * Durable owner queue for unresolved checkout ambiguity (directive 5.3).
 * Unresolved attempts must land as CockpitTask review items — deduplicated
 * per attempt, updated (not duplicated) across repair passes, and re-minted
 * only after the owner closed the previous task.
 */

type TaskRow = {
  id: string;
  status: string;
  source: string;
  payload?: unknown;
  [key: string]: unknown;
};

function makeCockpitClient() {
  const tasks: TaskRow[] = [];
  let nextId = 1;
  return {
    tasks,
    cockpitTask: {
      async findMany({ where }: { where: Record<string, unknown> }) {
        return tasks
          .filter((t) => (where["source"] ? t.source === where["source"] : true))
          .map((t) => ({ ...t }));
      },
      async create({ data }: { data: Record<string, unknown> }) {
        const row = { id: `task_${nextId++}`, ...data } as TaskRow;
        tasks.push(row);
        return { ...row };
      },
      async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
        const row = tasks.find((t) => t.id === where.id);
        if (!row) throw new Error("not found");
        Object.assign(row, data);
        return { ...row };
      },
    },
  };
}

const ENTRY = {
  attemptId: "ca_11111111-2222-4333-8444-555566667777",
  status: "AMBIGUOUS" as const,
  reason: "cannot_prove_outcome_yet",
};

describe("cockpitCheckoutRepairOwnerQueue", () => {
  it("returns null for a client without a cockpitTask delegate (stub) — caller falls back to logs", () => {
    expect(cockpitCheckoutRepairOwnerQueue({})).toBeNull();
  });

  it("creates a NEEDS_REVIEW high-risk task carrying the attempt id", async () => {
    const client = makeCockpitClient();
    const queue = cockpitCheckoutRepairOwnerQueue(client)!;
    await queue.surfaceUnresolvedAttempt(ENTRY);

    expect(client.tasks).toHaveLength(1);
    const task = client.tasks[0]!;
    expect(task.status).toBe("NEEDS_REVIEW");
    expect(task["riskLevel"]).toBe("HIGH");
    expect(task.source).toBe("checkout-attempt-repair");
    expect((task.payload as { attemptId: string }).attemptId).toBe(ENTRY.attemptId);
    expect(String(task["title"])).toContain(ENTRY.attemptId);
  });

  it("deduplicates: a second pass over the same attempt UPDATES the open task", async () => {
    const client = makeCockpitClient();
    const queue = cockpitCheckoutRepairOwnerQueue(client)!;
    await queue.surfaceUnresolvedAttempt(ENTRY);
    await queue.surfaceUnresolvedAttempt({ ...ENTRY, status: "REQUEST_IN_FLIGHT" });

    expect(client.tasks).toHaveLength(1);
    expect((client.tasks[0]!.payload as { status: string }).status).toBe("REQUEST_IN_FLIGHT");
  });

  it("different attempts get different tasks", async () => {
    const client = makeCockpitClient();
    const queue = cockpitCheckoutRepairOwnerQueue(client)!;
    await queue.surfaceUnresolvedAttempt(ENTRY);
    await queue.surfaceUnresolvedAttempt({
      ...ENTRY,
      attemptId: "ca_99999999-8888-4777-8666-555544443333",
    });
    expect(client.tasks).toHaveLength(2);
  });

  it("re-mints a task when the owner already closed the previous one", async () => {
    const client = makeCockpitClient();
    const queue = cockpitCheckoutRepairOwnerQueue(client)!;
    await queue.surfaceUnresolvedAttempt(ENTRY);
    client.tasks[0]!.status = "ARCHIVED";
    await queue.surfaceUnresolvedAttempt(ENTRY);
    expect(client.tasks).toHaveLength(2);
    expect(client.tasks[1]!.status).toBe("NEEDS_REVIEW");
  });
});
