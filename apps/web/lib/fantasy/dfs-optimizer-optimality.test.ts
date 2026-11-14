import { describe, it, expect } from "vitest";
import { optimizeOne, optimizeHeuristic, type Mode, type OptOpts } from "./dfs-optimizer";
import { DFS_SLATE, DFS_SLOTS, SALARY_CAP } from "./dfs-slate";

/**
 * Optimality regression tests.
 *
 * The expected values below are NOT hand-picked from the engine's own output —
 * they are the exact optima produced by an independent solver:
 * `scripts/dfs/oracle.py` (Google OR-Tools CP-SAT), run against this slate.
 * Run `python scripts/dfs/oracle.py` to reproduce or refresh them.
 *
 * Before the exact search landed, the hill-climb engine returned values ~0.4%
 * and ~0.9% short of the then-slate optimum — and silently dropped
 * `stack: true` on slates where it could not afford a stack.
 *
 * Re-pinned 2026-11-13: the constants below were 191.7 / 276.0 / 239.865 /
 * 238.394, taken from a 37-player slate. The shipped `DFS_SLATE` is now 40
 * players, so those numbers described a slate that no longer exists and the
 * engine was accused of a 1.4-point regression it never had. The values were
 * re-derived by `scripts/dfs/oracle.py` (CP-SAT) against the CURRENT slate and
 * are reproduced by the engine exactly; the engine lineup for every case is
 * the same nine players the oracle returns.
 *
 * Note on budgets: the leverage cases exhaust `costBudget` before the node
 * budget, so `solveExact` reports `optimal: false` while already holding the
 * optimum (proving it takes ~50s per case). The assertion below is therefore
 * the oracle value, not the search's self-report.
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
  // 40-player shipped slate, oracle-verified 2026-11-13:
  //   cash 190.3 (salary 49900), gpp 275.0 (49900),
  //   leverage 239.18993866186474 (stack off, salary 49600),
  //             237.21596156736132 (stack on, salary 50000)
  const cases: { mode: Mode; stack: boolean; optimum: number; tol: number }[] = [
    { mode: "cash", stack: false, optimum: 190.3, tol: 1e-6 },
    { mode: "cash", stack: true, optimum: 190.3, tol: 1e-6 },
    { mode: "gpp", stack: false, optimum: 275, tol: 1e-6 },
    { mode: "gpp", stack: true, optimum: 275, tol: 1e-6 },
    { mode: "leverage", stack: false, optimum: 239.18993866186474, tol: 1e-3 },
    { mode: "leverage", stack: true, optimum: 237.21596156736132, tol: 1e-3 },
  ];

  it.each(cases)(
    "reaches the CP-SAT optimum for $mode (stack=$stack)",
    ({ mode, stack, optimum, tol }) => {
      // generous node budget: the UI's own budget is about latency, not
      // correctness. Leverage still stops on its (work) cost budget with the
      // optimum in hand — see the header note — so the check below is the
      // oracle value, not `optimal`.
      const lu = optimizeOne(base({ mode, stack }), undefined, 60, DFS_SLATE, 1_000_000)!;
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
    const lu = optimizeOne(base({ stack: true }), undefined, 60, DFS_SLATE)!;
    const qb = lu.find((p) => p.pos === "QB")!;
    const catchers = lu.filter((p) => p.team === qb.team && (p.pos === "WR" || p.pos === "TE")).length;
    expect(catchers).toBeGreaterThanOrEqual(1);
  });

  it("beats or matches the heuristic it seeds from", () => {
    for (const mode of ["cash", "gpp", "leverage"] as Mode[]) {
      const heur = optimizeHeuristic(base({ mode }), undefined, 60, DFS_SLATE)!;
      const exact = optimizeOne(base({ mode }), undefined, 60, DFS_SLATE)!;
      expect(objective(mode, exact.map((p) => p.id))).toBeGreaterThanOrEqual(
        objective(mode, heur.map((p) => p.id)) - 1e-9,
      );
    }
  });

  it("keeps locks in the lineup and excludes out of it", () => {
    const lockId = "dwr1";
    const fadeId = "dqb1";
    const lu = optimizeOne(base({ locks: new Set([lockId]), excludes: new Set([fadeId]) }), undefined, 40)!;
    expect(lu.some((p) => p.id === lockId)).toBe(true);
    expect(lu.some((p) => p.id === fadeId)).toBe(false);
  });
});
