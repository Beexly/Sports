import { describe, it, expect } from "vitest";
import { orderPendingRowsForCycle } from "@/lib/data-sources/free-settlement-runner";

/**
 * Tripwire for the 2026-09-05 settlement fix: a cycle grades EVERY pending row,
 * overdue first. The previous runner kept only the overdue slice whenever one
 * existed, so with a single sticky hold every fresh pick was guaranteed to cross
 * the 6h grace before the free path first looked at it, and overduePending
 * inflated by construction (36 of 2344 commenced picks read CRITICAL while the
 * finals sat on ESPN).
 */
const NOW = new Date("2026-09-05T16:00:00.000Z");
const GRACE_HOURS = 6;
const row = (id: string, hoursAgo: number) => ({
  id,
  game: { commenceTime: new Date(NOW.getTime() - hoursAgo * 60 * 60 * 1000) },
});

describe("orderPendingRowsForCycle", () => {
  it("returns the within-grace rows too, after the overdue ones", () => {
    const ordered = orderPendingRowsForCycle(
      [row("fresh-2h", 2), row("stuck-30h", 30), row("fresh-1h", 1), row("overdue-8h", 8)],
      NOW,
      GRACE_HOURS,
    );
    expect(ordered.map((r) => r.id)).toHaveLength(4);
    // Overdue (past the 6h grace) rows lead, oldest first; fresh rows follow, oldest first.
    expect(ordered.slice(0, 2).map((r) => r.id)).toEqual(["stuck-30h", "overdue-8h"]);
    expect(ordered.slice(2).map((r) => r.id)).toEqual(["fresh-2h", "fresh-1h"]);
  });

  it("does not drop rows when only overdue rows exist, or when none are overdue", () => {
    expect(orderPendingRowsForCycle([row("a", 10), row("b", 20)], NOW, GRACE_HOURS).map((r) => r.id)).toEqual(["b", "a"]);
    expect(orderPendingRowsForCycle([row("a", 1), row("b", 3)], NOW, GRACE_HOURS).map((r) => r.id)).toEqual(["b", "a"]);
    expect(orderPendingRowsForCycle([], NOW, GRACE_HOURS)).toEqual([]);
  });

  it("is pure: the input array is not mutated", () => {
    const input = [row("a", 1), row("b", 30)];
    const snapshot = input.map((r) => r.id);
    orderPendingRowsForCycle(input, NOW, GRACE_HOURS);
    expect(input.map((r) => r.id)).toEqual(snapshot);
  });
});
