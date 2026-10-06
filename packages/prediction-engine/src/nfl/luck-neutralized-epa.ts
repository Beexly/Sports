// Adapted from dgrifka/luck-neutralized-epa (MIT) — methodology re-implemented for GSE.
/**
 * W5 — Luck-neutralized EPA.
 *
 * Adjusts EPA for high-variance outcomes (fumble recoveries, tipped INTs,
 * missed FGs) so team strength reflects process quality, not coin-flip luck.
 * `deserveToWin` replays a game with neutralized EPA and returns a
 * win-probability distribution.
 *
 * COMPOSES WITH: nflverse-cache (play inputs).
 */

export interface PlayInput {
  readonly playId: string;
  readonly gameId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly offenseTeam: string;
  /** EPA on the play as charted. Null → missing, never imputed. */
  readonly epa: number | null;
  readonly playType:
    | "pass"
    | "run"
    | "field_goal"
    | "punt"
    | "kickoff"
    | "extra_point"
    | "two_point"
    | "other";
  readonly fumble: boolean;
  readonly fumbleRecoveredByOwnTeam: boolean;
  readonly interception: boolean;
  /** True when the INT was tipped at the line or off a receiver's hands. */
  readonly tippedInterception: boolean;
  readonly fieldGoal: boolean;
  readonly fieldGoalMade: boolean;
  readonly fieldGoalDistance: number | null;
  /** Win probability before the play (0–1). Null → unknown. */
  readonly wpBefore: number | null;
}

export interface NeutralizedPlay {
  readonly playId: string;
  readonly originalEpa: number | null;
  readonly neutralizedEpa: number | null;
  readonly adjustment: number;
  readonly reason: string;
}

export interface GameInput {
  readonly gameId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly plays: readonly PlayInput[];
}

export interface DeserveToWinResult {
  readonly gameId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  /** Neutralized EPA totals per team. */
  readonly homeEpa: number;
  readonly awayEpa: number;
  /** Win-probability distribution over neutralized outcomes. */
  readonly pHomeWin: number;
  readonly pAwayWin: number;
  readonly pTie: number;
  readonly playsUsed: number;
  readonly playsSkipped: number;
}

/**
 * Neutralize a single play's EPA for known high-variance events.
 *
 * Rules (adapted from dgrifka methodology):
 * - Fumble recovered by offense: remove the positive EPA swing beyond expectation.
 * - Fumble recovered by defense: remove the negative EPA swing beyond expectation.
 * - Tipped INT: replace with a league-average incompletion EPA.
 * - Missed FG: replace with a modest negative EPA (process ok, outcome bad).
 * - Made FG at distance: leave EPA as-is (skill, not luck).
 *
 * Missing EPA stays null — never imputed.
 */
export function neutralize(play: PlayInput | null | undefined): NeutralizedPlay {
  if (!play || !Number.isFinite(play.epa as number) || play.epa === null) {
    return {
      playId: play?.playId ?? "unknown",
      originalEpa: play?.epa ?? null,
      neutralizedEpa: null,
      adjustment: 0,
      reason: "missing EPA — not neutralized (fail-closed null)",
    };
  }

  const original = play.epa;

  // Tipped INT: outcome is mostly luck; replace with average incompletion EPA
  if (play.interception && play.tippedInterception) {
    const neutral = -0.25;
    return {
      playId: play.playId,
      originalEpa: original,
      neutralizedEpa: Number(neutral.toFixed(4)),
      adjustment: Number((neutral - original).toFixed(4)),
      reason: "tipped INT replaced with incompletion EPA (-0.25)",
    };
  }

  // Missed FG: process was fine, outcome was variance
  if (play.fieldGoal && !play.fieldGoalMade) {
    const distance = play.fieldGoalDistance ?? 40;
    // Expected miss cost scales mildly with distance
    const neutral = distance > 50 ? -0.35 : -0.25;
    return {
      playId: play.playId,
      originalEpa: original,
      neutralizedEpa: Number(neutral.toFixed(4)),
      adjustment: Number((neutral - original).toFixed(4)),
      reason: `missed FG (${distance}yd) replaced with expected miss EPA (${neutral})`,
    };
  }

  // Fumble: strip the extreme swing, keep expected play value
  if (play.fumble) {
    // Expected fumble-play EPA without the recovery bounce
    const expected = play.fumbleRecoveredByOwnTeam ? 0.05 : -0.35;
    return {
      playId: play.playId,
      originalEpa: original,
      neutralizedEpa: Number(expected.toFixed(4)),
      adjustment: Number((expected - original).toFixed(4)),
      reason: `fumble (recovered ${play.fumbleRecoveredByOwnTeam ? "own" : "opp"}) neutralized to expected EPA ${expected}`,
    };
  }

  return {
    playId: play.playId,
    originalEpa: original,
    neutralizedEpa: Number(original.toFixed(4)),
    adjustment: 0,
    reason: "no luck event — EPA kept",
  };
}

/**
 * Replay a game with neutralized EPA and return a deserve-to-win
 * probability distribution. Teams that "deserve" to win accumulate more
 * neutralized EPA — this is process quality, not scoreboard luck.
 *
 * Uses a logistic mapping from EPA margin to win probability, with a small
 * tie mass to reflect the discreteness of a single game.
 */
export function deserveToWin(game: GameInput | null | undefined): DeserveToWinResult {
  if (!game || !Array.isArray(game.plays)) {
    throw new Error("deserveToWin: game with plays array is required");
  }

  let homeEpa = 0;
  let awayEpa = 0;
  let playsUsed = 0;
  let playsSkipped = 0;

  for (const p of game.plays) {
    const n = neutralize(p);
    if (n.neutralizedEpa === null) {
      playsSkipped += 1;
      continue;
    }
    if (p.offenseTeam === game.homeTeam) homeEpa += n.neutralizedEpa;
    else if (p.offenseTeam === game.awayTeam) awayEpa += n.neutralizedEpa;
    else {
      playsSkipped += 1;
      continue;
    }
    playsUsed += 1;
  }

  const margin = homeEpa - awayEpa;
  // Logistic strength: scale ~0.55 EPA points per log-odds unit
  const z = margin / 0.55;
  const pHomeNoTie = 1 / (1 + Math.exp(-z));
  // Small tie mass (OT-less regulation ties are rare in NFL but present in NCAA)
  const tieMass = 0.02;
  const pHomeWin = (1 - tieMass) * pHomeNoTie;

  return {
    gameId: game.gameId,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    homeEpa: Number(homeEpa.toFixed(4)),
    awayEpa: Number(awayEpa.toFixed(4)),
    pHomeWin: Number(pHomeWin.toFixed(4)),
    pAwayWin: Number((1 - tieMass - pHomeWin).toFixed(4)),
    pTie: tieMass,
    playsUsed,
    playsSkipped,
  };
}

/**
 * Batch neutralize a play list. Nulls pass through as null — never imputed.
 */
export function neutralizeAll(
  plays: readonly (PlayInput | null)[],
): readonly NeutralizedPlay[] {
  return plays.map((p) => neutralize(p));
}
