/**
 * The in-play exclusion, in ONE place (C-298 sample, C-302 public readers).
 *
 * A pick generated at or after its game's commenceTime was priced off a LIVE
 * line: the "publish-time" probability it carries already encodes part of the
 * outcome that the pick is then graded against. Scoring such a row is a
 * look-ahead, so it is counted and never scored.
 *
 * C-298 applied this to the eligibility sample and C-299 stopped the generator
 * from minting new ones, but the public readers did not apply it — so with
 * PRICES/PERFORMANCE live, a look-ahead row still moved a published number.
 * C-302 is that gap. This module exists so the rule has exactly one definition
 * and the sample and the public surfaces cannot drift apart again.
 *
 * Semantics, deliberately: absent or unparseable timestamps mean "cannot tell",
 * and the row is KEPT. Dropping a row on a missing timestamp would silently
 * shrink every published denominator by however much the data happened to be
 * incomplete, which is the defect class this repo keeps re-finding.
 */

export interface InPlayCandidate {
  readonly generatedAt: Date | null | undefined;
  readonly commenceTime: Date | null | undefined;
}

/** True only when both timestamps are known and the pick was generated at/after kickoff. */
export function isInPlayGenerated(
  generatedAt: Date | null | undefined,
  commenceTime: Date | null | undefined,
): boolean {
  const g = generatedAt?.getTime();
  const c = commenceTime?.getTime();
  if (g == null || c == null || !Number.isFinite(g) || !Number.isFinite(c)) return false;
  return g >= c;
}

export interface InPlayPartition<T> {
  /** Rows eligible to be scored: pre-game picks, plus any row whose clocks cannot be read. */
  readonly scored: readonly T[];
  readonly excludedInPlay: readonly T[];
}

/**
 * Split rows into what may be scored and what was generated in-play.
 * `read` returns the two clocks for a row; a null on either keeps the row.
 */
export function partitionInPlay<T>(
  rows: readonly T[],
  read: (row: T) => InPlayCandidate,
): InPlayPartition<T> {
  const scored: T[] = [];
  const excludedInPlay: T[] = [];
  for (const row of rows) {
    const { generatedAt, commenceTime } = read(row);
    if (isInPlayGenerated(generatedAt, commenceTime)) excludedInPlay.push(row);
    else scored.push(row);
  }
  return { scored, excludedInPlay };
}

/**
 * The one sentence every surface carrying this exclusion prints. Written once so
 * the sample, the panel and the tail monitor cannot describe the same exclusion
 * three different ways — and so the number is always stated WITH its denominator.
 */
export function inPlayExclusionNote(excludedInPlay: number, population: number): string {
  if (population <= 0) return "No settled rows in this population; nothing to exclude as in-play.";
  if (excludedInPlay <= 0) {
    return `Excluded 0 of ${population} settled rows as in-play (none was generated at or after kickoff).`;
  }
  return (
    `Excluded ${excludedInPlay} of ${population} settled rows as in-play: ` +
    `they were generated at or after their game's kickoff, so the price they carry is a live price ` +
    `that already encodes part of the outcome. Counted here, never scored (C-298 sample, C-302 readers).`
  );
}
