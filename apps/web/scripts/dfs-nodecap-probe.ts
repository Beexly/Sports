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

/**
 * Header text and column width declared together. Two parallel arrays indexed
 * by position drift the moment a column is added, and under
 * noUncheckedIndexedAccess the width lookup is `number | undefined` anyway.
 */
const COLUMNS: readonly { readonly head: string; readonly width: number }[] = [
  { head: "mode", width: 10 },
  { head: "stack", width: 6 },
  { head: "nodeBudget", width: 11 },
  { head: "optimal", width: 8 },
  { head: "nodes", width: 10 },
  { head: "work", width: 12 },
  { head: "objective", width: 12 },
  { head: "ms", width: 8 },
];

console.log(`slate size: ${slate.length}`);
console.log(COLUMNS.map((c) => c.head.padEnd(c.width)).join(""));

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
          ...[
            mode,
            String(stack),
            String(nodeBudget),
            String(r.optimal),
            String(r.nodes),
            String(r.work),
            obj.toFixed(4),
            ms.toFixed(0),
          ].map((cell, i) => cell.padEnd(COLUMNS[i]?.width ?? 10)),
          moved,
        ].join(""),
      );
      prevObj = obj;
      if (r.optimal) break; // completed: a larger cap cannot change the answer
    }
  }
}
