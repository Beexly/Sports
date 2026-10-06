/**
 * LST-Bench: Benchmarking Log-Structured Tables in the Cloud
 *
 * arXiv:2305.01120v3 · lane:data_infra · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Apply the findings to GSE's Delta lake: (1) default to Delta Lake CoW (read-heavy: weekly bulk
 * feature builds, constant point-in-time reads); (2) maintenance doctrine - schedule Optimize
 * (compaction) + Vacuum after every weekly feature build; (3) write-path discipline - configure
 * the Spark/DuckDB writer for large target file sizes (avoid small-file pathology); (4) track S_DR
 * on weekly feature-build latency and Sunday serving-read p99, alerting if S_DR > 0.1 over 4 weeks
 * as the lake-health KPI; (5) rely on time travel for point-in-time replay tests - plus workload-
 * aware compaction: Z-ordering/compaction keyed on (season, week) so hot recent partitions are
 * optimally laid out while cold history is compacted rarely.
 *
 * ACCEPTANCE GATE: ADOPT the maintenance doctrine iff: (i) the no-maintenance run shows S_DR > 0.1 (confirming the
 * degradation mechanism applies to GSE's workload - if no degradation appears at GSE's scale, the
 * doctrine is REJECTED as over-engineering), AND (ii) post-Optimize latency recovers to within 10%
 * of the fresh-table baseline.
 *
 * Ingest role: schemas (LST-Bench log-structured table benchmark: schema + workload harness).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2305.01120v3" as const;
export const LANE = "data_infra" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the maintenance doctrine iff: (i) the no-maintenance run shows S_DR > 0.1 (confirming the
 * degradation mechanism applies to GSE's workload - if no degradation appears at GSE's scale, the
 * doctrine is REJECTED as over-engineering), AND (ii) post-Optimize latency recovers to within 10%
 * of the fresh-table baseline.`;

export const CONFIG = {
  enabled: false,
  benchmark: "LST-Bench",
  engines: ["delta", "iceberg", "hudi"],
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export type LstEngine = "delta" | "iceberg" | "hudi";
export type Workload = "write" | "read" | "merge" | "vacuum";

export interface BenchRun {
  readonly engine: LstEngine;
  readonly workload: Workload;
  readonly rows: number;
  readonly seconds: number;
  readonly costUsd: number;
}

export function isBenchRun(x: unknown): x is BenchRun {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    ["delta", "iceberg", "hudi"].includes(o["engine"] as string) &&
    ["write", "read", "merge", "vacuum"].includes(o["workload"] as string) &&
    Number.isInteger(o["rows"]) && (o["rows"] as number) > 0 &&
    isFiniteNumber(o["seconds"]) && (o["seconds"] as number) > 0 &&
    isFiniteNumber(o["costUsd"]) && (o["costUsd"] as number) >= 0
  );
}

/** Throughput rows/sec. */
export function throughput(run: BenchRun): number | null {
  if (!isBenchRun(run)) return null;
  return run.rows / run.seconds;
}

/** Cost per million rows. */
export function costPerMillion(run: BenchRun): number | null {
  if (!isBenchRun(run)) return null;
  return (run.costUsd / run.rows) * 1e6;
}

/** Pareto frontier: runs not dominated on (throughput up, cost down). */
export function paretoFrontier(runs: readonly unknown[]): BenchRun[] {
  const v: BenchRun[] = [];
  for (const r of runs) if (isBenchRun(r)) v.push(r);
  const pts = v.map((r) => ({ r, t: throughput(r) ?? 0, c: costPerMillion(r) ?? Infinity }));
  return pts
    .filter((p) => !pts.some((q) => q !== p && q.t >= p.t && q.c <= p.c && (q.t > p.t || q.c < p.c)))
    .map((p) => p.r);
}

/** Winner per workload by throughput. */
export function winnerByWorkload(runs: readonly unknown[]): Record<Workload, BenchRun | null> {
  const v: BenchRun[] = [];
  for (const r of runs) if (isBenchRun(r)) v.push(r);
  const out: Record<Workload, BenchRun | null> = { write: null, read: null, merge: null, vacuum: null };
  for (const r of v) {
    const cur = out[r.workload];
    if (!cur || (throughput(r) ?? 0) > (throughput(cur) ?? 0)) out[r.workload] = r;
  }
  return out;
}
