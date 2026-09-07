/**
 * Selection for the three CORRUPTED-GRADE pick populations.
 *
 * These are distinct from the stale-PENDING population that
 * `stale-pending-picks-selection.ts` owns. Those rows were never graded; these
 * were graded, published, and are wrong — each for a different reason, each
 * with its code defect already fixed forward, and each with rows still live in
 * the database that the fix does not retroactively repair.
 *
 * The action is always the same and always the narrowest one available:
 * `isPublished = false`. Nothing is deleted, no `result` is rewritten, no game
 * row is touched. Rationale, recorded so it is not re-litigated:
 *
 *   - UNPUBLISH withdraws a claim the product cannot support. It asserts
 *     nothing new, which matters because for C-114 we do not know the true
 *     outcome and must not pretend to.
 *   - VOID would assert "this bet was voided", which is a result claim, and the
 *     settlement outbox owns the PickSettlementEvent contract — a VOID has to
 *     be written through that lane, not by a script.
 *   - REVERT TO PENDING is actively unsafe for C-114: SCORE_MISMATCH_CROSS_PATH
 *     refuses to overwrite an existing final with a different one, so a phantom
 *     score written before kickoff STUCK on the game row. Re-grading would
 *     re-derive the same wrong answer from the same wrong number.
 *
 * `isPublished` is also the field `CANONICAL_LEARNING_PICK_WHERE`
 * (apps/web/lib/ops/compute-live-calibration-metrics.ts) filters on, so
 * unpublishing removes a row from the calibration sample. That is the point for
 * C-114: an outcome nobody observed is not evidence, and a calibration figure
 * computed partly on fabricated outcomes is not a measurement. Which DIRECTION
 * that moves the published ECE is not a reason to run or not run this — the
 * rows are either evidence or they are not.
 */

import type { Prisma } from "@prisma/client";

export type CorruptedPopulation =
  | "settled-before-kickoff"
  | "soccer-two-way-ml"
  | "mlb-off-runline";

export const CORRUPTED_POPULATIONS: readonly CorruptedPopulation[] = [
  "settled-before-kickoff",
  "soccer-two-way-ml",
  "mlb-off-runline",
];

/** The run line ladder a book actually offers. Mirrors BASEBALL_RUN_LINES. */
export const MLB_RUN_LINES: readonly number[] = [1.5, 2.5, 3.5];
export const RUN_LINE_EPSILON = 1e-9;

export function isOnRunLineLadder(line: number): boolean {
  if (!Number.isFinite(line)) return false;
  const abs = Math.abs(line);
  return MLB_RUN_LINES.some((valid) => Math.abs(abs - valid) < RUN_LINE_EPSILON);
}

export type CorruptedPickRow = {
  readonly id: string;
  readonly gameId: string;
  readonly pickType: string;
  readonly selection: string;
  readonly line: number | null;
  readonly result: string;
  readonly settledAt: Date | null;
  readonly commenceTime: Date;
  readonly sportKey: string;
  readonly modelVersion: string | null;
};

/** Human-readable justification, printed per row so a reviewer can check it. */
export function reasonFor(population: CorruptedPopulation, row: CorruptedPickRow): string {
  switch (population) {
    case "settled-before-kickoff": {
      const hours =
        row.settledAt === null
          ? "unknown"
          : ((row.commenceTime.getTime() - row.settledAt.getTime()) / 3_600_000).toFixed(1);
      return `graded ${hours}h BEFORE kickoff, against a score nobody observed`;
    }
    case "soccer-two-way-ml":
      return "two-way moneyline on a three-way market: wrong by construction (a draw is unpriced)";
    case "mlb-off-runline":
      return `run line ${row.line ?? "null"} is not on the 1.5/2.5/3.5 ladder: no book offers it, so the bet cannot be placed`;
  }
}

/**
 * Prisma `where` per population. Exported separately from the query so it can
 * be asserted in a test without a database.
 */
export function whereFor(population: CorruptedPopulation): Prisma.PickWhereInput {
  const base = { isPublished: true };
  switch (population) {
    case "settled-before-kickoff":
      // Cannot be expressed as a column comparison in Prisma's filter language,
      // so the caller narrows in SQL/in memory. This where is the safe superset.
      //
      // VOID is excluded, and that exclusion is load-bearing rather than tidy.
      // A postponed fixture settles VOID with no score (free-settlement.ts,
      // POSTPONED_OR_CANCELLED) and the fixture is then RESCHEDULED, which moves
      // commenceTime later than the settlement that was correct when it was
      // written. `settledAt < commenceTime` therefore describes a perfectly
      // valid VOID as well as a C-114 phantom grade, and withdrawing the former
      // would delete a true result from public history (Devin Review, #719).
      // C-114 is about grading against a score nobody observed, which always
      // produces a W/L/PUSH — never a VOID.
      return { ...base, settledAt: { not: null }, result: { not: "VOID" } };
    case "soccer-two-way-ml":
      return { ...base, pickType: "MONEYLINE", game: { sport: { key: { startsWith: "soccer" } } } };
    case "mlb-off-runline":
      return { ...base, pickType: "SPREAD", game: { sport: { key: "baseball_mlb" } } };
  }
}

/**
 * In-memory narrowing applied AFTER the query, for the predicates Prisma cannot
 * express. Keeping it here rather than in the CLI is what makes it testable.
 */
export function narrow(
  population: CorruptedPopulation,
  rows: readonly CorruptedPickRow[],
): CorruptedPickRow[] {
  switch (population) {
    case "settled-before-kickoff":
      return rows.filter(
        (r) =>
          r.settledAt !== null &&
          r.settledAt.getTime() < r.commenceTime.getTime() &&
          // Mirrors whereFor: a rescheduled postponement is not corruption.
          r.result !== "VOID",
      );
    case "soccer-two-way-ml":
      return rows.filter((r) => r.sportKey.startsWith("soccer") && r.pickType === "MONEYLINE");
    case "mlb-off-runline":
      return rows.filter(
        (r) =>
          r.sportKey === "baseball_mlb" &&
          r.pickType === "SPREAD" &&
          r.line !== null &&
          !isOnRunLineLadder(r.line),
      );
  }
}

export function summarize(
  population: CorruptedPopulation,
  rows: readonly CorruptedPickRow[],
): Record<string, unknown> {
  return {
    population,
    count: rows.length,
    byMarket: rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.pickType] = (acc[r.pickType] ?? 0) + 1;
      return acc;
    }, {}),
    graded: rows.filter((r) => r.result !== "PENDING").length,
    pickIds: rows.map((r) => r.id),
  };
}
