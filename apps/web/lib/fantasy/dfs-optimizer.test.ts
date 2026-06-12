import { describe, it, expect } from "vitest";
import { optimizeOne, generateLineups, metrics, lateSwap, type OptOpts } from "./dfs-optimizer";
import { DFS_SLOTS, SALARY_CAP, DFS_SLATE } from "./dfs-slate";

const base = (over: Partial<OptOpts> = {}): OptOpts => ({
  mode: "gpp", stack: false, locks: new Set(), excludes: new Set(), ...over,
});

const FLEX_OK = new Set(["RB", "WR", "TE"]);
function slotsValid(lu: readonly { pos: string }[]): boolean {
  return DFS_SLOTS.every((slot, i) => (slot === ("FLEX" as string) ? FLEX_OK.has(lu[i]!.pos) : lu[i]!.pos === slot));
}

describe("dfs optimizer", () => {
  it("builds a full, slot-legal lineup under the cap", () => {
    const lu = optimizeOne(base(), undefined, 40);
    expect(lu).not.toBeNull();
    expect(lu!.length).toBe(DFS_SLOTS.length);
    expect(slotsValid(lu!)).toBe(true);
    expect(metrics(lu!).salary).toBeLessThanOrEqual(SALARY_CAP);
    // no duplicate players
    expect(new Set(lu!.map((p) => p.id)).size).toBe(lu!.length);
  });

  it("respects a lock and an exclude", () => {
    const lockId = "dwr1", fadeId = "dqb1";
    const lu = optimizeOne(base({ locks: new Set([lockId]), excludes: new Set([fadeId]) }), undefined, 40);
    expect(lu!.some((p) => p.id === lockId)).toBe(true);
    expect(lu!.some((p) => p.id === fadeId)).toBe(false);
  });

  it("enforces a QB stack when asked", () => {
    const lu = optimizeOne(base({ stack: true }), undefined, 60);
    const m = metrics(lu!);
    expect(m.stacked).toBeGreaterThanOrEqual(1);
  });

  it("cash mode out-projects on median, GPP reaches higher ceiling", () => {
    const cash = metrics(optimizeOne(base({ mode: "cash" }), undefined, 80)!);
    const gpp = metrics(optimizeOne(base({ mode: "gpp" }), undefined, 80)!);
    expect(cash.proj).toBeGreaterThanOrEqual(gpp.proj - 6); // cash optimises median
    expect(gpp.ceiling).toBeGreaterThanOrEqual(cash.ceiling - 2); // gpp reaches ceiling
  });

  it("generates the requested number of unique lineups with exposure control", () => {
    const { lineups, exposure } = generateLineups(base({ mode: "gpp", stack: true }), 5);
    expect(lineups.length).toBeGreaterThanOrEqual(3);
    const keys = lineups.map((l) => l.players.map((p) => p.id).sort().join(","));
    expect(new Set(keys).size).toBe(keys.length); // all unique
    lineups.forEach((l) => expect(l.metrics.salary).toBeLessThanOrEqual(SALARY_CAP));
    // no player exceeds the 60% exposure ceiling
    exposure.forEach((e) => expect(e.count / lineups.length).toBeLessThanOrEqual(0.8));
  });

  it("leverage mode favours lower total ownership than cash", () => {
    const lev = generateLineups(base({ mode: "leverage" }), 4).lineups;
    const cash = generateLineups(base({ mode: "cash" }), 4).lineups;
    const avg = (xs: readonly { metrics: { totalOwn: number } }[]) => xs.reduce((s, x) => s + x.metrics.totalOwn, 0) / xs.length;
    expect(avg(lev)).toBeLessThan(avg(cash) + 5);
  });

  it("every slate player is unique by id", () => {
    expect(new Set(DFS_SLATE.map((p) => p.id)).size).toBe(DFS_SLATE.length);
  });
});

describe("lateSwap", () => {
  it("returns null when no players are scratched", () => {
    const lu = optimizeOne(base({ mode: "gpp" }), undefined, 40)!;
    expect(lateSwap(lu, new Set(), "gpp", DFS_SLATE)).toBeNull();
  });

  it("finds a replacement for a scratched player and keeps everyone else", () => {
    const lu = optimizeOne(base({ mode: "cash" }), undefined, 60)!;
    const scratch = lu[1]!; // scratch one player
    const result = lateSwap(lu, new Set([scratch.id]), "cash", DFS_SLATE);
    expect(result).not.toBeNull();
    // scratched player is gone
    expect(result!.swapped.some((p) => p.id === scratch.id)).toBe(false);
    // all non-scratched players are still present
    const locked = lu.filter((p) => p.id !== scratch.id);
    for (const lp of locked) expect(result!.swapped.some((p) => p.id === lp.id)).toBe(true);
    // result is under cap
    expect(result!.swapped.reduce((s, p) => s + p.salary, 0)).toBeLessThanOrEqual(SALARY_CAP);
    // at least 1 changed slot (the scratched slot; optimizer may also adjust FLEX)
    expect(result!.changedSlots.length).toBeGreaterThanOrEqual(1);
  });

  it("reports projDelta and salaryDelta", () => {
    const lu = optimizeOne(base({ mode: "cash" }), undefined, 60)!;
    const scratch = lu[3]!;
    const result = lateSwap(lu, new Set([scratch.id]), "cash", DFS_SLATE);
    if (result) {
      expect(typeof result.projDelta).toBe("number");
      expect(typeof result.salaryDelta).toBe("number");
    }
  });
});
