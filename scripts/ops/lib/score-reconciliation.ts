/**
 * Reconcile the final scores we STORED against the finals the source we ingest
 * from is serving right now. Pure: no network, no database, no clock.
 *
 * C-247. On 2026-09-08, 25 of 169 MLB `games` rows marked FINAL held a score
 * that ESPN's own API contradicted, and 54 settled published picks sat on them.
 * 8 published moneyline results were the opposite of what happened. The pattern
 * was that when two teams play on consecutive days, one game's score lands on
 * every fixture in the series.
 *
 * The platform had no standing check for this. It had a detector for the
 * symptom (`SCORE_MISMATCH_CROSS_PATH` in the zero-sit lane) which had produced
 * zero voids, because it only looks at picks it is already about to void. This
 * module is the missing check: compare every stored final against the source,
 * on demand, and say plainly how many disagree.
 *
 * ESPN is not being treated as an outside referee. It is the feed these rows
 * were ingested from and their `externalId` carries its event id, so a
 * disagreement means our stored value diverged from the source we read it out
 * of. That is a statement about us, not about ESPN.
 */

/** A stored game row, narrowed to what a comparison needs. */
export type StoredGame = {
  readonly id: string;
  readonly externalId: string | null;
  readonly commenceTime: Date;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  /** Published picks on this row that already carry a graded result. */
  readonly settledPicks: number;
};

/** A final as the source reports it, keyed by the source's own event id. */
export type SourceFinal = {
  readonly eventId: string;
  readonly homeScore: number;
  readonly awayScore: number;
};

export type ScoreMismatch = {
  readonly gameId: string;
  readonly eventId: string;
  readonly commenceTime: Date;
  readonly matchup: string;
  readonly stored: { readonly home: number; readonly away: number };
  readonly source: { readonly home: number; readonly away: number };
  /** True when the two scores disagree about which side won. */
  readonly winnerDiffers: boolean;
  readonly settledPicks: number;
};

export type ReconciliationReport = {
  /** Rows that carried a stored final AND could be keyed to a source event. */
  readonly compared: number;
  /**
   * Rows with a stored final that could NOT be keyed to a source event, either
   * because the externalId is not the source's or because the source is not
   * serving that event. Reported rather than dropped: a check that silently
   * skips what it cannot see reports a clean bill of health it did not earn.
   */
  readonly uncomparable: number;
  readonly mismatches: readonly ScoreMismatch[];
  /** Settled published picks sitting on a mismatched row. */
  readonly settledPicksAffected: number;
  /** Of those, the ones whose game disagrees about the winner. */
  readonly settledPicksOnWinnerFlip: number;
};

/**
 * The source's event id inside one of our `externalId` values.
 *
 * Rows arrive with more than one scheme for the same event, at least
 * `espn:mlb:401816843` and `espn:baseball_mlb:401816843`, so the sport segment
 * is deliberately ignored and only the trailing id is used. Anything that is
 * not `<source>:<sport>:<id>` returns null and is counted as uncomparable
 * rather than guessed at; a bare content hash is a real example in the data.
 */
export function sourceEventId(externalId: string | null, source = "espn"): string | null {
  if (!externalId) return null;
  const parts = externalId.split(":");
  if (parts.length < 3) return null;
  if (parts[0] !== source) return null;
  const id = parts[parts.length - 1]?.trim();
  return id ? id : null;
}

/** Did the two scorelines disagree about who won? A tie counts as its own outcome. */
function winnerDiffers(sh: number, sa: number, fh: number, fa: number): boolean {
  const ours = Math.sign(sh - sa);
  const theirs = Math.sign(fh - fa);
  return ours !== theirs;
}

/**
 * Compare stored finals against source finals.
 *
 * Only rows that carry BOTH scores are compared. A row with a null score has
 * nothing to contradict and is not a mismatch; it is also not counted as
 * compared, because counting it would inflate the denominator and flatter the
 * result.
 */
export function reconcileScores(
  stored: readonly StoredGame[],
  finals: readonly SourceFinal[],
  source = "espn",
): ReconciliationReport {
  const byEvent = new Map<string, SourceFinal>();
  for (const f of finals) byEvent.set(f.eventId, f);

  let compared = 0;
  let uncomparable = 0;
  const mismatches: ScoreMismatch[] = [];

  for (const g of stored) {
    if (g.homeScore === null || g.awayScore === null) continue;
    const eventId = sourceEventId(g.externalId, source);
    const final = eventId ? byEvent.get(eventId) : undefined;
    if (!eventId || !final) {
      uncomparable++;
      continue;
    }
    compared++;
    if (g.homeScore === final.homeScore && g.awayScore === final.awayScore) continue;
    mismatches.push({
      gameId: g.id,
      eventId,
      commenceTime: g.commenceTime,
      matchup: `${g.homeTeamName} v ${g.awayTeamName}`,
      stored: { home: g.homeScore, away: g.awayScore },
      source: { home: final.homeScore, away: final.awayScore },
      winnerDiffers: winnerDiffers(g.homeScore, g.awayScore, final.homeScore, final.awayScore),
      settledPicks: g.settledPicks,
    });
  }

  return {
    compared,
    uncomparable,
    mismatches,
    settledPicksAffected: mismatches.reduce((n, m) => n + m.settledPicks, 0),
    settledPicksOnWinnerFlip: mismatches
      .filter((m) => m.winnerDiffers)
      .reduce((n, m) => n + m.settledPicks, 0),
  };
}

/** Human-readable report. Returns lines rather than printing, so it is testable. */
export function formatReconciliation(report: ReconciliationReport): string[] {
  const lines: string[] = [];
  lines.push(
    `compared ${report.compared} stored finals against the source; ` +
      `${report.mismatches.length} disagree; ${report.uncomparable} could not be keyed to a source event`,
  );
  if (report.mismatches.length > 0) {
    lines.push(
      `${report.settledPicksAffected} settled published pick(s) sit on the disagreeing rows, ` +
        `${report.settledPicksOnWinnerFlip} of them on a row where the WINNER differs`,
    );
    lines.push("");
    for (const m of [...report.mismatches].sort(
      (a, b) => a.commenceTime.getTime() - b.commenceTime.getTime(),
    )) {
      lines.push(
        `  ${m.commenceTime.toISOString().slice(0, 10)}  ${m.matchup}  ` +
          `stored ${m.stored.home}-${m.stored.away}  source ${m.source.home}-${m.source.away}` +
          `${m.winnerDiffers ? "  WINNER DIFFERS" : ""}` +
          `  settled=${m.settledPicks}  event=${m.eventId}`,
      );
    }
  }
  if (report.uncomparable > 0) {
    lines.push("");
    lines.push(
      `Note: ${report.uncomparable} stored final(s) were not compared at all. ` +
        `They are not evidence of health - the check simply could not see them.`,
    );
  }
  return lines;
}
