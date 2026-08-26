/**
 * Week-1 capture posture — the L-14 detector.
 *
 * L-14 measured "NFL last odds snapshot 2026-06-17, ZERO clean closes, 84
 * future NFL games with no odds attached" — and nothing on any surface said so
 * while it was happening, because the ops truth surface reports only the LAST
 * odds insert across ALL sports. A live MLB slate inserting every 15 minutes
 * makes a total NFL blackout look perfectly healthy.
 *
 * This classifies NFL capture on its own terms, and separately reports whether
 * the line archive is armed. The two failures are independent: odds can be
 * landing while CLOSE stamping is inert, in which case the board looks fine and
 * the closing lines — the thing a CLV track is actually built on — are being
 * silently discarded. Neither is recoverable after kickoff.
 */

export type NflCaptureState = "LIVE" | "QUIET" | "DARK";

export interface Week1CaptureInput {
  readonly nflOddsRowsLastHour: number;
  readonly nflOddsRowsLast24h: number;
  readonly lineArchiveEnabled: boolean;
  readonly closeStampedLast7d: number;
}

export interface Week1CapturePosture {
  readonly state: NflCaptureState;
  /** True only when the archive is armed AND odds are actually landing. */
  readonly week1Recoverable: boolean;
  readonly hint: string;
}

export function classifyWeek1Capture(input: Week1CaptureInput): Week1CapturePosture {
  const { nflOddsRowsLastHour, nflOddsRowsLast24h, lineArchiveEnabled, closeStampedLast7d } = input;

  const state: NflCaptureState =
    nflOddsRowsLastHour > 0 ? "LIVE" : nflOddsRowsLast24h > 0 ? "QUIET" : "DARK";

  const hints: string[] = [];
  if (state === "LIVE") {
    hints.push(`NFL capture LIVE — ${nflOddsRowsLastHour} odds row(s) in the last hour.`);
  } else if (state === "QUIET") {
    hints.push(
      `NFL capture QUIET — 0 rows in the last hour but ${nflOddsRowsLast24h} in 24h. Expected off-cycle; investigate if it persists past one refresh SLA.`,
    );
  } else {
    hints.push(
      "NFL capture DARK — 0 odds rows in 24h. This is the L-14 failure signature; check SEASON_WINDOWS, quota and the refresh cron before Week 1.",
    );
  }

  if (!lineArchiveEnabled) {
    hints.push(
      "LINE_ARCHIVE_ENABLED is OFF — OPEN/INTERIM/CLOSE snapshots are NOT being written. Week-1 closing lines are unrecoverable after kickoff. Founder flip required.",
    );
  } else if (closeStampedLast7d === 0) {
    hints.push(
      "Archive ON but 0 CLOSE-stamped rows in 7d — markClosingSnapshots runs at settle time, so this is expected until the first settle after a captured game.",
    );
  }

  return {
    state,
    // DARK odds or an inert archive each independently mean Week 1 is not being
    // captured in a form that can be reconstructed later.
    week1Recoverable: state !== "DARK" && lineArchiveEnabled,
    hint: hints.join(" "),
  };
}
