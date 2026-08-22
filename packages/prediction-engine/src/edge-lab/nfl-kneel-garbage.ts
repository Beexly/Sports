/**
 * Kneel-out / hurry-up garbage-time adjustment to remaining PASS ATTEMPTS.
 *
 * Doctrine C2.1 / H0.2. End-of-game absorbing states: kneel-outs delete
 * remaining dropbacks for big favorites; hurry-up garbage time inflates
 * trailing QBs. This is a script/end-state volume adjustment, not a new
 * HB family, not MODEL_VERSION, not process-sport, not Odds.
 *
 * Status: HYPOTHESIS until masterplan §6 gates. priced:false. No LIVE edge.
 *
 * Inputs are CC-BY nflverse PBP fields already mapped in
 * expected-metrics/nflverse-pbp-mapper.ts (`play_type`, including
 * `qb_kneel`; `game_seconds_remaining`; `score_differential`;
 * `spread_line`). Do not read pbp_participation or ftn_* (CC-BY-SA).
 *
 * `spreadLine` convention: nflverse PBP `spread_line` is HOME-framed,
 * positive = home favored (see nflverse-pbp-mapper.ts and
 * edge-lab/loaders/nfl-games.ts). It is NOT "favorite negative".
 * Possession-side favorite/underdog is `posteamType`; this module never
 * infers that from the sign of `spreadLine` (fail-closed, no imputation).
 *
 * Priors below are rules of thumb for sign and regime only — not
 * published magnitudes, not a claimed 30%.
 *
 * Pure, deterministic, no I/O.
 */

export const KNEEL_GARBAGE_METHOD_TAG = "nfl_kneel_garbage_v1" as const;

/** Last two minutes of the game (not end of half — that is ~1800s remaining). */
const SHORT_CLOCK_S = 120;
/** Comfortable / two-score margin (offense minus defense at play start). */
const TWO_SCORE_MARGIN = 8;
/** Neutral remaining dropback prior: seconds / plays × pass rate. */
const NEUTRAL_SECONDS_PER_PLAY = 27;
const NEUTRAL_PASS_RATE = 0.58;
/** Hurry-up remaining dropback prior. */
const HURRY_SECONDS_PER_PLAY = 14;
const HURRY_PASS_RATE = 0.92;

export type KneelGarbageInput = {
  readonly spreadLine: number; // nflverse PBP spread_line: HOME-framed, + = home favored
  readonly scoreDifferential: number; // offense minus defense at play start
  readonly gameSecondsRemaining: number;
  readonly playType: string; // e.g. qb_kneel, pass, run, no_play
  readonly posteamType: "favorite" | "underdog" | "unknown";
};

export type KneelGarbageResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof KNEEL_GARBAGE_METHOD_TAG;
      readonly priced: false;
      readonly remainingPassAttemptsDeleted: number; // expected remaining dropbacks removed by kneel-out
      readonly garbagePassInflation: number; // extra expected dropbacks for trailing team; 0 if none
      readonly regime: "kneel_out" | "garbage_hurry" | "normal";
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof KNEEL_GARBAGE_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "bad_input" | "insufficient_clock";
    };

const POSTEAM_TYPES = new Set(["favorite", "underdog", "unknown"]);

function deny(refuse: "bad_input" | "insufficient_clock"): KneelGarbageResult {
  return {
    ok: false,
    methodTag: KNEEL_GARBAGE_METHOD_TAG,
    priced: false,
    refuse,
  };
}

function remainingDropbacks(seconds: number, secondsPerPlay: number, passRate: number): number {
  return (seconds / secondsPerPlay) * passRate;
}

function ok(
  regime: "kneel_out" | "garbage_hurry" | "normal",
  remainingPassAttemptsDeleted: number,
  garbagePassInflation: number,
): KneelGarbageResult {
  return {
    ok: true,
    methodTag: KNEEL_GARBAGE_METHOD_TAG,
    priced: false,
    remainingPassAttemptsDeleted,
    garbagePassInflation,
    regime,
  };
}

/**
 * Classify the current PBP state and return the remaining-attempt volume
 * adjustment. Later attempt-volume bind calls this; it does not price.
 */
export function evaluateKneelGarbage(input: KneelGarbageInput): KneelGarbageResult {
  if (input == null || typeof input !== "object") return deny("bad_input");
  const { spreadLine, scoreDifferential, gameSecondsRemaining, playType, posteamType } = input;
  if (!Number.isFinite(spreadLine)) return deny("bad_input");
  if (!Number.isFinite(scoreDifferential)) return deny("bad_input");
  if (typeof playType !== "string" || playType.length === 0) return deny("bad_input");
  if (typeof posteamType !== "string" || !POSTEAM_TYPES.has(posteamType)) return deny("bad_input");
  if (!Number.isFinite(gameSecondsRemaining) || gameSecondsRemaining < 0) return deny("bad_input");
  if (gameSecondsRemaining === 0) return deny("insufficient_clock");

  const shortClock = gameSecondsRemaining <= SHORT_CLOCK_S;
  const kneelPlay = playType === "qb_kneel";
  const favoriteLeadingComfortable =
    posteamType === "favorite" && scoreDifferential >= TWO_SCORE_MARGIN;
  const favoriteKneeling =
    posteamType === "favorite" && kneelPlay && scoreDifferential > 0;

  if (shortClock && (favoriteLeadingComfortable || favoriteKneeling)) {
    const deleted = remainingDropbacks(
      gameSecondsRemaining,
      NEUTRAL_SECONDS_PER_PLAY,
      NEUTRAL_PASS_RATE,
    );
    return ok("kneel_out", deleted, 0);
  }

  const trailingLarge = scoreDifferential <= -TWO_SCORE_MARGIN;
  if (shortClock && trailingLarge) {
    const normal = remainingDropbacks(
      gameSecondsRemaining,
      NEUTRAL_SECONDS_PER_PLAY,
      NEUTRAL_PASS_RATE,
    );
    const hurry = remainingDropbacks(gameSecondsRemaining, HURRY_SECONDS_PER_PLAY, HURRY_PASS_RATE);
    return ok("garbage_hurry", 0, hurry - normal);
  }

  return ok("normal", 0, 0);
}
