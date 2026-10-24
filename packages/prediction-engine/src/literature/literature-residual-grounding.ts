/**
 * @file literature-residual-grounding.ts
 * Grounding a residual in the game the premise actually asserts about.
 *
 * WHY THIS EXISTS (2026-10-20)
 * A residual is only meaningful if the premise's claim and the outcome
 * being compared are about the SAME proposition. Two kinds of premise
 * exist in the index:
 *
 *   - GAME-SCOPED. A bridge premise's key is
 *     "bridge:<gameKey>:<signalId>" and its numeric_value is a probability
 *     FOR THAT GAME. `source_ref` carries the game key, and
 *     `historical_games` holds that game's real result under the same
 *     "gameKey" format (e.g. "2025_02_CLE_BAL"). 285 of 285 bridge
 *     premises resolve this way.
 *
 *   - CONTEXT-SCOPED. A general MIND-corpus claim ("a rest advantage of
 *     one day is worth about a point") makes no claim about a named game,
 *     so it is correctly graded against whatever game it was activated
 *     for.
 *
 * THE BUG THIS FIXES
 * The residual loop graded game-scoped premises against whatever game the
 * activation happened to be for. That compares two unrelated propositions:
 * "P(home wins 2025 CLE vs BAL)" against "did 2026 BAL@ATL cover".
 *
 * The damage was measurable. Every one of the 72 residuals it produced
 * had actual = 1 (both games it happened to grade were wins), so
 * mean_signed_residual equalled mean_abs_residual EXACTLY -- a signature
 * that no residual can take unless every residual is non-negative -- and
 * the "residuals improved" trend was noise with a favorable sign.
 *
 * Graded against its own game, the same bridge premises have Brier 0.2237
 * against the 0.25 uninformed baseline and a monotone calibration curve.
 * The signal was there; the grounding was wrong.
 *
 * THE RULE
 *   - a premise whose own game has a recorded result is graded against
 *     THAT result, and the residual's game_id is that game;
 *   - a premise with no own-game result is graded against the game it was
 *     activated for (correct for a general claim);
 *   - a premise that IS game-scoped but whose own game has NO recorded
 *     result is NOT gradeable, and must not be silently graded against a
 *     different game. Returning null is the honest answer.
 */

/** The game key shape used by both `historical_games.gameKey` and bridge premise keys. */
const GAME_KEY_PATTERN = /^\d{4}_\d{2}_[A-Z]{2,4}_[A-Z]{2,4}$/;

/** The minimal DB surface this module needs. */
export interface GroundingDb {
  query(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: unknown[]; rowCount: number }>;
}

/** A premise's own game outcome, when it has one. */
export interface OwnGameOutcome {
  /** 1.0 when the home side won, 0.0 when the away side won. */
  readonly actual: number;
  /** The game key the outcome came from. */
  readonly game_key: string;
}

/**
 * Is this source_ref a game key we can resolve?
 *
 * A premise's source_ref can be a game key, an arXiv id, a doc hash, or
 * null. Only a game key can match `historical_games.gameKey`, so the shape
 * is checked BEFORE the query. This also keeps a URL or a hash from ever
 * reaching the database.
 */
export function isGameKey(sourceRef: string | null | undefined): sourceRef is string {
  return typeof sourceRef === "string" && GAME_KEY_PATTERN.test(sourceRef);
}

/**
 * Resolve the outcome a game-scoped premise must be graded against.
 *
 * Returns null when:
 *   - the premise has no source_ref, or it is not a game key;
 *   - the premise's own game has no recorded result;
 *   - the deployment has no `historical_games` table (a query failure is
 *     swallowed, because a missing table must not break settlement -- and
 *     NOT grading is the safe direction).
 */
export async function resolveOwnGameOutcome(
  db: GroundingDb,
  sourceRef: string | null | undefined,
): Promise<OwnGameOutcome | null> {
  if (!isGameKey(sourceRef)) return null;
  const gameKey = sourceRef;
  try {
    const res = await db.query(
      `SELECT CASE WHEN h."homeScore" > h."awayScore" THEN 1.0::double precision ELSE 0.0::double precision END AS actual,
              h."gameKey" AS game_key
         FROM historical_games h
        WHERE h."gameKey" = $1
        LIMIT 1`,
      [gameKey],
    );
    const row = res.rows?.[0] as { actual?: unknown; game_key?: unknown } | undefined;
    if (!row) return null;
    // Postgres may hand back a numeric as a string depending on the
    // driver, so the value is coerced rather than type-asserted.
    const actual = typeof row.actual === "number" ? row.actual : Number(row.actual);
    if (!Number.isFinite(actual)) return null;
    return { actual, game_key: String(row.game_key ?? gameKey) };
  } catch {
    // A missing table or a permissions problem must not break settlement.
    // Returning null means the premise is not graded against a substitute
    // game, which is the honest outcome.
    return null;
  }
}

/**
 * Decide how a premise should be graded, given its own-game outcome.
 *
 * Returns the outcome to compare against and the game id the residual
 * should carry. `own` wins when present; otherwise the activation's game
 * is used.
 */
export function groundingFor(
  own: OwnGameOutcome | null,
  activationGameId: string | null,
): { actual: number | undefined; game_id: string | null } {
  if (own) return { actual: own.actual, game_id: own.game_key };
  return { actual: undefined, game_id: activationGameId };
}
