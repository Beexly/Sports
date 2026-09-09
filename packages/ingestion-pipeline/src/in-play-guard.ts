/**
 * Kickoff guard — a pick is a claim made BEFORE the game, or it is not a pick.
 *
 * Both generation paths already refuse a game the day's free ESPN scoreboard
 * reports as under way (`event_already_started`, fixture-confirmation.ts). That
 * guard reads ONE clock: the scoreboard's listed kickoff. It cannot help when
 * the board's clock and ours disagree — a provisional or stale listing whose
 * kickoff still reads in the future, or a same-teams match onto a later event —
 * and in those cases a game that has already started by our own row's clock is
 * confirmed and priced.
 *
 * Measured consequence (read-only production SQL, 2026-09-09): 113 of 477
 * settled moneyline picks carry `generatedAt >= games.commenceTime`. One of
 * them, "Minnesota Twins ML (-1771)", was generated at 02:03Z on a game that
 * started at 01:40Z, off in-play quotes between -1000 and -3335, and froze a
 * proof receipt at marketFairProb 0.884. The Padres came back and won. A
 * receipt is a pre-result commitment; one minted off a live price is not that,
 * whatever the number says.
 *
 * So this is the second clock, and it is ours: whatever the scoreboard says,
 * a game whose EFFECTIVE kickoff is not strictly in the future gets no new
 * pick and no rewrite of an existing one.
 *
 * "Effective" matters. The row's own `commenceTime` is not automatically the
 * truth: `commenceTimeCorrection` exists because a stale row can carry a wrong
 * clock that ESPN corrects, and refusing on the raw row value would suppress
 * legitimate games whose stored kickoff is merely out of date. Callers pass the
 * kickoff they actually priced against — the corrected one where a correction
 * was persisted, the row's otherwise — which is the same value the scorer and
 * the receipt see.
 *
 * Pure: no I/O, no ambient clock.
 */

/**
 * Has this kickoff arrived (or passed) as of `now`?
 *
 * Exactly `kickoff <= now` — no pre-kickoff buffer. A game five minutes out is
 * still a legitimate pre-game claim, and inventing a cushion here would
 * suppress real picks on a threshold nobody chose.
 *
 * An unparseable kickoff answers TRUE. Fail-closed is the only safe default on
 * a path that mints an immutable receipt: a date we cannot read is not evidence
 * that the game is still ahead.
 */
export function hasKickedOff(kickoff: Date, now: Date): boolean {
  const t = kickoff?.getTime?.();
  if (typeof t !== "number" || !Number.isFinite(t)) return true;
  const n = now.getTime();
  if (!Number.isFinite(n)) return true;
  return t <= n;
}

/** One log line naming the clock that refused, for the run's own record. */
export function inPlaySkipLine(gameId: string, kickoff: Date, now: Date): string {
  const kickoffText = Number.isFinite(kickoff?.getTime?.()) ? kickoff.toISOString() : "unparseable";
  return (
    `in-play, no pick: game ${gameId} kickoff ${kickoffText} is not after the run clock ` +
    `${now.toISOString()} — a pick is a pre-game claim`
  );
}
