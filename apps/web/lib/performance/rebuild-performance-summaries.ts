/**
 * Rebuild the /performance summary rows end to end (C-319).
 *
 * The population is the canonical public one, and it is the same definition the
 * live truth surface reports as `canonicalSettled`: published, not bootstrap,
 * not the v5.0.0-seed rows, result in WIN/LOSS/PUSH. Verified 2026-09-11 against
 * production — this query returns 2,298 rows, matching the truth surface's own
 * figure, and the summary totals it produces agree with the database's GROUP BY
 * on all 57 keys (scripts/hermes/verify-performance-summaries.mts).
 *
 * The write is flag-gated (PERFORMANCE_SUMMARIES_WRITE_ENABLED, default OFF) and
 * the flag is checked BEFORE the read, so an unconfigured deployment pays nothing
 * for a feature it has not enabled — no query, no transaction.
 */
import { db } from "@sports/db";
import {
  buildPerformanceSummaries,
  type BuiltPerformanceSummaries,
  type SummaryPickRow,
} from "./build-performance-summaries";
import {
  persistPerformanceSummaries,
  performanceSummariesWriteEnabled,
  type PerformanceSummaryWriterDb,
} from "./persist-performance-summaries";

/** The seed rows the public definitions exclude everywhere else in the repo. */
const SEED_MODEL_VERSION = "v5.0.0-seed";

/** Narrow read surface so this is testable without a Prisma client. */
export interface PerformanceSummaryReaderDb {
  pick: {
    findMany(args: {
      where: Record<string, unknown>;
      select: Record<string, unknown>;
    }): Promise<readonly unknown[]>;
  };
}

type RawRow = {
  readonly result: string;
  readonly settledAt: Date | null;
  readonly generatedAt: Date | null;
  readonly pickType: string | null;
  readonly tier: string | null;
  readonly modelVersion: string | null;
  readonly game?: { readonly commenceTime?: Date | null; readonly sport?: { readonly key?: string | null } | null } | null;
};

function toSummaryPickRow(r: RawRow): SummaryPickRow {
  return {
    sport: r.game?.sport?.key ?? null,
    pickType: r.pickType ?? null,
    tier: r.tier ?? null,
    modelVersion: r.modelVersion ?? null,
    result: r.result,
    settledAt: r.settledAt ?? null,
    generatedAt: r.generatedAt ?? null,
    commenceTime: r.game?.commenceTime ?? null,
  };
}

export interface RebuildResult {
  readonly status: "written" | "skipped_flag_off";
  readonly replaced: number;
  readonly written: number;
  readonly skipped: BuiltPerformanceSummaries["skipped"];
  readonly periods: readonly string[];
}

export async function rebuildPerformanceSummaries(
  opts: {
    readonly env?: NodeJS.ProcessEnv;
    readonly reader?: PerformanceSummaryReaderDb;
    readonly writer?: PerformanceSummaryWriterDb;
  } = {},
): Promise<RebuildResult> {
  const env = opts.env ?? process.env;
  const empty = { notDecidedOrVoid: 0, inPlay: 0, unkeyable: 0 };
  if (!performanceSummariesWriteEnabled(env)) {
    return { status: "skipped_flag_off", replaced: 0, written: 0, skipped: empty, periods: [] };
  }

  const reader = (opts.reader ?? (db as unknown as PerformanceSummaryReaderDb));
  const writer = (opts.writer ?? (db as unknown as PerformanceSummaryWriterDb));

  const rows = (await reader.pick.findMany({
    where: {
      isPublished: true,
      isBootstrap: false,
      result: { in: ["WIN", "LOSS", "PUSH"] },
      NOT: { modelVersion: SEED_MODEL_VERSION },
    },
    select: {
      result: true,
      settledAt: true,
      generatedAt: true,
      pickType: true,
      tier: true,
      modelVersion: true,
      game: { select: { commenceTime: true, sport: { select: { key: true } } } },
    },
  })) as readonly RawRow[];

  const built = buildPerformanceSummaries(rows.map(toSummaryPickRow));
  const persisted = await persistPerformanceSummaries(writer, built.rows, { env });
  return {
    status: persisted.status,
    replaced: persisted.replaced,
    written: persisted.written,
    skipped: built.skipped,
    periods: built.periods,
  };
}
