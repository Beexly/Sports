/**
 * DFS node-cap probe. Measurement only: it changes no default, it calls the
 * SHIPPED solver with explicit budgets.
 *
 * Question: `solveExact`'s provenance work proved cash and leverage stop on
 * their own node cap (400,001) on the shipped slate while gpp completes. This
 * measures what a raised cap buys: whether the search completes, what it costs
 * in work and wall clock, and whether the OBJECTIVE moves. The last one decides
 * whether raising the cap is a proof change or an output change.
 */
import { solveExact, objOf, type Mode, type OptOpts } from "../lib/fantasy/dfs-optimizer";
import { activeDfsSlate } from "../lib/integrations/dfs";

const slate = activeDfsSlate();
const MODES: Mode[] = ["cash", "gpp", "leverage"];
const BUDGETS = [400_000, 500_000, 600_000, 1_000_000, 2_000_000];

console.log(`slate size: ${slate.length}`);
console.log(
  ["mode", "stack", "nodeBudget", "optimal", "nodes", "work", "objective", "ms"]
    .map((h, i) => h.padEnd([10, 6, 11, 8, 10, 12, 12, 8][i]))
    .join(""),
);

for (const stack of [false, true]) {
  for (const mode of MODES) {
    let prevObj: number | null = null;
    for (const nodeBudget of BUDGETS) {
      const opts: OptOpts = { mode, stack, locks: new Set(), excludes: new Set() };
      const t0 = process.hrtime.bigint();
      const r = solveExact(opts, () => 0, 60, slate, nodeBudget);
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      const obj = r.lineup ? objOf(r.lineup, mode) : Number.NaN;
      const moved = prevObj !== null && Math.abs(obj - prevObj) > 1e-9 ? "  <-- OBJECTIVE MOVED" : "";
      console.log(
        [
          mode.padEnd(10),
          String(stack).padEnd(6),
          String(nodeBudget).padEnd(11),
          String(r.optimal).padEnd(8),
          String(r.nodes).padEnd(10),
          String(r.work).padEnd(12),
          obj.toFixed(4).padEnd(12),
          ms.toFixed(0).padEnd(8),
          moved,
        ].join(""),
      );
      prevObj = obj;
      if (r.optimal) break; // completed: a larger cap cannot change the answer
    }
  }
}
