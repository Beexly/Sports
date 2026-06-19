/**
 * Free-settlement score resolver — the SAFETY CORE of the keyless settlement path.
 *
 * WHY: settlement matches DB games by `Game.externalId`, which is the paid
 * Odds-API game id. The free score pool (ESPN / nflverse) emits its OWN provider
 * ids as `NormalizedScore.gameKey` — those NEVER equal the stored Odds-API id.
 * Feeding free scores straight into the `externalId` lookup would silently match
 * nothing. This module bridges the gap by RE-KEYING each free score onto the real
 * `externalId` of the unique pending DB game it provably describes.
 *
 * THE STAKES: settling the WRONG pick corrupts the company's permanent published
 * record and is strictly worse than not settling at all. So matching is STRICT and
 * FAIL-CLOSED. A free score is re-keyed to a pending game ONLY when ALL hold:
 *
 *   1. normalized(free.homeTeam) === normalized(game.homeTeamName), AND
 *   2. normalized(free.awayTeam) === normalized(game.awayTeamName)
 *      — i.e. the SAME orientation (home==home, away==away). A swapped-orientation
 *        free record (home/away flipped) is NOT a match: we never re-orient scores,
 *        because a wrong orientation flips WIN/LOSS.
 *   3. commence times are close: same UTC calendar date OR within ±18 hours.
 *   4. the free score is `completed` AND both homeScore/awayScore are non-null
 *      INTEGERS (a fractional or NaN score is rejected — a real final is integral).
 *
 * AMBIGUITY = SKIP. If a free score matches ZERO pending games, it is dropped. If it
 * matches MORE THAN ONE pending game, it is ALSO dropped (we cannot prove which game
 * it settles). Each pending game is claimed by at most one free score (the first that
 * matches it); a second free score competing for an already-claimed game is dropped.
 *
 * OUTPUT: `{ externalId, homeScore, awayScore, completed: true }[]`, keyed to the
 * REAL DB `externalId`, structurally identical to what `DataNormalizer.normalizeScores`
 * emits — so the existing settle loop consumes it with no forked logic. Only matched,
 * completed, integer-scored games are emitted; everything else leaves its picks PENDING.
 *
 * PURITY: no DB, no network, no clock dependence beyond the timestamps passed in.
 * Exhaustively unit-tested. This is the only place free ids cross into settlement.
 */

import type { NormalizedScore } from "./score-provider.js";

/** A still-PENDING DB game, projected to exactly the fields matching needs. */
export interface PendingGameForMatch {
  /** The REAL Odds-API external id stored on the Game row — the settle key. */
  readonly externalId: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  /** Scheduled kickoff (UTC). */
  readonly commenceTime: Date;
}

/**
 * A free score re-keyed onto a matched pending game's real `externalId`.
 * Mirrors the shape `DataNormalizer.normalizeScores` returns so the settle loop
 * is identical for paid and free inputs. `completed` is always true here (only
 * completed, integer-scored matches are ever emitted).
 */
export interface ResolvedSettlementScore {
  readonly externalId: string;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly completed: true;
}

/** ±18 hours, in ms — the commence-time tolerance when calendar dates differ. */
export const COMMENCE_TOLERANCE_MS = 18 * 60 * 60 * 1000;

/**
 * Deterministic, fail-closed team-name normalizer for equality matching.
 * Lowercase, strip accents, drop everything but [a-z0-9 ], collapse spaces.
 * Intentionally NO alias table: two strings match only when their cleaned forms
 * are byte-equal, so "Kansas City Chiefs" === "kansas city chiefs" but never a
 * fuzzy near-miss. An empty result (e.g. punctuation-only input) never matches a
 * non-empty name. Pure.
 */
export function normalizeTeamForMatch(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** True when both UTC calendar dates are equal, or the instants are within ±18h. */
function commenceTimesClose(freeIso: string | null, dbTime: Date): boolean {
  if (freeIso === null) return false;
  const freeMs = Date.parse(freeIso);
  if (!Number.isFinite(freeMs)) return false;
  const dbMs = dbTime.getTime();
  if (!Number.isFinite(dbMs)) return false;

  // Same UTC calendar date is a match regardless of clock time within the day.
  const free = new Date(freeMs);
  const db = new Date(dbMs);
  const sameUtcDate =
    free.getUTCFullYear() === db.getUTCFullYear() &&
    free.getUTCMonth() === db.getUTCMonth() &&
    free.getUTCDate() === db.getUTCDate();
  if (sameUtcDate) return true;

  return Math.abs(freeMs - dbMs) <= COMMENCE_TOLERANCE_MS;
}

/** A genuine final score is a non-null, finite INTEGER. Rejects null/NaN/fractional. */
function isFinalScore(value: number | null): value is number {
  return value !== null && Number.isInteger(value);
}

/** True when the free score and pending game describe the same matchup + window. */
function isStrictMatch(score: NormalizedScore, game: PendingGameForMatch): boolean {
  // Same orientation only — we never flip home/away (flipping flips WIN/LOSS).
  const freeHome = normalizeTeamForMatch(score.homeTeam);
  const freeAway = normalizeTeamForMatch(score.awayTeam);
  const dbHome = normalizeTeamForMatch(game.homeTeamName);
  const dbAway = normalizeTeamForMatch(game.awayTeamName);

  // Empty normalized names can never anchor a confident match.
  if (freeHome === "" || freeAway === "" || dbHome === "" || dbAway === "") return false;
  if (freeHome !== dbHome || freeAway !== dbAway) return false;

  return commenceTimesClose(score.commenceTime, game.commenceTime);
}

/**
 * Re-key free pool scores onto the real `externalId` of the pending game each one
 * provably settles. Fail-closed: emits ONLY unambiguous, completed, integer-scored
 * matches; drops zero-match, multi-match, swapped-orientation, incomplete, and
 * non-integer-score records. Each pending game is claimed at most once.
 *
 * @param freeScores    - normalized scores from the free pool (any completion state)
 * @param pendingGames  - the still-PENDING DB games to match against
 * @returns scores keyed to real externalIds, ready for the existing settle loop
 */
export function resolveFreeSettlementScores(
  freeScores: readonly NormalizedScore[],
  pendingGames: readonly PendingGameForMatch[],
): ResolvedSettlementScore[] {
  const resolved: ResolvedSettlementScore[] = [];
  const claimedExternalIds = new Set<string>();

  for (const score of freeScores) {
    // Only completed, integer-scored finals can settle anything.
    if (!score.completed) continue;
    if (!isFinalScore(score.homeScore) || !isFinalScore(score.awayScore)) continue;

    // Find every pending game this score strictly matches.
    const matches = pendingGames.filter((game) => isStrictMatch(score, game));

    // Ambiguity (0 or >1 matches) → settle nothing for this score.
    if (matches.length !== 1) continue;

    const game = matches[0]!;
    // A pending game already claimed by an earlier free score is not re-settled.
    if (claimedExternalIds.has(game.externalId)) continue;
    claimedExternalIds.add(game.externalId);

    resolved.push({
      externalId: game.externalId,
      homeScore: score.homeScore,
      awayScore: score.awayScore,
      completed: true,
    });
  }

  return resolved;
}
