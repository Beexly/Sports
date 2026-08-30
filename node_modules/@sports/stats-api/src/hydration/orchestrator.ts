/**
 * Hydration orchestrator — pure planning + pluggable runners.
 * Does not perform network I/O itself; runners inject fetch/DB.
 */

import { ruleForMetricId, type CadenceRule } from "./cadence.js";
import {
  strategyById,
  type HydrationStrategy,
  type HydrationStrategyId,
} from "./strategies.js";

export type HydrationJobStatus =
  | "planned"
  | "running"
  | "succeeded"
  | "partial"
  | "failed"
  | "skipped_stale_ok"
  | "refused";

export interface HydrationJob {
  readonly id: string;
  readonly metricPrefix: string;
  readonly strategy: HydrationStrategyId;
  readonly entityIds: readonly string[];
  readonly asOf: string;
  readonly plannedAt: string;
  status: HydrationJobStatus;
  rowsWritten: number;
  error?: string;
  finishedAt?: string;
}

export interface HydrationRunner {
  readonly strategy: HydrationStrategyId;
  run(job: HydrationJob): Promise<{ rowsWritten: number; ok: boolean; error?: string }>;
}

export interface HydrationPlan {
  readonly asOf: string;
  readonly jobs: HydrationJob[];
  readonly strategies: HydrationStrategy[];
}

let jobSeq = 0;

export function planHydration(input: {
  metricIds: readonly string[];
  entityIds: readonly string[];
  asOf: string;
  now?: string;
}): HydrationPlan {
  const asOf = input.asOf;
  const byPrefix = new Map<string, CadenceRule>();
  for (const mid of input.metricIds) {
    const rule = ruleForMetricId(mid);
    if (rule) byPrefix.set(rule.prefix, rule);
  }

  const jobs: HydrationJob[] = [];
  const strategies: HydrationStrategy[] = [];
  const seenStrat = new Set<HydrationStrategyId>();

  for (const rule of byPrefix.values()) {
    const strat = strategyById(rule.primary);
    if (strat && !seenStrat.has(strat.id)) {
      strategies.push(strat);
      seenStrat.add(strat.id);
    }
    jobSeq += 1;
    jobs.push({
      id: `hyd_${jobSeq}_${rule.prefix.replace(/\./g, "_")}`,
      metricPrefix: rule.prefix,
      strategy: rule.primary,
      entityIds: input.entityIds,
      asOf,
      plannedAt: input.now ?? new Date().toISOString(),
      status: "planned",
      rowsWritten: 0,
    });
  }

  return { asOf, jobs, strategies };
}

/**
 * Execute plan with injected runners. Unknown strategy → job refused (not fake success).
 */
export async function runHydrationPlan(
  plan: HydrationPlan,
  runners: readonly HydrationRunner[],
): Promise<HydrationPlan> {
  const byStrat = new Map(runners.map((r) => [r.strategy, r]));
  for (const job of plan.jobs) {
    const runner = byStrat.get(job.strategy);
    if (!runner) {
      job.status = "refused";
      job.error = `No runner for strategy ${job.strategy}`;
      job.finishedAt = new Date().toISOString();
      continue;
    }
    job.status = "running";
    try {
      const result = await runner.run(job);
      job.rowsWritten = result.rowsWritten;
      job.status = result.ok ? (result.rowsWritten > 0 ? "succeeded" : "partial") : "failed";
      job.error = result.error;
    } catch (e) {
      job.status = "failed";
      job.error = e instanceof Error ? e.message : String(e);
    }
    job.finishedAt = new Date().toISOString();
  }
  return plan;
}

/** Freshness decision for a stored asOf vs now + maxAge. */
export function isFresh(
  storedAsOf: string,
  now: string,
  maxAgeMs: number,
): { fresh: boolean; ageMs: number } {
  const s = Date.parse(storedAsOf);
  const n = Date.parse(now);
  if (!Number.isFinite(s) || !Number.isFinite(n)) {
    return { fresh: false, ageMs: Number.POSITIVE_INFINITY };
  }
  const ageMs = Math.max(0, n - s);
  return { fresh: ageMs <= maxAgeMs, ageMs };
}

/**
 * Recommended max age from cadence class (defaults; ops can tighten).
 */
export function maxAgeForCadence(cadence: CadenceRule["cadence"]): number {
  switch (cadence) {
    case "sub_minute":
      return 60_000;
    case "few_minutes":
      return 15 * 60_000;
    case "hourly":
      return 90 * 60_000;
    case "daily":
      return 36 * 3_600_000;
    case "weekly":
      return 8 * 86_400_000;
    case "seasonal":
      return 30 * 86_400_000;
    case "on_demand":
      return Number.POSITIVE_INFINITY;
  }
}
