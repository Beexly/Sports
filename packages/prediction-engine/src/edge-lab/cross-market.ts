/**
 * Lane C2 — cross-market consistency: pure arithmetic on spread + total.
 * Zero new data. SIGN: props inconsistent with team market regress toward consistency.
 */

/** Named constant: spread-to-pass-lean coefficient (favorites pass-lean ahead). */
export const PASS_LEAN_PER_SPREAD_FAVORITE = 0.035; // +3.5% implied pass rate per point of favorite spread
/** Named constant: spread-to-pass-lean coefficient (underdog runs ahead in script). */
export const PASS_LEAN_PER_SPREAD_DOG = -0.015; // -1.5% implied pass rate per point dog spread
/** Named constant: total-to-plays coefficient. */
export const PLAYS_PER_TOTAL_POINT = 1.25; // ~1.25 implied plays per total point
/** Named constant: league-average baseline plays. */
export const LEAGUE_AVG_PLAYS = 64.0; // ~64 offensive plays / team / game
/** Named constant: league-average pass-rate baseline. */
export const LEAGUE_AVG_PASS_RATE = 0.58;
/** Named constant: consistency z-threshold (fail-closed). */
export const CONSISTENCY_Z_THRESHOLD = 2.5;

export interface ImpliedTeamVolume {
  readonly impliedPassRate: number;
  readonly impliedRushRate: number;
  readonly impliedPlays: number;
}

export interface ConsistencyFlag {
  readonly zDistance: number;
  readonly consistent: boolean;
}

/**
 * Implied team pass / rush volume + total plays from spread + total.
 * Pure arithmetic — named constants document every coefficient explicitly.
 */
export function impliedTeamVolume(
  spread: number | null,
  total: number | null,
  leagueAverages?: { avgPassRate?: number; avgPlays?: number },
): ImpliedTeamVolume | null {
  if (spread === null || total === null || !Number.isFinite(spread) || !Number.isFinite(total) || total <= 0) {
    return null; // fail closed
  }
  const avgPass = leagueAverages?.avgPassRate ?? LEAGUE_AVG_PASS_RATE;
  const avgPlays = leagueAverages?.avgPlays ?? LEAGUE_AVG_PLAYS;
  // Convention from game-row.ts: negative spread = favored.
  const passLean = Math.abs(spread) * (spread < 0 ? PASS_LEAN_PER_SPREAD_FAVORITE : PASS_LEAN_PER_SPREAD_DOG);
  const impliedPassRate = Math.max(0.2, Math.min(0.85, avgPass + passLean));
  const impliedRushRate = 1.0 - impliedPassRate;
  const impliedPlays = avgPlays + total * PLAYS_PER_TOTAL_POINT;
  return { impliedPassRate, impliedRushRate, impliedPlays };
}

/**
 * Prop-line consistency flag: z-distance of player line from team-implied expectation.
 * Monotonic in inconsistency magnitude; returns null on bad input (fail-closed).
 */
export function consistencyFlag(
  playerLine: number | null,
  impliedTeamVolume: ImpliedTeamVolume | null,
  playerRoleShare: number, // [0,1] share of team volume this player receives
): ConsistencyFlag | null {
  if (
    playerLine === null ||
    impliedTeamVolume === null ||
    !Number.isFinite(playerLine) ||
    playerRoleShare <= 0 || playerRoleShare > 1
  ) {
    return null;
  }
  // Expected player contribution = team implied plays * role share * base rate ratio.
  const expected = impliedTeamVolume.impliedPassRate * impliedTeamVolume.impliedPlays * playerRoleShare;
  const std = Math.max(5.0, expected * 0.15); // synthetic std scaled to expectation
  const zDistance = expected !== 0 ? (playerLine - expected) / std : playerLine > 0 ? 999 : -999;
  return { zDistance: Math.abs(zDistance), consistent: Math.abs(zDistance) < CONSISTENCY_Z_THRESHOLD };
}
