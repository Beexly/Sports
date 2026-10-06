import { describe, expect, it } from "vitest";
import { DFS_SLATE, type DfsPlayer } from "@/lib/fantasy/dfs-slate";
import { validateLineup } from "@/lib/fantasy/dfs-lineup-validation";
import type { OptOpts } from "@/lib/fantasy/dfs-optimizer";
import { applySwap, proposeRepair, type RepairSource } from "@/lib/fantasy/dfs-lineup-repair";

const byId = new Map(DFS_SLATE.map((p) => [p.id, p]));
const pick = (id: string): DfsPlayer => {
  const p = byId.get(id);
  if (!p) throw new Error(`missing slate player ${id}`);
  return p;
};

// Legal 9-man Classic lineup (QB/RB/RB/WR/WR/WR/TE/FLEX/DST), $36,000 — well under cap.
const LINEUP: readonly DfsPlayer[] = [
  pick("dqb5"), // QB
  pick("drb7"), // RB
  pick("drb8"), // RB
  pick("dwr8"), // WR <- repair target in most tests
  pick("dwr9"), // WR
  pick("dwr10"), // WR
  pick("dte4"), // TE
  pick("dte5"), // FLEX (TE-eligible)
  pick("ddst5"), // DST
];

const baseOpts = (over: Partial<Pick<OptOpts, "locks" | "excludes" | "stack">> = {}): OptOpts => ({
  mode: "gpp",
  stack: false,
  locks: new Set<string>(),
  excludes: new Set<string>(),
  ...over,
});

const MANUAL: RepairSource = { kind: "manual", markedAt: "2026-09-12T10:00:00.000Z" };

describe("dfs lineup repair (manual, explicit)", () => {
  it("offers slot- and cap-legal swaps for an unavailable player; applied swap validates clean", () => {
    const proposal = proposeRepair({
      lineup: LINEUP,
      unavailable: new Set(["dwr8"]),
      pool: [...DFS_SLATE],
      opts: baseOpts(),
      source: MANUAL,
    });
    expect(proposal.slots.length).toBe(1);
    const slot = proposal.slots[0]!;
    expect(slot.kind).toBe("candidates");
    if (slot.kind !== "candidates") return;
    expect(slot.out.id).toBe("dwr8");
    expect(slot.candidates.length).toBeGreaterThan(0);
    for (const c of slot.candidates) {
      expect(c.inn.pos).toBe("WR"); // slot 4 is a pure WR slot
      expect(c.newSalary).toBeLessThanOrEqual(50000);
      expect(LINEUP.some((p) => p.id === c.inn.id)).toBe(false);
    }
    const repaired = applySwap(LINEUP, slot.slotIndex, slot.candidates[0]!.inn);
    expect(validateLineup(repaired, baseOpts(), [...DFS_SLATE])).toEqual([]);
  });

  it("preserves locked players with a reason instead of swapping them", () => {
    const proposal = proposeRepair({
      lineup: LINEUP,
      unavailable: new Set(["dwr8"]),
      pool: [...DFS_SLATE],
      opts: baseOpts({ locks: new Set(["dwr8"]) }),
      source: MANUAL,
    });
    expect(proposal.slots).toHaveLength(1);
    expect(proposal.slots[0]).toMatchObject({ kind: "preserved", reason: "locked" });
  });

  it("preserves already-started players even when flagged unavailable", () => {
    const proposal = proposeRepair({
      lineup: LINEUP,
      unavailable: new Set(["dwr8"]),
      pool: [...DFS_SLATE],
      opts: baseOpts(),
      started: new Set(["dwr8"]),
      source: MANUAL,
    });
    expect(proposal.slots).toHaveLength(1);
    expect(proposal.slots[0]).toMatchObject({ kind: "preserved", reason: "started" });
  });

  it("says no-alternative honestly when the pool is exhausted — never fabricates a pick", () => {
    const proposal = proposeRepair({
      lineup: LINEUP,
      unavailable: new Set(["dwr8"]),
      pool: [...LINEUP], // nobody else to offer
      opts: baseOpts(),
      source: MANUAL,
    });
    expect(proposal.slots).toHaveLength(1);
    const slot = proposal.slots[0]!;
    expect(slot.kind).toBe("no-alternative");
  });

  it("names the cap as the blocker when every alternative breaks it", () => {
    const pricey: DfsPlayer = { ...pick("dwr1"), id: "x-cap", salary: 40000 };
    const proposal = proposeRepair({
      lineup: LINEUP,
      unavailable: new Set(["dwr8"]),
      pool: [...LINEUP, pricey],
      opts: baseOpts(),
      source: MANUAL,
    });
    const slot = proposal.slots[0]!;
    expect(slot.kind).toBe("no-alternative");
    if (slot.kind !== "no-alternative") return;
    expect(slot.reason).toMatch(/salary cap/);
  });

  it("reports unknown projections factually — no delta, ranked last, never as the best", () => {
    const mystery: DfsPlayer = { ...pick("dwr1"), id: "x-mystery", proj: Number.NaN };
    const proposal = proposeRepair({
      lineup: LINEUP,
      unavailable: new Set(["dwr8"]),
      pool: [...DFS_SLATE, mystery],
      opts: baseOpts(),
      source: MANUAL,
    });
    const slot = proposal.slots[0]!;
    expect(slot.kind).toBe("candidates");
    if (slot.kind !== "candidates") return;
    const ix = slot.candidates.findIndex((c) => c.inn.id === "x-mystery");
    expect(ix).toBeGreaterThanOrEqual(0);
    const m = slot.candidates[ix]!;
    expect(m.projUnknown).toBe(true);
    expect(m.projDelta).toBeNull();
    expect(ix).toBe(slot.candidates.length - 1); // unknown sorts after every known projection
    expect(slot.candidates[0]!.projUnknown).toBe(false);
  });

  it("never mutates the saved lineup and always carries the source timestamp", () => {
    const before = [...LINEUP];
    const proposal = proposeRepair({
      lineup: LINEUP,
      unavailable: new Set(["dwr8"]),
      pool: [...DFS_SLATE],
      opts: baseOpts(),
      source: MANUAL,
    });
    const slot = proposal.slots[0]!;
    if (slot.kind !== "candidates") throw new Error("expected candidates");
    const repaired = applySwap(LINEUP, slot.slotIndex, slot.candidates[0]!.inn);
    expect([...LINEUP]).toEqual(before); // original untouched — apply is a separate explicit act
    expect(repaired).not.toBe(LINEUP);
    expect(proposal.source).toEqual(MANUAL);
  });

  it("carries event provenance when the flag came from the nflverse injury report", () => {
    const eventSource: RepairSource = {
      kind: "nflverse-injuries",
      season: 2025,
      week: null,
      generatedAt: "2026-09-12T09:00:00.000Z",
      note: "Lagged weekly report, not live inactives — manual crosswalk to slate ids.",
    };
    const proposal = proposeRepair({
      lineup: LINEUP,
      unavailable: new Set(["dwr8"]),
      pool: [...DFS_SLATE],
      opts: baseOpts(),
      source: eventSource,
    });
    expect(proposal.source).toEqual(eventSource);
  });
});
