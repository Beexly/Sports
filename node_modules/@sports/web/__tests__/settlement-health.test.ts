import { describe, it, expect } from "vitest";
import {
  evaluateSettlementHealth,
  loadSettlementHealth,
  type SettlementHealthInput,
} from "@/lib/performance/settlement-health";

function base(overrides: Partial<SettlementHealthInput> = {}): SettlementHealthInput {
  return {
    commencedTotal: 100,
    overduePending: 0,
    graceHours: 6,
    ...overrides,
  };
}

describe("settlement health (leading CLV indicator)", () => {
  it("reports NO_DATA before any game has started", () => {
    const h = evaluateSettlementHealth(base({ commencedTotal: 0, overduePending: 0 }));
    expect(h.health).toBe("NO_DATA");
    expect(h.clean).toBe(false);
    expect(h.remediation).toEqual([]);
  });

  it("is HEALTHY and clean when nothing is overdue", () => {
    const h = evaluateSettlementHealth(base({ commencedTotal: 40, overduePending: 0 }));
    expect(h.health).toBe("HEALTHY");
    expect(h.clean).toBe(true);
    expect(h.remediation).toEqual([]);
    expect(h.operatorMessage).toMatch(/keeping up/i);
  });

  it("flags a settlement backlog as DEGRADED below the critical threshold", () => {
    const h = evaluateSettlementHealth(base({ commencedTotal: 100, overduePending: 3 }));
    expect(h.health).toBe("DEGRADED");
    expect(h.clean).toBe(false);
    expect(h.remediation.length).toBeGreaterThan(0);
    expect(h.operatorMessage).toMatch(/falling behind/i);
  });

  it("escalates to CRITICAL at or above the threshold", () => {
    const h = evaluateSettlementHealth(base({ commencedTotal: 100, overduePending: 5 }));
    expect(h.health).toBe("CRITICAL");
  });

  it("respects a custom critical threshold", () => {
    const h = evaluateSettlementHealth(base({ commencedTotal: 100, overduePending: 2, criticalThreshold: 2 }));
    expect(h.health).toBe("CRITICAL");
  });

  it("never reports more overdue than commenced", () => {
    const h = evaluateSettlementHealth(base({ commencedTotal: 3, overduePending: 99, criticalThreshold: 3 }));
    expect(h.overduePending).toBe(3);
    expect(h.health).toBe("CRITICAL"); // 3 overdue ≥ critical 3, all of a tiny commenced set
  });

  it("loads with an overdue window of now − graceHours and the right filters", async () => {
    const now = new Date("2026-06-22T12:00:00.000Z");
    const calls: Array<Record<string, unknown>> = [];
    const db = {
      pick: {
        count: async ({ where }: { where: Record<string, unknown> }) => {
          calls.push(where);
          // The overdue query is the one that filters result PENDING.
          return where["result"] === "PENDING" ? 2 : 50;
        },
      },
    };

    const h = await loadSettlementHealth(db, { now, graceHours: 6 });
    expect(h.commencedTotal).toBe(50);
    expect(h.overduePending).toBe(2);
    expect(h.health).toBe("DEGRADED");

    // Commenced query: game started before now; excludes seed; published only.
    const commencedWhere = calls.find((w) => w["result"] === undefined)!;
    expect(commencedWhere["isPublished"]).toBe(true);
    expect(commencedWhere["NOT"]).toEqual({ modelVersion: { contains: "seed" } });
    expect(commencedWhere["game"]).toEqual({ commenceTime: { lt: now } });

    // Overdue query: commenced more than graceHours before now, still PENDING.
    const overdueWhere = calls.find((w) => w["result"] === "PENDING")!;
    const cutoff = (overdueWhere["game"] as { commenceTime: { lt: Date } }).commenceTime.lt;
    expect(cutoff.toISOString()).toBe("2026-06-22T06:00:00.000Z");
  });
});
