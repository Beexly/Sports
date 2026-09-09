/**
 * ONE rule for whether a pick's CLV verdict may be presented, and one place to
 * change it (C-279; ledger C-197 / C-282 / C-278, Devin Review #733 round 6).
 *
 * CLV is a claim about a bet that STOOD: "we beat the close" only means
 * anything if the pick was live at the close. A pick withdrawn to VOID — by the
 * line-integrity lane or any other lane — has no such bet, so its verdict must
 * not appear in any sample, ledger, aggregate or explainer.
 *
 * WHY A SHARED MODULE RATHER THAN A FILTER PER CALLER. Round 4 fixed the public
 * policy and the grading drain; round 6 then found the identical defect still
 * live on the Elite member ledger, because the rule existed in two files and
 * not in a third. This module is the third file's answer and every future
 * reader's: import the filter at a QUERY boundary, or the predicate at a
 * SHAPING boundary, and the rule cannot be half-applied again.
 *
 * WHAT THIS DOES NOT DO. It never erases a stored `clvVerdict`. The verdict is
 * settlement history and stays on the row; this module governs READING it. A
 * surface whose job is to show the record (proof of record) therefore keeps the
 * withdrawn pick visible and blanks only its CLV claim.
 */

/** The result that withdraws a pick, and with it any CLV claim. */
export const CLV_WITHDRAWN_RESULT = "VOID" as const;

/**
 * Prisma `where` fragment for the `result` column at a QUERY boundary.
 *
 * Spread it into the where clause of anything that counts, lists or aggregates
 * graded CLV. Callers that already restrict to an explicit outcome set
 * (`{ in: ["WIN", "LOSS", "PUSH"] }`) are narrower still and need nothing.
 */
export const CLV_SAMPLE_RESULT_FILTER = { not: CLV_WITHDRAWN_RESULT } as const;

/**
 * SHAPING boundary: may this row present a CLV verdict as a live claim?
 *
 * Use where a row has already been loaded — a renderer, a serializer, an LLM
 * grounding block — and the query could not be narrowed (or deliberately was
 * not, as on the proof-of-record board).
 */
export function carriesLiveClvClaim(result: string | null | undefined): boolean {
  return result !== CLV_WITHDRAWN_RESULT;
}

/**
 * Blank the CLV fields of a withdrawn pick while leaving everything else — and
 * the stored row — untouched. For surfaces that must still show the pick.
 */
export function withdrawnClvStripped<
  T extends { result: string; clvVerdict: string | null; clvValue: number | null },
>(row: T): T {
  if (carriesLiveClvClaim(row.result)) return row;
  return { ...row, clvVerdict: null, clvValue: null };
}
