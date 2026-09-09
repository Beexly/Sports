/**
 * Pure logic for scripts/ops/regrade-against-book-lines.ts (C-273; ledger
 * C-197 / C-270 / C-271). No Prisma import, no DATABASE_URL, no I/O — so it
 * typechecks and unit-tests without a database.
 *
 * WHAT THIS ANSWERS. For a settled published SPREAD/TOTAL pick whose stored
 * line is off the half-point grid, what result would the pick have taken if it
 * had been graded against a line a book actually quoted at publish time, and
 * does that differ from the result on record?
 *
 * WHAT IT DELIBERATELY DOES NOT PRODUCE. A corrected hit rate, anywhere. The
 * per-market difference counts below say how many recorded results a book-line
 * grade would change; turning that into a win percentage would be publishing a
 * performance claim off a grading policy nobody has approved, which is the
 * exact thing ledger C-197 exists to prevent. The caller prints counts.
 *
 * RESOLVER ORDER, mirroring the calibration loader (C-253 / C-110,
 * apps/web/lib/calibration/publish-time-market-p.ts): consider only REAL
 * bookmakers, and for each one take its LATEST row at or before the pick's
 * generatedAt. A line a book posted after we published cannot justify what we
 * published, and a book's older snapshot is superseded by its newer one.
 *
 * WHICH of those book lines is "the" book line is a REPORTING CHOICE, stated
 * here rather than buried: the MODAL line, the one the most books quoted, ties
 * broken toward the line nearest the stored value (the reading most favourable
 * to the record on file, so a reported difference is never an artifact of
 * picking the least favourable rung). It is not an approved grading policy and
 * nothing in the product grades against it.
 */

export type RegradeOddsRow = {
  readonly bookmaker: string;
  readonly fetchedAt: Date;
  /** The line this row quotes in the pick's unit (points): spread or total. */
  readonly line: number | null;
};

export type RegradePickRow = {
  readonly id: string;
  readonly gameId: string;
  readonly pickType: string;
  readonly selection: string;
  readonly line: number;
  readonly clvLockLine: number | null;
  readonly result: string;
  readonly generatedAt: Date;
  readonly sportKey: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
};

/** Bookmaker keys with no book identity (mirrors NON_BOOK_BOOKMAKER_KEYS). */
export const NON_BOOK_BOOKMAKER_KEYS: ReadonlySet<string> = new Set(["rundown_default"]);

export function isRealBookmakerKey(key: string | null | undefined): key is string {
  if (typeof key !== "string") return false;
  const trimmed = key.trim();
  if (trimmed.length === 0) return false;
  return !NON_BOOK_BOOKMAKER_KEYS.has(trimmed);
}

/**
 * The latest row per real bookmaker at or before `asOf`. Deterministic: rows
 * are sorted newest first, then by bookmaker and line, so a tie in fetchedAt
 * resolves the same way on every run.
 */
export function latestLinePerBookmaker(
  rows: readonly RegradeOddsRow[],
  asOf: Date,
): RegradeOddsRow[] {
  const eligible = rows
    .filter((r) => isRealBookmakerKey(r.bookmaker) && r.line !== null && Number.isFinite(r.line))
    .filter((r) => r.fetchedAt.getTime() <= asOf.getTime())
    .sort((a, b) => {
      const dt = b.fetchedAt.getTime() - a.fetchedAt.getTime();
      if (dt !== 0) return dt;
      const dk = a.bookmaker.localeCompare(b.bookmaker);
      if (dk !== 0) return dk;
      return (a.line ?? 0) - (b.line ?? 0);
    });
  const latest = new Map<string, RegradeOddsRow>();
  for (const row of eligible) {
    const key = row.bookmaker.trim();
    if (!latest.has(key)) latest.set(key, row);
  }
  return [...latest.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, row]) => row);
}

export type BookLineResolution = {
  /** The modal quoted line, or null when no real book quoted one by generatedAt. */
  readonly bookLine: number | null;
  /** How many real books quoted at all. */
  readonly bookCount: number;
  /** How many of them quoted `bookLine`. */
  readonly modalCount: number;
};

/** Modal line across the latest-per-book set; ties go to the line nearest `storedLine`. */
export function resolveBookLine(
  rows: readonly RegradeOddsRow[],
  asOf: Date,
  storedLine: number,
): BookLineResolution {
  const books = latestLinePerBookmaker(rows, asOf);
  if (books.length === 0) return { bookLine: null, bookCount: 0, modalCount: 0 };

  const counts = new Map<number, number>();
  for (const b of books) counts.set(b.line!, (counts.get(b.line!) ?? 0) + 1);

  let bestLine = books[0]!.line!;
  let bestCount = 0;
  for (const [line, count] of [...counts.entries()].sort((a, b) => a[0] - b[0])) {
    if (count > bestCount) {
      bestLine = line;
      bestCount = count;
      continue;
    }
    if (count === bestCount && Math.abs(line - storedLine) < Math.abs(bestLine - storedLine)) {
      bestLine = line;
    }
  }
  return { bookLine: bestLine, bookCount: books.length, modalCount: counts.get(bestLine) ?? 0 };
}

/** The stored value the settlement lanes actually grade against (the no-drift rule). */
export function gradingLineOf(pick: Pick<RegradePickRow, "clvLockLine" | "line">): number {
  return pick.clvLockLine ?? pick.line;
}

export function isOffHalfPointGrid(line: number): boolean {
  if (!Number.isFinite(line)) return true;
  const doubled = Math.abs(line) * 2;
  return Math.abs(doubled - Math.round(doubled)) > 1e-9;
}

export type RegradeVerdict =
  | { readonly status: "no_book_line" }
  | { readonly status: "no_final" }
  | {
      readonly status: "compared";
      readonly storedLine: number;
      readonly bookLine: number;
      readonly bookCount: number;
      readonly modalCount: number;
      readonly storedResult: string;
      readonly bookResult: string;
      readonly differs: boolean;
    };

/** Injected so this module never imports the engine's Prisma-adjacent types. */
export type CalculateResultFn = (
  pickType: "SPREAD" | "TOTAL",
  selection: string,
  line: number,
  homeTeam: string,
  homeScore: number,
  awayScore: number,
  sportKey: string,
  awayTeam: string,
) => string;

export function regradeOne(
  pick: RegradePickRow,
  oddsRows: readonly RegradeOddsRow[],
  calculateResult: CalculateResultFn,
): RegradeVerdict {
  if (pick.homeScore === null || pick.awayScore === null) return { status: "no_final" };
  if (pick.pickType !== "SPREAD" && pick.pickType !== "TOTAL") return { status: "no_final" };

  const storedLine = gradingLineOf(pick);
  const resolved = resolveBookLine(oddsRows, pick.generatedAt, storedLine);
  if (resolved.bookLine === null) return { status: "no_book_line" };

  const bookResult = calculateResult(
    pick.pickType,
    pick.selection,
    resolved.bookLine,
    pick.homeTeamName,
    pick.homeScore,
    pick.awayScore,
    pick.sportKey,
    pick.awayTeamName,
  );
  return {
    status: "compared",
    storedLine,
    bookLine: resolved.bookLine,
    bookCount: resolved.bookCount,
    modalCount: resolved.modalCount,
    storedResult: pick.result,
    bookResult,
    differs: bookResult !== pick.result,
  };
}

export type RegradeBucket = {
  sportKey: string;
  pickType: string;
  /** Off-grid settled published picks examined. */
  examined: number;
  /** Of those, how many had a real book line at or before generatedAt. */
  compared: number;
  /** Of those, how many had NO book line: reported as NONE, never regraded. */
  noBookLine: number;
  /** Of the compared ones, how many results a book-line grade would change. */
  differs: number;
};

export type RegradeReport = {
  readonly examined: number;
  readonly compared: number;
  readonly noBookLine: number;
  readonly noFinal: number;
  readonly differs: number;
  readonly buckets: RegradeBucket[];
};

/** Aggregate. Pure: same input, same report. */
export function buildRegradeReport(
  rows: ReadonlyArray<{ pick: RegradePickRow; verdict: RegradeVerdict }>,
): RegradeReport {
  const buckets = new Map<string, RegradeBucket>();
  const report = { examined: 0, compared: 0, noBookLine: 0, noFinal: 0, differs: 0 };
  for (const { pick, verdict } of rows) {
    const key = `${pick.sportKey}|${pick.pickType}`;
    const bucket = buckets.get(key) ?? {
      sportKey: pick.sportKey,
      pickType: pick.pickType,
      examined: 0,
      compared: 0,
      noBookLine: 0,
      differs: 0,
    };
    bucket.examined += 1;
    report.examined += 1;
    if (verdict.status === "no_final") {
      report.noFinal += 1;
    } else if (verdict.status === "no_book_line") {
      bucket.noBookLine += 1;
      report.noBookLine += 1;
    } else {
      bucket.compared += 1;
      report.compared += 1;
      if (verdict.differs) {
        bucket.differs += 1;
        report.differs += 1;
      }
    }
    buckets.set(key, bucket);
  }
  return {
    ...report,
    buckets: [...buckets.values()].sort(
      (a, b) => b.examined - a.examined || a.sportKey.localeCompare(b.sportKey),
    ),
  };
}

/** Every flag this tool refuses. It is report-only and has no write mode. */
export const FORBIDDEN_WRITE_FLAGS = ["--execute", "--write", "--apply", "--fix", "--regrade"] as const;

export function refusedWriteFlag(argv: readonly string[]): string | null {
  return FORBIDDEN_WRITE_FLAGS.find((f) => argv.includes(f)) ?? null;
}
