/**
 * Write the /performance summary rows (C-319). FLAG-GATED, default OFF.
 *
 * WHY A FLAG. This is a write path into a table a public page reads, and until
 * this change that table had never been written by anything. Landing it enabled
 * would mean the first rows the public record section ever shows are produced by
 * a code path nobody has watched run. The flag is the repo's established idiom
 * for exactly this (see LINE_INTEGRITY_VOID_ENABLED and the zero-sit lane), and
 * it makes activation a deliberate, attributable act rather than a side effect of
 * a deploy.
 *
 * WHY DELETE-AND-INSERT RATHER THAN UPSERT. The model's unique key is
 * (sport, pickType, tier, modelVersion, period) and pickType/tier are NULLABLE.
 * Postgres treats NULLs as distinct in a unique index, so an upsert whose key
 * contains a NULL can never MATCH the existing row — it would insert a second
 * copy on every cycle and the section would grow duplicates that each look
 * plausible. A summary table is a cache of a deterministic computation, not a
 * source of truth, so it is rebuilt atomically inside one transaction: readers
 * see either the whole previous build or the whole new one, never a half-written
 * mix. `computedAt` defaults to now() per row, so every row carries its own
 * build time.
 */
import type { PerformanceSummaryRow } from "./build-performance-summaries";

export const PERFORMANCE_SUMMARIES_WRITE_FLAG = "PERFORMANCE_SUMMARIES_WRITE_ENABLED";

/** The repo's env-flag idiom: trimmed, lower-cased, exact "true", default false. */
export function performanceSummariesWriteEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[PERFORMANCE_SUMMARIES_WRITE_FLAG]?.trim().toLowerCase() === "true";
}

/** Narrow write surface, so the persist path is testable without a Prisma client. */
export interface PerformanceSummaryWriterDb {
  $transaction<T>(
    fn: (tx: {
      performanceSummary: {
        deleteMany(args: Record<string, never>): Promise<{ count: number }>;
        createMany(args: { data: readonly unknown[] }): Promise<{ count: number }>;
      };
    }) => Promise<T>,
  ): Promise<T>;
}

export interface PersistResult {
  readonly status: "written" | "skipped_flag_off";
  readonly replaced: number;
  readonly written: number;
}

export async function persistPerformanceSummaries(
  client: PerformanceSummaryWriterDb,
  rows: readonly PerformanceSummaryRow[],
  opts: { readonly env?: NodeJS.ProcessEnv } = {},
): Promise<PersistResult> {
  const env = opts.env ?? process.env;
  if (!performanceSummariesWriteEnabled(env)) {
    return { status: "skipped_flag_off", replaced: 0, written: 0 };
  }
  return client.$transaction(async (tx) => {
    const deleted = await tx.performanceSummary.deleteMany({});
    if (rows.length === 0) {
      // Rebuilding onto nothing is a legitimate outcome (an empty population) and
      // is reported as such: it clears stale rows rather than leaving a record
      // that no longer describes the population.
      return { status: "written" as const, replaced: deleted.count, written: 0 };
    }
    const inserted = await tx.performanceSummary.createMany({ data: rows as readonly unknown[] });
    return { status: "written" as const, replaced: deleted.count, written: inserted.count };
  });
}
