/**
 * Settle-time line-archive CLOSE stamp for the free settlement lanes (C-95).
 *
 * Until 2026-09-08 the paid grader (packages/ingestion-pipeline/src/settle-sport.ts)
 * was the ONLY caller of `markClosingSnapshotsIfEnabled`, so a pick graded by
 * the free ESPN grader or the stale backfill never had its last pre-kickoff
 * snapshot re-tagged CLOSE, and the CLV ledger for those picks had no close to
 * grade against. Both free lanes now stamp through this one helper, AFTER the
 * settlement transaction has committed, exactly as the paid lane does:
 *
 *   - after commit, never inside the transaction: a failed statement inside an
 *     interactive Postgres transaction aborts it, and a line tag must never cost
 *     a grade;
 *   - hard-gated on LINE_ARCHIVE_ENABLED=true inside the callee (zero DB calls
 *     otherwise);
 *   - never throws: grading a pick matters more than tagging a line.
 */

import {
  markClosingSnapshotsIfEnabled,
  type MarkClosingSnapshotsIfEnabledResult,
} from "@sports/ingestion-pipeline";

export async function stampClosingLinesAfterSettle(
  dbArg: unknown,
  gameId: string,
  kickoff: Date,
  logPrefix: string,
): Promise<MarkClosingSnapshotsIfEnabledResult> {
  try {
    const result = await markClosingSnapshotsIfEnabled(dbArg, gameId, kickoff);
    if (result.enabled && result.error) {
      console.warn(`${logPrefix} markClosingSnapshots failed for ${gameId}: ${result.error}`);
    }
    return result;
  } catch (archiveErr) {
    // The callee already swallows its own errors; this guards a future edit to
    // it, so a settlement lane can never be failed by the archive.
    console.warn(
      `${logPrefix} markClosingSnapshots failed for ${gameId}: ` +
        `${archiveErr instanceof Error ? archiveErr.message : archiveErr}`,
    );
    return { enabled: true, updated: 0, error: archiveErr instanceof Error ? archiveErr.message : String(archiveErr) };
  }
}
