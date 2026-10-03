/**
 * Pure score-pair fill rules for game merges (extracted from
 * scripts/ops/merge-duplicate-games.ts so they are unit-testable without
 * touching the database or executing the migration).
 *
 * Doctrine: a final is a PAIR from one row, never a home score from one alias
 * and an away score from another (that would grade picks against a result no
 * feed ever reported).
 */

/** The subset of the Game row these rules read or write. */
export interface MergeScoreRow {
  readonly status: string;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
}

/**
 * Canonical fill: scores are the exception to per-field filling. The pair is
 * copied only from an alias that is FINAL with both sides present, and it
 * carries the terminal status with it so the canonical does not end up with a
 * full score and a SCHEDULED status.
 *
 * The canonical qualifies for a fill when EITHER side is null (`||`): a
 * partial pair (home set, away null) is not a valid final and used to be
 * blocked from filling forever by a `&&` (C-67, 2026-09-03 dual-audit). A
 * complete canonical pair is never touched.
 */
export function canonicalScoreFill(
  canonical: MergeScoreRow,
  aliases: readonly MergeScoreRow[],
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  if (canonical.homeScore == null || canonical.awayScore == null) {
    const source = aliases.find(
      (alias) => alias.status === "FINAL" && alias.homeScore != null && alias.awayScore != null,
    );
    if (source) {
      data["homeScore"] = source.homeScore;
      data["awayScore"] = source.awayScore;
      if (canonical.status !== "FINAL") data["status"] = "FINAL";
    }
  }
  return data;
}

/**
 * Alias grade fill: copy the canonical's terminal score onto the alias ONLY
 * when the alias has neither score yet (a partial alias pair stays partial —
 * the merge must never invent the missing half).
 */
export function aliasScoreFill(
  canonical: MergeScoreRow,
  alias: MergeScoreRow,
): Record<string, unknown> {
  if (alias.homeScore != null || alias.awayScore != null) return {};
  if (canonical.homeScore == null || canonical.awayScore == null) return {};
  return {
    status: canonical.status,
    homeScore: canonical.homeScore,
    awayScore: canonical.awayScore,
  };
}
