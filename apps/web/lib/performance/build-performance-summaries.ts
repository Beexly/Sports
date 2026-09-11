/**
 * Build the rows behind /performance's summary section (C-319).
 *
 * WHY THIS EXISTS. `apps/web/app/performance/page.tsx` renders its record
 * section from the `performance_summaries` table, and NOTHING in this repository
 * has ever written a row to it. Measured 2026-09-11 against production:
 * `SELECT COUNT(*) FROM performance_summaries` returns 0, so the section is
 * structurally incapable of showing data — while it currently publishes the
 * sentence "No official record yet — We're still collecting finished, graded
 * picks from the live engine" over a population of 2,298 settled picks with the
 * performance gate OPEN. An empty section reads as a modest site; a published
 * claim that the collection is empty at 2,298 picks deep reads as a false one.
 *
 * THE POPULATION IS THE CANONICAL ONE, and it is deliberately the same
 * definition the rest of the public surfaces use: published, not bootstrap, not
 * the v5.0.0-seed rows. This module does NOT invent a fifth copy of it; callers
 * own the query and hand the rows here.
 *
 * IN-PLAY ROWS ARE WITHHELD (C-302, same rule and same shared module as the
 * calibration panel, the tail monitor and the public calibrator). Measured on
 * production, the 170 graded rows generated at or after kickoff win 73.53%
 * against 52.34% for the other 2,119 — a look-ahead class. A summary built on
 * them would hand the marketing page a number the model did not earn.
 *
 * VOID IS NOT A RESULT. The model has no voids column, and a withdrawn result
 * must not be counted as a decided one in either direction, so voids are
 * dropped from the summary and reported in `skipped` instead.
 *
 * Writes are NOT performed here. `persistPerformanceSummaries` does that and is
 * flag-gated; see its own comment.
 */
import { isInPlayGenerated } from "@/lib/calibration/in-play-exclusion";

/** One graded pick, in the shape the summary needs. */
export interface SummaryPickRow {
  readonly sport: string | null;
  readonly pickType: string | null;
  readonly tier: string | null;
  readonly modelVersion: string | null;
  readonly result: string;
  /** Drives the per-period bucket. A row with no date lands in "all-time" only. */
  readonly settledAt: Date | null;
  readonly generatedAt: Date | null;
  readonly commenceTime: Date | null;
}

export interface PerformanceSummaryRow {
  readonly sport: string;
  readonly league: string | null;
  readonly pickType: string | null;
  readonly tier: string | null;
  readonly modelVersion: string;
  readonly totalPicks: number;
  readonly wins: number;
  readonly losses: number;
  readonly pushes: number;
  /** wins / (wins + losses). Pushes are population, never rate — as the site says. */
  readonly winRate: number;
  /** "all-time" or "YYYY-MM", derived from settledAt. */
  readonly period: string;
}

export interface BuiltPerformanceSummaries {
  readonly rows: readonly PerformanceSummaryRow[];
  readonly skipped: {
    /** Result is WIN/LOSS/PUSH only; PENDING and VOID are not results. */
    readonly notDecidedOrVoid: number;
    readonly inPlay: number;
    /** No sport or no modelVersion: the row cannot be keyed, so it is counted, not guessed. */
    readonly unkeyable: number;
  };
  readonly periods: readonly string[];
}

const DECIDED = new Set(["WIN", "LOSS", "PUSH"]);

function periodOf(settledAt: Date | null): string | null {
  if (!(settledAt instanceof Date) || !Number.isFinite(settledAt.getTime())) return null;
  const y = settledAt.getUTCFullYear();
  const m = String(settledAt.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

/**
 * Group graded picks into one row per (sport, pickType, tier, modelVersion, period),
 * plus an "all-time" row for every key that has any history.
 */
export function buildPerformanceSummaries(
  rows: readonly SummaryPickRow[],
): BuiltPerformanceSummaries {
  const skipped = { notDecidedOrVoid: 0, inPlay: 0, unkeyable: 0 };
  const buckets = new Map<string, { key: Omit<PerformanceSummaryRow, "totalPicks" | "wins" | "losses" | "pushes" | "winRate">; wins: number; losses: number; pushes: number }>();

  const add = (
    sport: string,
    pickType: string | null,
    tier: string | null,
    modelVersion: string,
    period: string,
    result: string,
  ) => {
    const id = [sport, pickType ?? "", tier ?? "", modelVersion, period].join("|");
    const b =
      buckets.get(id) ??
      { key: { sport, league: null, pickType, tier, modelVersion, period }, wins: 0, losses: 0, pushes: 0 };
    if (result === "WIN") b.wins += 1;
    else if (result === "LOSS") b.losses += 1;
    else b.pushes += 1;
    buckets.set(id, b);
  };

  for (const row of rows) {
    if (!DECIDED.has(row.result)) {
      skipped.notDecidedOrVoid += 1;
      continue;
    }
    // Same rule, same shared predicate as every other public reader (C-302).
    if (isInPlayGenerated(row.generatedAt, row.commenceTime)) {
      skipped.inPlay += 1;
      continue;
    }
    if (!row.sport || !row.modelVersion) {
      skipped.unkeyable += 1;
      continue;
    }
    add(row.sport, row.pickType, row.tier, row.modelVersion, "all-time", row.result);
    const period = periodOf(row.settledAt);
    if (period) add(row.sport, row.pickType, row.tier, row.modelVersion, period, row.result);
  }

  const out: PerformanceSummaryRow[] = [];
  for (const b of buckets.values()) {
    const decided = b.wins + b.losses;
    out.push({
      ...b.key,
      totalPicks: b.wins + b.losses + b.pushes,
      wins: b.wins,
      losses: b.losses,
      pushes: b.pushes,
      winRate: decided > 0 ? round4(b.wins / decided) : 0,
    });
  }
  // Deterministic order so a diff of two builds means something.
  out.sort(
    (a, z) =>
      a.period.localeCompare(z.period) ||
      a.sport.localeCompare(z.sport) ||
      (a.pickType ?? "").localeCompare(z.pickType ?? "") ||
      (a.tier ?? "").localeCompare(z.tier ?? "") ||
      a.modelVersion.localeCompare(z.modelVersion),
  );

  return {
    rows: out,
    skipped,
    periods: [...new Set(out.map((r) => r.period))].sort(),
  };
}
