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
// The allow-listed public rate helper. lib/performance/public-performance-policy.ts
// and __tests__/policy-only-winrate.test.ts make this the ONLY sanctioned path to a
// customer-facing win rate; a second implementation anywhere else fails the build,
// and a differently-spelled copy of the same arithmetic would satisfy that test
// while violating the invariant it protects.
import { winRatePct } from "@/lib/format/stat";

/**
 * Two display lanes (C-352, AGENTS.md 2026-09-14 audit).
 *
 * book-priced  — bookmakerCount >= 1: a market priced the pick. This is the
 *                only lane a customer could have placed, so it leads the hero.
 * model-signal — bookmakerCount 0: published and settled, never bettable.
 *                Stays in the record; never summed into the headline.
 */
export type PerformanceLane = "book-priced" | "model-signal";

/**
 * Lane is encoded into `modelVersion` because `performance_summaries` has no
 * lane column and its unique key (sport, pickType, tier, modelVersion, period)
 * is schema-frozen. Suffixing the version is the only existing key column that
 * (a) is always non-null, (b) participates in the unique index, and (c) is
 * strip-able on read. Persist writes the encoded form; the page decodes.
 */
export const MODEL_SIGNAL_LANE_SUFFIX = " (model signal)";

export function laneFromBookmakerCount(
  bookmakerCount: number | null | undefined,
): PerformanceLane {
  return (bookmakerCount ?? 0) >= 1 ? "book-priced" : "model-signal";
}

export function encodeLaneModelVersion(
  modelVersion: string,
  lane: PerformanceLane,
): string {
  return lane === "book-priced"
    ? modelVersion
    : `${modelVersion}${MODEL_SIGNAL_LANE_SUFFIX}`;
}

export function decodeLaneModelVersion(stored: string): {
  readonly modelVersion: string;
  readonly lane: PerformanceLane;
} {
  if (stored.endsWith(MODEL_SIGNAL_LANE_SUFFIX)) {
    return {
      modelVersion: stored.slice(0, -MODEL_SIGNAL_LANE_SUFFIX.length),
      lane: "model-signal",
    };
  }
  return { modelVersion: stored, lane: "book-priced" };
}

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
  /**
   * Mint-time book count. >= 1 → book-priced lane; 0/null/absent → model-signal.
   * Absent is treated as 0 so a caller that forgets the field cannot silently
   * promote an unpriced row into the bettable hero.
   */
  readonly bookmakerCount?: number | null;
}

export interface PerformanceSummaryRow {
  readonly sport: string;
  readonly league: string | null;
  readonly pickType: string | null;
  readonly tier: string | null;
  /** May carry MODEL_SIGNAL_LANE_SUFFIX — decode before display. */
  readonly modelVersion: string;
  readonly totalPicks: number;
  readonly wins: number;
  readonly losses: number;
  readonly pushes: number;
  /** Decided picks only: the allow-listed helper keeps pushes out of the denominator, as the site says. */
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

/**
 * Group graded picks into one row per
 * (sport, pickType, tier, modelVersion, period, lane),
 * plus an "all-time" row for every key that has any history.
 *
 * Lane (book-priced vs model-signal) is part of the key so a mixed population
 * cannot average an unbettable signal into the bettable record (C-352). Both
 * lanes are written; the page leads with book-priced and never sums signal
 * into the headline.
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
    lane: PerformanceLane,
  ) => {
    const storedVersion = encodeLaneModelVersion(modelVersion, lane);
    const id = [sport, pickType ?? "", tier ?? "", storedVersion, period].join("|");
    const b =
      buckets.get(id) ??
      { key: { sport, league: null, pickType, tier, modelVersion: storedVersion, period }, wins: 0, losses: 0, pushes: 0 };
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
    if (isInPlayGenerated(row.generatedAt, row.commenceTime)) {
      skipped.inPlay += 1;
      continue;
    }
    if (!row.sport || !row.modelVersion) {
      skipped.unkeyable += 1;
      continue;
    }
    const lane = laneFromBookmakerCount(row.bookmakerCount);
    add(row.sport, row.pickType, row.tier, row.modelVersion, "all-time", row.result, lane);
    const period = periodOf(row.settledAt);
    if (period) add(row.sport, row.pickType, row.tier, row.modelVersion, period, row.result, lane);
  }

  const out: PerformanceSummaryRow[] = [];
  for (const b of buckets.values()) {
    out.push({
      ...b.key,
      totalPicks: b.wins + b.losses + b.pushes,
      wins: b.wins,
      losses: b.losses,
      pushes: b.pushes,
      winRate: winRatePct(b.wins, b.losses) ?? 0,
    });
  }
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