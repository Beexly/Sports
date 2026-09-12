import { describe, it, expect } from "vitest";
import { optimizeOne, type Mode, type OptOpts } from "./dfs-optimizer";
import { DFS_SLATE, DFS_SLOTS, SALARY_CAP } from "./dfs-slate";

/**
 * Optimality regression tests.
 *
 * The expected values below are NOT hand-picked from the engine's own output —
 * they are the exact optima produced by an independent solver:
 * `scripts/dfs/oracle.py` (Google OR-Tools CP-SAT), run against this slate.
 * Run `python scripts/dfs/oracle.py` to reproduce or refresh them.
 *
 * Before the exact search landed, the hill-climb engine returned 120.0 (cash)
 * and 216.0 (GPP) here — 0.4% and 0.9% short of the optimum — and silently
 * dropped `stack: true` on slates where it could not afford a stack.
 */
const base = (over: Partial<OptOpts> = {}): OptOpts => ({
  mode: "gpp",
  stack: false,
  locks: new Set(),
  excludes: new Set(),
  ...over,
});

/** The objective the search maximises, recomputed from a returned lineup. */
function objective(mode: Mode, ids: readonly string[]): number {
  const byId = new Map(DFS_SLATE.map((p) => [p.id, p]));
  return ids.reduce((s, id) => {
    const p = byId.get(id)!;
    if (mode === "cash") return s + p.proj;
    if (mode === "gpp") return s + p.ceiling;
    return s + (p.ceiling / (p.own * 100 + 1.5)) * 6 + p.ceiling * 0.45;
  }, 0);
}

function slotsValid(lu: readonly { pos: string }[]): boolean {
  const FLEX_OK = new Set(["RB", "WR", "TE"]);
  return DFS_SLOTS.every((slot, i) =>
    slot === ("FLEX" as string) ? FLEX_OK.has(lu[i]!.pos) : lu[i]!.pos === slot,
  );
}

describe("dfs optimizer — optimality (oracle-checked)", () => {
  // CP-SAT solves the objective scaled to integers, so the leverage values below
  // carry a ~1e-6 lattice; cash/gpp are integral, so they get the tight epsilon.
  const cases: { mode: Mode; stack: boolean; optimum: number; tol: number }[] = [
    { mode: "cash", stack: false, optimum: 120.5, tol: 1e-6 },
    { mode: "cash", stack: true, optimum: 120.5, tol: 1e-6 },
    { mode: "gpp", stack: false, optimum: 218, tol: 1e-6 },
    { mode: "gpp", stack: true, optimum: 218, tol: 1e-6 },
    { mode: "leverage", stack: false, optimum: 259.00296370296365, tol: 1e-3 },
    { mode: "leverage", stack: true, optimum: 256.236241294937, tol: 1e-3 },
  ];

  it.each(cases)(
    "reaches the CP-SAT optimum for $mode (stack=$stack)",
    ({ mode, stack, optimum, tol }) => {
      // generous node budget: this asserts optimality, and the UI's own budget
      // is about latency, not correctness
      const lu = optimizeOne(base({ mode, stack }), undefined, DFS_SLATE)!;
      expect(lu).not.toBeNull();
      expect(lu.length).toBe(DFS_SLOTS.length);
      expect(slotsValid(lu)).toBe(true);
      const salary = lu.reduce((s, p) => s + p.salary, 0);
      expect(salary).toBeLessThanOrEqual(SALARY_CAP);
      expect(new Set(lu.map((p) => p.id)).size).toBe(lu.length);
      // as good as the independent optimum (never below it — that is the regression)
      expect(objective(mode, lu.map((p) => p.id))).toBeGreaterThanOrEqual(optimum - tol);
      // and never above it (that would mean the oracle or the model is wrong)
      expect(objective(mode, lu.map((p) => p.id))).toBeLessThanOrEqual(optimum + Math.max(tol, 1e-6));
    },
  );

  it("honours stack:true instead of silently returning an unstacked lineup", () => {
    const lu = optimizeOne(base({ stack: true }), undefined, DFS_SLATE)!;
    const qb = lu.find((p) => p.pos === "QB")!;
    const catchers = lu.filter((p) => p.team === qb.team && (p.pos === "WR" || p.pos === "TE")).length;
    expect(catchers).toBeGreaterThanOrEqual(1);
  });

  // Note: the engine is an exact dynamic program (see dfs-optimizer.ts); the
  // oracle-pin tests above are the optimality proof. There is no heuristic to
  // "beat" anymore — that test was retired when the heuristic was removed from
  // the engine in favor of the exact DP.

  it("keeps locks in the lineup and excludes out of it", () => {
    const lockId = "dwr1";
    const fadeId = "dqb1";
    const lu = optimizeOne(base({ locks: new Set([lockId]), excludes: new Set([fadeId]) }), undefined, DFS_SLATE)!;
    expect(lu.some((p) => p.id === lockId)).toBe(true);
    expect(lu.some((p) => p.id === fadeId)).toBe(false);
  });
});
