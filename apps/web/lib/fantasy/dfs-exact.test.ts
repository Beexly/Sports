import { describe, it, expect } from "vitest";
import { optimizeExact, isCapLegal, kBest, diversePool, lateSwap } from "./dfs-exact";
import { optimizeOne, objVal, objOf, eligible, type Mode } from "./dfs-optimizer";
import { DFS_SLOTS, SALARY_CAP, DFS_SLATE, type DfsPlayer, type DfsPos } from "./dfs-slate";

// ── small fixture we can brute-force exhaustively ─────────────────────────────
const p = (
  id: string, pos: DfsPos, salary: number, proj: number, floor: number, ceiling: number, own: number,
): DfsPlayer => ({ id, name: id, pos, team: id.slice(0, 3).toUpperCase(), opp: "OPP", salary, proj, floor, ceiling, own });

const FIXTURE: DfsPlayer[] = [
  p("q1", "QB", 8000, 25, 15, 38, 0.2), p("q2", "QB", 6000, 18, 10, 30, 0.1),
  p("r1", "RB", 7500, 20, 12, 32, 0.2), p("r2", "RB", 7000, 18, 10, 28, 0.18),
  p("r3", "RB", 5500, 14, 7, 24, 0.12), p("r4", "RB", 4500, 10, 4, 20, 0.08),
  p("w1", "WR", 8000, 22, 12, 34, 0.2), p("w2", "WR", 7000, 18, 10, 30, 0.16),
  p("w3", "WR", 6000, 15, 8, 27, 0.12), p("w4", "WR", 5000, 12, 6, 22, 0.09), p("w5", "WR", 3800, 8, 3, 18, 0.05),
  p("t1", "TE", 6000, 14, 7, 24, 0.16), p("t2", "TE", 4500, 10, 5, 18, 0.1), p("t3", "TE", 3000, 6, 2, 14, 0.04),
  p("d1", "DST", 3500, 9, 3, 18, 0.14), p("d2", "DST", 2500, 6, 1, 14, 0.06),
];

function combos<T>(arr: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  const [head, ...rest] = arr;
  return [...combos(rest, k - 1).map((c) => [head!, ...c]), ...combos(rest, k)];
}

const FLEX_POS: DfsPos[] = ["RB", "WR", "TE"];

/** Exhaustive optimum over the fixture — the ground truth the solver must match. */
function bruteForce(slate: DfsPlayer[], mode: Mode): { obj: number; salary: number } {
  const by = (pos: DfsPos) => slate.filter((x) => x.pos === pos);
  let best = { obj: -Infinity, salary: 0 };
  for (const flex of FLEX_POS) {
    const need: Record<DfsPos, number> = { QB: 1, RB: 2, WR: 3, TE: 1, DST: 1 };
    need[flex] += 1;
    for (const qb of combos(by("QB"), need.QB))
      for (const rb of combos(by("RB"), need.RB))
        for (const wr of combos(by("WR"), need.WR))
          for (const te of combos(by("TE"), need.TE))
            for (const dst of combos(by("DST"), need.DST)) {
              const lu = [...qb, ...rb, ...wr, ...te, ...dst];
              const salary = lu.reduce((s, x) => s + x.salary, 0);
              if (salary > SALARY_CAP) continue;
              const obj = lu.reduce((s, x) => s + objVal(x, mode), 0);
              if (obj > best.obj) best = { obj, salary };
            }
  }
  return best;
}

const slotLegal = (lu: readonly DfsPlayer[]) => DFS_SLOTS.every((slot, i) => eligible(lu[i]!, slot));

describe("exact dfs optimizer", () => {
  it("matches brute-force ground truth on every mode", () => {
    (["cash", "gpp", "leverage"] as Mode[]).forEach((mode) => {
      const exact = optimizeExact({ mode, locks: new Set(), excludes: new Set() }, FIXTURE);
      const bf = bruteForce(FIXTURE, mode);
      expect(exact.optimal).toBe(true);
      expect(exact.objective).toBeCloseTo(bf.obj, 6);
    });
  });

  it("returns a slot-legal, cap-legal, distinct lineup", () => {
    const exact = optimizeExact({ mode: "cash", locks: new Set(), excludes: new Set() }, FIXTURE);
    expect(exact.lineup).not.toBeNull();
    expect(exact.lineup!.length).toBe(DFS_SLOTS.length);
    expect(slotLegal(exact.lineup!)).toBe(true);
    expect(isCapLegal(exact.lineup!)).toBe(true);
    expect(new Set(exact.lineup!.map((x) => x.id)).size).toBe(exact.lineup!.length);
  });

  it("honours locks and excludes while staying optimal", () => {
    const exact = optimizeExact(
      { mode: "cash", locks: new Set(["r4", "w5"]), excludes: new Set(["q1"]) },
      FIXTURE,
    );
    expect(exact.lineup!.some((x) => x.id === "r4")).toBe(true);
    expect(exact.lineup!.some((x) => x.id === "w5")).toBe(true);
    expect(exact.lineup!.some((x) => x.id === "q1")).toBe(false);
    expect(isCapLegal(exact.lineup!)).toBe(true);
  });

  it("reports infeasible (null) when constraints can't be met", () => {
    // exclude every DST → no legal lineup exists
    const exact = optimizeExact(
      { mode: "cash", locks: new Set(), excludes: new Set(["d1", "d2"]) },
      FIXTURE,
    );
    expect(exact.lineup).toBeNull();
    expect(exact.objective).toBe(-Infinity);
  });

  it("on the real slate: optimal, and agrees with the incumbent exact optimizer", () => {
    (["cash", "gpp", "leverage"] as Mode[]).forEach((mode) => {
      const exact = optimizeExact({ mode, locks: new Set(), excludes: new Set() }, DFS_SLATE);
      expect(exact.optimal).toBe(true);
      expect(slotLegal(exact.lineup!)).toBe(true);
      const incumbent = optimizeOne({ mode, stack: false, locks: new Set(), excludes: new Set() }, undefined, DFS_SLATE);
      // Two independently-implemented exact solvers for the same combinatorial
      // optimum must agree — disagreement would expose a real bug in one of them.
      expect(exact.objective).toBeCloseTo(objOf(incumbent!, mode), 6);
    });
  });
});

describe("exact k-best · diverse pool · minStack · late-swap", () => {
  it("kBest returns k distinct lineups, sorted by objective, topped by the single optimum", () => {
    const k = 6;
    const best = kBest({ mode: "gpp" }, k, DFS_SLATE);
    expect(best.length).toBe(k);
    const keys = best.map((l) => l.map((p) => p.id).sort().join(","));
    expect(new Set(keys).size).toBe(k); // all distinct sets
    const objs = best.map((l) => objOf(l, "gpp"));
    for (let i = 1; i < objs.length; i++) expect(objs[i - 1]!).toBeGreaterThanOrEqual(objs[i]!);
    const single = optimizeExact({ mode: "gpp" }, DFS_SLATE);
    expect(objs[0]!).toBeCloseTo(single.objective, 6); // best-of-k == the proven optimum
  });

  it("diversePool honours the overlap cap between every pair", () => {
    const maxOverlap = 6;
    const pool = diversePool({ mode: "gpp" }, 8, { maxOverlap, factor: 12 }, DFS_SLATE);
    expect(pool.length).toBeGreaterThanOrEqual(2);
    for (let a = 0; a < pool.length; a++)
      for (let b = a + 1; b < pool.length; b++) {
        const sb = new Set(pool[b]!.map((p) => p.id));
        const overlap = pool[a]!.filter((p) => sb.has(p.id)).length;
        expect(overlap).toBeLessThanOrEqual(maxOverlap);
      }
  });

  it("minStack forces a QB stack and never beats the unconstrained optimum", () => {
    const free = optimizeExact({ mode: "gpp" }, DFS_SLATE);
    const stacked = optimizeExact({ mode: "gpp", minStack: 1 }, DFS_SLATE);
    expect(stacked.lineup).not.toBeNull();
    const qb = stacked.lineup!.find((p) => p.pos === "QB")!;
    const catchers = stacked.lineup!.filter((p) => p.team === qb.team && (p.pos === "WR" || p.pos === "TE")).length;
    expect(catchers).toBeGreaterThanOrEqual(1);
    expect(free.objective).toBeGreaterThanOrEqual(stacked.objective - 1e-6);
  });

  it("late-swap keeps locked players, stays legal, and never lowers the objective", () => {
    const start = optimizeOne({ mode: "gpp", stack: false, locks: new Set(), excludes: new Set() }, undefined, DFS_SLATE)!;
    const lockedIds = new Set([start[0]!.id, start[1]!.id, start[8]!.id]); // QB, an RB, DST
    const swapped = lateSwap(start, lockedIds, "gpp", DFS_SLATE);
    lockedIds.forEach((id) => expect(swapped.some((p) => p.id === id)).toBe(true));
    expect(isCapLegal(swapped)).toBe(true);
    expect(objOf(swapped, "gpp")).toBeGreaterThanOrEqual(objOf(start, "gpp") - 1e-6);
  });
});
