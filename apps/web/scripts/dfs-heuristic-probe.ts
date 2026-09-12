/**
 * DFS heuristic probe — a thin CLI over the SHIPPED optimizer.
 *
 * Purpose: let an independent optimum (scripts/dfs/oracle.py, CP-SAT) be
 * compared against what `optimizeOne` / `generateLineups` actually return, on
 * the shipped slate and on synthetic slates. It imports the real engine — it
 * does not re-implement it — so any gap measured is a gap in the product code.
 *
 * Usage (from apps/web):
 *   npx tsx scripts/dfs-heuristic-probe.ts --job <job.json> --out <results.json>
 *
 * Job shape:
 *   { "cases": [ { "id": "s0", "mode": "cash"|"gpp"|"leverage", "stack": bool,
 *                  "restarts": 60, "locks": [id], "excludes": [id],
 *                  "slate": [ DfsPlayer, ... ] } ] }
 * Result shape:
 *   { "results": [ { "id", "mode", "objective", "salary", "stacked",
 *                    "lineup": [ DfsPlayer, ... ] } ] }
 */

import { readFileSync, writeFileSync } from "node:fs";
import { optimizeOne, type Mode } from "../lib/fantasy/dfs-optimizer";
import type { DfsPlayer } from "../lib/fantasy/dfs-slate";

type Case = {
  readonly id: string;
  readonly mode: Mode;
  readonly stack: boolean;
  readonly restarts?: number;
  readonly locks?: readonly string[];
  readonly excludes?: readonly string[];
  readonly slate: readonly DfsPlayer[];
};

type Job = { readonly cases: readonly Case[] };

/** The engine's own objective, re-derived from the public mode definitions. */
function objective(lu: readonly DfsPlayer[], mode: Mode): number {
  return lu.reduce((s, p) => {
    if (mode === "cash") return s + p.proj;
    if (mode === "gpp") return s + p.ceiling;
    return s + (p.ceiling / (p.own * 100 + 1.5)) * 6 + p.ceiling * 0.45;
  }, 0);
}

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};

const jobPath = flag("--job");
const outPath = flag("--out");
if (!jobPath || !outPath) {
  console.error("usage: tsx scripts/dfs-heuristic-probe.ts --job <job.json> --out <results.json>");
  process.exit(2);
}

const job = JSON.parse(readFileSync(jobPath, "utf8")) as Job;
const results = job.cases.map((c) => {
  const opts = {
    mode: c.mode,
    stack: c.stack,
    locks: new Set(c.locks ?? []),
    excludes: new Set(c.excludes ?? []),
  };
  const lu = optimizeOne(opts, undefined, c.slate);
  if (!lu) return { id: c.id, mode: c.mode, objective: null, lineup: [], note: "no feasible lineup" };
  return {
    id: c.id,
    mode: c.mode,
    stack: c.stack,
    objective: objective(lu, c.mode),
    salary: lu.reduce((s, p) => s + p.salary, 0),
    lineup: lu,
  };
});

writeFileSync(outPath, JSON.stringify({ results }, null, 1));
console.log(`[dfs-probe] ${results.length} case(s) -> ${outPath}`);
