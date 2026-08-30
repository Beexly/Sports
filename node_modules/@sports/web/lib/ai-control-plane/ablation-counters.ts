/**
 * W6 — ablation counters (Wave 1 Foundation item, owner-authorized).
 *
 * `computeAblationCounters` reads `FormalIncident` rows in a window and
 * computes TP/FP counters purely from the `reviewOutcome` human-review
 * label (see formal-incident.ts's `recordFormalIncidentReview` — the
 * prerequisite this module depends on). Read-only: issues one SELECT, no
 * writes, no side effects.
 *
 * SCOPE (do not let this drift): this module never imports `admitUnderSRQC`,
 * `admitUnderSRQCLogged`, `resolveSrqcModeFromEnv`, or anything from
 * `enforce-gate.ts` / `invocation-pipeline.ts` / `dispatch.ts` /
 * `executor.ts`. It is not invoked from the cron route or any
 * invocation-pipeline code path — only from the standalone script
 * (scripts/srqc-ablation-report.ts). Admin/script output only, no auto
 * ENFORCE.
 */

import type { ControlSqlClient } from "./control-store";
import type { FormalIncidentKind } from "./formal-incident";

export interface AblationCounterWindow {
  readonly sinceInclusive: Date;
  readonly untilExclusive: Date;
}

export interface AblationCountsByKind {
  readonly violationKind: FormalIncidentKind | "ALL";
  readonly total: number;
  readonly reviewed: number;
  readonly unreviewed: number;
  readonly truePositives: number;
  readonly falsePositives: number;
  /** truePositives / reviewed, or null if reviewed === 0 (avoid a
   *  misleading 0% on an unreviewed backlog). */
  readonly precision: number | null;
}

export interface AblationCounterReport {
  readonly generatedAt: string;
  readonly windowSinceInclusive: string;
  readonly windowUntilExclusive: string;
  readonly overall: AblationCountsByKind;
  readonly byKind: readonly AblationCountsByKind[];
  /** reviewed/total*100, or null if total===0 — explicit, not inferred, so
   *  a reader never mistakes silence for a clean bill of health. */
  readonly reviewCoveragePct: number | null;
}

interface IncidentRow {
  readonly violationKind: string;
  readonly reviewOutcome: string | null;
}

function summarize(
  violationKind: FormalIncidentKind | "ALL",
  rows: readonly IncidentRow[],
): AblationCountsByKind {
  const total = rows.length;
  const truePositives = rows.filter((r) => r.reviewOutcome === "true_positive").length;
  const falsePositives = rows.filter((r) => r.reviewOutcome === "false_positive").length;
  const reviewed = truePositives + falsePositives;
  const unreviewed = total - reviewed;
  return {
    violationKind,
    total,
    reviewed,
    unreviewed,
    truePositives,
    falsePositives,
    precision: reviewed === 0 ? null : truePositives / reviewed,
  };
}

/**
 * Read FormalIncident rows in `[sinceInclusive, untilExclusive)` and
 * compute TP/FP counters. Never fabricates a `byKind` entry for a
 * violation kind that didn't occur in the window.
 */
export async function computeAblationCounters(
  sql: ControlSqlClient,
  window: AblationCounterWindow,
): Promise<AblationCounterReport> {
  const rows = await sql.query<IncidentRow>(
    `SELECT "violationKind", "reviewOutcome"
       FROM "formal_incident"
      WHERE "createdAt" >= $1 AND "createdAt" < $2`,
    [window.sinceInclusive, window.untilExclusive],
  );

  const kinds = Array.from(new Set(rows.map((r) => r.violationKind))) as FormalIncidentKind[];
  const byKind = kinds.map((kind) => summarize(kind, rows.filter((r) => r.violationKind === kind)));
  const overall = summarize("ALL", rows);

  return {
    generatedAt: new Date().toISOString(),
    windowSinceInclusive: window.sinceInclusive.toISOString(),
    windowUntilExclusive: window.untilExclusive.toISOString(),
    overall,
    byKind,
    reviewCoveragePct: overall.total === 0 ? null : (overall.reviewed / overall.total) * 100,
  };
}

/**
 * Production entry point, same pattern as
 * formal-receipt-job.ts's runFormalReceiptPassProduction.
 */
export async function computeAblationCountersProduction(
  options: { readonly windowMs?: number; readonly now?: () => Date } = {},
): Promise<AblationCounterReport> {
  const [{ prismaSqlClient }, dbModule] = await Promise.all([
    import("./control-store"),
    import("@sports/db"),
  ]);
  const now = (options.now ?? ((): Date => new Date()))();
  const windowMs = options.windowMs ?? 7 * 24 * 60 * 60 * 1000;
  return computeAblationCounters(prismaSqlClient(dbModule.db), {
    sinceInclusive: new Date(now.getTime() - windowMs),
    untilExclusive: now,
  });
}
